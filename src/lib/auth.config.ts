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
      const isAdminRoute =
        nextUrl.pathname.startsWith("/admin") &&
        nextUrl.pathname !== "/admin/login";
      const isLoginRoute = nextUrl.pathname === "/admin/login";

      if (isAdminRoute) return isLoggedIn;
      if (isLoginRoute && isLoggedIn) {
        return Response.redirect(new URL("/admin", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
