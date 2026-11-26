import { formatMoney, LANDING, storyInsight } from "../data";

/**
 * Still picture of the story's last stage, drawn in SVG with theme colours.
 * Server-rendered: it is what visitors see before the 3D scene loads, with
 * JavaScript off, and with reduced motion.
 */
export function StoryStill({ className }: { className?: string }) {
  const products = LANDING.topProducts;
  const max = Math.max(...products.map((p) => p.revenue));
  const { first, leadPercent, month } = storyInsight();

  return (
    <svg
      viewBox="0 0 560 460"
      role="img"
      aria-label={`Bar chart: top 5 products by revenue in ${month}. ${products
        .map((p) => `${p.product} ${formatMoney(p.revenue)}`)
        .join(", ")}.`}
      className={className}
    >
      {/* answer card */}
      <rect x="20" y="16" width="520" height="92" rx="12" fill="var(--surface)" stroke="var(--border)" />
      <text x="40" y="46" fontSize="12" fontFamily="var(--font-mono)" fill="var(--fg-subtle)" letterSpacing="0.06em">
        ANSWER
      </text>
      <text x="40" y="72" fontSize="15" fill="var(--fg)" fontFamily="var(--font-sans)">
        {first.product} led {month} with {formatMoney(first.revenue)},
      </text>
      <text x="40" y="94" fontSize="15" fill="var(--fg)" fontFamily="var(--font-sans)">
        {leadPercent}% ahead of the next product.
      </text>

      {/* chart card */}
      <rect x="20" y="124" width="520" height="252" rx="12" fill="var(--surface)" stroke="var(--border)" />
      <text x="40" y="154" fontSize="12" fontFamily="var(--font-mono)" fill="var(--fg-subtle)" letterSpacing="0.06em">
        REVENUE BY PRODUCT · {month.toUpperCase()}
      </text>
      {products.map((p, i) => {
        const y = 176 + i * 38;
        const width = (p.revenue / max) * 250;
        return (
          <g key={p.product}>
            <text x="40" y={y + 17} fontSize="13" fill="var(--fg)" fontFamily="var(--font-sans)">
              {p.product.length > 24 ? `${p.product.slice(0, 23)}…` : p.product}
            </text>
            <rect x="214" y={y + 4} width={width} height="18" rx="4" fill="var(--chart-1)" />
            <text x={222 + width} y={y + 17} fontSize="12" fill="var(--fg-muted)" fontFamily="var(--font-mono)">
              {formatMoney(p.revenue)}
            </text>
          </g>
        );
      })}

      {/* sql chip */}
      <rect x="20" y="392" width="520" height="48" rx="10" fill="var(--sunken)" stroke="var(--border)" />
      <text x="40" y="421" fontSize="12.5" fontFamily="var(--font-mono)" fill="var(--fg-muted)">
        <tspan fill="var(--sql-keyword)">SELECT</tspan> p.name, <tspan fill="var(--sql-fn)">sum</tspan>(oi.quantity *
        oi.unit_price) … <tspan fill="var(--sql-keyword)">LIMIT</tspan> <tspan fill="var(--sql-number)">5</tspan>
      </text>
    </svg>
  );
}
