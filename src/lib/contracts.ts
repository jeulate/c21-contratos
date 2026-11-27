import { redis } from "./redis";
import { CONTRACT_TYPES } from "./contract-types";
import type { AdvisorProfile } from "./users";
import type { ContractEvidence } from "./contract-evidence";

export type Contract = {
  id: string;
  tipo: string;
  estado: string;
  observacion?: string;
  observations?: ContractObservation[];
  evidencias?: ContractEvidence[];
  evidenciasFirmadas?: ContractEvidence[];
  signedEvidenceStatus?: "locked" | "reupload-requested";
  signedEvidenceReplacementsPending?: number;
  asesor: string; // username
  asesorNombre: string;
  asesorProfileSnapshot?: AdvisorProfile;
  templateVersionId?: string;
  cliente: string;
  clienteDoc: string;
  additionalOwners?: AdditionalContractOwner[];
  propiedad: string;
  monto: number;
  moneda: string;
  monedaNombre?: string;
  monedaSingular?: string;
  monedaSimbolo?: string;
  fecha: string; // yyyy-mm-dd
  vigenciaCantidad?: number;
  vigenciaUnidad?: "dias" | "meses" | "años";
  vigenciaEnPalabras?: string;
  comision: number; // %
  notas: string;
  extras: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  history: { at: string; by: string; changes: string[] }[];
};

export type AdditionalContractOwner = {
  fullName: string;
  identityNumber: string;
  identityIssuedIn: string;
  address: string;
};

export type ContractObservation = {
  id: string;
  message: string;
  by: string;
  at: string;
  resolvedAt?: string;
  resolvedBy?: string;
  kind?: "signed-evidence";
};

const ck = (id: string) => `contract:${id}`;

export const getContract = (id: string) => redis.get<Contract>(ck(id));

const signedNotificationReadKey = (username: string) => `contract-notifications:signed:read:${username}`;

export const listReadSignedContractNotifications = (username: string) =>
  redis.smembers(signedNotificationReadKey(username));

export async function markSignedContractNotificationAsRead(id: string, username: string) {
  const contract = await getContract(id);
  if (!contract || contract.asesor !== username || contract.estado !== "firmado") {
    throw new Error("No se pudo confirmar la lectura de esta notificación.");
  }
  await redis.sadd(signedNotificationReadKey(username), id);
}

export async function listContracts(opts?: { asesor?: string }): Promise<Contract[]> {
  const idx = opts?.asesor ? `contracts:by:${opts.asesor}` : "contracts:all";
  const ids = await redis.zrange<string[]>(idx, 0, -1, { rev: true });
  if (!ids.length) return [];
  const rows = await redis.mget<(Contract | null)[]>(...ids.map(ck));
  return rows.filter((c): c is Contract => !!c);
}

export type ContractInput = Omit<
  Contract,
  | "id" | "asesor" | "asesorNombre" | "asesorProfileSnapshot" | "templateVersionId" | "evidencias"
  | "createdAt" | "updatedAt" | "updatedBy" | "history"
>;

export async function createContract(
  input: ContractInput,
  by: { username: string; name: string },
  advisorProfile?: AdvisorProfile,
  templateVersionId?: string,
  options?: { id?: string; evidencias?: ContractEvidence[] },
) {
  const id = options?.id ?? crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const c: Contract = {
    ...input,
    id,
    asesor: by.username,
    asesorNombre: by.name,
    ...(advisorProfile ? { asesorProfileSnapshot: { ...advisorProfile } } : {}),
    ...(templateVersionId ? { templateVersionId } : {}),
    ...(options?.evidencias?.length ? { evidencias: options.evidencias } : {}),
    createdAt: now,
    updatedAt: now,
    updatedBy: by.username,
    history: [{ at: now, by: by.username, changes: ["Contrato creado y enviado a revisión legal"] }],
  };
  const score = Date.now();
  await Promise.all([
    redis.set(ck(id), c),
    redis.zadd("contracts:all", { score, member: id }),
    redis.zadd(`contracts:by:${by.username}`, { score, member: id }),
  ]);
  return c;
}

