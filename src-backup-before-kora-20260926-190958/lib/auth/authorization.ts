import { getCurrentUser } from "./current-user";
import type { AuthenticatedUser } from "./session-service";

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}

export async function requireRole(
  ...allowedRoles: string[]
): Promise<AuthenticatedUser> {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }

  return user;
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  return requireRole("ADMIN", "SUPER_ADMIN");
}

export async function requireSuperAdmin(): Promise<AuthenticatedUser> {
  return requireRole("SUPER_ADMIN");
}
