export function formatPrice(amount?: number | null) {
  const n = Number(amount ?? 0);
  return `TZS ${n.toLocaleString()}`;
}

export default formatPrice;
