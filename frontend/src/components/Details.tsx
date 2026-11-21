import { useApi } from "../api";
import { navigate } from "../router";
import type { Detail, Neo, Satellite } from "../types";
import { number, types } from "../utils";
import { Card, Empty, Group, State } from "./UI";

export function NeoDetail({
  id,
  onCompare,
}: {
  id?: number;
  onCompare?: (id: number) => void;
}) {
  const query = useApi<Detail<Neo>>(`/neo/${id}`, {}, id !== undefined);
  const n = query.data?.objeto;
  return (
    <Card
      title="Ficha del objeto"
      subtitle="Aproximación más cercana registrada"
      tag={id ? "SELECCIONADO" : undefined}
      className="detail-card"
    >
      <State
        loading={id !== undefined && query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        {n ? (
          <>
            <h3 className="object-name">{n.name}</h3>
            <p className="fineprint">
              ID {n.id} · {number(n.n_aproximaciones)} aproximaciones
            </p>
            <Group id={n.cluster} />
            <dl className="measurements">
              {[
                ["Diámetro estimado", n.diameter_km, "km"],
                ["Velocidad relativa", n.velocity_km_s, "km/s"],
                ["Distancia de aproximación", n.miss_distance_au, "UA"],
                ["Magnitud absoluta", n.absolute_magnitude, "mag"],
              ].map(([label, value, unit]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {number(Number(value), unit === "UA" ? 4 : 3)}{" "}
                    <small>{unit}</small>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="actions">
              <button
                className="primary"
                onClick={() => navigate("ia", { id: n.id })}
              >
                Ver similares
              </button>
              <button
                onClick={() =>
                  onCompare
                    ? onCompare(n.id)
                    : navigate("ia", { id: n.id, comparar: 1 })
                }
              >
                Comparar
              </button>
            </div>
            <p className="fineprint">Fuente: {query.data!.fuente}.</p>
            <p className="fineprint">
              La distancia de aproximación del dataset no es una medición de
              MOID.
            </p>
          </>
        ) : (
          <Empty text="Selecciona un objeto para consultar su ficha." />
        )}
      </State>
    </Card>
  );
}
export function SatelliteDetail({ id }: { id?: number }) {
  const query = useApi<Detail<Satellite>>(
    `/satcat/${id}`,
    {},
    id !== undefined,
  );
  const n = query.data?.objeto;
  return (
    <Card
      title="Objeto seleccionado"
      subtitle="Información del catálogo SATCAT"
      className="detail-card"
    >
      <State
        loading={id !== undefined && query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        {n ? (
          <>
            <h3 className="object-name">{n.OBJECT_NAME}</h3>
            <p className="fineprint">
              NORAD {n.NORAD_CAT_ID} · {n.OBJECT_ID}
            </p>
            <dl className="attributes">
              {[
                ["Tipo", types[n.OBJECT_TYPE] || n.OBJECT_TYPE],
                ["Régimen", n.REGIME],
                ["Inclinación", `${number(n.INCLINATION, 2)}°`],
                ["Apogeo", `${number(n.APOGEE)} km`],
                ["Perigeo", `${number(n.PERIGEE)} km`],
                ["Lanzamiento", n.LAUNCH_DATE || "Sin datos"],
                ["Propietario", n.OWNER],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() =>
                navigate("satcat", { id: n.NORAD_CAT_ID, q: n.NORAD_CAT_ID })
              }
            >
              Ver en el catálogo
            </button>
            <p className="fineprint">
              Fuente: {query.data!.fuente}. Los regímenes se derivan de los
              parámetros disponibles.
            </p>
          </>
        ) : (
          <Empty text="Selecciona un satélite para consultar sus parámetros." />
        )}
      </State>
    </Card>
  );
}
