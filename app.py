# app.py  —  docker compose up -d ; pip install -r requirements.txt ; flask --app app run
import os, hashlib, hmac
from functools import wraps
import psycopg
from psycopg.rows import dict_row
from flask import Flask, request, jsonify, session
app = Flask(__name__)
# la sesión viaja en una cookie firmada; sin SECRET_KEY fija, las sesiones se pierden al reiniciar
app.secret_key = os.environ.get("SECRET_KEY") or os.urandom(32)
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")
DB_URL = os.environ.get("DATABASE_URL", "postgresql://lab:lab@localhost:5433/lab")
db = psycopg.connect(DB_URL, autocommit=True, row_factory=dict_row)
db.execute("""CREATE TABLE IF NOT EXISTS registro (
    id              SERIAL PRIMARY KEY,
    nombres         TEXT NOT NULL,
    apellidos       TEXT NOT NULL,
    correo          TEXT NOT NULL,
    telefono        TEXT,
    contrasena_hash BYTEA NOT NULL,
    salt            BYTEA NOT NULL,
    creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
# prueba del consentimiento (Ley 29733, art. 13.5) y un solo registro por correo
db.execute("ALTER TABLE registro ADD COLUMN IF NOT EXISTS acepta_politica_en TIMESTAMP")
db.execute("CREATE UNIQUE INDEX IF NOT EXISTS registro_correo_unico ON registro (lower(correo))")

CAMPOS = ("nombres", "apellidos", "correo", "telefono")   # campos editables / restringibles
OCULTOS = ("contrasena_hash", "salt")                      # nunca se devuelven
ITERACIONES = 600_000
MAX_RESTRINGIDOS = 2

def hashear(contrasena, salt=None):
    salt = salt or os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", contrasena.encode(), salt, ITERACIONES)
    return h, salt

def verificar(contrasena, h, salt):
    return hmac.compare_digest(hashear(contrasena, bytes(salt))[0], bytes(h))

def publico(fila):
    # quita hash/salt y oculta los campos marcados como restringidos
    fila = {k: v for k, v in fila.items() if k not in OCULTOS}
    for campo in fila.get("restringidos") or []:
        if campo in fila:
            fila[campo] = "***RESTRINGIDO***"
    return fila

def con_sesion(f):
    @wraps(f)
    def envoltura(*args, **kwargs):
        if "id" not in session:
            return {"error": "Inicia sesión para continuar."}, 401
        return f(*args, **kwargs)
    return envoltura

def solo_propia(f):
    # cada persona solo puede leer o modificar su propia ficha
    @wraps(f)
    @con_sesion
    def envoltura(id, *args, **kwargs):
        if session["id"] != id:
            return {"error": "Solo puedes acceder a tu propia ficha."}, 403
        return f(id, *args, **kwargs)
    return envoltura

# ---------- CREATE (registro + inicio de sesión) ----------
@app.post("/registro")
def registrar():
    d = request.get_json()
    if d.get("acepta_politica") is not True:
        return {"error": "Debes aceptar la política de privacidad para registrarte."}, 400
    h, salt = hashear(d["contrasena"])
    try:
        fila = db.execute("INSERT INTO registro (nombres, apellidos, correo, telefono, contrasena_hash, salt, "
                          "acepta_politica_en) VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP) RETURNING id",
                          (d["nombres"], d["apellidos"], d["correo"], d.get("telefono"), h, salt)).fetchone()
    except psycopg.errors.UniqueViolation:
        return {"error": "Ese correo ya está registrado. Inicia sesión con él."}, 409
    session.clear()
    session["id"] = fila["id"]
    return {"ok": True, "id": fila["id"]}, 201

# ---------- READ ----------
@app.get("/registros")
@con_sesion
def listar():
    # solo devuelve la ficha de quien tiene la sesión iniciada
    filas = db.execute("SELECT * FROM registro WHERE id = %s", (session["id"],)).fetchall()
    return jsonify([publico(f) for f in filas])

@app.get("/registro/<int:id>")
@solo_propia
def obtener(id):
    fila = db.execute("SELECT * FROM registro WHERE id = %s", (id,)).fetchone()
    if not fila:
        return {"error": "no encontrado"}, 404
    return publico(fila)

# ---------- UPDATE ----------
@app.put("/registro/<int:id>")
@solo_propia
def actualizar(id):
    d = request.get_json()
    cambios = {k: d[k] for k in CAMPOS if k in d}
    if "contrasena" in d:
        cambios["contrasena_hash"], cambios["salt"] = hashear(d["contrasena"])
    if not cambios:
        return {"error": "nada que actualizar"}, 400
    # los nombres de columna salen de una lista blanca, los valores van parametrizados
    sets = ", ".join(f"{k} = %s" for k in cambios)
    try:
        cur = db.execute(f"UPDATE registro SET {sets} WHERE id = %s", (*cambios.values(), id))
    except psycopg.errors.UniqueViolation:
        return {"error": "Ese correo ya lo usa otra persona."}, 409
    if cur.rowcount == 0:
        return {"error": "no encontrado"}, 404
    return {"ok": True}

# ---------- DELETE ----------
@app.delete("/registro/<int:id>")
@solo_propia
def eliminar(id):
    cur = db.execute("DELETE FROM registro WHERE id = %s", (id,))
    if cur.rowcount == 0:
        return {"error": "no encontrado"}, 404
    session.clear()
    return {"ok": True}

# ---------- SESIÓN ----------
@app.post("/login")
def login():
    d = request.get_json()
    fila = db.execute("SELECT id, contrasena_hash, salt FROM registro WHERE lower(correo) = lower(%s)",
                      (d["correo"],)).fetchone()
    if not fila or not verificar(d["contrasena"], fila["contrasena_hash"], fila["salt"]):
        return {"error": "credenciales inválidas"}, 401
    session.clear()
    session["id"] = fila["id"]
    return {"ok": True, "id": fila["id"]}

@app.post("/logout")
def logout():
    session.clear()
    return {"ok": True}

# ---------- RESTRINGIDOS ----------
@app.post("/registro/<int:id>/restringidos")
@solo_propia
def restringir(id):
    d = request.get_json()
    valores = d.get("restringidos", [])
    if not isinstance(valores, list) or any(v not in CAMPOS for v in valores):
        return {"error": "restringidos debe ser una lista con valores de " + ", ".join(CAMPOS)}, 400
    valores = list(dict.fromkeys(valores))   # sin repetidos, para que el límite cuente datos distintos
    if len(valores) > MAX_RESTRINGIDOS:
        return {"error": f"Puedes restringir como máximo {MAX_RESTRINGIDOS} datos."}, 400
    db.execute("ALTER TABLE registro ADD COLUMN IF NOT EXISTS restringidos TEXT[] DEFAULT '{}'")
    cur = db.execute("UPDATE registro SET restringidos = %s WHERE id = %s", (valores, id))
    if cur.rowcount == 0:
        return {"error": "no encontrado"}, 404
    return {"ok": True, "restringidos": valores}, 201
