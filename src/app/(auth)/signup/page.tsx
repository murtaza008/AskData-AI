import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a free AskData account.",
};

export default function SignupPage() {
  return <SignupForm />;
}
