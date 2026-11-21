import type { Bin } from "./types";
export const colors = ["#6cc7d1", "#b8a1dc", "#e08f86", "#a4c28c"];
export const groupColor = (group: number) =>
  colors[(group - 1) % colors.length] || colors[0];
export function number(value: number | null | undefined, digits = 0) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("es-MX", { maximumFractionDigits: digits }).format(
        value,
      );
}
export const types: Record<string, string> = {
  PAY: "Carga útil",
  "R/B": "Cuerpo de cohete",
  DEB: "Fragmento",
  UNK: "Desconocido",
};
export function histogram(values: number[], count = 10, log = false): Bin[] {
  const valid = values.filter((v) => Number.isFinite(v) && (!log || v > 0));
  if (!valid.length) return [];
  const transform = log ? Math.log10 : (v: number) => v;
  const inverse = log ? (v: number) => 10 ** v : (v: number) => v;
  const min = Math.min(...valid.map(transform)),
    max = Math.max(...valid.map(transform));
  const width = (max - min || 1) / count;
  const bins = Array.from({ length: count }, (_, i) => ({
    desde: inverse(min + i * width),
    hasta: inverse(min + (i + 1) * width),
    conteo: 0,
  }));
  valid.forEach(
    (v) =>
      bins[Math.min(count - 1, Math.floor((transform(v) - min) / width))]
        .conteo++,
  );
  return bins;
}
