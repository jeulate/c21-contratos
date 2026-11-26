import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_CONTRACT_EVIDENCE_BYTES, MAX_CONTRACT_EVIDENCE_IMAGES, MIN_CONTRACT_EVIDENCE_IMAGES } from "./contract-evidence-constants";

export { MAX_CONTRACT_EVIDENCE_BYTES, MAX_CONTRACT_EVIDENCE_IMAGES, MIN_CONTRACT_EVIDENCE_IMAGES } from "./contract-evidence-constants";

export type ContractEvidence = {
  id: string;
  fileName: string;
  mimeType: "image/webp" | "image/jpeg" | "image/png";
  size: number;
  uploadedAt: string;
};

type StagedEvidenceManifest = ContractEvidence;
type StorageMode = "local" | "bunny";
type BunnyDirectoryEntry = { ObjectName?: string; IsDirectory?: boolean; LastChanged?: string };

const evidenceRoot = () => path.resolve(process.env.CONTRACT_EVIDENCE_DIR ?? path.join(process.cwd(), "storage", "contract-evidence"));
const safeSegment = (value: string) => /^[a-zA-Z0-9._-]{1,80}$/.test(value) && !value.includes("..");
const extensionFor = (mimeType: ContractEvidence["mimeType"]) => ({ "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" })[mimeType];
const supportedMimeTypes: ContractEvidence["mimeType"][] = ["image/webp", "image/jpeg", "image/png"];
const MAX_ADVISOR_PHOTO_BYTES = 1024 * 1024;

const bunnyRegions: Record<string, string> = {
  de: "storage.bunnycdn.com",
  uk: "uk.storage.bunnycdn.com",
  ny: "ny.storage.bunnycdn.com",
  la: "la.storage.bunnycdn.com",
  sg: "sg.storage.bunnycdn.com",
  se: "se.storage.bunnycdn.com",
  br: "br.storage.bunnycdn.com",
  jh: "jh.storage.bunnycdn.com",
  syd: "syd.storage.bunnycdn.com",
};

function storageMode(): StorageMode {
  const configuredMode = process.env.CONTRACT_EVIDENCE_STORAGE;
  if (configuredMode === "local") {
    if (process.env.VERCEL) throw new Error("El almacenamiento local de evidencias no es persistente en Vercel. Configura Bunny Storage.");
    return "local";
  }
  if (configuredMode === "bunny") return "bunny";
  if (configuredMode) throw new Error("CONTRACT_EVIDENCE_STORAGE debe ser 'local' o 'bunny'.");
  // Vercel's filesystem is ephemeral. Prefer a clear configuration error over silently losing evidence.
  return process.env.VERCEL ? "bunny" : "local";
}

function bunnyConfig() {
  const zone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const password = process.env.BUNNY_STORAGE_PASSWORD?.trim();
  const region = (process.env.BUNNY_STORAGE_REGION ?? "de").trim().toLowerCase();
  const endpoint = bunnyRegions[region];
  if (!zone || !/^[a-z0-9-]{2,64}$/i.test(zone) || !password || !endpoint) {
    throw new Error("Bunny Storage no está configurado. Revisa BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD y BUNNY_STORAGE_REGION.");
  }
  return { zone, password, endpoint };
}

function bunnyUrl(key: string, directory = false) {
  const { zone, endpoint } = bunnyConfig();
  const segments = key.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Ruta de almacenamiento inválida.");
  }
  const encodedKey = segments.map(encodeURIComponent).join("/");
  return `https://${endpoint}/${encodeURIComponent(zone)}/${encodedKey}${directory ? "/" : ""}`;
}

async function bunnyRequest(key: string, method: "GET" | "PUT" | "DELETE", body?: Buffer, directory = false) {
  const { password } = bunnyConfig();
  const requestBody = body ? Uint8Array.from(body) : undefined;
  const response = await fetch(bunnyUrl(key, directory), {
    method,
    headers: {
      AccessKey: password,
      ...(body ? { "Content-Type": "application/octet-stream" } : {}),
    },
    body: requestBody,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`Bunny Storage respondió ${response.status}${detail ? `: ${detail}` : ""}.`);
  }
  return response;
}

