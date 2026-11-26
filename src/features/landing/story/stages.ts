import { formatInt, LANDING, totalOrders } from "../data";

/** The five stages of the landing-page story. Captions are server-rendered; the 3D scene follows them. */
export const STAGES = [
  {
    key: "ask",
    label: "Question",
    title: "You ask in plain English.",
    body: "Type the question the way you would ask a colleague. There is no query language to learn and no dashboard to set up first.",
  },
  {
    key: "schema",
    label: "Schema",
    title: "It reads the schema first.",
    body: `Before writing any SQL, the agent reads every table it is allowed to use: columns, keys, sample values and the business rules written in column comments. The demo store has ${LANDING.tables.length} tables and ${formatInt(totalOrders)} orders.`,
  },
  {
    key: "sql",
    label: "SQL",
    title: "It writes one SELECT, and fixes it when Postgres says no.",
    body: "Each query is parsed and checked before it runs, then runs read-only with a 5-second limit and a 500-row cap. If the database returns an error, the agent reads it and tries again, up to three times.",
  },
  {
    key: "rows",
    label: "Rows",
    title: "The rows come from the database, not the model.",
    body: "The table you see is the server's own copy of the result. The model chooses which result to show; it never types a number into it.",
  },
  {
    key: "answer",
    label: "Answer",
    title: "You get the answer, the chart and the SQL.",
    body: "A short finding with the key figures, a chart that fits the result, and the exact query to check. Pin the chart to the dashboard or export the rows as CSV.",
  },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];
