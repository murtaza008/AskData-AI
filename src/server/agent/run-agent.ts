import "server-only";
import { generateText, isStepCount, type LanguageModel, type ModelMessage, tool } from "ai";
import { z } from "zod";
import { resolveChartSpec } from "@/lib/agent/chart";
import { CHART_TYPES, VALUE_FORMATS, type AgentAnswer, type AgentStep, type QueryResult } from "@/lib/agent/types";
import { describeModelError, isOverloadError, resolveFallbackModel, resolveModel } from "@/server/ai/models";
import { env } from "@/server/env";
import { QueryRejectedError, runGuardedQuery } from "@/server/sql/execute";
import { type DataSource, renderSchemaForModel } from "@/server/sql/schema";
import { buildSystemPrompt, MAX_AGENT_STEPS, MAX_QUERY_FAILURES, ROWS_SHOWN_TO_MODEL, RUN_BUDGET_MS } from "./prompt";

/**
 * The AskData agent: a multi-step tool-calling loop on the Vercel AI SDK.
 *
 *   getSchema ──▶ runQuery ──▶ (error? fix and runQuery again, ≤3×) ──▶ submitAnswer
 *
 * Design notes:
 * - The schema inspection always happens and always comes first, so the server
 *   performs it itself and hands the result to the model up front. Asking the
 *   model to "decide" to call getSchema would cost a full model round-trip
 *   (several seconds) for a decision with only one right answer. The tool
 *   stays available in case the model wants to look again.
 * - The model is forced to call a tool on every step (`toolChoice: "required"`)
 *   and can only finish through `submitAnswer`, whose input is a zod-validated
 *   structured answer. That is more reliable across providers than asking for
 *   JSON in free text.
 * - The rows the user sees come from OUR copy of the query result, selected by
 *   id — the model never gets to retype data, so the table and chart cannot
 *   contain invented numbers.
 * - Every tool reports progress through `onStep`, which the API route streams
 *   to the browser as it happens.
 */

export type HistoryTurn = { question: string; insight: string; sql: string | null };

export type RunAgentInput = {
  question: string;
  /** Earlier turns of the same conversation, oldest first. */
  history: HistoryTurn[];
  dataSource: DataSource;
  /** Catalog id from the model picker; falls back to the default model. */
  modelId?: string | null;
  /** Inject a model directly instead of resolving `modelId` (used by tests). */
  modelOverride?: { id: string; model: LanguageModel };
  onStep?: (step: AgentStep) => void;
  abortSignal?: AbortSignal;
};

const answerSchema = z.object({
  answerable: z
    .boolean()
    .describe("false when the database cannot answer the question (missing data, or not a data question)."),
  insight: z
    .string()
    .describe(
      "2–3 plain-English sentences with real figures from the result; key figures wrapped in **double asterisks**. If not answerable, explain what is missing.",
    ),
  queryId: z
    .number()
    .int()
    .nullable()
    .describe("id of the runQuery result to present to the user. null when not answerable."),
  chart: z
    .object({
      type: z.enum(CHART_TYPES),
      x: z.string().describe("Result column for the category / time axis."),
      y: z.string().describe("Numeric result column to plot."),
      title: z.string().describe("Short chart title, e.g. 'Revenue by month'."),
      yFormat: z.enum(VALUE_FORMATS).describe("How to format y values."),
    })
    .nullable()
    .describe("How to visualise the chosen result. null when not answerable."),
  followUps: z.array(z.string()).max(3).describe("Up to 3 follow-up questions the data can answer."),
});

/**
 * Text-to-SQL is a tool-use task, not a deep-reasoning one: a low thinking
 * level makes Gemini several times faster with no loss on this workload.
 * Options for other providers are ignored by the one in use.
 */
const PROVIDER_OPTIONS = {
  google: { thinkingConfig: { thinkingLevel: "low" } },
} as const;

const QUERY_DESCRIPTION =
  "Run ONE read-only PostgreSQL SELECT against the database and get the rows back. " +
  "Returns { queryId, columns, rowCount, truncated, rows } on success or { error } on failure. " +
  "On error, fix the SQL and call this again.";

/** Fold previous turns into the prompt so follow-up questions have context. */
function historyMessages(history: HistoryTurn[]): ModelMessage[] {
  return history.slice(-5).flatMap((turn): ModelMessage[] => [
    { role: "user", content: turn.question },
    {
      role: "assistant",
      content: turn.sql ? `${turn.insight}\n\n(SQL used: ${turn.sql})` : turn.insight,
    },
  ]);
}

