import { revokeSession } from "./session-service";
import {
  clearSessionCookie,
  getSessionTokenFromCookie,
} from "./session-cookie";

export async function logoutCurrentUser(): Promise<void> {
  const token = await getSessionTokenFromCookie();

  if (token) {
    await revokeSession(token);
  }

  await clearSessionCookie();
}