export async function updateContract(id: string, input: ContractInput, by: string) {
  const prev = await getContract(id);
  if (!prev) throw new Error("Contrato no encontrado");
  const changes: string[] = [];
  (Object.keys(input) as (keyof ContractInput)[]).forEach((k) => {
    if (JSON.stringify(prev[k]) !== JSON.stringify(input[k])) changes.push(String(k));
  });
  if (!changes.length) return prev;
  const now = new Date().toISOString();
  const next: Contract = {
    ...prev,
    ...input,
    updatedAt: now,
    updatedBy: by,
    history: [...prev.history, { at: now, by, changes: changes.map((c) => `Editó ${c}`) }].slice(-50),
  };
  await redis.set(ck(id), next);
  return next;
}

export function isSignedEvidenceSubmissionLocked(contract: Contract) {
  if (contract.signedEvidenceStatus === "reupload-requested") return false;
  if (contract.signedEvidenceStatus === "locked") return true;
  return (contract.evidenciasFirmadas?.length ?? 0) > 0;
}

export async function submitSignedContractEvidence(id: string, evidences: ContractEvidence[], by: string, byName: string) {
  const contract = await getContract(id);
  if (!contract) throw new Error("Contrato no encontrado.");
  if (contract.estado !== "firmado") throw new Error("Las fotografías finales solo se pueden adjuntar a contratos firmados.");
  if (isSignedEvidenceSubmissionLocked(contract)) throw new Error("El respaldo firmado está bloqueado hasta que Legal o Administración solicite un reemplazo.");
  if (!evidences.length || evidences.length > 20) throw new Error("Guarda entre 1 y 20 fotografías por envío.");
  const replacementsPending = contract.signedEvidenceReplacementsPending ?? 0;
  if (replacementsPending > 0 && evidences.length !== replacementsPending) {
    throw new Error(`Legal o Administración solicitó reemplazar ${replacementsPending} fotografía${replacementsPending === 1 ? "" : "s"}. Carga esa cantidad para completar la revisión.`);
  }
  const current = contract.evidenciasFirmadas ?? [];
  if (current.length + evidences.length > 20) throw new Error("Este contrato solo admite 20 fotografías firmadas en total.");
  if (new Set(evidences.map((item) => item.id)).size !== evidences.length || evidences.some((evidence) => current.some((item) => item.id === evidence.id))) {
    throw new Error("Una o más fotografías ya están asociadas al contrato.");
  }

  const now = new Date().toISOString();
  const observations = (contract.observations ?? []).map((observation) => observation.kind === "signed-evidence" && !observation.resolvedAt
    ? { ...observation, resolvedAt: now, resolvedBy: by }
    : observation);
  const next: Contract = {
    ...contract,
    evidenciasFirmadas: [...current, ...evidences.map((evidence) => ({ ...evidence, uploadedBy: by, uploadedByName: byName }))],
    signedEvidenceStatus: "locked",
    signedEvidenceReplacementsPending: 0,
    observations,
    updatedAt: now,
    updatedBy: by,
    history: [...contract.history, { at: now, by, changes: [`Guardó ${evidences.length} fotografía${evidences.length === 1 ? "" : "s"} del contrato firmado y bloqueó la carga`] }].slice(-50),
  };
  await redis.set(ck(id), next);
  return next;
}

