import { useState } from "react";
import { api } from "../api.js";
import FormPersona from "./FormPersona.jsx";

// Sin sesión: iniciar sesión (POST /login) o crear cuenta (POST /registro)
export default function Acceso({ onEntrar }) {
  const [modo, setModo] = useState("entrar");

  return (
    <section className="acceso">
      <div className="pestanas" role="tablist" aria-label="Acceso">
        <button
          type="button"
          role="tab"
          id="tab-entrar"
          aria-selected={modo === "entrar"}
          aria-controls="panel-acceso"
          onClick={() => setModo("entrar")}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          role="tab"
          id="tab-crear"
          aria-selected={modo === "crear"}
          aria-controls="panel-acceso"
          onClick={() => setModo("crear")}
        >
          Crear cuenta
        </button>
      </div>
      <div id="panel-acceso" role="tabpanel" aria-labelledby={modo === "entrar" ? "tab-entrar" : "tab-crear"}>
        {modo === "entrar" ? (
          <FormEntrar onEntrar={onEntrar} onCrear={() => setModo("crear")} />
        ) : (
          <FormPersona modo="crear" onListo={(id, texto) => onEntrar(id, texto)} />
        )}
      </div>
    </section>
  );
}

function FormEntrar({ onEntrar, onCrear }) {
  const [valores, setValores] = useState({ correo: "", contrasena: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => {
    setValores({ ...valores, [e.target.name]: e.target.value });
    setError("");
  };

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const { id } = await api.login(valores);
      onEntrar(id, "Sesión iniciada");
    } catch (err) {
      setError(err.status === 401 ? "El correo o la contraseña no coinciden." : err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo">
        <span>Correo</span>
        <input name="correo" type="email" value={valores.correo} onChange={cambiar} required autoComplete="email" />
      </label>
      <label className="campo">
        <span>Contraseña</span>
        <input
          name="contrasena"
          type="password"
          value={valores.contrasena}
          onChange={cambiar}
          required
          autoComplete="current-password"
        />
      </label>

      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

      <div className="acciones">
        <button type="submit" className="boton boton-principal" disabled={enviando}>
          {enviando ? "Comprobando…" : "Iniciar sesión"}
        </button>
      </div>
      <p className="ayuda">
        ¿Aún no tienes ficha?{" "}
        <button type="button" className="enlace" onClick={onCrear}>
          Crea una cuenta
        </button>
      </p>
    </form>
  );
}
