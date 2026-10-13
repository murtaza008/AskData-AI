import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNT } from "@/lib/demo";

type DemoCredentialsProps = {
  onUse: () => void;
  isPending: boolean;
};

/** The public demo login, shown openly so visitors can try the app without signing up. */
export function DemoCredentials({ onUse, isPending }: DemoCredentialsProps) {
  return (
    <div className="rounded-md border border-l-2 border-l-highlight bg-card p-4">
      <div className="label-caps">Demo account</div>
      <dl className="mt-2 grid grid-cols-[80px_1fr] gap-y-1 text-[13px]">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="num">{DEMO_ACCOUNT.email}</dd>
        <dt className="text-muted-foreground">Password</dt>
        <dd className="num">{DEMO_ACCOUNT.password}</dd>
      </dl>
      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onUse} disabled={isPending}>
        {isPending ? "Signing in…" : "Continue with the demo account"}
      </Button>
    </div>
  );
}
