import type { NextAuthConfig } from "next-auth";

export default {
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicAuthPaths = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];
      const isAdminRoute =
        nextUrl.pathname.startsWith("/admin") && !publicAuthPaths.includes(nextUrl.pathname);
      const isLoginRoute = nextUrl.pathname === "/admin/login";

      if (isAdminRoute) return isLoggedIn;
      if (isLoginRoute && isLoggedIn) {
        return Response.redirect(new URL("/admin", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