async function bunnyPut(key: string, bytes: Buffer) {
  await bunnyRequest(key, "PUT", bytes);
}

async function bunnyRead(key: string) {
  const response = await bunnyRequest(key, "GET");
  return Buffer.from(await response.arrayBuffer());
}

async function bunnyDelete(key: string, ignoreMissing = false) {
  try {
    await bunnyRequest(key, "DELETE");
  } catch (error) {
    if (ignoreMissing && error instanceof Error && error.message.includes("respondió 404")) return;
    throw error;
  }
}

async function bunnyList(directoryKey: string): Promise<BunnyDirectoryEntry[]> {
  const response = await bunnyRequest(directoryKey, "GET", undefined, true);
  const entries: unknown = await response.json();
  if (!Array.isArray(entries)) throw new Error("Bunny Storage devolvió una lista de archivos inválida.");
  return entries.filter((entry): entry is BunnyDirectoryEntry => Boolean(entry && typeof entry === "object"));
}

export function isEvidenceIdentifier(value: string) {
  return /^[a-f0-9-]{36}$/i.test(value);
}

function userStagingDirectory(username: string, sessionId: string) {
  if (!safeSegment(username) || !isEvidenceIdentifier(sessionId)) throw new Error("Identificador de carga inválido.");
  return path.join(evidenceRoot(), "staging", username, sessionId);
}

function userStagingKey(username: string, sessionId: string) {
  if (!safeSegment(username) || !isEvidenceIdentifier(sessionId)) throw new Error("Identificador de carga inválido.");
  return `staging/${username}/${sessionId}`;
}

function contractKey(contractId: string) {
  if (!safeSegment(contractId)) throw new Error("Identificador de contrato inválido.");
  return `contracts/${contractId}`;
}

function manifestFromJSON(contents: string, id: string): StagedEvidenceManifest {
  let manifest: StagedEvidenceManifest;
  try {
    manifest = JSON.parse(contents) as StagedEvidenceManifest;
  } catch {
    throw new Error("Los datos temporales de una imagen no son válidos.");
  }
  if (!manifest || manifest.id !== id || !supportedMimeTypes.includes(manifest.mimeType) || !Number.isInteger(manifest.size) || manifest.size <= 0 || manifest.size > MAX_CONTRACT_EVIDENCE_BYTES || typeof manifest.fileName !== "string" || typeof manifest.uploadedAt !== "string") {
    throw new Error("Una de las imágenes no es válida o supera el tamaño permitido.");
  }
  return manifest;
}

export async function saveStagedContractEvidence(
  username: string,
  sessionId: string,
  id: string,
  fileName: string,
  mimeType: ContractEvidence["mimeType"],
  bytes: Buffer,
) {
  if (!isEvidenceIdentifier(id)) throw new Error("Identificador de imagen inválido.");
  if (!supportedMimeTypes.includes(mimeType)) throw new Error("El formato de imagen no es válido.");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CONTRACT_EVIDENCE_BYTES) throw new Error("La imagen comprimida debe pesar como máximo 1 MB.");

  await cleanupExpiredStaging(username);
  const manifest: StagedEvidenceManifest = {
    id,
    fileName: path.basename(fileName).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 140) || `respaldo.${extensionFor(mimeType)}`,
    mimeType,
    size: bytes.byteLength,
    uploadedAt: new Date().toISOString(),
  };
  const extension = extensionFor(mimeType);

  if (storageMode() === "bunny") {
    const base = `${userStagingKey(username, sessionId)}/${id}`;
    await bunnyPut(`${base}.${extension}`, bytes);
    try {
      await bunnyPut(`${base}.json`, Buffer.from(JSON.stringify(manifest)));
    } catch (error) {
      await bunnyDelete(`${base}.${extension}`, true);
      throw error;
    }
    return manifest;
  }

  const directory = userStagingDirectory(username, sessionId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const base = path.join(directory, id);
  await writeFile(`${base}.${extension}`, bytes, { flag: "wx", mode: 0o600 });
  try {
    await writeFile(`${base}.json`, JSON.stringify(manifest), { flag: "wx", mode: 0o600 });
  } catch (error) {
    await rm(`${base}.${extension}`, { force: true });
    throw error;
  }
  return manifest;
}

