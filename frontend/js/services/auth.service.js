/** Auth endpoints — thin wrappers over the central API client. */

import { api, refreshSession, setToken } from "../core/api.js";
import { setUser } from "../core/auth.js";

export function registerAccount(payload) {
  return api.post("/api/auth/register", payload, { auth: false });
}

export async function loginAccount(email, password) {
  const data = await api.post("/api/auth/login", { email, password }, { auth: false });
  setToken(data.accessToken);
  setUser(data.user);
  return data.user;
}

export function logoutAccount() {
  return api.post("/api/auth/logout", undefined, { auth: false });
}

/** Restore session from the refresh cookie. */
export function refreshAccount() {
  return refreshSession();
}

export function fetchMyProfile() {
  return api.get("/api/auth/me").then((d) => d.user);
}
