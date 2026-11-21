import { useEffect, useState, type FormEvent } from "react";
import { useApi } from "../api";
import { Bars, Histogram, SatScatter } from "../components/Charts";
import { SatelliteDetail } from "../components/Details";
import { FiltersForm } from "../components/Filters";
import { Card, Empty, Kpi, Pagination, State } from "../components/UI";
import type { Page, Params, Satellite, SatStats } from "../types";
import { number, types } from "../utils";

export default function SatCatalog({ params }: { params: URLSearchParams }) {
  const [search, setSearch] = useState(params.get("q") || "");
  const [filters, setFilters] = useState<Params>({ q: params.get("q") || "" });
  const [page, setPage] = useState(1),
    [sort, setSort] = useState("NORAD_CAT_ID"),
    [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<number | undefined>(
    params.has("id") ? Number(params.get("id")) : undefined,
  );
  useEffect(() => {
    if (params.has("id")) setSelected(Number(params.get("id")));
  }, [params.get("id")]);
  const rows = useApi<Page<Satellite>>("/satcat", {
    ...filters,
    page,
    page_size: 8,
    sort,
    desc,
  });
  const stats = useApi<SatStats>("/satcat/stats", { ...filters, bins: 10 });
  const sample = useApi<Page<Satellite>>("/satcat", {
    ...filters,
    page_size: 300,
  });
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
                label="Objetos en el catálogo"
                value={number(s.kpis.registros)}
                note="Registros de la consulta"
              />
              <Kpi
                label="Cargas útiles"
                value={number(s.kpis.cargas_utiles)}
                note="Tipo PAY en SATCAT"
              />
              <Kpi
                label="Sin reingreso registrado"
                value={number(s.kpis.en_orbita)}
                note="Según la fecha de reingreso disponible"
              />
              <Kpi
                label="Propietarios"
                value={number(s.kpis.propietarios)}
                note="Países y organizaciones"
              />
            </div>
            <div className="grid catalog-charts">
              <Card
                title="Tipos de objeto"
                subtitle="Registros por clasificación"
              >
                <Bars counts={s.por_tipo} />
              </Card>
              <Card
                title="Lanzamientos por año"
                subtitle="Registros con fecha disponible"
              >
                <Histogram
                  bins={s.lanzamientos_por_anio.map((c) => ({
                    desde: Number(c.valor),
                    hasta: Number(c.valor) + 1,
                    conteo: c.conteo,
                  }))}
                  color="#a4c28c"
                  label="Objetos por año de lanzamiento"
                />
              </Card>
              <Card
                title="Apogeo y perigeo"
                subtitle={`Muestra de ${number(sample.data?.items.length)} registros · color por régimen`}
              >
                <State
                  loading={sample.isPending}
                  error={sample.error}
                  retry={() => void sample.refetch()}
                >
                  <SatScatter
                    items={sample.data?.items || []}
                    onSelect={setSelected}
                  />
                </State>
                <div className="legend">
                  <span>LEO · MEO · GEO · HEO</span>
                </div>
              </Card>
            </div>
          </>
        )}
      </State>
      <div className={selected ? "grid two-one catalog-detail" : ""}>
        <Card
          title="Catálogo de objetos artificiales"
          subtitle="Selecciona un registro para ver su detalle"
          tag="SATCAT"
        >
          <form className="toolbar" onSubmit={submit}>
            <input
              type="search"
              aria-label="Buscar satélite por nombre o identificador"
              placeholder="Nombre, NORAD o identificador internacional…"
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Buscar</button>
            <span>{number(rows.data?.total)} registros</span>
          </form>
          <FiltersForm
            catalog="satcat"
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
                        ["Objeto / NORAD", "OBJECT_NAME"],
                        ["Tipo", ""],
                        ["Órbita", ""],
                        ["Inclinación", "INCLINATION"],
                        ["Apogeo (km)", "APOGEE"],
                        ["Perigeo (km)", "PERIGEE"],
                        ["Lanzamiento", "LAUNCH_DATE"],
                        ["Propietario", ""],
                      ].map(([label, key]) => (
                        <th
                          key={label}
                          aria-sort={
                            key && sort === key
                              ? desc
                                ? "descending"
                                : "ascending"
                              : undefined
                          }
                        >
                          {key ? (
                            <button onClick={() => order(key)}>
                              {label}
                              {sort === key && (desc ? " ↓" : " ↑")}
                            </button>
                          ) : (
                            label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.data.items.map((n) => (
                      <tr
                        key={n.NORAD_CAT_ID}
                        className={
                          selected === n.NORAD_CAT_ID ? "selected" : ""
                        }
                      >
                        <td>
                          <button
                            className="object-link"
                            onClick={() => setSelected(n.NORAD_CAT_ID)}
                          >
                            {n.OBJECT_NAME}
                            <small>{n.NORAD_CAT_ID}</small>
                          </button>
                        </td>
                        <td>{types[n.OBJECT_TYPE] || n.OBJECT_TYPE}</td>
                        <td>{n.REGIME}</td>
                        <td>{number(n.INCLINATION, 1)}°</td>
                        <td>{number(n.APOGEE)}</td>
                        <td>{number(n.PERIGEE)}</td>
                        <td>{n.LAUNCH_YEAR || "—"}</td>
                        <td>{n.OWNER}</td>
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
        {selected && (
          <div className="stack">
            <SatelliteDetail id={selected} />
            <button onClick={() => setSelected(undefined)}>Cerrar ficha</button>
          </div>
        )}
      </div>
    </>
  );
}
