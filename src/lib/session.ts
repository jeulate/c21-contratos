// Sin dependencias de next/headers: se usa también desde el middleware (edge).
import { SignJWT, jwtVerify } from "jose";

export type Role = "admin" | "administrativo" | "legal" | "asesor";
export type Session = { username: string; name: string; role: Role };
export const COOKIE = "session";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta AUTH_SECRET");
    return new TextEncoder().encode("dev-secret-solo-para-desarrollo-local-0000");
  }
  return new TextEncoder().encode(secret);
}

export function signSession(s: Session) {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(key());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { username: payload.username as string, name: payload.name as string, role: payload.role as Role };
  } catch {
    return null;
  }
}
