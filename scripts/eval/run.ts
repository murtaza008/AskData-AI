/**
 * npm run eval
 *
 * Runs every case in cases.ts through the real agent (real model, real
 * database, real safety pipeline) and scores the answers against gold SQL.
 * Use it to measure accuracy and to catch regressions after changing the
 * prompt, the tools or the model.
 *
 *   npm run eval                          all cases, default model
 *   npm run eval -- --only revenue        cases whose id contains "revenue"
 *   npm run eval -- --model openai:gpt-5.4-mini
 *   npm run eval -- --delay 8000          pause between cases (free-tier rate limits)
 *
 * Exits non-zero when accuracy is below --min (default 0.8), so it can gate CI.
 */
import "dotenv/config";
import type { AgentAnswer, Cell, Row } from "../../src/lib/agent/types";
import { runAgent } from "../../src/server/agent/run-agent";
import { analyticsPool } from "../../src/server/db/pools";
import { getAnalyticsTables } from "../../src/server/sql/schema";
import { EVAL_CASES, type EvalCase } from "./cases";

type Outcome = { id: string; pass: boolean; detail: string; ms: number; sql: string | null };

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Run a hand-written gold query (trusted) on the read-only connection. */
async function gold(sql: string): Promise<unknown[][]> {
  const client = await analyticsPool().connect();
  try {
    await client.query("SET search_path = analytics");
    const result = await client.query({ text: sql, rowMode: "array" });
    return result.rows as unknown[][];
  } finally {
    client.release();
  }
}

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

function close(actual: number, expected: number, tolerance: number): boolean {
  // Absolute slack for rounding to cents, relative slack for larger figures.
  return Math.abs(actual - expected) <= Math.max(0.01, Math.abs(expected) * tolerance);
}

function numbersIn(row: Row): number[] {
  return Object.values(row).filter((value): value is number => typeof value === "number");
}

/** The row whose text cells mention `label`. */
function rowFor(rows: Row[], label: string): Row | undefined {
  const wanted = normalize(label);
  return rows.find((row) => Object.values(row).some((value: Cell) => normalize(value) === wanted));
}

async function score(testCase: EvalCase, answer: AgentAnswer): Promise<{ pass: boolean; detail: string }> {
  if (testCase.check === "unanswerable") {
    return answer.status === "unanswerable"
      ? { pass: true, detail: "declined, as it should" }
      : { pass: false, detail: `expected a refusal but got status "${answer.status}"` };
  }

  if (answer.status !== "answered") {
    return { pass: false, detail: `agent did not answer (${answer.status}): ${answer.insight.slice(0, 120)}` };
  }

  const expected = await gold(testCase.gold);
  const tolerance = ("tolerance" in testCase ? testCase.tolerance : undefined) ?? 0.005;

  if (testCase.check === "scalar") {
    const target = Number(expected[0]?.[0]);
    const found = answer.rows.some((row) => numbersIn(row).some((value) => close(value, target, tolerance)));
    return found
      ? { pass: true, detail: `found ${target}` }
      : { pass: false, detail: `expected ${target}; got ${JSON.stringify(answer.rows.slice(0, 3))}` };
  }

  if (testCase.check === "top-labels") {
    const labels = expected.map((row) => normalize(row[0]));
    // Positions of the gold labels within the agent's rows must be increasing.
    const positions = labels.map((label) =>
      answer.rows.findIndex((row) => Object.values(row).some((value) => normalize(value) === label)),
    );
    const allPresent = positions.every((position) => position !== -1);
    const ordered = positions.every((position, index) => index === 0 || position > positions[index - 1]);
    return allPresent && ordered
      ? { pass: true, detail: `matched ${labels.join(" > ")}` }
      : { pass: false, detail: `expected order ${labels.join(" > ")}; found positions ${positions.join(",")}` };
  }

  // label-values
  const misses: string[] = [];
  for (const [label, value] of expected) {
    const row = rowFor(answer.rows, String(label));
    const target = Number(value);
    if (!row) misses.push(`${String(label)}: row missing`);
    else if (!numbersIn(row).some((actual) => close(actual, target, tolerance))) {
      misses.push(`${String(label)}: expected ${target}, got ${JSON.stringify(numbersIn(row))}`);
    }
  }
  return misses.length === 0
    ? { pass: true, detail: `all ${expected.length} labels match` }
    : { pass: false, detail: misses.slice(0, 3).join("; ") };
}

async function main() {
  const only = option("only");
  const modelId = option("model");
  const delay = Number(option("delay") ?? 4000);
  const minimum = Number(option("min") ?? 0.8);

  const cases = EVAL_CASES.filter((testCase) => !only || testCase.id.includes(only));
  if (cases.length === 0) throw new Error(`No eval cases match "${only}".`);

  const tables = await getAnalyticsTables();
  const dataSource = { tables, allowed: tables.map((table) => ({ schema: table.schema, name: table.name })) };

  console.log(`\nAskData eval · ${cases.length} cases · model: ${modelId ?? "default"}\n`);
  const outcomes: Outcome[] = [];

  for (const [index, testCase] of cases.entries()) {
    if (index > 0 && delay > 0) await sleep(delay);

    const started = Date.now();
    const answer = await runAgent({ question: testCase.question, history: [], dataSource, modelId });
    const result =
      answer.status === "error"
        ? { pass: false, detail: `agent error: ${answer.insight}` }
        : await score(testCase, answer);

    const outcome: Outcome = { id: testCase.id, ...result, ms: Date.now() - started, sql: answer.sql };
    outcomes.push(outcome);
    console.log(
      `${outcome.pass ? "✔" : "✖"} ${testCase.id.padEnd(26)} ${(outcome.ms / 1000).toFixed(1).padStart(5)}s  ${outcome.detail}`,
    );
    if (!outcome.pass && outcome.sql) console.log(`    SQL: ${outcome.sql.replace(/\s+/g, " ").slice(0, 300)}`);
  }

  const passed = outcomes.filter((outcome) => outcome.pass).length;
  const accuracy = passed / outcomes.length;
  const average = outcomes.reduce((sum, outcome) => sum + outcome.ms, 0) / outcomes.length / 1000;

  console.log(`\nAccuracy: ${passed}/${outcomes.length} (${(accuracy * 100).toFixed(0)}%) · avg ${average.toFixed(1)}s per question`);
  await analyticsPool().end();
  process.exit(accuracy >= minimum ? 0 : 1);
}

main().catch((error) => {
  console.error("\n✖ eval failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
