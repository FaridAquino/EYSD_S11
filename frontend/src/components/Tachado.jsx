// Barra de tachado que reemplaza un dato restringido
export default function Tachado({ largo = 12, pendiente = false }) {
  return (
    <span
      className={pendiente ? "tachado tachado-pendiente" : "tachado"}
      style={{ "--largo": `${largo}ch` }}
      role="img"
      aria-label={pendiente ? "Dato que se mostrará al guardar" : "Dato restringido"}
    />
  );
}
