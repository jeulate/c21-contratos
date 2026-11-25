"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession, isStaff } from "@/lib/auth";
import { COOKIE, signSession, Role } from "@/lib/session";
import { AdvisorProfile, checkPassword, createUser, getUser, patchUser } from "@/lib/users";
import { CONTRACT_TYPES, CURRENCIES, isTemplateBasedContract, STATES } from "@/lib/contract-types";
import { changeContractState, ContractInput, createContract, getContract, listContracts, markSignedContractNotificationAsRead, updateContract, validateAdditionalOwners, validateExtras } from "@/lib/contracts";
import { activateTemplateVersion, createTemplateVersion, deleteTemplateVersion, getActiveTemplate, getTemplateVersion, listTemplateVersions } from "@/lib/contract-templates";
import { getContractCurrency, setContractCurrency } from "@/lib/contract-currencies";
import { setContractFormOptions } from "@/lib/contract-form-options";
import type { CountryCallingCode } from "@/lib/contract-form-option-defaults";
import { validateHtmlTemplateMarkers } from "@/lib/contract-html-document";
import { finalizeStagedContractEvidence, isEvidenceIdentifier, MIN_CONTRACT_EVIDENCE_IMAGES, MAX_CONTRACT_EVIDENCE_IMAGES, removeContractEvidenceFiles } from "@/lib/contract-evidence";
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
  if (isTemplateBasedContract(parsed.data.tipo) && !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]*$/u.test(parsed.data.cliente)) {
    return { error: "El nombre del propietario solo debe contener texto, espacios, apóstrofes, puntos o guiones." };
  }
  if (isTemplateBasedContract(parsed.data.tipo) && !/^[0-9]{4,12}(?:-(?=[A-Za-z0-9]{2,3}$)(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{2,3})?$/.test(parsed.data.clienteDoc)) {
    return { error: "La cédula debe tener de 4 a 12 dígitos y, si incluye complemento, un guion seguido de 2 o 3 caracteres que combinen letras y números (ejemplo: 785462-1D)." };
  }

  const extras: Record<string, string> = {};
  CONTRACT_TYPES.find((t) => t.id === parsed.data.tipo)?.extras.forEach((f) => {
    extras[f.key] = String(fd.get(`x_${f.key}`) ?? "").trim();
  });
  const extrasError = validateExtras(parsed.data.tipo, extras);
  if (extrasError) return { error: extrasError };

  let submittedAdditionalOwners: unknown;
  try {
    submittedAdditionalOwners = JSON.parse(String(fd.get("additionalOwnersJson") ?? "[]"));
  } catch {
    return { error: "No se pudo leer la lista de propietarios adicionales." };
  }
  const validatedAdditionalOwners = validateAdditionalOwners(submittedAdditionalOwners);
  if (validatedAdditionalOwners.error) return { error: validatedAdditionalOwners.error };

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

  const input: ContractInput = { ...parsed.data, extras, additionalOwners: isTemplateBasedContract(parsed.data.tipo) ? validatedAdditionalOwners.owners ?? [] : [] };
  if (id) {
    const current = await getContract(id);
    if (!current || (!isStaff(session) && current.asesor !== session.username)) return { error: "Sin permiso" };
    if (current.estado === "anulado") return { error: "Este contrato fue anulado y ya no se puede editar." };
    if (session.role === "asesor" && current.estado === "firmado") return { error: "Este contrato ya fue aprobado y firmado por Legal; no se puede modificar." };
    await updateContract(id, {
      ...input,
      moneda: current.moneda,
      ...(session.role === "asesor" ? { estado: current.estado } : {}),
    }, session.username);
    if (session.role === "asesor" && current.estado === "observado") {
      await changeContractState(id, "revision", session.username, "El asesor guardó los cambios y reenvió el contrato para revisión legal.");
    }
    revalidatePath("/contratos");
    revalidatePath(`/contratos/${id}`);
    return { ok: current.estado === "observado" && session.role === "asesor" ? "Cambios guardados y contrato reenviado a revisión legal" : "Cambios guardados" };
  }
  const configuredCurrency = await getContractCurrency(parsed.data.tipo);
  const evidenceSessionId = String(fd.get("evidenceSessionId") ?? "");
  let evidenceIds: string[];
  try {
    const submittedIds = JSON.parse(String(fd.get("evidenceIds") ?? "[]")) as unknown;
    if (!Array.isArray(submittedIds) || submittedIds.some((id) => typeof id !== "string")) throw new Error();
    evidenceIds = submittedIds;
  } catch {
    return { error: "No se pudo verificar la lista de imágenes adjuntas. Vuelve a cargarlas." };
  }
  if (!isEvidenceIdentifier(evidenceSessionId)) return { error: "La sesión de carga de imágenes venció. Vuelve a cargar las imágenes." };
  if (evidenceIds.length < MIN_CONTRACT_EVIDENCE_IMAGES || evidenceIds.length > MAX_CONTRACT_EVIDENCE_IMAGES) {
    return { error: `Adjunta entre ${MIN_CONTRACT_EVIDENCE_IMAGES} y ${MAX_CONTRACT_EVIDENCE_IMAGES} imágenes de respaldo antes de crear el contrato.` };
  }

  const newContractId = crypto.randomUUID().slice(0, 8);
  let evidencias;
  try {
    evidencias = await finalizeStagedContractEvidence(session.username, evidenceSessionId, newContractId, evidenceIds);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudieron asociar las imágenes al contrato." };
  }
  let created;
  try {
    created = await createContract(
      { ...input, estado: "revision", moneda: configuredCurrency },
      session,
      creator?.advisorProfile,
      templateVersionId,
      { id: newContractId, evidencias },
    );
  } catch {
    await removeContractEvidenceFiles(newContractId);
    return { error: "No se pudo guardar el contrato. Las imágenes no se asociaron." };
  }
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

function parseFormOptionList(value: string, label: string) {
  const options = [...new Set(value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean))];
  if (!options.length) throw new Error(`Agrega al menos una opción para ${label.toLowerCase()}.`);
  if (options.length > 100) throw new Error(`La lista de ${label.toLowerCase()} no puede superar 100 opciones.`);
  if (options.some((item) => item.length > 60 || !/^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s.'’()/-]*$/u.test(item))) {
    throw new Error(`Revisa ${label.toLowerCase()}: usa texto de hasta 60 caracteres por opción.`);
  }
  return options;
}

function parseCountryCallingCodes(value: string): CountryCallingCode[] {
  const lines = value.split(/[\r\n]+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Agrega al menos un código de país.");
  if (lines.length > 250) throw new Error("La lista de códigos de país no puede superar 250 opciones.");
  const options = lines.map((line) => {
    const [rawCode, rawDial, ...rawName] = line.split("|").map((item) => item.trim());
    const code = rawCode?.toUpperCase() ?? "";
    const dial = rawDial ?? "";
    const name = rawName.join(" | ").trim();
    if (!/^[A-Z]{2}$/.test(code) || !/^\+[1-9][0-9]{0,3}$/.test(dial) || !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’()-]{1,59}$/u.test(name)) {
      throw new Error(`Formato inválido en “${line}”. Usa el código ISO de dos letras|PREFIJO|PAÍS, por ejemplo BO|+591|Bolivia.`);
    }
    return { code, dial, name };
  });
  const codes = options.map((item) => item.code);
  if (new Set(codes).size !== codes.length) throw new Error("No repitas el código ISO de dos letras del país.");
  return options;
}

export async function saveContractFormOptionsAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireSession(["admin"]);
  try {
    const propertyTypes = parseFormOptionList(String(fd.get("propertyTypes") ?? ""), "Tipos de inmueble");
    const identityCities = parseFormOptionList(String(fd.get("identityCities") ?? ""), "Ciudades de expedición");
    const countryCallingCodes = parseCountryCallingCodes(String(fd.get("countryCallingCodes") ?? ""));
    await setContractFormOptions({ propertyTypes, identityCities, countryCallingCodes });
    revalidatePath("/configuracion-contratos");
    revalidatePath("/contratos/nuevo");
    revalidatePath("/contratos/[id]", "page");
    return { ok: "Se guardaron las opciones del formulario de contratos." };
  } catch (error) {
    return { error: (error as Error).message };
  }
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

export async function markSignedContractNotificationReadAction(id: string) {
  const session = await requireSession(["asesor"]);
  await markSignedContractNotificationAsRead(id, session.username);
  revalidatePath("/contratos");
}

export async function uploadContractTemplateAction(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession(["legal", "admin"]);
  const type = String(fd.get("tipo") ?? "");
  const sourceId = String(fd.get("versionOrigen") ?? "").trim();
  const sourceVersion = sourceId ? await getTemplateVersion(sourceId) : null;
  if (sourceId && (!sourceVersion || sourceVersion.tipo !== type)) {
    return { error: "La versión base no existe o no corresponde a este modelo de contrato." };
  }
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
      "owners",
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
    if (sourceVersion) {
      const ownerTags = new Set([
        "owner1.fullName", "owner1.identityNumber", "owner1.identityIssuedIn", "owner1.address", "owner1.email", "owner1.whatsapp",
        "owner2.fullName", "owner2.identityNumber", "owner2.identityIssuedIn", "owner2.address", "owner2.email", "owner2.whatsapp",
      ]);
      const replacedByOwnersList = tags.includes("owners");
      const removed = sourceVersion.tags.filter((tag) => !tags.includes(tag) && !(replacedByOwnersList && ownerTags.has(tag)));
      if (removed.length) return { error: `La revisión debe conservar los marcadores de la versión base: ${removed.map((tag) => `{{${tag}}}`).join(", ")}` };
    }
    await createTemplateVersion({ tipo: type, fileName: file.name, contentBase64: buffer.toString("base64"), tags, uploadedBy: session.username });
    revalidatePath("/plantillas");
    return { ok: sourceVersion ? `Nueva versión creada como borrador. Se conservaron los marcadores de la versión ${sourceVersion.version}; revísala y actívala cuando esté aprobada.` : `Plantilla cargada. Se detectaron ${tags.length} marcadores; quedó como borrador para revisión legal.` };
  } catch (error) {
    return { error: `No se pudo leer la plantilla Word: ${(error as Error).message}` };
  }
}

