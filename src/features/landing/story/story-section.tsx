import { LANDING } from "../data";
import { STAGES } from "./stages";
import { StoryLoader } from "./story-loader";
import { StoryStill } from "./story-still";

/**
 * Scroll story: captions on the left scroll normally (they are the content and
 * work without JavaScript); the visual on the right stays pinned and follows.
 */
export function StorySection() {
  return (
    <section
      id="how"
      data-story
      aria-labelledby="story-title"
      className="group/story relative scroll-mt-16 border-t bg-bg"
    >
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        {/* pinned visual */}
        <div className="sticky top-14 z-20 h-[54vh] border-b bg-bg lg:order-2 lg:top-0 lg:z-0 lg:h-dvh lg:border-b-0">
          <div className="relative h-full">
            <div className="absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-300 group-data-[scene-ready]/story:opacity-0 lg:p-10">
              <StoryStill className="h-full max-h-[520px] w-full max-w-[560px]" />
            </div>
            <StoryLoader />
            {/* stage ticker: a query plan read left to right */}
            <ol
              aria-hidden
              className="absolute inset-x-0 bottom-3 mx-auto flex max-w-[520px] items-center gap-1.5 px-2 lg:bottom-8"
            >
              {STAGES.map((stage, i) => (
                <li
                  key={stage.key}
                  data-tick
                  data-active={i === 0 ? "" : undefined}
                  className="group/tick flex flex-1 flex-col gap-1.5"
                >
                  <span className="h-[3px] rounded-full bg-border transition-colors duration-300 group-data-[active]/tick:bg-accent" />
                  <span className="num hidden text-[10.5px] text-fg-subtle transition-colors group-data-[active]/tick:text-fg sm:block">
                    {String(i + 1).padStart(2, "0")} {stage.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* captions */}
        <div className="relative z-10 lg:order-1">
          <div className="pt-10 lg:pt-[22vh]">
            <p className="eyebrow">How it works</p>
            <h2 id="story-title" className="mt-3 max-w-[18ch] text-[30px] sm:text-[38px]">
              One question, start to finish.
            </h2>
            <p className="mt-3 max-w-[46ch] text-[15px] text-fg-muted">
              Follow a real question through AskData: <q>{"What were our top 5 products by revenue last month?"}</q>{" "}
              The figures are the demo store&apos;s own, for {LANDING.lastMonth.label}.
            </p>
          </div>
          <ol className="pb-[20vh]">
            {STAGES.map((stage, i) => (
              <li
                key={stage.key}
                data-caption
                data-active={i === 0 ? "" : undefined}
                className="group/caption flex min-h-[72vh] items-center lg:min-h-[88vh]"
              >
                <div className="panel max-w-[460px] p-5 transition-[border-color] duration-300 lg:rounded-none lg:border-0 lg:border-l-2 lg:border-l-border lg:bg-transparent lg:py-1 lg:pl-6 lg:pr-0 lg:shadow-none lg:group-data-[active]/caption:border-l-accent">
                  <p className="num text-[12px] text-accent-text">
                    {String(i + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")} · {stage.label}
                  </p>
                  <h3 className="mt-2 text-[22px] sm:text-[26px]">{stage.title}</h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-fg-muted">{stage.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
