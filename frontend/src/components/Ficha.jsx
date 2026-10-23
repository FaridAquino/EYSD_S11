import { useEffect, useState } from "react";
import { api, CAMPOS, MAX_RESTRINGIDOS, OCULTO } from "../api.js";
import Tachado from "./Tachado.jsx";

const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short" });

// GET /registro/<id>, POST /registro/<id>/restringidos y DELETE /registro/<id>
export default function Ficha({ id, version, onEditar, onCambio, onEliminada, onSinSesion, avisar }) {
  const [registro, setRegistro] = useState(null);
  const [error, setError] = useState("");
  const [borrador, setBorrador] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    let vigente = true;
    setError("");
    setConfirmando(false);
    api
      .obtener(id)
      .then((r) => {
        if (!vigente) return;
        setRegistro(r);
        setBorrador(r.restringidos ?? []);
      })
      .catch((err) => {
        if (!vigente) return;
        if (err.status === 401) onSinSesion();
        else setError(err.message);
      });
    return () => {
      vigente = false;
    };
  }, [id, version]);

  if (error) return <section className="ficha"><p className="mensaje mensaje-error">{error}</p></section>;
  if (!registro || registro.id !== id) return <section className="ficha" aria-busy="true" />;

  const guardadas = registro.restringidos ?? [];
  const hayCambios =
    borrador.length !== guardadas.length || borrador.some((c) => !guardadas.includes(c));

  const enLimite = borrador.length >= MAX_RESTRINGIDOS;

  const alternar = (clave) => {
    if (borrador.includes(clave)) setBorrador(borrador.filter((c) => c !== clave));
    else if (!enLimite) setBorrador([...borrador, clave]);
  };

  async function guardarRestricciones() {
    setGuardando(true);
    try {
      await api.restringir(id, CAMPOS.map((c) => c.clave).filter((c) => borrador.includes(c)));
      avisar("Restricciones guardadas");
      onCambio();
    } catch (err) {
      avisar(err.message, true);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    try {
      await api.eliminar(id);
      avisar("Ficha eliminada");
      onEliminada();
    } catch (err) {
      avisar(err.message, true);
    }
  }

  const nombre = (v) => (v === OCULTO ? null : v);
  const titulo = [nombre(registro.nombres), nombre(registro.apellidos)].filter(Boolean).join(" ");

  return (
    <section className="ficha" aria-labelledby="ficha-titulo">
      <header className="ficha-cabecera">
        <p className="ficha-numero">Ficha N.º {registro.id}</p>
        <h2 id="ficha-titulo">{titulo || <Tachado largo={14} />}</h2>
        <p className="ficha-fecha">Registrada el {fecha.format(new Date(registro.creado_en))}</p>
      </header>

      <dl className="datos">
        {CAMPOS.map(({ clave, etiqueta }) => {
          const valor = registro[clave];
          const oculto = valor === OCULTO;
          const marcado = borrador.includes(clave);
          return (
            <div key={clave} className="dato">
              <dt>{etiqueta}</dt>
              <dd className="dato-valor">
                {oculto ? (
                  <Tachado pendiente={!marcado} />
                ) : marcado ? (
                  <Tachado largo={Math.max(String(valor ?? "").length, 6)} />
                ) : valor ? (
                  valor
                ) : (
                  <span className="vacio">Sin dato</span>
                )}
              </dd>
              <dd className="dato-accion">
                <button
                  type="button"
                  className="interruptor"
                  aria-pressed={marcado}
                  disabled={!marcado && enLimite}
                  title={!marcado && enLimite ? `Puedes restringir como máximo ${MAX_RESTRINGIDOS} datos` : undefined}
                  onClick={() => alternar(clave)}
                >
                  {marcado ? "Restringido" : "Visible"}
                </button>
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="restricciones">
        <p className="ayuda" aria-live="polite">
          {hayCambios
            ? "Tienes cambios sin guardar en los datos restringidos."
            : "Los datos restringidos no se muestran al consultar la ficha."}{" "}
          {enLimite
            ? `Ya restringiste ${MAX_RESTRINGIDOS} de ${MAX_RESTRINGIDOS}; quita uno para elegir otro.`
            : `Puedes restringir hasta ${MAX_RESTRINGIDOS} datos (${borrador.length} de ${MAX_RESTRINGIDOS}).`}
        </p>
        <button
          type="button"
          className="boton boton-sello"
          onClick={guardarRestricciones}
          disabled={!hayCambios || guardando}
        >
          {guardando ? "Guardando…" : "Guardar restricciones"}
        </button>
      </div>

      <footer className="ficha-pie">
        {confirmando ? (
          <div className="confirmar" role="alert">
            <p>Se eliminará tu ficha con todos sus datos y se cerrará tu sesión. Esta acción no se puede deshacer.</p>
            <div className="acciones">
              <button type="button" className="boton boton-peligro" onClick={eliminar} autoFocus>
                Eliminar ficha
              </button>
              <button type="button" className="boton" onClick={() => setConfirmando(false)}>
                Conservar
              </button>
            </div>
          </div>
        ) : (
          <div className="acciones">
            <button type="button" className="boton" onClick={() => onEditar(registro)}>
              Editar datos
            </button>
            <button type="button" className="boton boton-texto-peligro" onClick={() => setConfirmando(true)}>
              Eliminar ficha
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}
