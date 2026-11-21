import { useEffect, useState } from "react";
import { useApi } from "./api";
import { ObjectSearch } from "./components/Search";
import { Notice } from "./components/UI";
import { navigate, useRoute, type Route } from "./router";
import Home from "./pages/Home";
import NeoCatalog from "./pages/NeoCatalog";
import Analysis from "./pages/Analysis";
import SatCatalog from "./pages/SatCatalog";
import Orbital from "./pages/Orbital";
import { number } from "./utils";

const titles: Record<Route, [string, string]> = {
  inicio: [
    "Inicio",
    "Estado del catálogo NEO y de los grupos detectados por la IA.",
  ],
  neo: [
    "Catálogo NEO",
    "Busca, filtra y consulta los objetos cercanos a la Tierra.",
  ],
  ia: [
    "Análisis IA",
    "Agrupamiento con K-Means y objetos similares por distancia.",
  ],
  satcat: [
    "Satélites SATCAT",
    "Explora objetos artificiales y sus parámetros orbitales disponibles.",
  ],
  orbital: [
    "Explorador orbital",
    "Una representación conceptual del entorno terrestre y de los objetos NEO.",
  ],
};
export default function App() {
  const { route, params } = useRoute();
  const [menu, setMenu] = useState(false);
  const health = useApi<{ status: string; neo: number; satcat: number }>(
    "/health",
  );
  useEffect(() => {
    document.title = `${titles[route][0]} · AstroShield`;
    setMenu(false);
    window.scrollTo(0, 0);
  }, [route]);
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/inicio">
            <img src="/assets/logo.svg" width="26" height="26" alt="" />
            <span>AstroShield</span>
          </a>
          <button
            className="menu-button"
            aria-label="Mostrar navegación"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <nav
            className={menu ? "main-nav open" : "main-nav"}
            aria-label="Navegación principal"
          >
            {(Object.keys(titles) as Route[]).map((r) => (
              <a
                key={r}
                href={`#/${r}`}
                aria-current={r === route ? "page" : undefined}
              >
                {r === "satcat" ? "Satélites SATCAT" : titles[r][0]}
              </a>
            ))}
          </nav>
          <div className="global-search">
            <ObjectSearch
              label="Buscar en NEO y SATCAT"
              placeholder="Buscar identificador…"
              onSelect={(catalog, id) => navigate(catalog, { id, q: id })}
            />
          </div>
          <span
            className={`badge connection ${health.error ? "offline" : ""}`}
            role="status"
          >
            <i />
            {health.isPending
              ? "CONECTANDO"
              : health.error
                ? "API SIN CONEXIÓN"
                : "DATOS DEL CATÁLOGO"}
          </span>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <div className="page-title">
          <div>
            <h1>{titles[route][0]}</h1>
            <p>{titles[route][1]}</p>
          </div>
          <span>
            {route === "orbital"
              ? "Vista conceptual · posiciones ilustrativas"
              : health.data
                ? `${number(route === "satcat" ? health.data.satcat : health.data.neo)} registros · ${route === "satcat" ? "SATCAT" : "NEO · K-Means"}`
                : "Consulta de catálogos espaciales"}
          </span>
        </div>
        <Notice />
        <div className="page-content" key={`${route}:${params.get("q") || ""}`}>
          {route === "inicio" ? (
            <Home />
          ) : route === "neo" ? (
            <NeoCatalog params={params} />
          ) : route === "ia" ? (
            <Analysis params={params} />
          ) : route === "satcat" ? (
            <SatCatalog params={params} />
          ) : (
            <Orbital />
          )}
        </div>
        <footer>
          AstroShield es una herramienta exploratoria y educativa. No predice
          impactos ni emite alertas; los grupos son estadísticos, no
          clasificaciones oficiales.
        </footer>
      </main>
    </>
  );
}
