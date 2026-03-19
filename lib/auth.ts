import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "capacity-session";

function getSecret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw) throw new Error("AUTH_SECRET env var is required");
  return new TextEncoder().encode(raw);
}

export function validateCredentials(username: string, password: string) {
  const validUsername = process.env.AUTH_USERNAME;
  const validPassword = process.env.AUTH_PASSWORD;
  if (!validUsername || !validPassword) {
    throw new Error("AUTH_USERNAME and AUTH_PASSWORD env vars are required");
  }
  return username === validUsername && password === validPassword;
}

export async function createSession() {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
