import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import authConfig from "@/lib/auth.config";
import { rateLimited } from "@/lib/rate-limit";
import { consumeRecoveryCode, verifyTotp } from "@/lib/totp";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Backstop for direct calls to /api/auth that skip the login form's own limits.
        if (
          (await rateLimited("authorize-ip", 60, 15 * 60_000)) ||
          (await rateLimited(`authorize:${parsed.data.email.toLowerCase()}`, 20, 15 * 60_000))
        ) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || user.disabledAt) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!isValid) return null;

        if (user.totpEnabled && user.totpSecret) {
          const code = (parsed.data.code ?? "").trim();
          if (!code) return null;
          const step = verifyTotp(user.totpSecret, code, user.totpLastStep);
          if (step !== null) {
            await prisma.user.update({ where: { id: user.id }, data: { totpLastStep: step } });
          } else {
            const remaining = consumeRecoveryCode(user.recoveryCodes, code);
            if (!remaining) return null;
            await prisma.user.update({ where: { id: user.id }, data: { recoveryCodes: JSON.stringify(remaining) } });
          }
        }

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        return token;
      }
      // On later requests: end the session if the account was deleted or its password changed
      // after this token was issued, and pick up role changes.
      if (token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, passwordChangedAt: true, disabledAt: true },
        });
        if (!u || u.disabledAt) return null;
        if (u.passwordChangedAt && token.iat && u.passwordChangedAt.getTime() / 1000 > (token.iat as number)) return null;
        token.role = u.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
