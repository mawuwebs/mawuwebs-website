import "server-only";
import { auth } from "@/lib/auth";

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

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("This action requires admin access.");
  return user;
}
