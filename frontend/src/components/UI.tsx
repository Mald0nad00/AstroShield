import type { ReactNode } from "react";
import { groupColor, number } from "../utils";

export function Card({
  title,
  subtitle,
  tag,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  tag?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {tag && <span className="badge">{tag}</span>}
      </div>
      {children}
    </section>
  );
}
export function Kpi({
  label,
  value,
  unit,
  note,
  groups,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: string;
  groups?: boolean;
}) {
  return (
    <div className="kpi">
      <p>{label}</p>
      <div className="kpi-value">
        {value}
        <span>{unit}</span>
      </div>
      {groups && (
        <div className="color-strips">
          {[1, 2, 3, 4].map((c) => (
            <i key={c} style={{ background: groupColor(c) }} />
          ))}
        </div>
      )}
      <small>{note}</small>
    </div>
  );
}
export function Group({ id }: { id: number }) {
  return (
    <span className="group">
      <i style={{ background: groupColor(id) }} />
      Grupo {id}
    </span>
  );
}
export function State({
  loading,
  error,
  retry,
  children,
}: {
  loading?: boolean;
  error?: Error | null;
  retry?: () => void;
  children: ReactNode;
}) {
  if (error)
    return (
      <div className="state error" role="alert">
        <h2>No pudimos cargar los datos</h2>
        <p>{error.message}</p>
        <button onClick={retry}>Volver a intentar</button>
      </div>
    );
  if (loading)
    return (
      <div className="state loading" role="status">
        <span className="spinner" />
        <p>Consultando el catálogo espacial…</p>
      </div>
    );
  return <>{children}</>;
}
export function Empty({
  text = "No hay registros que coincidan con los filtros.",
}: {
  text?: string;
}) {
  return (
    <p className="empty" role="status">
      {text}
    </p>
  );
}
export function Pagination({
  page,
  total,
  size = 8,
  onChange,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  return (
    <div className="pagination">
      <span>
        {total
          ? `Mostrando ${number((page - 1) * size + 1)}–${number(Math.min(page * size, total))} de ${number(total)}`
          : "Sin resultados"}
      </span>
      <nav aria-label="Paginación">
        <button
          aria-label="Página anterior"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          ‹
        </button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => start + i).map(
          (p) => (
            <button
              key={p}
              aria-label={`Página ${p}`}
              aria-current={page === p ? "page" : undefined}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button
          aria-label="Página siguiente"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          ›
        </button>
      </nav>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Notice() {
  return (
    <div className="notice">
      <span>
        Datos del catálogo · Los grupos de IA son exploratorios; no predicen
        impactos ni indican niveles de riesgo.
      </span>
      <span className="badge">ANÁLISIS EXPLORATORIO</span>
    </div>
  );
}
