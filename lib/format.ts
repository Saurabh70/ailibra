/**
 * Indian-rupee formatter using lakh / crore notation.
 *   1,500           → ₹1.5K
 *   1,50,000        → ₹1.5L
 *   1,50,00,000     → ₹1.5Cr
 *
 * Used everywhere we display deal values, pipeline totals, etc.
 */
export function formatINR(n: number, opts?: { compact?: boolean }): string {
  const compact = opts?.compact ?? true;
  if (!Number.isFinite(n) || n === 0) return "₹0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (compact) {
    if (abs >= 10_000_000) return `${sign}₹${stripTrailing((abs / 10_000_000).toFixed(2))}Cr`;
    if (abs >= 100_000) return `${sign}₹${stripTrailing((abs / 100_000).toFixed(1))}L`;
    if (abs >= 1_000) return `${sign}₹${stripTrailing((abs / 1_000).toFixed(0))}K`;
    return `${sign}₹${abs}`;
  }
  // Indian grouping: 12,34,56,789
  const s = abs.toFixed(0);
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `${sign}₹${grouped}`;
}

function stripTrailing(s: string): string {
  return s.replace(/\.?0+$/, "");
}
