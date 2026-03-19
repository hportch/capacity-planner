import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "capacity-session";

if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET env var is required");
if (!process.env.AUTH_USERNAME) throw new Error("AUTH_USERNAME env var is required");
if (!process.env.AUTH_PASSWORD) throw new Error("AUTH_PASSWORD env var is required");

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);
const VALID_USERNAME = process.env.AUTH_USERNAME;
const VALID_PASSWORD = process.env.AUTH_PASSWORD;

export function validateCredentials(username: string, password: string) {
  return username === VALID_USERNAME && password === VALID_PASSWORD;
}

export async function createSession() {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}
