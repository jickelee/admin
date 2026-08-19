import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "anole_session";

function credentials() {
  return {
    username: process.env.ADMIN_USERNAME ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
    secret: process.env.AUTH_SECRET ?? "",
  };
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function validCredentials(username: string, password: string) {
  const expected = credentials();
  return Boolean(expected.username && expected.password) && safeEqual(username, expected.username) && safeEqual(password, expected.password);
}

export function sessionToken() {
  const { username, password, secret } = credentials();
  if (!username || !password) return "";
  return createHmac("sha256", secret || password).update(`anole:${username}:${password}`).digest("hex");
}

export function isAuthenticated(value?: string) {
  const expected = sessionToken();
  return Boolean(value && expected && safeEqual(value, expected));
}
