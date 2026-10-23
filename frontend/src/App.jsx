import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import Acceso from "./components/Acceso.jsx";
import Dialogo from "./components/Dialogo.jsx";
import Ficha from "./components/Ficha.jsx";
import FormPersona from "./components/FormPersona.jsx";

export default function App() {
  const [sesion, setSesion] = useState(undefined); // undefined: comprobando · null: sin sesión · número: id propio
  const [errorInicio, setErrorInicio] = useState("");
  const [version, setVersion] = useState(0);
  const [editando, setEditando] = useState(null);
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);

  // GET /registros: con sesión devuelve solo la ficha propia, sin sesión responde 401
  const comprobarSesion = () => {
    setErrorInicio("");
    api
      .listar()
      .then((fichas) => setSesion(fichas[0]?.id ?? null))
      .catch((err) => {
        if (err.status === 401) setSesion(null);
        else setErrorInicio(err.message);
      });
  };

  useEffect(comprobarSesion, []);

  const avisar = (texto, error = false) => {
    clearTimeout(temporizador.current);
    setAviso({ texto, error });
    temporizador.current = setTimeout(() => setAviso(null), 4000);
  };

  const salir = (texto) => {
    setSesion(null);
    setEditando(null);
    if (texto) avisar(texto);
  };

  async function cerrarSesion() {
    try {
      await api.logout();
    } finally {
      salir("Sesión cerrada");
    }
  }

  return (
    <div className="pagina">
      <header className="cabecera">
        <div>
          <h1>{sesion ? "Mi ficha" : "Registro de personas"}</h1>
          <p className="bajada">
            {sesion
              ? "Solo tú puedes ver y editar estos datos. Restringe un dato para que no aparezca al consultar tu ficha."
              : "Crea tu ficha o inicia sesión para ver y administrar tus datos personales."}
          </p>
        </div>
        {sesion && (
          <div className="acciones">
            <button type="button" className="boton" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      <main className={sesion ? "cuerpo cuerpo-ficha" : "cuerpo cuerpo-acceso"}>
        {errorInicio ? (
          <div className="mensaje mensaje-error" role="alert">
            <p>{errorInicio}</p>
            <button type="button" className="enlace" onClick={comprobarSesion}>Reintentar</button>
          </div>
        ) : sesion === undefined ? null : sesion ? (
          <div className="hoja">
            <Ficha
              id={sesion}
              version={version}
              avisar={avisar}
              onCambio={() => setVersion((v) => v + 1)}
              onEditar={(registro) => setEditando(registro)}
              onEliminada={() => salir()}
              onSinSesion={() => salir("Tu sesión terminó. Vuelve a iniciar sesión.")}
            />
          </div>
        ) : (
          <div className="hoja">
            <Acceso
              onEntrar={(id, texto) => {
                setSesion(id);
                avisar(texto);
              }}
            />
          </div>
        )}
      </main>

      <footer className="pie-pagina">
        <a href="/privacidad.html" target="_blank" rel="noopener">Política de privacidad</a>
      </footer>

      <Dialogo abierto={!!editando} titulo="Editar mis datos" onCerrar={() => setEditando(null)}>
        <FormPersona
          key={editando?.id}
          modo="editar"
          registro={editando}
          onCancelar={() => setEditando(null)}
          onListo={(_, texto) => {
            avisar(texto);
            setEditando(null);
            setVersion((v) => v + 1);
          }}
        />
      </Dialogo>

      <div className="aviso-zona" aria-live="polite">
        {aviso && <p className={aviso.error ? "aviso aviso-error" : "aviso"}>{aviso.texto}</p>}
      </div>
    </div>
  );
}
