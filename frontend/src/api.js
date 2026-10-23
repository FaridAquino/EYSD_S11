// Un método por endpoint del backend Flask (app.py)

export const CAMPOS = [
  { clave: "nombres", etiqueta: "Nombres" },
  { clave: "apellidos", etiqueta: "Apellidos" },
  { clave: "correo", etiqueta: "Correo" },
  { clave: "telefono", etiqueta: "Teléfono" },
];

// igual que MAX_RESTRINGIDOS en app.py
export const MAX_RESTRINGIDOS = 2;

// valor con el que el backend reemplaza los campos restringidos
export const OCULTO = "***RESTRINGIDO***";

async function pedir(ruta, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`/api${ruta}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("No hay conexión con el servidor. Comprueba que Flask esté en marcha.");
  }
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(
      datos?.error ??
        (res.status >= 500
          ? "El servidor no respondió. Comprueba que Flask y el contenedor de Postgres estén en marcha."
          : `La petición falló (código ${res.status}).`)
    );
    error.status = res.status;
    throw error;
  }
  return datos;
}

export const api = {
  // con sesión iniciada devuelve solo la ficha propia; sin sesión responde 401
  listar: () => pedir("/registros"),
  logout: () => pedir("/logout", { method: "POST" }),
  obtener: (id) => pedir(`/registro/${id}`),
  crear: (datos) => pedir("/registro", { method: "POST", body: datos }),
  actualizar: (id, datos) => pedir(`/registro/${id}`, { method: "PUT", body: datos }),
  eliminar: (id) => pedir(`/registro/${id}`, { method: "DELETE" }),
  login: (datos) => pedir("/login", { method: "POST", body: datos }),
  restringir: (id, restringidos) =>
    pedir(`/registro/${id}/restringidos`, { method: "POST", body: { restringidos } }),
};
