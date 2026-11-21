import { useEffect, useState } from "react";
import { useApi } from "../api";
import { CompareChart, Scatter } from "../components/Charts";
import { ObjectSearch } from "../components/Search";
import { Card, Empty, Group, Kpi, State } from "../components/UI";
import { navigate } from "../router";
import type {
  Clusters,
  Detail,
  Inference,
  Metrics,
  Neo,
  Point,
} from "../types";
import { number } from "../utils";

export default function Analysis({ params }: { params: URLSearchParams }) {
  const [reference, setReference] = useState(
    Number(params.get("id")) || 2162635,
  );
  const [compareTo, setCompareTo] = useState<number>();
  const [group, setGroup] = useState<number>();
  useEffect(() => {
    if (params.get("id")) {
      setReference(Number(params.get("id")));
      setCompareTo(undefined);
    }
  }, [params.get("id")]);
  const clusters = useApi<Clusters>("/ia/clusters");
  const metrics = useApi<Metrics>("/ia/metricas");
  const scatter = useApi<{ points: Point[] }>("/neo/scatter", {
    limit: 700,
    cluster: group,
  });
  const detail = useApi<Detail<Neo>>(`/neo/${reference}`);
  const inference = useApi<Inference>("/ia/inferencia", {}, true, {
    id: reference,
    k: 6,
  });
  const other = compareTo ?? inference.data?.objetos_similares[0]?.id;
  const comparison = useApi<{ a: Neo; b: Neo }>(
    "/neo/compare",
    { a: reference, b: other },
    other !== undefined,
  );
  function selectReference(id: number) {
    setReference(id);
    setCompareTo(undefined);
  }
  return (
    <>
      <div className="kpi-grid">
        <Kpi
          label="Grupos (k)"
          value={clusters.data?.n_clusters ?? "—"}
          groups
          note="Configuración del modelo actual"
        />
        <Kpi
          label="Variables usadas"
          value="5"
          note="Diámetros mín./máx., velocidad, distancia y H"
        />
        <Kpi
          label="Silueta de validación"
          value={number(metrics.data?.selected.val.silhouette, 4)}
          note="Métrica del modelo entrenado"
        />
        <Kpi
          label="Aproximaciones analizadas"
          value={number(
            clusters.data?.clusters.reduce((sum, c) => sum + c.registros, 0),
          )}
          note="Agrupamientos sobre el catálogo NEO"
        />
      </div>
      {metrics.error && (
        <p role="alert" className="form-error">
          No se pudieron consultar las métricas.{" "}
          <button
            className="text-button"
            onClick={() => void metrics.refetch()}
          >
            Reintentar
          </button>
        </p>
      )}
      <div className="grid two-one">
        <Card
          title="Mapa de grupos"
          subtitle="Diámetro frente a velocidad de una muestra del catálogo"
          tag="K-MEANS"
        >
          <div className="group-tabs">
            <button
              aria-pressed={group === undefined}
              onClick={() => setGroup(undefined)}
            >
              Todos
            </button>
            {[1, 2, 3, 4].map((g) => (
              <button
                key={g}
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
              >
                <Group id={g} />
              </button>
            ))}
          </div>
          <State
            loading={scatter.isPending}
            error={scatter.error}
            retry={() => void scatter.refetch()}
          >
            <Scatter
              points={scatter.data?.points || []}
              selected={reference}
              onSelect={selectReference}
            />
          </State>
        </Card>
        <Card
          title="Cómo leer los grupos"
          subtitle="Promedios de las aproximaciones"
        >
          <State
            loading={clusters.isPending}
            error={clusters.error}
            retry={() => void clusters.refetch()}
          >
            <div className="cluster-list">
              {clusters.data?.clusters.map((c) => (
                <button
                  key={c.cluster}
                  className={group === c.cluster ? "active" : ""}
                  onClick={() =>
                    setGroup(group === c.cluster ? undefined : c.cluster)
                  }
                >
                  <Group id={c.cluster} />
                  <strong>{number(c.registros)} registros</strong>
                  <small>
                    Diám. {number(c.variables.diameter_km.media, 3)} km · vel.{" "}
                    {number(c.variables.velocity_km_s.media, 1)} km/s
                  </small>
                  <small>
                    Dist. {number(c.variables.miss_distance_au.media, 3)} UA · H{" "}
                    {number(c.variables.absolute_magnitude.media, 1)} mag
                  </small>
                </button>
              ))}
            </div>
          </State>
          <p className="fineprint">
            Describen similitud numérica. Los colores no representan niveles de
            peligrosidad.
          </p>
        </Card>
      </div>
      <div className="grid dashboard-main">
        <Card
          title="Objetos similares"
          subtitle="Ordenados por distancia en el espacio transformado del modelo"
          tag="DISTANCIA NORMALIZADA"
        >
          <label className="search-label">Objeto de referencia</label>
          <ObjectSearch
            label="Buscar NEO de referencia"
            neoOnly
            onSelect={(_, id) => selectReference(id)}
            placeholder="Buscar otro NEO de referencia…"
          />
          <State
            loading={detail.isPending}
            error={detail.error}
            retry={() => void detail.refetch()}
          >
            <p className="reference-name">
              {detail.data?.objeto.name} <span>ID {reference}</span>
            </p>
          </State>
          <State
            loading={inference.isPending}
            error={inference.error}
            retry={() => void inference.refetch()}
          >
            {inference.data?.objetos_similares.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Objeto</th>
                      <th>Grupo</th>
                      <th>Distancia</th>
                      <th>Índice¹</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inference.data.objetos_similares.map((n, i) => (
                      <tr
                        key={n.id}
                        className={n.id === other ? "selected" : ""}
                      >
                        <td>{i + 1}</td>
                        <td>
                          <button
                            className="object-link"
                            onClick={() => navigate("neo", { id: n.id })}
                          >
                            {n.name}
                          </button>
                        </td>
                        <td>
                          <Group id={n.cluster} />
                        </td>
                        <td>{number(n.distancia, 3)}</td>
                        <td>{number(1 / (1 + n.distancia), 3)}</td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => setCompareTo(n.id)}
                          >
                            Comparar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
          </State>
          <p className="fineprint">
            ¹ Índice visual = 1 / (1 + distancia). No es una probabilidad. Menor
            distancia indica mayor parecido.
          </p>
        </Card>
        <Card
          title="Comparación de variables"
          subtitle="Referencia frente al objeto elegido"
        >
          <ObjectSearch
            label="Buscar segundo NEO para comparar"
            neoOnly
            onSelect={(_, id) => setCompareTo(id)}
            placeholder="Elegir otro objeto…"
          />
          <State
            loading={other !== undefined && comparison.isPending}
            error={comparison.error}
            retry={() => void comparison.refetch()}
          >
            {comparison.data ? (
              <CompareChart a={comparison.data.a} b={comparison.data.b} />
            ) : (
              <Empty text="Elige dos objetos para comparar sus variables." />
            )}
          </State>
        </Card>
      </div>
      <p className="fineprint">
        Modelo: K-Means, cinco variables; log1p en los dos diámetros y
        StandardScaler.{" "}
        {metrics.data &&
          `Silueta de referencia (k=2): ${number(metrics.data.baseline_k2.val.silhouette, 4)}. La configuración k=4 no supera esa referencia.`}
      </p>
    </>
  );
}