export async function requestSignedEvidenceReplacement(id: string, evidenceId: string, by: string) {
  const contract = await getContract(id);
  if (!contract) throw new Error("Contrato no encontrado.");
  if (contract.estado !== "firmado") throw new Error("Solo se pueden revisar respaldos de contratos firmados.");
  const current = contract.evidenciasFirmadas ?? [];
  const removed = current.find((item) => item.id === evidenceId);
  if (!removed) throw new Error("La fotografía ya no está asociada al contrato.");

  const now = new Date().toISOString();
  const message = `Legal o Administración solicita reemplazar la fotografía «${removed.fileName}» del contrato firmado. Se habilitó nuevamente la carga para que adjuntes una imagen legible y guardes el respaldo actualizado.`;
  const observation: ContractObservation = { id: crypto.randomUUID(), message, by, at: now, kind: "signed-evidence" };
  const next: Contract = {
    ...contract,
    evidenciasFirmadas: current.filter((item) => item.id !== evidenceId),
    signedEvidenceStatus: "reupload-requested",
    signedEvidenceReplacementsPending: (contract.signedEvidenceReplacementsPending ?? 0) + 1,
    observations: [...(contract.observations ?? []), observation],
    updatedAt: now,
    updatedBy: by,
    history: [...contract.history, { at: now, by, changes: [`Solicitó reemplazar fotografía firmada: ${removed.fileName}`] }].slice(-50),
  };
  await redis.set(ck(id), next);
  return { contract: next, removed };
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  borrador: ["revision", "anulado"],
  revision: ["observado", "firmado", "anulado"],
  observado: ["revision", "anulado"],
  firmado: [],
  anulado: [],
};

export const allowedContractTransitions = (estado: string) => STATUS_TRANSITIONS[estado] ?? [];

export async function changeContractState(id: string, nextState: string, by: string, comment: string) {
  const current = await getContract(id);
  if (!current) throw new Error("Contrato no encontrado");
  if (!allowedContractTransitions(current.estado).includes(nextState)) {
    throw new Error("La transición solicitada no está permitida para el estado actual.");
  }
  const now = new Date().toISOString();
  let observations = current.observations ?? [];
  if (nextState === "observado") {
    observations = [...observations, { id: crypto.randomUUID(), message: comment, by, at: now }];
  } else if (current.estado === "observado" && nextState === "revision") {
    if (!observations.length && current.observacion) {
      observations = [{ id: crypto.randomUUID(), message: current.observacion, by: current.updatedBy, at: current.updatedAt }];
    }
    const lastOpenIndex = observations.findLastIndex((observation) => !observation.resolvedAt);
    if (lastOpenIndex >= 0) {
      observations = observations.map((observation, index) => index === lastOpenIndex
        ? { ...observation, resolvedAt: now, resolvedBy: by }
        : observation);
    }
  }
  const next: Contract = {
    ...current,
    estado: nextState,
    observacion: nextState === "observado" ? comment : undefined,
    observations,
    updatedAt: now,
    updatedBy: by,
    history: [
      ...current.history,
      { at: now, by, changes: [`Cambió estado de ${current.estado} a ${nextState}`, `Motivo: ${comment}`] },
    ].slice(-50),
  };
  await redis.set(ck(id), next);
  return next;
}

export function validateExtras(tipo: string, extras: Record<string, string>) {
  const t = CONTRACT_TYPES.find((x) => x.id === tipo);
  if (!t) return "Tipo de contrato inválido";
  for (const f of t.extras) if (f.required && !extras[f.key]?.trim()) return `Falta: ${f.label}`;
  for (const field of t.extras) {
    const value = extras[field.key]?.trim() ?? "";
    if (!value) continue;
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return `${field.label} debe tener un formato de correo válido`;
    }
    if (field.type === "number") {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) return `${field.label} debe ser un número igual o mayor a cero`;
      if (field.step === 1 && !Number.isInteger(number)) return `${field.label} debe ser un número entero`;
    }
    if (field.validation === "name" && !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]*$/u.test(value)) {
      return `${field.label} solo debe contener texto, espacios, apóstrofes, puntos o guiones`;
    }
    if (field.validation === "phone" && !/^\+?[0-9][0-9\s().-]{5,19}$/.test(value)) {
      return `${field.label} debe contener un número de teléfono válido`;
    }
    if (field.validation === "identity" && !/^[0-9]{4,12}(?:-(?=[A-Za-z0-9]{2,3}$)(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{2,3})?$/.test(value)) {
      return `${field.label} debe tener de 4 a 12 dígitos y, si incluye complemento, un guion seguido de 2 o 3 caracteres que combinen letras y números (ejemplo: 785462-1D)`;
    }
  }
  if (["exclusiva-venta", "exclusiva-alquiler", "exclusiva-anticretico"].includes(tipo) && extras.owner2Name?.trim()) {
    const secondOwnerRequired = [
      ["owner2IdentityNumber", "Cédula del segundo propietario"],
      ["owner2IssuedIn", "Lugar de expedición del segundo propietario"],
      ["owner2Address", "Domicilio del segundo propietario"],
    ] as const;
    for (const [key, label] of secondOwnerRequired) if (!extras[key]?.trim()) return `Falta: ${label}`;
  }
  return null;
}