export async function deleteStagedContractEvidence(username: string, sessionId: string, id: string) {
  if (!isEvidenceIdentifier(id)) return;
  if (storageMode() === "bunny") {
    const base = `${userStagingKey(username, sessionId)}/${id}`;
    await Promise.all(["webp", "jpg", "png", "json"].map((extension) => bunnyDelete(`${base}.${extension}`, true)));
    return;
  }
  const directory = userStagingDirectory(username, sessionId);
  await Promise.all(["webp", "jpg", "png", "json"].map((extension) => rm(path.join(directory, `${id}.${extension}`), { force: true })));
}

export async function finalizeStagedContractEvidence(
  username: string,
  sessionId: string,
  contractId: string,
  evidenceIds: string[],
): Promise<ContractEvidence[]> {
  if (!safeSegment(contractId) || evidenceIds.length < MIN_CONTRACT_EVIDENCE_IMAGES || evidenceIds.length > MAX_CONTRACT_EVIDENCE_IMAGES) {
    throw new Error(`Adjunta entre ${MIN_CONTRACT_EVIDENCE_IMAGES} y ${MAX_CONTRACT_EVIDENCE_IMAGES} imágenes de respaldo.`);
  }
  if (new Set(evidenceIds).size !== evidenceIds.length || evidenceIds.some((id) => !isEvidenceIdentifier(id))) {
    throw new Error("La lista de imágenes contiene identificadores inválidos.");
  }

  const mode = storageMode();
  const staged = userStagingKey(username, sessionId);
  const final = contractKey(contractId);
  const manifests = await Promise.all(evidenceIds.map(async (id) => {
    let manifestContents: string;
    if (mode === "bunny") {
      try {
        manifestContents = (await bunnyRead(`${staged}/${id}.json`)).toString("utf8");
      } catch {
        throw new Error("No se encontró una de las imágenes temporales. Vuelve a cargarla antes de crear el contrato.");
      }
      const manifest = manifestFromJSON(manifestContents, id);
      const extension = extensionFor(manifest.mimeType);
      let bytes: Buffer;
      try {
        bytes = await bunnyRead(`${staged}/${id}.${extension}`);
      } catch {
        throw new Error("No se encontró una de las imágenes cargadas.");
      }
      if (bytes.byteLength !== manifest.size) throw new Error("Una de las imágenes no coincide con los datos cargados.");
      return { manifest, extension, bytes };
    }

    const directory = userStagingDirectory(username, sessionId);
    try {
      manifestContents = await readFile(path.join(directory, `${id}.json`), "utf8");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        throw new Error("No se encontró una de las imágenes temporales. Vuelve a cargarla antes de crear el contrato.");
      }
      throw error;
    }
    const manifest = manifestFromJSON(manifestContents, id);
    const extension = extensionFor(manifest.mimeType);
    const sourcePath = path.join(directory, `${id}.${extension}`);
    const sourceStat = await stat(sourcePath);
    if (!sourceStat.isFile() || sourceStat.size !== manifest.size) throw new Error("No se encontró una de las imágenes cargadas.");
    return { manifest, extension, sourcePath };
  }));

  if (mode === "bunny") {
    const uploaded: string[] = [];
    try {
      for (const { manifest, extension, bytes } of manifests) {
        const key = `${final}/${manifest.id}.${extension}`;
        await bunnyPut(key, bytes!);
        uploaded.push(key);
      }
    } catch (error) {
      await Promise.all(uploaded.map((key) => bunnyDelete(key, true)));
      throw error;
    }
    try {
      await bunnyDelete(staged, true);
    } catch {
      // A failed cleanup leaves only temporary objects; it must not invalidate a saved contract.
    }
    return manifests.map(({ manifest }) => manifest);
  }

  const finalDirectory = path.join(evidenceRoot(), "contracts", contractId);
  await mkdir(finalDirectory, { recursive: true, mode: 0o700 });
  try {
    await Promise.all(manifests.map(({ manifest, sourcePath, extension }) =>
      copyFile(sourcePath!, path.join(finalDirectory, `${manifest.id}.${extension}`))));
    await rm(userStagingDirectory(username, sessionId), { recursive: true, force: true });
  } catch (error) {
    await rm(finalDirectory, { recursive: true, force: true });
    throw error;
  }
  return manifests.map(({ manifest }) => manifest);
}

