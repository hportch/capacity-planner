import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "capacity-session";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "capacity-planner-default-secret-change-me"
);

// Default credentials — override with AUTH_USERNAME / AUTH_PASSWORD env vars
const VALID_USERNAME = process.env.AUTH_USERNAME || "henry";
const VALID_PASSWORD = process.env.AUTH_PASSWORD || "capacity2026";

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