const additionalOwnerIdentityPattern = /^[0-9]{4,12}(?:-(?=[A-Za-z0-9]{2,3}$)(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{2,3})?$/;
const additionalOwnerNamePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]*$/u;

export function validateAdditionalOwners(value: unknown): { owners?: AdditionalContractOwner[]; error?: string } {
  if (!Array.isArray(value)) return { error: "La lista de propietarios adicionales no tiene un formato válido." };
  if (value.length > 18) return { error: "Se permite registrar hasta 18 propietarios adicionales." };

  const owners: AdditionalContractOwner[] = [];
  for (const [index, candidate] of value.entries()) {
    const position = index + 3;
    if (!candidate || typeof candidate !== "object") return { error: `Revisa los datos del propietario ${position}.` };
    const row = candidate as Record<string, unknown>;
    const owner = {
      fullName: typeof row.fullName === "string" ? row.fullName.trim() : "",
      identityNumber: typeof row.identityNumber === "string" ? row.identityNumber.trim() : "",
      identityIssuedIn: typeof row.identityIssuedIn === "string" ? row.identityIssuedIn.trim() : "",
      address: typeof row.address === "string" ? row.address.trim() : "",
    };
    if (!owner.fullName || !owner.identityNumber || !owner.identityIssuedIn || !owner.address) {
      return { error: `Completa nombre, cédula, lugar de expedición y domicilio del propietario ${position}.` };
    }
    if (owner.fullName.length > 160 || !additionalOwnerNamePattern.test(owner.fullName)) {
      return { error: `El nombre del propietario ${position} debe contener solo texto, espacios, apóstrofes, puntos o guiones.` };
    }
    if (!additionalOwnerIdentityPattern.test(owner.identityNumber)) {
      return { error: `La cédula del propietario ${position} debe tener de 4 a 12 dígitos y, opcionalmente, un complemento como 785462-1D.` };
    }
    if (owner.identityIssuedIn.length > 100 || owner.address.length > 300) {
      return { error: `El lugar de expedición o domicilio del propietario ${position} supera la longitud permitida.` };
    }
    owners.push(owner);
  }
  return { owners };
}

export function buildStats(contracts: Contract[]) {
  const by = (fn: (c: Contract) => string) =>
    Object.entries(
      contracts.reduce<Record<string, number>>((acc, c) => ((acc[fn(c)] = (acc[fn(c)] ?? 0) + 1), acc), {}),
    ).sort((a, b) => b[1] - a[1]);
  const month = new Date().toISOString().slice(0, 7);
  const firmados = contracts.filter((c) => c.estado === "firmado");
  const sum = (list: Contract[], cur: string) => list.filter((c) => c.moneda === cur).reduce((s, c) => s + c.monto, 0);
  return {
    total: contracts.length,
    firmadosMes: firmados.filter((c) => c.fecha.startsWith(month)).length,
    enRevision: contracts.filter((c) => c.estado === "revision").length,
    montoFirmado: { USD: sum(firmados, "USD"), BOB: sum(firmados, "BOB") },
    porEstado: by((c) => c.estado),
    porTipo: by((c) => c.tipo),
    porAsesor: by((c) => c.asesorNombre),
    recientes: [...contracts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
  };
}
