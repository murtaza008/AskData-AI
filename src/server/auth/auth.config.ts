import type { NextAuthConfig } from "next-auth";

/**
 * Database-free part of the Auth.js config, shared by the request proxy
 * (src/proxy.ts) and the full config in auth.ts. Keeping Prisma and bcrypt out
 * of here keeps the proxy bundle small.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      // The workspace is private: returning false redirects to /login with a callbackUrl.
      if (pathname.startsWith("/app")) return isLoggedIn;

      // Signed-in visitors have no use for the auth pages.
      if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
        return Response.redirect(new URL("/app", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.isDemo = user.isDemo ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.isDemo = Boolean(token.isDemo);
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
