import { ClosingCta, QuestionsSection, SiteFooter } from "@/features/landing/closing";
import { DemosSection } from "@/features/landing/demos/demos-section";
import { Hero } from "@/features/landing/hero";
import { LandingMotion } from "@/features/landing/motion";
import { SafetyStack } from "@/features/landing/safety-stack";
import { ScreensSection } from "@/features/landing/screens/screens-section";
import { SiteHeader } from "@/features/landing/site-header";
import { SmoothScroll } from "@/features/landing/smooth-scroll";
import { StorySection } from "@/features/landing/story/story-section";

/**
 * Public landing page. Static: no database or session access. Every figure on
 * it comes from a read-only snapshot of the demo dataset (landing-data.json)
 * or from running the app's own modules in the browser.
 */
export default function LandingPage() {
  return (
    <LandingMotion>
      <SmoothScroll />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <StorySection />
        <DemosSection />
        <SafetyStack />
        <ScreensSection />
        <QuestionsSection />
        <ClosingCta />
      </main>
      <SiteFooter />
    </LandingMotion>
  );
}
