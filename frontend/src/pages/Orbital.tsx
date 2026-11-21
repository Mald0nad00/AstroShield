import { useState } from "react";
import { useApi } from "../api";
import { Bars, Histogram } from "../components/Charts";
import { NeoDetail, SatelliteDetail } from "../components/Details";
import { EarthLayers } from "../components/EarthLayers";
import { Card, Group, State } from "../components/UI";
import type { Neo, Page, Satellite } from "../types";
import { colors, groupColor, histogram, number } from "../utils";

const regimes = ["LEO", "MEO", "GEO", "HEO"];
export default function Orbital() {
  const [mode, setMode] = useState<"earth" | "neo">("earth");
  const [zoom, setZoom] = useState(1),
    [active, setActive] = useState<string[]>([]);
  const [satId, setSatId] = useState<number>(),
    [neoId, setNeoId] = useState<number>(2162635);
  const sat = useApi<Page<Satellite>>(
    "/satcat",
    { page_size: 100, in_orbit: true, regime: regimes },
    mode === "earth",
  );
  const neo = useApi<Page<Neo>>("/neo", { page_size: 150 }, mode === "neo");
  const satellites =
    sat.data?.items.filter(
      (s) =>
        (s.APOGEE ?? -1) >= 0 &&
        (s.PERIGEE ?? -1) >= 0 &&
        s.INCLINATION !== null,
    ) || [];
  const selectedSatId = satId ?? satellites[0]?.NORAD_CAT_ID;
  const unique = [...new Map(neo.data?.items.map((n) => [n.id, n])).values()];
  const selected =
    mode === "earth"
      ? satellites.find((s) => s.NORAD_CAT_ID === selectedSatId)?.OBJECT_NAME
      : unique.find((n) => n.id === neoId)?.name;
  function toggle(value: string) {
    setActive((old) =>
      old.includes(value) ? old.filter((v) => v !== value) : [...old, value],
    );
  }
  const counts =
    mode === "earth"
      ? regimes.map((r) => ({
          valor: r,
          conteo: satellites.filter((s) => s.REGIME === r).length,
        }))
      : [1, 2, 3, 4].map((g) => ({
          valor: g,
          conteo: unique.filter((n) => n.cluster === g).length,
        }));
  return (
    <>
      <div className="orbital-toolbar">
        <div className="segmented" aria-label="Vista del explorador">
          <button
            aria-pressed={mode === "earth"}
            onClick={() => {
              setMode("earth");
              setZoom(1);
              setActive([]);
            }}
          >
            Entorno terrestre
          </button>
          <button
            aria-pressed={mode === "neo"}
            onClick={() => {
              setMode("neo");
              setZoom(1);
              setActive([]);
            }}
          >
            Vecindad NEO
          </button>
        </div>
        <div className="group-tabs">
          {(mode === "earth" ? regimes : ["1", "2", "3", "4"]).map((v, i) => (
            <button
              key={v}
              aria-pressed={active.includes(v)}
              onClick={() => toggle(v)}
            >
              {mode === "neo" ? (
                <Group id={Number(v)} />
              ) : (
                <>
                  <i style={{ background: colors[i] }} />
                  {v}
                </>
              )}
            </button>
          ))}
        </div>
        <small>Escala comprimida · posiciones ilustrativas</small>
      </div>
      <div className="grid two-one">
        <Card
          title={
            mode === "earth"
              ? "Vista del entorno terrestre"
              : "Vista radial de los NEO"
          }
          subtitle={
            mode === "earth"
              ? "Parámetros del catálogo; posiciones y orientación ilustrativas"
              : "Radio según distancia de aproximación; sector según grupo"
          }
          tag="CONCEPTUAL"
          className="orbital-card"
        >
          <State
            loading={mode === "earth" ? sat.isPending : neo.isPending}
            error={mode === "earth" ? sat.error : neo.error}
            retry={() => {
              void sat.refetch();
              void neo.refetch();
            }}
          >
            <label className="field orbital-selection">
              <span>Seleccionar objeto de la muestra</span>
              <select
                aria-label="Seleccionar objeto de la muestra"
                value={mode === "earth" ? (selectedSatId ?? "") : neoId}
                onChange={(e) =>
                  mode === "earth"
                    ? setSatId(Number(e.target.value))
                    : setNeoId(Number(e.target.value))
                }
              >
                {mode === "earth"
                  ? satellites.map((s) => (
                      <option key={s.NORAD_CAT_ID} value={s.NORAD_CAT_ID}>
                        {s.OBJECT_NAME} · {s.REGIME}
                      </option>
                    ))
                  : unique.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} · Grupo {n.cluster}
                      </option>
                    ))}
              </select>
            </label>
            <div className="orbital-scene">
              <svg
                viewBox="0 0 830 544"
                role="group"
                aria-label={
                  mode === "earth"
                    ? "Explorador conceptual del entorno terrestre"
                    : "Explorador radial de distancias de aproximación"
                }
              >
                <defs>
                  <clipPath id="scene-clip">
                    <rect width="830" height="544" />
                  </clipPath>
                </defs>
                <g clipPath="url(#scene-clip)">
                  <g
                    transform={`translate(${415 * (1 - zoom)} ${272 * (1 - zoom)}) scale(${zoom})`}
                  >
                    {mode === "earth" ? (
                      <>
                        <EarthLayers />
                        {satellites
                          .filter(
                            (s) => !active.length || active.includes(s.REGIME),
                          )
                          .map((s) => {
                            const radius =
                              155 +
                              Math.log10(1 + Math.max(0, s.APOGEE || 0) / 300) *
                                52;
                            const ry = radius * 0.32,
                              rotation = (s.INCLINATION || 0) * 0.9,
                              phase = s.NORAD_CAT_ID * 2.39996;
                            const x = Math.cos(phase) * radius,
                              y = Math.sin(phase) * ry;
                            const color =
                              s.NORAD_CAT_ID === selectedSatId
                                ? "#e2a95e"
                                : colors[regimes.indexOf(s.REGIME)] ||
                                  colors[0];
                            return (
                              <g
                                key={s.NORAD_CAT_ID}
                                transform={`translate(414.67 266) rotate(${-rotation})`}
                              >
                                <ellipse
                                  rx={radius}
                                  ry={ry}
                                  fill="none"
                                  stroke={color}
                                  strokeWidth={
                                    s.NORAD_CAT_ID === selectedSatId ? 1.8 : 0.7
                                  }
                                  opacity={
                                    s.NORAD_CAT_ID === selectedSatId ? 1 : 0.45
                                  }
                                />
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={s.NORAD_CAT_ID === selectedSatId ? 6 : 3.2}
                                  fill={color}
                                  tabIndex={-1}
                                  role="button"
                                  aria-label={`Seleccionar ${s.OBJECT_NAME}`}
                                  onClick={() => setSatId(s.NORAD_CAT_ID)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      setSatId(s.NORAD_CAT_ID);
                                  }}
                                >
                                  <title>
                                    {s.OBJECT_NAME} · {s.REGIME} · apogeo{" "}
                                    {number(s.APOGEE)} km
                                  </title>
                                </circle>
                              </g>
                            );
                          })}
                        <text x="410" y="102">
                          N
                        </text>
                      </>
                    ) : (
                      <>
                        {[
                          ["024dc.png", 360.57, 211.9, 128.195],
                          ["d84f5.png", 315.1, 166.43, 219.13],
                          ["9b2a0.png", 273.61, 124.95, 302.108],
                          ["8156f.png", 228.14, 79.48, 393.043],
                          ["63bb2.png", 186.66, 37.99, 476.021],
                        ].map(([src, x, y, size]) => (
                          <image
                            key={src}
                            href={`/assets/${src}`}
                            x={x}
                            y={y}
                            width={size}
                            height={size}
                          />
                        ))}
                        {[0.003, 0.01, 0.03, 0.1, 0.3].map((d) => {
                          const r = 64.0975 + Math.log10(d / 0.003) * 86.96;
                          return (
                            <text key={d} x="432" y={276 - r + 13}>
                              {d} UA
                            </text>
                          );
                        })}
                        <image
                          href="/assets/5cca4.svg"
                          x="410.67"
                          y="262"
                          width="28"
                          height="28"
                        />
                        <text x="424.67" y="304" textAnchor="middle">
                          Tierra
                        </text>
                        {unique
                          .filter(
                            (n) =>
                              !active.length ||
                              active.includes(String(n.cluster)),
                          )
                          .map((n) => {
                            const radius = Math.max(
                              20,
                              Math.min(
                                260,
                                64.0975 +
                                  Math.log10(
                                    Math.max(0.00001, n.miss_distance_au) /
                                      0.003,
                                  ) *
                                    86.96,
                              ),
                            );
                            const angle =
                              (((n.cluster - 1) * 90 +
                                8 +
                                ((n.id % 997) / 997) * 74) *
                                Math.PI) /
                              180;
                            return (
                              <circle
                                key={n.id}
                                cx={424.67 + Math.cos(angle) * radius}
                                cy={276 + Math.sin(angle) * radius}
                                r={Math.max(
                                  3,
                                  Math.min(8, 3 + Math.sqrt(n.diameter_km) * 3),
                                )}
                                fill={groupColor(n.cluster)}
                                stroke={n.id === neoId ? "#e2a95e" : "none"}
                                strokeWidth="3"
                                opacity=".85"
                                tabIndex={-1}
                                role="button"
                                aria-label={`Seleccionar ${n.name}`}
                                onClick={() => setNeoId(n.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") setNeoId(n.id);
                                }}
                              >
                                <title>
                                  {n.name} · Grupo {n.cluster} · distancia{" "}
                                  {number(n.miss_distance_au, 4)} UA
                                </title>
                              </circle>
                            );
                          })}
                      </>
                    )}
                  </g>
                </g>
              </svg>
              <div className="zoom-controls">
                <button
                  aria-label="Acercar vista"
                  disabled={zoom >= 2}
                  onClick={() => setZoom((v) => Math.min(2, v + 0.2))}
                >
                  +
                </button>
                <button
                  aria-label="Alejar vista"
                  disabled={zoom <= 0.6}
                  onClick={() => setZoom((v) => Math.max(0.6, v - 0.2))}
                >
                  −
                </button>
                <button
                  aria-label="Restablecer vista"
                  onClick={() => {
                    setZoom(1);
                    setActive([]);
                  }}
                >
                  ⟲
                </button>
              </div>
            </div>
            <p className="fineprint">
              {selected ? `Seleccionado: ${selected}. ` : ""}
              {mode === "earth"
                ? `${satellites.length} registros con parámetros disponibles. Escala de altitud comprimida; no representa trayectorias precisas ni posiciones actuales.`
                : `${unique.length} objetos únicos de una muestra de ${neo.data?.items.length || 0} aproximaciones. Distancia radial en escala logarítmica; el ángulo no tiene significado físico.`}
            </p>
          </State>
        </Card>
        <div className="stack">
          {mode === "earth" ? (
            <SatelliteDetail id={selectedSatId} />
          ) : (
            <NeoDetail id={neoId} />
          )}
          <Card title="Cómo leer esta vista" subtitle="Escala y límites">
            <p className="body-copy">
              {mode === "earth"
                ? "Las elipses ilustran los parámetros de inclinación, apogeo y perigeo de una muestra del catálogo SATCAT. Los anillos de referencia indican LEO, MEO y GEO."
                : "Cada sector representa un grupo K-Means. El radio resume la distancia de aproximación registrada, no MOID ni distancia actual. Los puntos no representan posiciones reales."}
            </p>
            <p className="fineprint">
              No calcula trayectorias, ventanas de aproximación, colisiones ni
              probabilidades de impacto.
            </p>
          </Card>
        </div>
      </div>
      <div className="grid thirds">
        <Card
          title={mode === "earth" ? "Objetos por régimen" : "Objetos por grupo"}
          subtitle="Distribución de la muestra"
        >
          <Bars counts={counts} groups={mode === "neo"} />
        </Card>
        <Card
          title={
            mode === "earth"
              ? "Inclinación orbital"
              : "Distancia de aproximación"
          }
          subtitle={
            mode === "earth"
              ? "Registros de la muestra, grados"
              : "Objetos únicos de la muestra, UA (log)"
          }
        >
          <Histogram
            bins={
              mode === "earth"
                ? histogram(
                    satellites.map((s) => s.INCLINATION!),
                    10,
                  )
                : histogram(
                    unique.map((n) => n.miss_distance_au),
                    10,
                    true,
                  )
            }
            color="#b8a1dc"
            label="Distribución de la muestra orbital"
          />
        </Card>
        <Card
          title={mode === "earth" ? "Apogeo y perigeo" : "Diámetro estimado"}
          subtitle="Resumen de la muestra"
        >
          {mode === "earth" ? (
            <dl className="attributes">
              <div>
                <dt>Apogeo máximo</dt>
                <dd>
                  {satellites.length
                    ? number(Math.max(...satellites.map((s) => s.APOGEE!)))
                    : "—"}{" "}
                  km
                </dd>
              </div>
              <div>
                <dt>Perigeo mínimo</dt>
                <dd>
                  {satellites.length
                    ? number(Math.min(...satellites.map((s) => s.PERIGEE!)))
                    : "—"}{" "}
                  km
                </dd>
              </div>
              <div>
                <dt>Objetos en la muestra</dt>
                <dd>{number(satellites.length)}</dd>
              </div>
            </dl>
          ) : (
            <Histogram
              bins={histogram(
                unique.map((n) => n.diameter_km),
                10,
                true,
              )}
              label="Diámetros en la muestra orbital"
              unit="km"
            />
          )}
        </Card>
      </div>
    </>
  );
}
