import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, Role, Session, verifySession } from "./session";

export async function getSession(): Promise<Session | null> {
  return verifySession((await cookies()).get(COOKIE)?.value);
}

/** Exige sesión y, opcionalmente, uno de los roles indicados. */
export async function requireSession(roles?: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (roles && !roles.includes(s.role)) redirect("/contratos");
  return s;
}

export const isStaff = (s: Session) => s.role === "admin" || s.role === "administrativo";
