import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentStep, QueryResult } from "@/lib/agent/types";
import type { DataSource } from "@/server/sql/schema";

// The agent's database access is replaced so the loop can be tested in isolation.
const runGuardedQuery = vi.fn();
vi.mock("@/server/sql/execute", () => ({
  ANALYTICS_SCHEMA: "analytics",
  UPLOADS_SCHEMA: "uploads",
  QueryRejectedError: class QueryRejectedError extends Error {},
  QueryExecutionError: class QueryExecutionError extends Error {},
  runGuardedQuery: (...args: unknown[]) => runGuardedQuery(...args),
}));
vi.mock("@/server/db/prisma", () => ({ prisma: {} }));
vi.mock("@/server/db/pools", () => ({ analyticsPool: () => ({}), ownerPool: () => ({}) }));

const { runAgent } = await import("@/server/agent/run-agent");

const column = (name: string, dataType: string) => ({
  name,
  dataType,
  nullable: false,
  isPrimaryKey: false,
  references: null,
  comment: null,
  samples: [],
  samplesComplete: false,
  min: null,
  max: null,
});

const dataSource: DataSource = {
  tables: [
    {
      schema: "analytics",
      name: "orders",
      comment: "One row per order.",
      rowCount: 3,
      columns: [column("status", "text"), column("total_amount", "numeric")],
    },
  ],
  allowed: [{ schema: "analytics", name: "orders" }],
};

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

let callCounter = 0;

/** One scripted model turn that calls a single tool. */
function toolCall(toolName: string, input: unknown) {
  return {
    content: [
      { type: "tool-call" as const, toolCallId: `call-${++callCounter}`, toolName, input: JSON.stringify(input) },
    ],
    finishReason: { unified: "tool-calls" as const, raw: undefined },
    usage,
    warnings: [],
  };
}

const answer = (overrides: Record<string, unknown> = {}) =>
  toolCall("submitAnswer", {
    answerable: true,
    insight: "Completed orders brought in **$120**.",
    queryId: 1,
    chart: { type: "bar", x: "status", y: "revenue", title: "Revenue by status", yFormat: "currency" },
    followUps: ["What about refunds?"],
    ...overrides,
  });

const GOOD_SQL = "SELECT status, sum(total_amount) AS revenue FROM orders GROUP BY status";

const result: QueryResult = {
  columns: [
    { name: "status", kind: "text" },
    { name: "revenue", kind: "number" },
  ],
  rows: [
    { status: "completed", revenue: 120 },
    { status: "shipped", revenue: 30 },
  ],
  rowCount: 2,
  truncated: false,
  durationMs: 4,
};

async function run(script: ReturnType<typeof toolCall>[]) {
  const steps: AgentStep[] = [];
  const model = new MockLanguageModelV4({ doGenerate: script });
  const agentAnswer = await runAgent({
    question: "Revenue by status?",
    history: [],
    dataSource,
    modelOverride: { id: "test:mock", model },
    onStep: (step) => steps.push(step),
  });
  return { agentAnswer, steps, model };
}

