# EYSD_S11 · Registro de personas

## Integrantes

* Elmer Jose Manuel Villegas Suarez - 202410032
* Farid Jack Aquino Castro - 202410569

Laboratorio de la sesión 11 del curso DS3031 Ética y seguridad de datos (UTEC). Es una aplicación donde cada persona crea su ficha, inicia sesión y administra sus propios datos personales: verlos, editarlos, eliminarlos y restringir hasta 2 de ellos.

- **Backend:** Flask (`app.py`)
- **Base de datos:** PostgreSQL 16 en Docker (`docker-compose.yml`)
- **Frontend:** React + Vite (`frontend/`)
- **Política de privacidad:** `frontend/public/privacidad.html` (Ley N.º 29733)
- **DPIA:** `DPIA_Registro_de_personas.docx`

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) en ejecución
- Python 3.10 o superior
- Node.js 18 o superior

## Cómo levantarlo

Se necesitan tres terminales, todas abiertas en la raíz del proyecto.

### 1. Base de datos

```bash
docker compose up -d
```

Crea el contenedor `lab-postgres`, publicado en el puerto **5433** del equipo para no chocar con un Postgres instalado localmente. Para comprobar que está listo:

```bash
docker exec lab-postgres pg_isready -U lab
```

### 2. Backend

```bash
pip install -r requirements.txt
flask --app app run
```

La API queda en `http://127.0.0.1:5000`. La tabla `registro` se crea sola la primera vez.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**. Vite reenvía las peticiones `/api/*` a Flask, así que no hace falta configurar CORS.

La política de privacidad queda en http://localhost:5173/privacidad.html.

## Variables de entorno (opcionales)

| Variable | Para qué sirve | Valor por defecto |
|---|---|---|
| `DATABASE_URL` | Conexión a Postgres | `postgresql://lab:lab@localhost:5433/lab` |
| `SECRET_KEY` | Firma la cookie de sesión | Una clave aleatoria en cada arranque |

Si no defines `SECRET_KEY`, las sesiones se pierden cada vez que reinicias Flask y hay que volver a iniciar sesión. Para mantenerlas:

```bash
# PowerShell
$env:SECRET_KEY = "una-clave-larga-y-aleatoria"
# bash
export SECRET_KEY="una-clave-larga-y-aleatoria"
```

## Endpoints

Todos los endpoints de ficha exigen haber iniciado sesión y solo permiten acceder a la ficha propia: responden 401 sin sesión y 403 con la ficha de otra persona.

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/registro` | Crea la cuenta (exige `acepta_politica: true`) e inicia sesión |
| POST | `/login` | Inicia sesión |
| POST | `/logout` | Cierra sesión |
| GET | `/registros` | Devuelve solo la ficha propia |
| GET | `/registro/<id>` | Lee la ficha propia |
| PUT | `/registro/<id>` | Edita la ficha propia |
| DELETE | `/registro/<id>` | Elimina la ficha propia y cierra la sesión |
| POST | `/registro/<id>/restringidos` | Guarda los datos restringidos (máximo 2) |

## Detener y limpiar

```bash
docker compose down        # detiene Postgres y conserva los datos
docker compose down -v     # detiene Postgres y BORRA todos los datos
```

Para detener Flask y Vite, pulsa `Ctrl+C` en su terminal.

## DPIA
El archivo DPIA esta cargado directamente en el repo