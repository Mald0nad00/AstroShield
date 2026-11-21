import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useApi } from "../api";
import type { Neo, Satellite } from "../types";
import { Group } from "./UI";

interface Results {
  neo: Pick<Neo, "id" | "name" | "cluster">[];
  satcat: Pick<Satellite, "NORAD_CAT_ID" | "OBJECT_NAME">[];
}
export function ObjectSearch({
  label,
  onSelect,
  neoOnly = false,
  placeholder = "Buscar nombre o identificador…",
}: {
  label: string;
  onSelect: (catalog: "neo" | "satcat", id: number) => void;
  neoOnly?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(""),
    [debounced, setDebounced] = useState(""),
    [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null),
    id = useId();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const query = useApi<Results>(
    "/search",
    { q: debounced, limit: 6 },
    debounced.length > 0,
  );
  function select(catalog: "neo" | "satcat", id: number) {
    onSelect(catalog, id);
    setOpen(false);
    setText("");
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (debounced !== text.trim() || query.isFetching) return;
    if (query.data?.neo[0]) select("neo", query.data.neo[0].id);
    else if (!neoOnly && query.data?.satcat[0])
      select("satcat", query.data.satcat[0].NORAD_CAT_ID);
  }
  const visible = open && text.trim().length > 0;
  return (
    <div className="object-search" ref={ref}>
      <form onSubmit={submit}>
        <input
          aria-label={label}
          aria-expanded={visible}
          aria-controls={id}
          type="search"
          maxLength={100}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </form>
      {visible && (
        <div
          className="search-results"
          id={id}
          aria-label="Resultados de búsqueda"
        >
          <p className="fineprint">
            {query.isFetching || debounced !== text.trim()
              ? "Buscando…"
              : query.error
                ? "La búsqueda no está disponible."
                : "Resultados del catálogo"}
          </p>
          {debounced === text.trim() && query.data && (
            <>
              {query.data.neo.map((n) => (
                <button key={n.id} onClick={() => select("neo", n.id)}>
                  <span>
                    {n.name}
                    <small>NEO · {n.id}</small>
                  </span>
                  <Group id={n.cluster} />
                </button>
              ))}
              {!neoOnly &&
                query.data.satcat.map((n) => (
                  <button
                    key={n.NORAD_CAT_ID}
                    onClick={() => select("satcat", n.NORAD_CAT_ID)}
                  >
                    <span>
                      {n.OBJECT_NAME}
                      <small>SATCAT · {n.NORAD_CAT_ID}</small>
                    </span>
                  </button>
                ))}
              {!query.data.neo.length &&
                (neoOnly || !query.data.satcat.length) && (
                  <p className="empty">Sin coincidencias.</p>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
