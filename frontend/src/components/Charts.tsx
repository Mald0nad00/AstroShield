import type { KeyboardEvent } from "react";
import type { Bin, Count, Neo, Point, Satellite } from "../types";
import { colors, groupColor, number, types } from "../utils";
import { Empty, Group } from "./UI";

function pointKey(e: KeyboardEvent<SVGCircleElement>, select: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    select();
  }
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
    return;
  e.preventDefault();
  const points = Array.from(
    e.currentTarget.ownerSVGElement!.querySelectorAll<SVGCircleElement>(
      "circle[role=button]",
    ),
  );
  const direction = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
  const next =
    points[
      (points.indexOf(e.currentTarget) + direction + points.length) %
        points.length
    ];
  e.currentTarget.tabIndex = -1;
  next.tabIndex = 0;
  next.focus();
}

export function Histogram({
  bins,
  color = colors[0],
  unit = "",
  label,
}: {
  bins: Bin[];
  color?: string;
  unit?: string;
  label: string;
}) {
  if (!bins.length) return <Empty />;
  const max = Math.max(...bins.map((b) => b.conteo), 1),
    w = 360 / bins.length;
  return (
    <svg
      className="histogram"
      viewBox="0 0 400 180"
      role="img"
      aria-label={label}
    >
      {bins.map((b, i) => (
        <g key={i}>
          <rect
            x={20 + i * w}
            y={140 - (b.conteo / max) * 108}
            width={Math.max(1, w - 4)}
            height={(b.conteo / max) * 108}
            fill={color}
            opacity=".88"
          >
            <title>
              {number(b.desde, 4)}–{number(b.hasta, 4)} {unit}:{" "}
              {number(b.conteo)} registros
            </title>
          </rect>
          {bins.length <= 16 && (
            <text
              x={20 + i * w + (w - 4) / 2}
              y={132 - (b.conteo / max) * 108}
              textAnchor="middle"
            >
              {new Intl.NumberFormat("es-MX", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(b.conteo)}
            </text>
          )}
        </g>
      ))}
      <line x1="20" x2="380" y1="140" y2="140" />
      <text x="20" y="165">
        {number(bins[0].desde, 3)}
      </text>
      <text x="200" y="165" textAnchor="middle">
        {number(bins[Math.floor(bins.length / 2)].desde, 3)}
      </text>
      <text x="380" y="165" textAnchor="end">
        {number(bins.at(-1)!.hasta, 3)} {unit}
      </text>
    </svg>
  );
}
export function Bars({
  counts,
  groups = false,
  onGroup,
  active,
}: {
  counts: Count[];
  groups?: boolean;
  onGroup?: (group: number) => void;
  active?: number;
}) {
  const max = Math.max(...counts.map((c) => c.conteo), 1);
  if (!counts.length) return <Empty />;
  return (
    <div className="bars">
      {counts.map((c, i) => {
        const content = (
          <>
            <span>
              {groups ? `Grupo ${c.valor}` : types[String(c.valor)] || c.valor}
            </span>
            <span className="bar-track">
              <span
                style={{
                  width: `${(c.conteo / max) * 100}%`,
                  background: groups
                    ? groupColor(Number(c.valor))
                    : colors[i % 4],
                }}
              />
            </span>
            <strong>{number(c.conteo)}</strong>
          </>
        );
        return onGroup ? (
          <button
            className="bar-row"
            aria-pressed={active === Number(c.valor)}
            key={c.valor}
            onClick={() => onGroup(Number(c.valor))}
          >
            {content}
          </button>
        ) : (
          <div className="bar-row" key={c.valor}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
export function Scatter({
  points,
  selected,
  onSelect,
  compact = false,
}: {
  points: Point[];
  selected?: number;
  onSelect: (id: number) => void;
  compact?: boolean;
}) {
  const valid = points.filter(
    (p) => p.diameter_km > 0 && Number.isFinite(p.velocity_km_s),
  );
  if (!valid.length) return <Empty />;
  const lo = Math.floor(
    Math.log10(Math.min(...valid.map((p) => p.diameter_km))),
  );
  const hi = Math.max(
    lo + 1,
    Math.ceil(Math.log10(Math.max(...valid.map((p) => p.diameter_km)))),
  );
  const maxV = Math.max(
    10,
    Math.ceil(Math.max(...valid.map((p) => p.velocity_km_s)) / 10) * 10,
  );
  const x = (v: number) => 58 + ((Math.log10(v) - lo) / (hi - lo)) * 590;
  const y = (v: number) => 235 - (v / maxV) * 200;
  return (
    <div className={`scatter ${compact ? "compact" : ""}`}>
      <svg
        viewBox="0 0 700 285"
        aria-label="Dispersión de diámetro estimado y velocidad relativa"
        role="group"
      >
        <text x="58" y="15">
          Velocidad relativa (km/s)
        </text>
        {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((v) => (
          <g key={v}>
            <line x1={x(10 ** v)} x2={x(10 ** v)} y1="30" y2="235" />
            <text x={x(10 ** v)} y="254" textAnchor="middle">
              {number(10 ** v, 4)}
            </text>
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="58"
              x2="648"
              y1={y((maxV * i) / 4)}
              y2={y((maxV * i) / 4)}
            />
            <text x="46" y={y((maxV * i) / 4) + 4} textAnchor="end">
              {number((maxV * i) / 4, 1)}
            </text>
          </g>
        ))}
        {valid.map((p, i) => (
          <circle
            key={`${p.id}-${i}`}
            cx={x(p.diameter_km)}
            cy={y(p.velocity_km_s)}
            r={selected === p.id ? 6 : 3.3}
            fill={groupColor(p.cluster)}
            fillOpacity={selected === p.id ? 1 : 0.64}
            stroke={selected === p.id ? "#e2a95e" : "none"}
            strokeWidth="2"
            tabIndex={i === 0 ? 0 : -1}
            role="button"
            aria-label={`Ver ficha de ${p.name}`}
            onClick={() => onSelect(p.id)}
            onKeyDown={(e) => pointKey(e, () => onSelect(p.id))}
          >
            <title>
              {p.name} · Grupo {p.cluster} · {number(p.diameter_km, 3)} km ·{" "}
              {number(p.velocity_km_s, 2)} km/s
            </title>
          </circle>
        ))}
        <text x="350" y="278" textAnchor="middle">
          Diámetro estimado (km, escala logarítmica)
        </text>
      </svg>
      <div className="legend">
        {[...new Set(valid.map((p) => p.cluster))].sort().map((id) => (
          <Group key={id} id={id} />
        ))}
        <small>{number(valid.length)} aproximaciones en la muestra</small>
      </div>
    </div>
  );
}
export function SatScatter({
  items,
  onSelect,
}: {
  items: Satellite[];
  onSelect: (id: number) => void;
}) {
  const valid = items.filter(
    (p) =>
      p.APOGEE != null && p.PERIGEE != null && p.APOGEE > 0 && p.PERIGEE > 0,
  );
  if (!valid.length)
    return (
      <Empty text="Sin parámetros orbitales disponibles en esta muestra." />
    );
  const max = Math.max(
    4,
    Math.ceil(
      Math.log10(
        Math.max(...valid.map((p) => Math.max(p.APOGEE!, p.PERIGEE!))),
      ),
    ),
  );
  const x = (v: number) => 58 + (Math.log10(Math.max(v, 1)) / max) * 560;
  const y = (v: number) => 225 - (Math.log10(Math.max(v, 1)) / max) * 190;
  return (
    <svg
      viewBox="0 0 680 275"
      className="sat-scatter"
      role="group"
      aria-label="Apogeo frente a perigeo, escala logarítmica"
    >
      <text x="58" y="16">
        Apogeo (km)
      </text>
      {Array.from({ length: max + 1 }, (_, i) => i).map((i) => (
        <g key={i}>
          <line x1={x(10 ** i)} x2={x(10 ** i)} y1="30" y2="225" />
          <line x1="58" x2="618" y1={y(10 ** i)} y2={y(10 ** i)} />
          <text x={x(10 ** i)} y="245" textAnchor="middle">
            {number(10 ** i)}
          </text>
        </g>
      ))}
      {valid.map((p) => (
        <circle
          key={p.NORAD_CAT_ID}
          cx={x(p.PERIGEE!)}
          cy={y(p.APOGEE!)}
          r="3.5"
          fill={
            colors[["LEO", "MEO", "GEO", "HEO"].indexOf(p.REGIME)] || colors[0]
          }
          opacity=".75"
          tabIndex={0}
          role="button"
          aria-label={`Ver ${p.OBJECT_NAME}`}
          onClick={() => onSelect(p.NORAD_CAT_ID)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSelect(p.NORAD_CAT_ID);
          }}
        >
          <title>
            {p.OBJECT_NAME}: apogeo {number(p.APOGEE)} km / perigeo{" "}
            {number(p.PERIGEE)} km
          </title>
        </circle>
      ))}
      <text x="340" y="271" textAnchor="middle">
        Perigeo (km, escala logarítmica)
      </text>
    </svg>
  );
}
export function CompareChart({ a, b }: { a: Neo; b: Neo }) {
  const variables: { key: keyof Neo; label: string; unit: string }[] = [
    { key: "diameter_km", label: "Diámetro estimado", unit: "km" },
    { key: "velocity_km_s", label: "Velocidad relativa", unit: "km/s" },
    { key: "miss_distance_au", label: "Distancia de aproximación", unit: "UA" },
    { key: "absolute_magnitude", label: "Magnitud absoluta", unit: "mag" },
  ];
  return (
    <>
      <div className="legend">
        <span style={{ color: "#e2a95e" }}>{a.name}</span>
        <span style={{ color: colors[0] }}>{b.name}</span>
      </div>
      {variables.map((v) => {
        const av = Number(a[v.key]),
          bv = Number(b[v.key]),
          max = Math.max(Math.abs(av), Math.abs(bv), 0.0001);
        return (
          <div className="comparison-variable" key={v.key}>
            <span>
              {v.label} ({v.unit})
            </span>
            {[av, bv].map((n, i) => (
              <div className="comparison-row" key={i}>
                <div className="bar-track">
                  <span
                    style={{
                      width: `${(Math.abs(n) / max) * 100}%`,
                      background: i ? colors[0] : "#e2a95e",
                    }}
                  />
                </div>
                <strong>{number(n, v.unit === "UA" ? 4 : 3)}</strong>
              </div>
            ))}
          </div>
        );
      })}
      <p className="fineprint">Cada variable utiliza su propia escala.</p>
    </>
  );
}
