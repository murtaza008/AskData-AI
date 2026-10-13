import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-6 py-8">
      <Wordmark />
      <div className="mx-auto flex max-w-[420px] flex-1 flex-col justify-center">
        <div className="label-caps">404</div>
        <h1 className="mt-3 text-[32px]">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">The link may be out of date, or the page was moved.</p>
        <Link href="/" className={buttonClass("primary", "md", "mt-6 self-start")}>
          Back to the home page
        </Link>
      </div>
    </div>
  );
}