describe("runAgent", () => {
  beforeEach(() => runGuardedQuery.mockReset());

  it("reads the schema, runs the query and returns rows from the database", async () => {
    runGuardedQuery.mockResolvedValueOnce(result);
    const { agentAnswer, steps } = await run([
            toolCall("runQuery", { sql: GOOD_SQL }),
      answer(),
    ]);

    expect(agentAnswer.status).toBe("answered");
    expect(agentAnswer.rows).toEqual(result.rows);
    expect(agentAnswer.sql).toBe(GOOD_SQL);
    expect(agentAnswer.chart).toMatchObject({ type: "bar", x: "status", y: "revenue" });
    expect(agentAnswer.followUps).toEqual(["What about refunds?"]);
    expect(agentAnswer.model).toBe("test:mock");
    // The query went through the guard with this request's allow-list.
    expect(runGuardedQuery).toHaveBeenCalledWith(GOOD_SQL, dataSource.allowed);
    // Live trace as streamed: schema (running, ok), query (running, ok), answer.
    expect(steps.map((step) => `${step.kind}:${step.status}`)).toEqual([
      "schema:running",
      "schema:ok",
      "query:running",
      "query:ok",
      "answer:ok",
    ]);
    expect(agentAnswer.steps.map((step) => step.label)).toEqual([
      "Read schema · 1 table",
      "Returned 2 rows · 4ms",
      "Wrote answer",
    ]);
  });

  it("repairs a failed query and records the correction in the trace", async () => {
    runGuardedQuery.mockRejectedValueOnce(new Error('column "qty" does not exist')).mockResolvedValueOnce(result);
    const { agentAnswer, model } = await run([
            toolCall("runQuery", { sql: "SELECT qty FROM orders" }),
      toolCall("runQuery", { sql: GOOD_SQL }),
      answer(),
    ]);

    expect(agentAnswer.status).toBe("answered");
    expect(agentAnswer.sql).toBe(GOOD_SQL);
    expect(agentAnswer.steps.map((step) => `${step.kind}:${step.status}`)).toEqual([
      "schema:ok",
      "query:error",
      "fix:ok",
      "answer:ok",
    ]);
    expect(agentAnswer.steps[1].detail).toContain("qty");
    expect(agentAnswer.steps[2].label).toMatch(/^Fixed query/);
    // The database error was fed back to the model so it could fix the SQL.
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain("does not exist");
  });

  it("gives the model the schema up front and requires a tool call on every step", async () => {
    runGuardedQuery.mockResolvedValueOnce(result);
    const { model } = await run([toolCall("runQuery", { sql: GOOD_SQL }), answer()]);
    const firstPrompt = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(firstPrompt).toContain("DATABASE SCHEMA");
    expect(firstPrompt).toContain("total_amount numeric");
    expect(model.doGenerateCalls[0].toolChoice).toEqual({ type: "required" });
  });

  it("still shows the data when the model fails after a successful query", async () => {
    runGuardedQuery.mockResolvedValueOnce(result);
    let calls = 0;
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        if (calls++ === 0) return toolCall("runQuery", { sql: GOOD_SQL });
        throw new Error("503 UNAVAILABLE: high demand");
      },
    });
    const agentAnswer = await runAgent({ question: "q", history: [], dataSource, modelOverride: { id: "test:mock", model } });
    expect(agentAnswer.status).toBe("answered");
    expect(agentAnswer.rows).toEqual(result.rows);
    expect(agentAnswer.sql).toBe(GOOD_SQL);
  });

  it("stops retrying after three failures and refuses to report unbacked numbers", async () => {
    runGuardedQuery
      .mockRejectedValueOnce(new Error("syntax error 1"))
      .mockRejectedValueOnce(new Error("syntax error 2"))
      .mockRejectedValueOnce(new Error("syntax error 3"));
    const { agentAnswer, model } = await run([
            toolCall("runQuery", { sql: "SELECT a FROM orders" }),
      toolCall("runQuery", { sql: "SELECT b FROM orders" }),
      toolCall("runQuery", { sql: "SELECT c FROM orders" }),
      // Even if the model claims success, there is no result to back it up.
      answer({ insight: "Revenue was **$999**." }),
    ]);

    expect(runGuardedQuery).toHaveBeenCalledTimes(3);
    expect(model.doGenerateCalls[3].toolChoice).toEqual({ type: "tool", toolName: "submitAnswer" });
    expect(agentAnswer.status).toBe("unanswerable");
    expect(agentAnswer.insight).not.toContain("999");
    expect(agentAnswer.rows).toEqual([]);
  });

  it("passes through an honest refusal without running a query", async () => {
    const { agentAnswer } = await run([
            answer({
        answerable: false,
        insight: "There is no marketing spend data.",
        queryId: null,
        chart: null,
        followUps: [],
      }),
    ]);
    expect(runGuardedQuery).not.toHaveBeenCalled();
    expect(agentAnswer.status).toBe("unanswerable");
    expect(agentAnswer.insight).toBe("There is no marketing spend data.");
    expect(agentAnswer.sql).toBeNull();
  });

  it("repairs a chart spec that names columns the result does not have", async () => {
    runGuardedQuery.mockResolvedValueOnce(result);
    const { agentAnswer } = await run([
            toolCall("runQuery", { sql: GOOD_SQL }),
      answer({ chart: { type: "pie", x: "nope", y: "also_nope", title: "T", yFormat: "currency" } }),
    ]);
    expect(agentAnswer.chart).toMatchObject({ type: "pie", x: "status", y: "revenue" });
  });

  it("turns a provider failure into a readable error answer", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("429 RESOURCE_EXHAUSTED: quota exceeded");
      },
    });
    const agentAnswer = await runAgent({
      question: "Anything?",
      history: [],
      dataSource,
      modelOverride: { id: "test:mock", model },
    });
    expect(agentAnswer.status).toBe("error");
    expect(agentAnswer.insight).toMatch(/rate limit/i);
  });
});
