import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, type Area } from "@/lib/permissions";

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do this.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Signed in, account still active, and not stuck on a temporary password.
 * Only the change-password style actions pass `allowPasswordChange`.
 */
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}) {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { disabledAt: true, mustChangePassword: true },
  });
  if (!row || row.disabledAt) throw new UnauthorizedError();
  if (row.mustChangePassword && !opts.allowPasswordChange) {
    throw new ForbiddenError("Change your temporary password first (Account & security).");
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("This action requires admin access.");
  return user;
}

/** Signed in AND allowed into this area of the dashboard. */
export async function requireArea(area: Area) {
  const user = await requireUser();
  if (!can(user.role, area)) throw new ForbiddenError("Your role doesn't include this.");
  return user;
}
