"use client";

import { useEffect, useRef } from "react";
import { formatInt, formatMoney, LANDING, STORY_QUESTION, STORY_SQL, storyInsight } from "../data";

/*
 * The landing page's 3D story, in CSS 3D (perspective + preserve-3d), no WebGL.
 * One continuous set of objects (the question, the demo store's five tables,
 * the SQL, and the five result rows that become the chart's bars) moves
 * through five stages tied to the story section's scroll position. A
 * requestAnimationFrame loop outside React writes the transforms; it stops
 * while the section is off screen. Loaded lazily; the SVG still shows first.
 */

type Pose = [x: number, y: number, z: number, ry: number, rx: number, s: number, o: number];

const USED = new Set(["products", "orders", "order_items"]);
const TABLE_ORDER = ["customers", "products", "orders", "order_items", "refunds"];

function slabPoses(index: number, name: string): Pose[] {
  const x = (index - 2) * 148;
  const arcZ = -Math.abs(index - 2) * 46;
  const ry = (2 - index) * 11;
  const used = USED.has(name);
  return [
    [x * 0.2, 60, -520, 0, 0, 0.5, 0],
    [x, 30, arcZ, ry, 0, 1, 1],
    [x, used ? -10 : 40, arcZ + (used ? 60 : -40), ry * 0.6, 0, used ? 1.04 : 0.94, used ? 1 : 0.35],
    [x * 1.1, 120, -300, ry, 10, 0.8, 0.16],
    [x * 1.1, 160, -460, ry, 12, 0.7, 0],
  ];
}

const QUESTION: Pose[] = [
  [0, -10, 90, 0, 0, 1.12, 1],
  [0, -210, 0, 0, 0, 0.82, 1],
  [-40, -238, -50, 0, 0, 0.72, 0.6],
  [-60, -290, -140, 0, 0, 0.62, 0.2],
  [-60, -320, -200, 0, 0, 0.6, 0],
];

const SQL: Pose[] = [
  [160, 120, -320, -10, 0, 0.7, 0],
  [180, 170, -240, -10, 0, 0.8, 0],
  [60, 150, 140, -6, 6, 0.98, 1],
  [220, -20, -60, -18, 0, 0.7, 0.75],
  [196, 214, -70, -14, 0, 0.6, 0.9],
];

const ANSWER: Pose[] = [
  [-40, -260, -200, 0, 0, 0.8, 0],
  [-40, -260, -200, 0, 0, 0.8, 0],
  [-40, -260, -200, 0, 0, 0.8, 0],
  [-60, -250, -100, 0, 0, 0.86, 0],
  [-70, -196, 60, 4, 0, 1, 1],
];

const CHART: Pose[] = [
  [-70, 30, -300, 0, 0, 0.8, 0],
  [-70, 30, -300, 0, 0, 0.8, 0],
  [-70, 30, -300, 0, 0, 0.8, 0],
  [-70, 30, -120, 0, 0, 0.9, 0],
  [-70, 46, 20, 4, 0, 1, 1],
];

