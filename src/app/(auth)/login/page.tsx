import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to AskData, or use the demo account to explore.",
};

export default function LoginPage() {
  return <LoginForm />;
}
