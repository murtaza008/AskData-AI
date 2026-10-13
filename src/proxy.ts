import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/auth.config";

// Next.js 16 calls this file "proxy" (formerly middleware). It gives signed-out
// visitors a fast redirect away from the workspace. It is a convenience, not
// the security boundary: every API route re-checks the session itself.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
