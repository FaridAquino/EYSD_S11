import { useState } from "react";
import { api, CAMPOS, OCULTO } from "../api.js";

const OBLIGATORIOS = ["nombres", "apellidos", "correo"];
const TIPOS = { correo: "email", telefono: "tel" };

// modo "crear" → POST /registro ; modo "editar" → PUT /registro/<id>
export default function FormPersona({ modo, registro, onListo, onCancelar }) {
  const editando = modo === "editar";
  const inicial = Object.fromEntries(
    CAMPOS.map(({ clave }) => {
      const valor = registro?.[clave];
      return [clave, !valor || valor === OCULTO ? "" : valor];
    })
  );
  const [valores, setValores] = useState({ ...inicial, contrasena: "" });
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setValores({ ...valores, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (editando) {
        // solo se envía lo que cambió; un campo restringido vacío se deja como está
        const cambios = {};
        for (const { clave } of CAMPOS) {
          if (valores[clave] !== inicial[clave] && valores[clave] !== "") cambios[clave] = valores[clave];
        }
        if (valores.contrasena) cambios.contrasena = valores.contrasena;
        if (Object.keys(cambios).length === 0) {
          setError("No cambiaste ningún dato.");
          return;
        }
        await api.actualizar(registro.id, cambios);
        onListo(registro.id, "Cambios guardados");
      } else {
        const { id } = await api.crear({
          ...valores,
          telefono: valores.telefono || null,
          acepta_politica: acepta,
        });
        onListo(id, "Cuenta creada");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      {CAMPOS.map(({ clave, etiqueta }) => {
        const restringido = editando && registro?.[clave] === OCULTO;
        return (
          <label key={clave} className="campo">
            <span>
              {etiqueta}
              {!OBLIGATORIOS.includes(clave) && <small> (opcional)</small>}
            </span>
            <input
              name={clave}
              type={TIPOS[clave] || "text"}
              value={valores[clave]}
              onChange={cambiar}
              required={!editando && OBLIGATORIOS.includes(clave)}
              placeholder={restringido ? "Dato restringido. Escribe uno nuevo para reemplazarlo" : ""}
              autoComplete="off"
            />
          </label>
        );
      })}
      <label className="campo">
        <span>{editando ? "Nueva contraseña" : "Contraseña"}</span>
        <input
          name="contrasena"
          type="password"
          value={valores.contrasena}
          onChange={cambiar}
          required={!editando}
          minLength={editando && !valores.contrasena ? undefined : 6}
          autoComplete="new-password"
        />
        <small className="ayuda">
          {editando
            ? "Déjala vacía para mantener la actual."
            : "Se guarda como hash con salt; nadie puede leerla después."}
        </small>
      </label>

      {!editando && (
        <div className="politica">
          <p className="recuerda">
            Recuerda leer la política de privacidad antes de aceptarla: explica qué datos guardamos, para qué
            y cómo ejercer tus derechos ARCO.
          </p>
          <label className="casilla">
            <input
              type="checkbox"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
              required
            />
            <span>
              He leído y acepto la{" "}
              <a href="/privacidad.html" target="_blank" rel="noopener">
                Política de privacidad
              </a>
              , conforme a la Ley N.º 29733.
            </span>
          </label>
        </div>
      )}

      {error && <p className="mensaje mensaje-error" role="alert">{error}</p>}

      <div className="acciones">
        <button type="submit" className="boton boton-principal" disabled={enviando}>
          {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear cuenta"}
        </button>
        {onCancelar && (
          <button type="button" className="boton" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
