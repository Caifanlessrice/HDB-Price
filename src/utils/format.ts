export function formatPrice(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-SG");
}

export function formatPriceShort(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + Math.round(n).toString();
}

export function titleCase(s: string): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
