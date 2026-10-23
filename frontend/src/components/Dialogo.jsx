import { useEffect, useRef } from "react";

// <dialog> nativo: atrapa el foco y se cierra con Escape
export default function Dialogo({ abierto, titulo, onCerrar, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog ref={ref} className="dialogo" onClose={onCerrar} aria-labelledby="dialogo-titulo">
      <header className="dialogo-cabecera">
        <h2 id="dialogo-titulo">{titulo}</h2>
        <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
          ×
        </button>
      </header>
      {abierto && children}
    </dialog>
  );
}
