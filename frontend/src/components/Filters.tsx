import { useState, type FormEvent } from "react";
import type { Filters, Params } from "../types";
import { useApi } from "../api";
import { Field } from "./UI";

export function FiltersForm({
  catalog,
  onApply,
  onReset,
}: {
  catalog: "neo" | "satcat";
  onApply: (params: Params) => void;
  onReset: () => void;
}) {
  const [error, setError] = useState("");
  const options = useApi<Filters>("/filtros");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;
    for (const [lo, hi] of [
      ["diam_min", "diam_max"],
      ["vel_min", "vel_max"],
      ["moid_min", "moid_max"],
    ]) {
      if (values[lo] && values[hi] && Number(values[lo]) > Number(values[hi])) {
        setError("El valor mínimo debe ser menor o igual al máximo.");
        return;
      }
    }
    setError("");
    onApply(values);
  }
  return (
    <details className="filter-details">
      <summary>Filtros avanzados</summary>
      <form
        onSubmit={submit}
        onReset={() => {
          setError("");
          onReset();
        }}
      >
        <div className="filter-grid">
          {catalog === "neo" ? (
            <>
              <Field label="Grupo">
                <select name="cluster">
                  <option value="">Todos los grupos</option>
                  {(options.data?.neo.cluster || [1, 2, 3, 4]).map((g) => (
                    <option key={g} value={g}>
                      Grupo {g}
                    </option>
                  ))}
                </select>
              </Field>
              {[
                ["Diámetro (km)", "diam"],
                ["Velocidad (km/s)", "vel"],
                ["Distancia de aproximación (UA)", "moid"],
              ].map(([label, key]) => (
                <fieldset key={key}>
                  <legend>{label}</legend>
                  <div className="range-inputs">
                    <input
                      aria-label={`${label} mínimo`}
                      name={`${key}_min`}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Mínimo"
                    />
                    <input
                      aria-label={`${label} máximo`}
                      name={`${key}_max`}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Máximo"
                    />
                  </div>
                </fieldset>
              ))}
            </>
          ) : (
            <>
              <Field label="Tipo de objeto">
                <select name="object_type">
                  <option value="">Todos los tipos</option>
                  {Object.entries(
                    options.data?.satcat.object_type || {
                      PAY: "Carga útil",
                      "R/B": "Cuerpo de cohete",
                      DEB: "Fragmento",
                      UNK: "Desconocido",
                    },
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Régimen orbital">
                <select name="regime">
                  <option value="">Todos los regímenes</option>
                  {(
                    options.data?.satcat.regime || ["LEO", "MEO", "GEO", "HEO"]
                  ).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Propietario">
                <select name="owner">
                  <option value="">Todos los propietarios</option>
                  {options.data?.satcat.owner.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Estado orbital">
                <select name="in_orbit">
                  <option value="">Todos los registros</option>
                  <option value="true">Sin reingreso registrado</option>
                  <option value="false">Con reingreso registrado</option>
                </select>
              </Field>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="primary" type="submit">
            Aplicar filtros
          </button>
          <button type="reset">Restablecer filtros</button>
        </div>
      </form>
    </details>
  );
}
