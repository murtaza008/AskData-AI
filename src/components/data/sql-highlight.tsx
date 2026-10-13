import type { ReactNode } from "react";

const KEYWORDS = new Set(
  `SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER FULL CROSS LATERAL ON AND OR NOT GROUP BY ORDER LIMIT OFFSET AS
   DESC ASC HAVING IN NULL IS CASE WHEN THEN ELSE END DISTINCT WITH UNION ALL EXCEPT INTERSECT BETWEEN LIKE ILIKE
   OVER PARTITION FILTER INTERVAL DATE TIMESTAMP TRUE FALSE EXISTS USING NULLS FIRST LAST WITHIN`.split(/\s+/),
);

const FUNCTIONS = new Set(
  `SUM COUNT AVG MIN MAX ROUND COALESCE NULLIF TO_CHAR DATE_TRUNC DATE_PART EXTRACT NOW CAST LOWER UPPER LENGTH
   CONCAT ROW_NUMBER RANK DENSE_RANK LAG LEAD PERCENTILE_CONT STRING_AGG ARRAY_AGG GREATEST LEAST ABS AGE
   CURRENT_DATE CURRENT_TIMESTAMP`.split(/\s+/),
);

/** Lightweight SQL syntax colouring — enough to make a query scannable. */
export function highlightSql(sql: string): ReactNode[] {
  // Split into strings, line comments, numbers and words; everything else passes through.
  const tokens = sql.split(/('(?:[^']|'')*'|--[^\n]*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g);

  return tokens.map((token, index) => {
    if (!token) return null;
    if (token.startsWith("'")) return <span key={index} className="text-sql-string">{token}</span>;
    if (token.startsWith("--")) return <span key={index} className="text-muted-foreground italic">{token}</span>;
    if (/^\d/.test(token)) return <span key={index} className="text-sql-number">{token}</span>;

    const upper = token.toUpperCase();
    if (KEYWORDS.has(upper)) return <span key={index} className="font-medium text-sql-keyword">{token}</span>;
    if (FUNCTIONS.has(upper)) return <span key={index} className="text-sql-fn">{token}</span>;
    return token;
  });
}
