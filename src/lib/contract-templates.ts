import { redis } from "./redis";
import { TEMPLATE_CONTRACT_TYPES } from "./contract-types";

export type TemplateType = (typeof TEMPLATE_CONTRACT_TYPES)[number]["id"];
export type TemplateStatus = "borrador" | "activa" | "archivada";

export type ContractTemplateVersion = {
  id: string;
  tipo: TemplateType;
  version: number;
  fileName: string;
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  contentBase64: string;
  tags: string[];
  status: TemplateStatus;
  uploadedBy: string;
  createdAt: string;
  activatedAt?: string;
  activatedBy?: string;
};

const templateKey = (id: string) => `contract-template:${id}`;
const indexKey = (type: TemplateType) => `contract-templates:${type}`;
const activeKey = (type: TemplateType) => `contract-template-active:${type}`;
const isTemplateType = (type: string): type is TemplateType => TEMPLATE_CONTRACT_TYPES.some((item) => item.id === type);

export async function listTemplateVersions(type: string) {
  if (!isTemplateType(type)) return [];
  const ids = await redis.zrange<string[]>(indexKey(type), 0, -1, { rev: true });
  if (!ids.length) return [];
  const versions = await redis.mget<(ContractTemplateVersion | null)[]>(...ids.map(templateKey));
  return versions.filter((version): version is ContractTemplateVersion => !!version);
}

export async function getTemplateVersion(id: string) {
  return redis.get<ContractTemplateVersion>(templateKey(id));
}

export async function getActiveTemplate(type: string) {
  if (!isTemplateType(type)) return null;
  const id = await redis.get<string>(activeKey(type));
  return id ? getTemplateVersion(id) : null;
}

export async function createTemplateVersion(input: {
  tipo: string;
  fileName: string;
  contentBase64: string;
  tags: string[];
  uploadedBy: string;
}) {
  if (!isTemplateType(input.tipo)) throw new Error("Tipo de plantilla inválido");
  const versions = await listTemplateVersions(input.tipo);
  const now = new Date().toISOString();
  const version: ContractTemplateVersion = {
    id: crypto.randomUUID(),
    tipo: input.tipo,
    version: Math.max(0, ...versions.map((item) => item.version)) + 1,
    fileName: input.fileName,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    contentBase64: input.contentBase64,
    tags: input.tags,
    status: "borrador",
    uploadedBy: input.uploadedBy,
    createdAt: now,
  };
  await Promise.all([
    redis.set(templateKey(version.id), version),
    redis.zadd(indexKey(input.tipo), { score: Date.now(), member: version.id }),
  ]);
  return version;
}

export async function activateTemplateVersion(id: string, by: string) {
  const next = await getTemplateVersion(id);
  if (!next) throw new Error("Versión de plantilla no encontrada");
  const previous = await getActiveTemplate(next.tipo);
  const now = new Date().toISOString();
  if (previous && previous.id !== next.id) {
    await redis.set(templateKey(previous.id), { ...previous, status: "archivada" });
  }
  const activated = { ...next, status: "activa" as const, activatedAt: now, activatedBy: by };
  await Promise.all([
    redis.set(templateKey(next.id), activated),
    redis.set(activeKey(next.tipo), next.id),
  ]);
  return activated;
}