export async function removeContractEvidenceFiles(contractId: string) {
  if (!safeSegment(contractId)) return;
  if (storageMode() === "bunny") {
    await bunnyDelete(contractKey(contractId), true);
    return;
  }
  await rm(path.join(evidenceRoot(), "contracts", contractId), { recursive: true, force: true });
}

export async function readContractEvidenceFile(contractId: string, evidence: ContractEvidence) {
  if (!safeSegment(contractId) || !isEvidenceIdentifier(evidence.id) || !supportedMimeTypes.includes(evidence.mimeType)) throw new Error("Identificador de archivo inválido.");
  const key = `${contractKey(contractId)}/${evidence.id}.${extensionFor(evidence.mimeType)}`;
  if (storageMode() === "bunny") return bunnyRead(key);
  return readFile(path.join(evidenceRoot(), "contracts", contractId, `${evidence.id}.${extensionFor(evidence.mimeType)}`));
}

function advisorPhotoKey(username: string, id: string, mimeType: ContractEvidence["mimeType"]) {
  if (!safeSegment(username) || !isEvidenceIdentifier(id) || !supportedMimeTypes.includes(mimeType)) {
    throw new Error("Identificador de foto de perfil inválido.");
  }
  return `advisors/${username.toLowerCase()}/${id}.${extensionFor(mimeType)}`;
}

export async function saveAdvisorProfilePhoto(username: string, id: string, mimeType: ContractEvidence["mimeType"], bytes: Buffer) {
  if (!supportedMimeTypes.includes(mimeType) || bytes.byteLength === 0 || bytes.byteLength > MAX_ADVISOR_PHOTO_BYTES) {
    throw new Error("La foto debe ser JPG, PNG o WebP y pesar como máximo 1 MB.");
  }
  const key = advisorPhotoKey(username, id, mimeType);
  if (storageMode() === "bunny") {
    await bunnyPut(key, bytes);
    return;
  }
  const filePath = path.join(evidenceRoot(), ...key.split("/"));
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
}

export async function readAdvisorProfilePhoto(username: string, id: string, mimeType: ContractEvidence["mimeType"]) {
  const key = advisorPhotoKey(username, id, mimeType);
  if (storageMode() === "bunny") return bunnyRead(key);
  return readFile(path.join(evidenceRoot(), ...key.split("/")));
}

async function cleanupExpiredStaging(username: string) {
  if (!safeSegment(username)) return;
  const expireBefore = Date.now() - 24 * 60 * 60 * 1000;
  if (storageMode() === "bunny") {
    try {
      const sessions = await bunnyList(`staging/${username}`);
      await Promise.all(sessions.filter((entry) => entry.IsDirectory && entry.ObjectName && isEvidenceIdentifier(entry.ObjectName) && entry.LastChanged && new Date(entry.LastChanged).getTime() < expireBefore).map((entry) =>
        bunnyDelete(`staging/${username}/${entry.ObjectName}`, true).catch(() => undefined)));
    } catch {
      // Cleanup is opportunistic and should never block a valid image upload.
    }
    return;
  }

  const userDirectory = path.join(evidenceRoot(), "staging", username);
  let sessions: string[];
  try {
    sessions = await readdir(userDirectory);
  } catch {
    return;
  }
  await Promise.all(sessions.filter(isEvidenceIdentifier).map(async (sessionId) => {
    const directory = path.join(userDirectory, sessionId);
    try {
      if ((await stat(directory)).mtimeMs < expireBefore) await rm(directory, { recursive: true, force: true });
    } catch {
      // La limpieza es oportunista; no debe impedir una carga válida.
    }
  }));
}
