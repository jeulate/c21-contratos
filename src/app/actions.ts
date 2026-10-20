"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession, isStaff } from "@/lib/auth";
import { COOKIE, signSession, Role } from "@/lib/session";
import { AdvisorProfile, checkPassword, createUser, getUser, patchUser } from "@/lib/users";
import { CONTRACT_TYPES, CURRENCIES, isTemplateBasedContract, STATES } from "@/lib/contract-types";
import { changeContractState, ContractInput, createContract, getContract, updateContract, validateExtras } from "@/lib/contracts";
import { getActiveTemplate } from "@/lib/contract-templates";
import { activateTemplateVersion, createTemplateVersion } from "@/lib/contract-templates";
import { getContractCurrency, setContractCurrency } from "@/lib/contract-currencies";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import InspectModule from "docxtemplater/js/inspect-module.js";

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

  let templateVersionId: string | undefined;
  let creator = await getUser(session.username);
  if (isTemplateBasedContract(parsed.data.tipo)) {
    if (session.role !== "asesor") return { error: "Los modelos de exclusividad solo pueden registrarse desde una cuenta de asesor." };
    const profile = creator?.advisorProfile;
    if (!profile) return { error: "Completa primero tu perfil de asesor para usar esta plantilla." };
    const activeTemplate = await getActiveTemplate(parsed.data.tipo);
    if (!activeTemplate) return { error: "Legal todavía no activó una plantilla Word para este tipo de contrato." };
    templateVersionId = activeTemplate.id;
  }

  const input: ContractInput = { ...parsed.data, extras };
  if (id) {
    const current = await getContract(id);
    if (!current || (!isStaff(session) && current.asesor !== session.username)) return { error: "Sin permiso" };
    await updateContract(id, { ...input, moneda: current.moneda }, session.username);
    revalidatePath("/contratos");
    return { ok: "Cambios guardados" };
  }
  const configuredCurrency = await getContractCurrency(parsed.data.tipo);
  const created = await createContract({ ...input, moneda: configuredCurrency }, session, creator?.advisorProfile, templateVersionId);
  redirect(`/contratos/${created.id}`);
}

export async function saveContractCurrencyAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireSession(["admin"]);
  const parsed = z.object({
    tipo: z.enum(CONTRACT_TYPES.map((item) => item.id) as [string, ...string[]]),
    moneda: z.enum(CURRENCIES),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await setContractCurrency(parsed.data.tipo, parsed.data.moneda);
  } catch (error) {
    return { error: (error as Error).message };
  }
  revalidatePath("/configuracion-contratos");
  revalidatePath("/contratos/nuevo");
  return { ok: `Divisa ${parsed.data.moneda} guardada para ${CONTRACT_TYPES.find((item) => item.id === parsed.data.tipo)?.label}.` };
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

export async function changeContractStateAction(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession(["legal", "admin"]);
  const parsed = z.object({
    estado: z.enum(STATES.map((state) => state.id) as [string, ...string[]]),
    comentario: z.string().trim().min(3, "Registra el motivo del cambio"),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await changeContractState(id, parsed.data.estado, session.username, parsed.data.comentario);
  } catch (error) {
    return { error: (error as Error).message };
  }
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
  return { ok: "Estado actualizado y registrado en el historial" };
}

export async function uploadContractTemplateAction(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession(["legal", "admin"]);
  const type = String(fd.get("tipo") ?? "");
  const file = fd.get("archivo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo Word (.docx)." };
  if (!file.name.toLowerCase().endsWith(".docx")) return { error: "El archivo debe tener formato .docx." };
  if (file.size > 5 * 1024 * 1024) return { error: "El archivo no puede superar 5 MB." };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) return { error: "El archivo no parece ser un documento Word válido." };
    const inspect = new InspectModule();
    const document = new Docxtemplater(new PizZip(buffer), {
      modules: [inspect],
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });
    void document;
    const tags = [...new Set(inspect.getAllStructuredTags().filter((part) => part.type === "placeholder").map((part) => part.value))];
    if (!tags.length) return { error: "La plantilla no contiene marcadores. Usa marcadores como {{owner1.fullName}}." };
    const typeDefinition = CONTRACT_TYPES.find((item) => item.id === type && item.templateBased);
    if (!typeDefinition) return { error: "Selecciona uno de los cuatro modelos de exclusividad." };
    const supported = new Set([
      "owner1.fullName", "owner1.identityNumber", "owner1.identityIssuedIn", "owner1.address", "owner1.email", "owner1.whatsapp",
      "owner2.fullName", "owner2.identityNumber", "owner2.identityIssuedIn", "owner2.address", "owner2.email", "owner2.whatsapp",
      "property.reference", "property.name", "property.class", "property.activity", "property.department", "property.province",
      "property.municipality", "property.hectares", "property.executorialTitle", "property.cadastralPlan", "property.registry",
      "property.cadastralCertificate", "property.zone", "property.uv", "property.block", "property.lot", "property.type", "property.address",
      "property.landArea", "property.builtArea", "property.bedroomCount", "property.suiteCount", "property.otherDetails", "property.liens",
      "advisor.fullName", "advisor.identityNumber", "advisor.identityIssuedIn", "advisor.address", "advisor.mobile", "advisor.whatsapp", "advisor.email",
      "contract.id", "contract.type", "contract.amount", "contract.amountNumeric", "contract.amountInWords", "contract.amountPerHectare",
      "contract.currency", "contract.currencyName", "contract.currencySymbol", "contract.date", "contract.dateRaw", "contract.commission", "contract.status", "client.name", "client.document",
      "propertyName", "amount", "currency", "currencyName", "currencySymbol", "date",
      ...typeDefinition.extras.map((field) => `extras.${field.key}`),
    ]);
    const unsupported = tags.filter((tag) => !supported.has(tag));
    if (unsupported.length) return { error: `Marcadores sin correspondencia para este modelo: ${unsupported.map((tag) => `{{${tag}}}`).join(", ")}` };
    await createTemplateVersion({ tipo: type, fileName: file.name, contentBase64: buffer.toString("base64"), tags, uploadedBy: session.username });
    revalidatePath("/plantillas");
    return { ok: `Plantilla cargada. Se detectaron ${tags.length} marcadores; quedó como borrador para revisión legal.` };
  } catch (error) {
    return { error: `No se pudo leer la plantilla Word: ${(error as Error).message}` };
  }
}

export async function activateContractTemplateAction(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession(["legal", "admin"]);
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "No se indicó la versión que se activará." };
  try {
    const version = await activateTemplateVersion(id, session.username);
    revalidatePath("/plantillas");
    revalidatePath("/contratos/nuevo");
    return { ok: `Versión ${version.version} activada para ${version.tipo}.` };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
