"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession, isStaff } from "@/lib/auth";
import { COOKIE, signSession, Role } from "@/lib/session";
import { AdvisorProfile, checkPassword, createUser, getUser, patchUser } from "@/lib/users";
import { CONTRACT_TYPES, CURRENCIES, STATES } from "@/lib/contract-types";
import { ContractInput, createContract, getContract, updateContract, validateExtras } from "@/lib/contracts";

export type FormState = { error?: string; ok?: string };

/* ---------- Sesión ---------- */
export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser(String(fd.get("username") ?? "").trim());
  const ok = user?.active && (await checkPassword(user, String(fd.get("password") ?? "")));
  if (!user || !ok) return { error: "Usuario o contraseña incorrectos" };
  (await cookies()).set(COOKIE, await signSession({ username: user.username, name: user.name, role: user.role }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect(user.role === "asesor" ? "/contratos" : "/dashboard");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

/* ---------- Contratos ---------- */
const contractSchema = z.object({
  tipo: z.enum(CONTRACT_TYPES.map((t) => t.id) as [string, ...string[]]),
  estado: z.enum(STATES.map((s) => s.id) as [string, ...string[]]),
  cliente: z.string().trim().min(2, "Indica el nombre del cliente"),
  clienteDoc: z.string().trim().default(""),
  propiedad: z.string().trim().min(3, "Indica la propiedad o dirección"),
  monto: z.coerce.number().min(0, "El monto no es válido"),
  moneda: z.enum(CURRENCIES),
  fecha: z.string().min(1, "Indica la fecha"),
  comision: z.coerce.number().min(0).max(100),
  notas: z.string().trim().default(""),
});

export async function saveContract(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession();
  if (session.role === "legal") return { error: "El área legal tiene acceso de revisión, no de edición de contratos." };
  const parsed = contractSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const extras: Record<string, string> = {};
  CONTRACT_TYPES.find((t) => t.id === parsed.data.tipo)?.extras.forEach((f) => {
    extras[f.key] = String(fd.get(`x_${f.key}`) ?? "").trim();
  });
  const extrasError = validateExtras(parsed.data.tipo, extras);
  if (extrasError) return { error: extrasError };

  const input: ContractInput = { ...parsed.data, extras };
  if (id) {
    const current = await getContract(id);
    if (!current || (!isStaff(session) && current.asesor !== session.username)) return { error: "Sin permiso" };
    await updateContract(id, input, session.username);
    revalidatePath("/contratos");
    return { ok: "Cambios guardados" };
  }
  const creator = await getUser(session.username);
  const created = await createContract(input, session, creator?.advisorProfile);
  redirect(`/contratos/${created.id}`);
}

/* ---------- Usuarios (solo admin) ---------- */
export async function createUserAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireSession(["admin"]);
  const parsed = z
    .object({
      username: z.string().trim().regex(/^[a-z0-9._-]{3,30}$/i, "Usuario: 3-30 caracteres, sin espacios"),
      name: z.string().trim().min(2, "Indica el nombre"),
      role: z.enum(["admin", "administrativo", "legal", "asesor"]),
      password: z.string().min(8, "La contraseña necesita al menos 8 caracteres"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await createUser({ ...parsed.data, role: parsed.data.role as Role });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/usuarios");
  return { ok: `Usuario ${parsed.data.username} creado` };
}

export async function toggleUser(username: string, active: boolean) {
  const s = await requireSession(["admin"]);
  if (s.username === username) return;
  await patchUser(username, { active });
  revalidatePath("/usuarios");
}

export async function resetPassword(username: string, fd: FormData) {
  await requireSession(["admin"]);
  const password = String(fd.get("password") ?? "");
  if (password.length >= 8) await patchUser(username, { password });
  revalidatePath("/usuarios");
}

/* ---------- Perfil del asesor ---------- */
export async function saveAdvisorProfile(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession(["asesor"]);
  const parsed = z
    .object({
      fullName: z.string().trim().min(3, "Indica el nombre legal completo"),
      identityNumber: z.string().trim().min(3, "Indica el número de cédula"),
      identityIssuedIn: z.string().trim().min(2, "Indica el lugar de expedición"),
      address: z.string().trim().min(4, "Indica el domicilio"),
      mobile: z.string().trim().min(6, "Indica el teléfono móvil"),
      whatsapp: z.string().trim().min(6, "Indica el WhatsApp"),
      email: z.string().trim().email("Indica un correo válido"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await getUser(session.username);
  if (!user) return { error: "No se encontró la cuenta del asesor" };
  const profile: AdvisorProfile = { ...parsed.data, updatedAt: new Date().toISOString() };
  await patchUser(session.username, { advisorProfile: profile });
  revalidatePath("/perfil");
  return { ok: "Perfil guardado" };
}