function rowPoses(index: number): Pose[] {
  // Rows start inside the `products` slab (index 1 of the arc), become a table, then the chart's bars.
  const inSlab: Pose = [-148, 30 + index * 4, -46, 11, 0, 0.3, 0];
  return [
    [-27, 60, -520, 0, 0, 0.2, 0],
    inSlab,
    [-148, -10 + index * 4, 14, 7, 0, 0.32, 0],
    [-70, -96 + index * 44, 70, 4, 0, 1, 1],
    [-70, -30 + index * 40, 50, 4, 0, 1, 1],
  ];
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function pose(poses: Pose[], stage: number): Pose {
  const k = Math.min(poses.length - 2, Math.floor(stage));
  const t = ease(Math.min(1, Math.max(0, stage - k)));
  const a = poses[k];
  const b = poses[k + 1];
  return a.map((value, i) => lerp(value, b[i], t)) as Pose;
}

function write(element: HTMLElement, p: Pose) {
  const [x, y, z, ry, rx, s, o] = p;
  element.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${s})`;
  element.style.opacity = String(o);
  element.style.visibility = o < 0.02 ? "hidden" : "visible";
}

export default function StoryScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const products = LANDING.topProducts;
  const max = Math.max(...products.map((p) => p.revenue));
  const insight = storyInsight();
  const tables = TABLE_ORDER.map((name) => LANDING.tables.find((t) => t.name === name)!).filter(Boolean);

  useEffect(() => {
    const root = rootRef.current;
    const world = worldRef.current;
    const tip = tipRef.current;
    const section = root?.closest<HTMLElement>("[data-story]");
    if (!root || !world || !tip || !section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const objects: { el: HTMLElement; poses: Pose[]; fill?: HTMLElement; fillTo?: number }[] = [];
    const add = (selector: string, poses: Pose[]) => {
      const el = world.querySelector<HTMLElement>(selector);
      if (el) objects.push({ el, poses });
    };
    add('[data-obj="question"]', QUESTION);
    add('[data-obj="sql"]', SQL);
    add('[data-obj="answer"]', ANSWER);
    add('[data-obj="chart"]', CHART);
    TABLE_ORDER.forEach((name, i) => add(`[data-obj="table-${name}"]`, slabPoses(i, name)));
    products.forEach((p, i) => {
      const el = world.querySelector<HTMLElement>(`[data-obj="row-${i}"]`);
      if (el)
        objects.push({ el, poses: rowPoses(i), fill: el.querySelector<HTMLElement>("[data-fill]") ?? undefined, fillTo: p.revenue / max });
    });
    const captions = [...section.querySelectorAll<HTMLElement>("[data-caption]")];
    const ticks = [...section.querySelectorAll<HTMLElement>("[data-tick]")];
    const used = [...world.querySelectorAll<HTMLElement>("[data-used]")];

    let current = 0;
    let pointerX = 0;
    let pointerY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let lastStage = -1;
    let frame = 0;
    let running = false;

    const progress = () => {
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      return total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    };

    const render = () => {
      const target = progress() * 4;
      current = reduced ? Math.round(target) : current + (target - current) * 0.12;
      if (Math.abs(target - current) < 0.0005) current = target;

      const { width, height } = root.getBoundingClientRect();
      const fit = Math.min(width / 760, height / 700, 1.15);
      if (!reduced) {
        tiltX += (pointerY - tiltX) * 0.08;
        tiltY += (pointerX - tiltY) * 0.08;
      }
      world.style.transform = `scale(${fit}) rotateX(${8 - tiltX * 5}deg) rotateY(${-12 + tiltY * 7}deg)`;

      for (const object of objects) {
        write(object.el, pose(object.poses, current));
        if (object.fill && object.fillTo !== undefined) {
          const grow = Math.min(1, Math.max(0, current - 3));
          object.fill.style.transform = `scaleX(${ease(grow) * object.fillTo})`;
        }
      }

      const stage = Math.round(current);
      if (stage !== lastStage) {
        lastStage = stage;
        section.dataset.stage = String(stage);
        captions.forEach((caption, i) => caption.toggleAttribute("data-active", i === stage));
        ticks.forEach((tick, i) => tick.toggleAttribute("data-active", i <= stage));
        used.forEach((el) => el.toggleAttribute("data-lit", stage === 2));
      }
    };

    const loop = () => {
      render();
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    // Pause whenever the story is off screen.
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), {
      rootMargin: "100px 0px",
    });
    observer.observe(section);
    render();
    section.dataset.sceneReady = "";

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = root.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      if (target && target.style.visibility !== "hidden") {
        tip.textContent = target.dataset.tip ?? "";
        tip.style.transform = `translate(${event.clientX - rect.left + 14}px, ${event.clientY - rect.top + 14}px)`;
        tip.style.opacity = "1";
      } else {
        tip.style.opacity = "0";
      }
    };
    const onLeave = () => {
      pointerX = 0;
      pointerY = 0;
      tip.style.opacity = "0";
    };
    if (finePointer) {
      root.addEventListener("pointermove", onPointer);
      root.addEventListener("pointerleave", onLeave);
    }

    return () => {
      stop();
      observer.disconnect();
      root.removeEventListener("pointermove", onPointer);
      root.removeEventListener("pointerleave", onLeave);
      delete section.dataset.sceneReady;
    };
  }, [products, max]);

  const object = "absolute left-0 top-0 [backface-visibility:hidden] will-change-transform";

  return (
    <div ref={rootRef} aria-hidden className="absolute inset-0 overflow-hidden [perspective:1400px]">
      <div ref={worldRef} className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d]">
        {/* the question */}
        <div data-obj="question" data-tip="Your question, in plain English" className={object} style={{ width: 380, marginLeft: -190, marginTop: -40 }}>
          <div className="panel-raised flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent font-mono text-[11px] font-semibold text-accent-fg">
              You
            </span>
            <span className="text-[15px] leading-snug text-fg">{STORY_QUESTION}</span>
          </div>
        </div>

        {/* the five tables */}
        {tables.map((table) => (
          <div
            key={table.name}
            data-obj={`table-${table.name}`}
            data-used={USED.has(table.name) ? "" : undefined}
            data-tip={`${table.name}: ${formatInt(table.rows)} rows, ${table.columns} columns`}
            className={`${object} group`}
            style={{ width: 124, marginLeft: -62, marginTop: -54 }}
          >
            <div className="panel-raised overflow-hidden transition-[box-shadow,border-color] duration-300 group-data-[lit]:border-accent group-data-[lit]:shadow-[0_0_0_3px_var(--accent-soft),var(--shadow-lg)]">
              <div className="flex items-center gap-1.5 border-b bg-surface-2 px-2.5 py-1.5">
                <span className="size-1.5 rounded-full bg-accent" />
                <span className="truncate font-mono text-[11.5px] font-medium text-fg">{table.name}</span>
              </div>
              <div className="space-y-1 px-2.5 py-2">
                {[0, 1, 2].map((line) => (
                  <div key={line} className="h-1.5 rounded-full bg-sunken" style={{ width: `${90 - line * 18}%` }} />
                ))}
                <p className="num pt-1 text-[11px] text-fg-muted">{formatInt(table.rows)} rows</p>
              </div>
            </div>
          </div>
        ))}

        {/* the SQL */}
        <div data-obj="sql" data-tip="Checked before it runs: one SELECT, allowed tables only" className={object} style={{ width: 390, marginLeft: -195, marginTop: -110 }}>
          <div className="panel-raised overflow-hidden">
            <div className="flex items-center justify-between border-b bg-surface-2 px-3 py-1.5">
              <span className="eyebrow">SQL</span>
              <span className="font-mono text-[10.5px] text-success-text">validated · read-only · 5 s</span>
            </div>
            <pre className="overflow-hidden px-3 py-2.5 font-mono text-[11px] leading-[1.55] text-fg">
              {STORY_SQL.map((line) => (
                <span key={line} className="block whitespace-pre">
                  {line.split(/(\b(?:SELECT|FROM|JOIN|ON|WHERE|AND|NOT IN|GROUP BY|ORDER BY|DESC|LIMIT|AS|date|interval)\b)/).map((part, i) =>
                    i % 2 === 1 ? (
                      <span key={i} className="text-sql-keyword">
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )}
                </span>
              ))}
            </pre>
          </div>
        </div>

        {/* the answer */}
        <div data-obj="answer" className={object} style={{ width: 440, marginLeft: -220, marginTop: -44 }}>
          <div className="panel-raised px-4 py-3">
            <p className="eyebrow">Answer</p>
            <p className="mt-1 text-[14px] leading-snug text-fg">
              {insight.first.product} led {insight.month} with{" "}
              <span className="key-num">{formatMoney(insight.first.revenue)}</span>,{" "}
              <span className="key-num">{insight.leadPercent}%</span> ahead of {insight.second.product}.
            </p>
          </div>
        </div>

        {/* the chart frame the rows land in */}
        <div data-obj="chart" className={object} style={{ width: 440, height: 260, marginLeft: -220, marginTop: -130 }}>
          <div className="panel-raised h-full px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Revenue by product · {insight.month}</span>
              <span className="rounded-full border px-2 py-0.5 text-[10.5px] text-fg-muted">Pin · CSV · SQL</span>
            </div>
          </div>
        </div>

        {/* the five result rows: a table first, then the chart's bars */}
        {products.map((p, i) => (
          <div
            key={p.product}
            data-obj={`row-${i}`}
            data-tip={`${p.product} · ${p.category} · ${p.units} units · ${formatMoney(p.revenue)}`}
            className={object}
            style={{ width: 400, marginLeft: -200, marginTop: -16 }}
          >
            <div className="flex h-8 items-center gap-3 rounded-sm border bg-surface px-3 shadow-[var(--shadow-sm)]">
              <span className="w-[150px] shrink-0 truncate text-[12.5px] text-fg">{p.product}</span>
              <span className="relative h-3 flex-1 overflow-hidden rounded-xs">
                <span data-fill className="absolute inset-y-0 left-0 w-full origin-left rounded-xs bg-chart-1" style={{ transform: "scaleX(0)" }} />
              </span>
              <span className="num w-[62px] shrink-0 text-right text-[12px] text-fg-muted">{formatMoney(p.revenue)}</span>
            </div>
          </div>
        ))}
      </div>
      <div
        ref={tipRef}
        className="pointer-events-none absolute left-0 top-0 z-10 max-w-[260px] rounded-sm bg-inverse px-2.5 py-1.5 text-[12px] text-inverse-fg opacity-0 shadow-[var(--shadow-md)] transition-opacity duration-150"
      />
    </div>
  );
}
