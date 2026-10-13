/**
 * Types shared by the agent (server), the chat stream, and the UI.
 * This file is isomorphic — keep it free of server-only imports.
 */

export const CHART_TYPES = ["bar", "line", "pie", "table"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const VALUE_FORMATS = ["number", "currency", "percent"] as const;
export type ValueFormat = (typeof VALUE_FORMATS)[number];

/** How to draw a result set. Field names refer to result column names. */
export type ChartSpec = {
  type: ChartType;
  x: string;
  y: string;
  title: string;
  yFormat: ValueFormat;
};

export type ColumnKind = "number" | "date" | "boolean" | "text";

export type ResultColumn = {
  name: string;
  kind: ColumnKind;
};

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

/** Rows returned by a guarded query. */
export type QueryResult = {
  columns: ResultColumn[];
  rows: Row[];
  /** Number of rows returned (after the automatic limit). */
  rowCount: number;
  /** True when the automatic row limit cut the result short. */
  truncated: boolean;
  durationMs: number;
};

export type StepKind = "schema" | "query" | "fix" | "answer";
export type StepStatus = "running" | "ok" | "error";

/** One line in the live "what the agent is doing" trace. */
export type AgentStep = {
  id: string;
  kind: StepKind;
  status: StepStatus;
  label: string;
  /** Error text or other secondary detail. */
  detail?: string;
  /** SQL attempted in this step (query / fix steps only). */
  sql?: string;
  /** Milliseconds since the run started, at the time of the last update. */
  atMs: number;
};

export type AnswerStatus = "answered" | "unanswerable" | "error";

export type AgentAnswer = {
  status: AnswerStatus;
  /** 2–3 plain-English sentences. Key figures are wrapped in **double asterisks**. */
  insight: string;
  chart: ChartSpec | null;
  sql: string | null;
  columns: ResultColumn[];
  rows: Row[];
  rowCount: number;
  truncated: boolean;
  steps: AgentStep[];
  followUps: string[];
  durationMs: number;
  /** Catalog id of the model that produced the answer, e.g. `google:gemini-flash-latest`. */
  model: string;
};

/** Newline-delimited JSON events sent by POST /api/chat. */
export type ChatStreamEvent =
  | { type: "start"; conversationId: string }
  | { type: "step"; step: AgentStep }
  | { type: "answer"; turnId: string; answer: AgentAnswer }
  | { type: "error"; message: string };

/** A persisted question/answer pair, as returned by the conversations API. */
export type TurnDTO = {
  id: string;
  question: string;
  answer: AgentAnswer;
  createdAt: string;
};
