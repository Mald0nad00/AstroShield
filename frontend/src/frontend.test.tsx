import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryString, request } from "./api";
import { histogram } from "./utils";
import { FiltersForm } from "./components/Filters";
import { ObjectSearch } from "./components/Search";
import { Pagination } from "./components/UI";
import { Scatter } from "./components/Charts";
import NeoCatalog from "./pages/NeoCatalog";
import type { ReactNode } from "react";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  );
}
const neo = {
  id: 2099942,
  name: "99942 Apophis",
  cluster: 2,
  diameter_km: 0.654,
  velocity_km_s: 8.226,
  miss_distance_au: 0.0964,
  absolute_magnitude: 19.09,
  n_aproximaciones: 9,
};
const stats = {
  kpis: {
    registros: 9,
    objetos_unicos: 1,
    grupos: 1,
    diametro_promedio_km: 0.654,
    velocidad_promedio_km_s: 8.226,
  },
  hist_diametro_km: [],
  hist_velocidad_km_s: [],
  por_grupo: [{ valor: 2, conteo: 9 }],
};
const options = {
  neo: { cluster: [1, 2, 3, 4] },
  satcat: {
    object_type: { PAY: "Carga útil" },
    regime: ["LEO"],
    owner: ["US"],
  },
};
function mockCatalog() {
  return vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      const empty = url.searchParams.get("q") === "inexistente";
      const result =
        url.pathname === "/api/filtros"
          ? options
          : url.pathname === "/api/neo/stats"
            ? {
                ...stats,
                kpis: {
                  ...stats.kpis,
                  registros: empty ? 0 : 9,
                  objetos_unicos: empty ? 0 : 1,
                },
              }
            : url.pathname === "/api/neo/scatter"
              ? { points: empty ? [] : [neo] }
              : url.pathname === "/api/neo"
                ? {
                    total: empty ? 0 : 9,
                    page: Number(url.searchParams.get("page") || 1),
                    page_size: 8,
                    items: empty ? [] : [neo],
                  }
                : { objeto: neo, fuente: "Dataset de prueba", variables: {} };
      return new Response(JSON.stringify(result), { status: 200 });
    }),
  );
}

describe("Contrato con FastAPI", () => {
  it("codifica filtros repetidos, caracteres especiales, false y cero", () => {
    const p = new URLSearchParams(
      queryString({
        cluster: [1, 3],
        q: "R/B & <test>",
        in_orbit: false,
        min: 0,
        vacio: "",
        omitido: undefined,
      }),
    );
    expect(p.getAll("cluster")).toEqual(["1", "3"]);
    expect(p.get("q")).toBe("R/B & <test>");
    expect(p.get("in_orbit")).toBe("false");
    expect(p.get("min")).toBe("0");
    expect(p.has("vacio")).toBe(false);
  });
  it("muestra los errores de validación del backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ detail: [{ msg: "Valor fuera de rango" }] }),
            { status: 422 },
          ),
        ),
    );
    await expect(request("/neo")).rejects.toThrow("Valor fuera de rango");
  });
  it("maneja errores de servidor sin JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Bad gateway", { status: 502 })),
    );
    await expect(request("/neo")).rejects.toThrow(
      "Comprueba que la API esté en ejecución",
    );
  });
  it("transmite cancelación y el cuerpo JSON de inferencia", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"estado":"procesado"}'));
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    await request("/ia/inferencia", {}, controller.signal, { id: 2099942 });
    expect(fetch.mock.calls[0][1]).toMatchObject({
      signal: controller.signal,
      method: "POST",
      body: '{"id":2099942}',
    });
  });
});
describe("Datos y controles", () => {
  it("el histograma logarítmico conserva los conteos y descarta valores inválidos", () => {
    const bins = histogram([0.001, 0.01, 0.1, 1, 10, NaN, -1, 0], 5, true);
    expect(bins.reduce((sum, b) => sum + b.conteo, 0)).toBe(5);
    expect(histogram([], 5)).toEqual([]);
    expect(histogram([2, 2], 5).reduce((sum, b) => sum + b.conteo, 0)).toBe(2);
  });
  it("impide navegar más allá de la última página", () => {
    const change = vi.fn();
    mount(<Pagination page={2} total={9} onChange={change} />);
    expect(
      (
        screen.getByRole("button", {
          name: "Página siguiente",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(change).toHaveBeenCalledWith(1);
    expect(screen.getByText("Mostrando 9–9 de 9")).toBeTruthy();
  });
  it("rechaza intervalos invertidos antes de consultar la API y permite corregirlos", async () => {
    mockCatalog();
    const apply = vi.fn();
    mount(<FiltersForm catalog="neo" onApply={apply} onReset={vi.fn()} />);
    fireEvent.click(screen.getByText("Filtros avanzados"));
    fireEvent.change(screen.getByLabelText("Velocidad (km/s) mínimo"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Velocidad (km/s) máximo"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(screen.getByRole("alert").textContent).toContain("mínimo");
    expect(apply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Velocidad (km/s) máximo"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() =>
      expect(apply).toHaveBeenCalledWith(
        expect.objectContaining({ vel_min: "20", vel_max: "30" }),
      ),
    );
  });
  it("permite seleccionar puntos de la gráfica mediante teclado", () => {
    const select = vi.fn();
    mount(<Scatter points={[neo]} onSelect={select} />);
    fireEvent.keyDown(
      screen.getByRole("button", { name: `Ver ficha de ${neo.name}` }),
      { key: "Enter" },
    );
    expect(select).toHaveBeenCalledWith(2099942);
  });
});
describe("Flujos de consulta", () => {
  it("carga una ficha real del contrato y muestra el estado vacío al buscar", async () => {
    mockCatalog();
    mount(<NeoCatalog params={new URLSearchParams()} />);
    await screen.findByRole("heading", { name: neo.name });
    expect(screen.getByRole("cell", { name: "0.0964" })).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "inexistente" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText("Selecciona un objeto para consultar su ficha.");
    expect(
      (
        await screen.findAllByText(
          "No hay registros que coincidan con los filtros.",
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: neo.name })).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Página siguiente",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("busca en ambos catálogos y selecciona un resultado sin mezclar identificadores", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              neo: [neo],
              satcat: [{ NORAD_CAT_ID: 25544, OBJECT_NAME: "ISS (ZARYA)" }],
            }),
          ),
        ),
    );
    const select = vi.fn();
    mount(<ObjectSearch label="Búsqueda global" onSelect={select} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Apophis" },
    });
    const result = await screen.findByRole("button", { name: /ISS \(ZARYA\)/ });
    fireEvent.click(result);
    expect(select).toHaveBeenCalledWith("satcat", 25544);
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
  });
});
