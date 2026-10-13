import { ArrowRight, Code2 } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Pressable, Reveal } from "@/components/motion/reveal";
import { SITE } from "@/lib/site";

export function CtaBanner() {
  return (
    <section className="border-t bg-primary text-primary-foreground">
      <Reveal className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-4 py-12 sm:px-6">
        <p className="max-w-[26ch] font-display text-[28px] font-medium leading-[1.15]">
          See it answer a real question against a live database.
        </p>
        <Pressable>
          <Link
            href="/login?demo=1"
            className="group inline-flex items-center gap-2 rounded-md bg-background px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Open the demo
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
        </Pressable>
      </Reveal>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-muted-foreground sm:px-6">
        <Wordmark />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            href={SITE.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Code2 className="size-4" strokeWidth={1.5} />
            Source code
          </a>
          <span>
            Built by{" "}
            <a
              href={SITE.authorUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {SITE.author}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
