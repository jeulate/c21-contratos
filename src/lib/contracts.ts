import { redis } from "./redis";
import { CONTRACT_TYPES } from "./contract-types";
import type { AdvisorProfile } from "./users";

export type Contract = {
  id: string;
  tipo: string;
  estado: string;
  asesor: string; // username
  asesorNombre: string;
  asesorProfileSnapshot?: AdvisorProfile;
  templateVersionId?: string;
  cliente: string;
  clienteDoc: string;
  propiedad: string;
  monto: number;
  moneda: string;
  fecha: string; // yyyy-mm-dd
  comision: number; // %
  notas: string;
  extras: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  history: { at: string; by: string; changes: string[] }[];
};

const ck = (id: string) => `contract:${id}`;

export const getContract = (id: string) => redis.get<Contract>(ck(id));

export async function listContracts(opts?: { asesor?: string }): Promise<Contract[]> {
  const idx = opts?.asesor ? `contracts:by:${opts.asesor}` : "contracts:all";
  const ids = await redis.zrange<string[]>(idx, 0, -1, { rev: true });
  if (!ids.length) return [];
  const rows = await redis.mget<(Contract | null)[]>(...ids.map(ck));
  return rows.filter((c): c is Contract => !!c);
}

export type ContractInput = Omit<
  Contract,
  "id" | "asesor" | "asesorNombre" | "asesorProfileSnapshot" | "templateVersionId" | "createdAt" | "updatedAt" | "updatedBy" | "history"
>;

export async function createContract(
  input: ContractInput,
  by: { username: string; name: string },
  advisorProfile?: AdvisorProfile,
  templateVersionId?: string,
) {
  const id = crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const c: Contract = {
    ...input,
    id,
    asesor: by.username,
    asesorNombre: by.name,
    ...(advisorProfile ? { asesorProfileSnapshot: { ...advisorProfile } } : {}),
    ...(templateVersionId ? { templateVersionId } : {}),
    createdAt: now,
    updatedAt: now,
    updatedBy: by.username,
    history: [{ at: now, by: by.username, changes: ["Contrato creado"] }],
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

const STATUS_TRANSITIONS: Record<string, string[]> = {
  borrador: ["revision", "anulado"],
  revision: ["borrador", "firmado", "anulado"],
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
  const next: Contract = {
    ...current,
    estado: nextState,
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
  return null;
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
