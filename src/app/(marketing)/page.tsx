import { Hero } from "@/features/marketing/components/hero";
import { HowItWorks } from "@/features/marketing/components/how-it-works";
import { QuestionsSection } from "@/features/marketing/components/questions-section";
import { SafetySection } from "@/features/marketing/components/safety-section";
import { CtaBanner, SiteFooter } from "@/features/marketing/components/site-footer";
import { SiteHeader } from "@/features/marketing/components/site-header";

/** Public landing page. Fully static: no database or session access. */
export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <SafetySection />
        <QuestionsSection />
        <CtaBanner />
      </main>
      <SiteFooter />
    </div>
  );
}