export async function runAgent(input: RunAgentInput): Promise<AgentAnswer> {
  const started = Date.now();
  const steps: AgentStep[] = [];
  const results: { sql: string; result: QueryResult }[] = [];
  let failures = 0;
  let lastQueryFailed = false;

  /** Insert or update a step in the trace and notify the listener. */
  const report = (step: Omit<AgentStep, "atMs">) => {
    const full: AgentStep = { ...step, atMs: Date.now() - started };
    const index = steps.findIndex((existing) => existing.id === full.id);
    if (index === -1) steps.push(full);
    else steps[index] = full;
    input.onStep?.(full);
  };

  const finish = (answer: Omit<AgentAnswer, "steps" | "durationMs" | "model">, model: string): AgentAnswer => ({
    ...answer,
    // A step still marked "running" means the run was cut short mid-step.
    steps: steps.map((step) => (step.status === "running" ? { ...step, status: "error" as const } : step)),
    durationMs: Date.now() - started,
    model,
  });

  const empty = { chart: null, sql: null, columns: [], rows: [], rowCount: 0, truncated: false, followUps: [] };

  let info: { id: string };
  let model: LanguageModel;
  try {
    if (input.modelOverride) {
      info = { id: input.modelOverride.id };
      model = input.modelOverride.model;
    } else {
      ({ info, model } = resolveModel(input.modelId));
    }
  } catch (error) {
    return finish({ ...empty, status: "error", insight: describeModelError(error) }, "none");
  }

  /** Read the schema, recording it as a step in the trace. */
  const readSchema = () => {
    const id = `schema-${steps.length}`;
    report({ id, kind: "schema", status: "running", label: "Reading schema…" });
    const tables = input.dataSource.tables;
    report({
      id,
      kind: "schema",
      status: "ok",
      label: `Read schema · ${tables.length} ${tables.length === 1 ? "table" : "tables"}`,
    });
    return renderSchemaForModel(tables);
  };

  const tools = {
    getSchema: tool({
      description:
        "Inspect the database again: tables, columns and types, primary/foreign keys, notes on business rules, sample values and value ranges. The schema is already in your instructions; call this only to re-read it.",
      inputSchema: z.object({}),
      execute: async () => readSchema(),
    }),

    runQuery: tool({
      description: QUERY_DESCRIPTION,
      inputSchema: z.object({
        sql: z.string().describe("A single PostgreSQL SELECT statement."),
      }),
      execute: async ({ sql }) => {
        if (failures >= MAX_QUERY_FAILURES) {
          return { error: "Retry limit reached. Do not run more queries; call submitAnswer now." };
        }

        const id = `query-${steps.length}`;
        const kind = lastQueryFailed ? ("fix" as const) : ("query" as const);
        report({ id, kind, status: "running", sql, label: lastQueryFailed ? "Fixing query…" : "Running query…" });

        try {
          const result = await runGuardedQuery(sql, input.dataSource.allowed);
          results.push({ sql, result });
          const summary = `${result.rowCount} ${result.rowCount === 1 ? "row" : "rows"} · ${result.durationMs}ms`;
          report({
            id,
            kind,
            status: "ok",
            sql,
            label: lastQueryFailed ? `Fixed query · returned ${summary}` : `Returned ${summary}`,
          });
          lastQueryFailed = false;

          return {
            queryId: results.length,
            columns: result.columns.map((column) => column.name),
            rowCount: result.rowCount,
            truncated: result.truncated,
            rows: result.rows.slice(0, ROWS_SHOWN_TO_MODEL),
            ...(result.rowCount > ROWS_SHOWN_TO_MODEL
              ? { note: `Only the first ${ROWS_SHOWN_TO_MODEL} rows are shown to you; the user sees all ${result.rowCount}.` }
              : {}),
          };
        } catch (error) {
          failures += 1;
          lastQueryFailed = true;
          const message = error instanceof Error ? error.message : String(error);
          report({
            id,
            kind,
            status: "error",
            sql,
            label: error instanceof QueryRejectedError ? "Query blocked by safety check" : "Query failed",
            detail: message,
          });
          const attemptsLeft = MAX_QUERY_FAILURES - failures;
          return {
            error: message,
            attemptsLeft,
            ...(attemptsLeft === 0 ? { instruction: "No attempts left. Call submitAnswer with answerable=false." } : {}),
          };
        }
      },
    }),

    // No `execute`: calling this tool ends the loop, and its validated input is the answer.
    submitAnswer: tool({
      description: "Finish the turn with the final answer. Call this exactly once, after your queries.",
      inputSchema: answerSchema,
    }),
  };

  const instructions = buildSystemPrompt(env.queryRowLimit, readSchema());
  const generate = (languageModel: LanguageModel) =>
    generateText({
      model: languageModel,
      instructions,
      providerOptions: PROVIDER_OPTIONS,
      messages: [...historyMessages(input.history), { role: "user", content: input.question }],
      tools,
      toolChoice: "required",
      stopWhen: isStepCount(MAX_AGENT_STEPS),
      maxRetries: 1,
      // Whatever is left of the run's time budget.
      timeout: { totalMs: Math.max(1000, RUN_BUDGET_MS - (Date.now() - started)) },
      abortSignal: input.abortSignal,
      prepareStep: () => {
        // Once repairs are exhausted, force the finish.
        if (failures >= MAX_QUERY_FAILURES) return { toolChoice: { type: "tool", toolName: "submitAnswer" } };
        return {};
      },
    });

  try {
    let result: Awaited<ReturnType<typeof generate>>;
    try {
      result = await generate(model);
    } catch (error) {
      // Free-tier models are regularly "overloaded" for a few seconds. If that
      // happens before any query ran, start over once on the provider's lighter model.
      const fallback = input.modelOverride ? null : resolveFallbackModel(info.id);
      const timeLeft = RUN_BUDGET_MS - (Date.now() - started);
      if (!fallback || !isOverloadError(error) || results.length > 0 || timeLeft < 15_000) throw error;
      console.warn(`[agent] ${info.id} is overloaded; retrying with ${fallback.info.id}`);
      info = fallback.info;
      result = await generate(fallback.model);
    }

    const submitted = result.staticToolCalls.find((call) => call.toolName === "submitAnswer")?.input;

    if (!submitted) {
      // The step budget ran out before the model called submitAnswer.
      const last = results.at(-1);
      if (!last) {
        return finish(
          { ...empty, status: "error", insight: "I couldn't work out an answer within the step limit. Try rephrasing the question." },
          info.id,
        );
      }
      return finish(
        {
          status: "answered",
          insight: "Here is the data I found, though I ran out of steps before writing a summary.",
          chart: resolveChartSpec(null, last.result.columns, last.result.rows),
          sql: last.sql,
          columns: last.result.columns,
          rows: last.result.rows,
          rowCount: last.result.rowCount,
          truncated: last.result.truncated,
          followUps: [],
        },
        info.id,
      );
    }

    const chosen = submitted.queryId ? results[submitted.queryId - 1] : undefined;
    const presented = submitted.answerable ? (chosen ?? results.at(-1)) : undefined;
    const followUps = submitted.followUps.map((question) => question.trim()).filter(Boolean);

    if (!presented) {
      // Either the model said the data can't answer this, or it claimed an
      // answer without a single successful query — which we refuse to show.
      const insight = submitted.answerable
        ? "I wasn't able to run a query that answers this, so I have no figures to report."
        : submitted.insight;
      return finish({ ...empty, status: "unanswerable", insight, followUps }, info.id);
    }

    report({ id: "answer", kind: "answer", status: "ok", label: "Wrote answer" });
    return finish(
      {
        status: "answered",
        insight: submitted.insight.trim(),
        chart: resolveChartSpec(submitted.chart, presented.result.columns, presented.result.rows),
        sql: presented.sql,
        columns: presented.result.columns,
        rows: presented.result.rows,
        rowCount: presented.result.rowCount,
        truncated: presented.result.truncated,
        followUps,
      },
      info.id,
    );
  } catch (error) {
    console.error("[agent]", error instanceof Error ? error.message : error);
    // The model failed or ran out of time AFTER a query succeeded: the data is
    // real and worth showing, even without a written summary.
    const last = results.at(-1);
    if (last && !input.abortSignal?.aborted) {
      return finish(
        {
          status: "answered",
          insight: "Here is the data for your question. The AI model was too slow to write a summary this time.",
          chart: resolveChartSpec(null, last.result.columns, last.result.rows),
          sql: last.sql,
          columns: last.result.columns,
          rows: last.result.rows,
          rowCount: last.result.rowCount,
          truncated: last.result.truncated,
          followUps: [],
        },
        info.id,
      );
    }
    return finish({ ...empty, status: "error", insight: describeModelError(error) }, info.id);
  }
}