export async function saveHtmlContractTemplateAction(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession(["legal", "admin"]);
  const tipo = String(fd.get("tipo") ?? "");
  const sourceId = String(fd.get("versionOrigen") ?? "").trim();
  const sourceVersion = sourceId ? await getTemplateVersion(sourceId) : null;
  const htmlContent = String(fd.get("htmlContent") ?? "").trim();
  const htmlStyles = String(fd.get("htmlStyles") ?? "").trim();
  const headerLogoLeft = String(fd.get("headerLogoLeft") ?? "").trim();
  const headerLogoRight = String(fd.get("headerLogoRight") ?? "").trim();
  if (sourceId && (!sourceVersion || sourceVersion.tipo !== tipo)) return { error: "La plantilla base no existe o corresponde a otro tipo de contrato." };
  if (Buffer.byteLength(htmlContent, "utf8") + Buffer.byteLength(htmlStyles, "utf8") + Buffer.byteLength(headerLogoLeft, "utf8") + Buffer.byteLength(headerLogoRight, "utf8") > 1_500_000) return { error: "El HTML, los estilos y las imágenes no pueden superar 1.5 MB en total." };
  if (!htmlContent || !/<[a-z][\s\S]*>/i.test(htmlContent)) return { error: "Escribe o convierte el contenido del contrato a HTML antes de guardar." };

  for (const [label, dataUrl] of [["izquierdo", headerLogoLeft], ["derecho", headerLogoRight]] as const) {
    if (!dataUrl) continue;
    const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) return { error: `El logotipo ${label} debe ser PNG, JPG o WebP válido.` };
    const imageBytes = Buffer.from(match[2], "base64");
    if (imageBytes.length > 300 * 1024) return { error: `El logotipo ${label} no puede superar 300 KB.` };
    const validSignature = match[1] === "png"
      ? imageBytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      : match[1] === "jpeg"
        ? imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff
        : imageBytes.subarray(0, 4).toString("ascii") === "RIFF" && imageBytes.subarray(8, 12).toString("ascii") === "WEBP";
    if (!validSignature) return { error: `El archivo del logotipo ${label} no coincide con su formato de imagen.` };
  }

  const typeDefinition = CONTRACT_TYPES.find((item) => item.id === tipo && item.templateBased);
  if (!typeDefinition) return { error: "Selecciona uno de los cuatro modelos de exclusividad." };
  const supported = new Set([
    "owner1.fullName", "owner1.identityNumber", "owner1.identityIssuedIn", "owner1.address", "owner1.email", "owner1.whatsapp",
    "owner2.fullName", "owner2.identityNumber", "owner2.identityIssuedIn", "owner2.address", "owner2.email", "owner2.whatsapp",
    "owners", "number", "fullName", "identityNumber", "identityIssuedIn", "address", "email", "whatsapp", "separator",
    "property.reference", "property.name", "property.class", "property.activity", "property.department", "property.province",
    "property.municipality", "property.hectares", "property.executorialTitle", "property.cadastralPlan", "property.registry",
    "property.cadastralCertificate", "property.zone", "property.uv", "property.block", "property.lot", "property.type", "property.address",
    "property.landArea", "property.builtArea", "property.bedroomCount", "property.suiteCount", "property.otherDetails", "property.liens",
    "advisor.fullName", "advisor.identityNumber", "advisor.identityIssuedIn", "advisor.address", "advisor.mobile", "advisor.whatsapp", "advisor.email",
    "contract.id", "contract.type", "contract.amount", "contract.amountNumeric", "contract.amountInWords", "contract.amountPerHectare",
    "contract.currency", "contract.currencyName", "contract.currencySymbol", "contract.date", "contract.dateRaw", "contract.commission", "contract.status",
    "client.name", "client.document", "propertyName", "amount", "currency", "currencyName", "currencySymbol", "date",
    ...typeDefinition.extras.map((field) => `extras.${field.key}`),
  ]);
  const { tags, unsupported } = validateHtmlTemplateMarkers(htmlContent, supported);
  if (unsupported.length) return { error: `Marcadores HTML sin correspondencia para este modelo: ${unsupported.map((tag) => `{{${tag}}}`).join(", ")}` };
  if (!tags.length) return { error: "Incluye marcadores del contrato para vincular los datos registrados por el asesor." };

  try {
    const templateVersions = await listTemplateVersions(tipo);
    const sourceWordVersion = sourceVersion?.sourceDocxVersionId || sourceVersion?.contentBase64
      ? null
      : templateVersions
        .filter((item) => item.version < (sourceVersion?.version ?? Number.POSITIVE_INFINITY) && item.contentBase64 && !item.htmlContent)
        .sort((a, b) => b.version - a.version)[0];
    const sourceDocxVersionId = sourceVersion?.sourceDocxVersionId ?? (sourceVersion?.contentBase64 ? sourceVersion.id : sourceWordVersion?.id);
    const sourceDocxFileName = sourceVersion?.sourceDocxFileName
      ?? (sourceVersion?.contentBase64 ? sourceVersion.fileName : undefined)
      ?? sourceWordVersion?.fileName;
    const version = await createTemplateVersion({
      tipo,
      fileName: sourceVersion?.fileName.replace(/\.docx$/i, ".html") ?? `Contrato ${typeDefinition.label}.html`,
      htmlContent,
      htmlStyles,
      sourceDocxVersionId,
      sourceDocxFileName,
      headerLogoLeft: headerLogoLeft || undefined,
      headerLogoRight: headerLogoRight || undefined,
      format: "html",
      tags,
      uploadedBy: session.username,
    });
    revalidatePath("/plantillas");
    return { ok: `Nueva versión HTML v${version.version} creada como borrador. Revísala y actívala para usarla en contratos nuevos.` };
  } catch (error) {
    return { error: (error as Error).message };
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

export async function deleteContractTemplateAction(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireSession(["legal", "admin"]);
  const id = String(fd.get("id") ?? "").trim();
  if (!id) return { error: "No se indicó la versión que se eliminará." };
  try {
    const version = await getTemplateVersion(id);
    if (!version) return { error: "La versión ya no existe o fue eliminada." };
    if (version.status === "activa") return { error: "No se puede eliminar la versión activa. Activa otra versión primero." };
    const templateVersions = await listTemplateVersions(version.tipo);
    if (templateVersions.some((item) => item.sourceDocxVersionId === id)) {
      return { error: "Esta versión Word es la fuente de una plantilla HTML y se conserva para que la descarga Word siga disponible." };
    }
    const contracts = await listContracts();
    if (contracts.some((contract) => contract.templateVersionId === id)) {
      return { error: "Esta versión está asociada a contratos existentes y se conserva para mantener su vista previa y descarga." };
    }
    await deleteTemplateVersion(id);
    revalidatePath("/plantillas");
    return { ok: `Se eliminó la versión ${version.version} de ${version.tipo}.` };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
