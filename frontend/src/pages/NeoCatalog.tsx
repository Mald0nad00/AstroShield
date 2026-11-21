import { useEffect, useState, type FormEvent } from "react";
import { useApi } from "../api";
import { Bars, Histogram, Scatter } from "../components/Charts";
import { NeoDetail } from "../components/Details";
import { FiltersForm } from "../components/Filters";
import { Card, Empty, Group, Kpi, Pagination, State } from "../components/UI";
import type { Neo, NeoStats, Page, Params, Point } from "../types";
import { number } from "../utils";

export default function NeoCatalog({ params }: { params: URLSearchParams }) {
  const [search, setSearch] = useState(params.get("q") || "");
  const [filters, setFilters] = useState<Params>({
    q: params.get("q") || "",
    cluster: params.get("grupo") || "",
  });
  const [page, setPage] = useState(1),
    [sort, setSort] = useState("id"),
    [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<number | undefined>(
    params.has("id") ? Number(params.get("id")) : undefined,
  );
  useEffect(() => {
    if (params.has("id")) setSelected(Number(params.get("id")));
  }, [params.get("id")]);
  const rows = useApi<Page<Neo>>("/neo", {
    ...filters,
    page,
    page_size: 8,
    sort,
    desc,
  });
  const stats = useApi<NeoStats>("/neo/stats", { ...filters, bins: 10 });
  const scatter = useApi<{ points: Point[] }>("/neo/scatter", {
    ...filters,
    limit: 500,
  });
  const id = selected ?? rows.data?.items[0]?.id;
  function apply(next: Params) {
    setFilters({ q: filters.q, ...next });
    setPage(1);
    setSelected(undefined);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: search.trim() }));
    setPage(1);
    setSelected(undefined);
  }
  function order(key: string) {
    setSort(key);
    setDesc(key === sort ? !desc : false);
    setPage(1);
  }
  const s = stats.data;
  return (
    <>
      <State
        loading={stats.isPending}
        error={stats.error}
        retry={() => void stats.refetch()}
      >
        {s && (
          <>
            <div className="kpi-grid">
              <Kpi
                label="Objetos NEO únicos"
                value={number(s.kpis.objetos_unicos)}
                note={`${number(s.kpis.registros)} aproximaciones en la consulta`}
              />
              <Kpi
                label="Grupos presentes"
                value={s.kpis.grupos}
                groups
                note="Agrupamientos del modelo"
              />
              <Kpi
                label="Diámetro promedio"
                value={number(s.kpis.diametro_promedio_km, 3)}
                unit="km"
                note="Media de los registros filtrados"
              />
              <Kpi
                label="Velocidad promedio"
                value={number(s.kpis.velocidad_promedio_km_s, 1)}
                unit="km/s"
                note="Media de los registros filtrados"
              />
            </div>
            <div className="grid catalog-charts">
              <Card
                title="Objetos por grupo"
                subtitle="Reparto de las aproximaciones"
              >
                <Bars
                  counts={s.por_grupo}
                  groups
                  active={Number(filters.cluster)}
                  onGroup={(cluster) =>
                    apply({
                      ...filters,
                      cluster:
                        Number(filters.cluster) === cluster ? "" : cluster,
                    })
                  }
                />
              </Card>
              <Card
                title="Diámetros estimados"
                subtitle="Registros por intervalo, km (log)"
              >
                <Histogram
                  bins={s.hist_diametro_km}
                  label="Histograma de diámetros filtrados"
                  unit="km"
                />
              </Card>
              <Card
                title="Diámetro y velocidad"
                subtitle="Muestra de los resultados filtrados"
              >
                <State
                  loading={scatter.isPending}
                  error={scatter.error}
                  retry={() => void scatter.refetch()}
                >
                  <Scatter
                    compact
                    points={scatter.data?.points || []}
                    selected={id}
                    onSelect={setSelected}
                  />
                </State>
              </Card>
            </div>
          </>
        )}
      </State>
      <div className="grid two-one catalog-detail">
        <Card
          title="Catálogo de objetos NEO"
          subtitle="Selecciona una aproximación para consultar la ficha"
          tag="CATÁLOGO NEO"
        >
          <form className="toolbar" onSubmit={submit}>
            <input
              type="search"
              aria-label="Buscar NEO por nombre o identificador"
              placeholder="Buscar nombre o identificador…"
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Buscar</button>
            <span>{number(rows.data?.total)} registros</span>
          </form>
          <FiltersForm
            catalog="neo"
            onApply={apply}
            onReset={() => {
              setSearch("");
              apply({ q: "" });
            }}
          />
          <State
            loading={rows.isPending}
            error={rows.error}
            retry={() => void rows.refetch()}
          >
            {rows.data?.items.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        ["Objeto / ID", "name"],
                        ["Grupo", "cluster"],
                        ["Diám. (km)", "diameter_km"],
                        ["Vel. (km/s)", "velocity_km_s"],
                        ["Dist. (UA)", "miss_distance_au"],
                      ].map(([label, key]) => (
                        <th
                          key={key}
                          aria-sort={
                            sort === key
                              ? desc
                                ? "descending"
                                : "ascending"
                              : "none"
                          }
                        >
                          <button onClick={() => order(key)}>
                            {label}
                            {sort === key && (desc ? " ↓" : " ↑")}
                          </button>
                        </th>
                      ))}
                      <th>
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.data.items.map((n, index) => (
                      <tr
                        key={`${n.id}-${index}`}
                        className={n.id === id ? "selected" : ""}
                      >
                        <td>
                          <button
                            className="object-link"
                            onClick={() => setSelected(n.id)}
                          >
                            {n.name}
                            <small>{n.id}</small>
                          </button>
                        </td>
                        <td>
                          <Group id={n.cluster} />
                        </td>
                        <td>{number(n.diameter_km, 3)}</td>
                        <td>{number(n.velocity_km_s, 1)}</td>
                        <td>{number(n.miss_distance_au, 4)}</td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => setSelected(n.id)}
                          >
                            Ver ficha
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
          <Pagination
            page={page}
            total={rows.data?.total || 0}
            onChange={setPage}
          />
        </Card>
        <NeoDetail id={id} />
      </div>
    </>
  );
}
