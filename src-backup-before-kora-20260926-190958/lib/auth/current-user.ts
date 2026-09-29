import { getUserFromSessionToken } from "./session-service";
import { getSessionTokenFromCookie } from "./session-cookie";

export async function getCurrentUser() {
  const token = await getSessionTokenFromCookie();

  if (!token) {
    return null;
  }

  return getUserFromSessionToken(token);
}
