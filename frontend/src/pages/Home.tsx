import { useApi } from "../api";
import { Bars, Histogram, Scatter } from "../components/Charts";
import { Card, Group, Kpi, State } from "../components/UI";
import { navigate } from "../router";
import type { Clusters, Neo, NeoStats, Page, Point } from "../types";
import { histogram, number } from "../utils";

export default function Home() {
  const stats = useApi<NeoStats>("/neo/stats", { bins: 10 });
  const scatter = useApi<{ points: Point[] }>("/neo/scatter", { limit: 500 });
  const clusters = useApi<Clusters>("/ia/clusters");
  const sample = useApi<Page<Neo>>("/neo", { page_size: 500 });
  const s = stats.data;
  return (
    <State
      loading={
        stats.isPending ||
        scatter.isPending ||
        clusters.isPending ||
        sample.isPending
      }
      error={stats.error || scatter.error || clusters.error || sample.error}
      retry={() => {
        void stats.refetch();
        void scatter.refetch();
        void clusters.refetch();
        void sample.refetch();
      }}
    >
      {s && (
        <>
          <div className="kpi-grid">
            <Kpi
              label="Objetos NEO únicos"
              value={number(s.kpis.objetos_unicos)}
              note={`${number(s.kpis.registros)} aproximaciones registradas`}
            />
            <Kpi
              label="Grupos detectados"
              value={s.kpis.grupos}
              groups
              note="Asignados por K-Means"
            />
            <Kpi
              label="Diámetro promedio"
              value={number(s.kpis.diametro_promedio_km, 3)}
              unit="km"
              note="Media de las aproximaciones"
            />
            <Kpi
              label="Velocidad promedio"
              value={number(s.kpis.velocidad_promedio_km_s, 1)}
              unit="km/s"
              note="Media de las aproximaciones"
            />
          </div>
          <div className="grid dashboard-main">
            <Card
              title="Diámetro frente a velocidad"
              subtitle="Cada punto es una aproximación; el color indica su grupo"
              tag="K-MEANS"
            >
              <Scatter
                points={scatter.data?.points || []}
                onSelect={(id) => navigate("neo", { id })}
              />
            </Card>
            <div className="stack">
              <Card
                title="Objetos por grupo"
                subtitle="Aproximaciones asignadas a cada agrupamiento"
              >
                <Bars
                  counts={s.por_grupo}
                  groups
                  onGroup={(group) => navigate("neo", { grupo: group })}
                />
              </Card>
              <Card
                title="Distribución de diámetro"
                subtitle="Aproximaciones por intervalo, km (log)"
              >
                <Histogram
                  bins={s.hist_diametro_km}
                  label="Histograma del diámetro estimado"
                  unit="km"
                />
              </Card>
            </div>
          </div>
          <div className="grid thirds">
            <Card
              title="Distribución de velocidad"
              subtitle="Velocidad relativa, km/s"
            >
              <Histogram
                bins={s.hist_velocidad_km_s}
                label="Distribución de velocidad"
                unit="km/s"
              />
            </Card>
            <Card
              title="Distancia de aproximación"
              subtitle={`Muestra de ${number(sample.data?.items.length)} registros · UA, escala log`}
            >
              <Histogram
                bins={histogram(
                  sample.data?.items.map((n) => n.miss_distance_au) || [],
                  10,
                  true,
                )}
                color="#b8a1dc"
                label="Distancia de aproximación en una muestra del catálogo"
                unit="UA"
              />
            </Card>
            <Card
              title="Resumen por grupo"
              subtitle="Promedios de las aproximaciones"
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>N</th>
                      <th>Diám. (km)</th>
                      <th>Vel. (km/s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusters.data?.clusters.map((c) => (
                      <tr key={c.cluster}>
                        <td>
                          <Group id={c.cluster} />
                        </td>
                        <td>{number(c.registros)}</td>
                        <td>{number(c.variables.diameter_km.media, 3)}</td>
                        <td>{number(c.variables.velocity_km_s.media, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <div className="grid two-one">
            <Card
              title="Qué hace la IA"
              subtitle="Tres tareas sobre los datos del catálogo"
            >
              <div className="explain-grid">
                {[
                  [
                    "01",
                    "Agrupa",
                    "K-Means reúne aproximaciones con características numéricas similares en cuatro grupos.",
                  ],
                  [
                    "02",
                    "Encuentra similares",
                    "Calcula distancias en cinco variables transformadas y muestra los objetos más cercanos a uno elegido.",
                  ],
                  [
                    "03",
                    "Describe",
                    "Cada grupo muestra sus características y cada ficha indica la procedencia de los datos.",
                  ],
                ].map(([n, title, text]) => (
                  <div key={n}>
                    <span className="step-number">{n}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Accesos rápidos" subtitle="Continúa explorando">
              <div className="quick-links">
                {(
                  [
                    [
                      "neo",
                      "Buscar en el catálogo NEO",
                      "Objetos cercanos a la Tierra",
                    ],
                    [
                      "ia",
                      "Ver grupos y similares",
                      "Análisis de inteligencia artificial",
                    ],
                    ["satcat", "Consultar SATCAT", "Objetos artificiales"],
                  ] as const
                ).map(([route, title, sub]) => (
                  <button key={route} onClick={() => navigate(route)}>
                    <span>
                      {title}
                      <small>{sub}</small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </State>
  );
}
