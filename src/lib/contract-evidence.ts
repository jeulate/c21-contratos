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

const evidenceRoot = () => path.resolve(process.env.CONTRACT_EVIDENCE_DIR ?? path.join(process.cwd(), "storage", "contract-evidence"));
const safeSegment = (value: string) => /^[a-zA-Z0-9._-]{1,80}$/.test(value) && !value.includes("..");
const extensionFor = (mimeType: ContractEvidence["mimeType"]) => ({ "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" })[mimeType];

export function isEvidenceIdentifier(value: string) {
  return /^[a-f0-9-]{36}$/i.test(value);
}

function userStagingDirectory(username: string, sessionId: string) {
  if (!safeSegment(username) || !isEvidenceIdentifier(sessionId)) throw new Error("Identificador de carga inválido.");
  return path.join(evidenceRoot(), "staging", username, sessionId);
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
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CONTRACT_EVIDENCE_BYTES) throw new Error("La imagen comprimida debe pesar como máximo 1 MB.");

  await cleanupExpiredStaging(username);
  const directory = userStagingDirectory(username, sessionId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const manifest: StagedEvidenceManifest = {
    id,
    fileName: path.basename(fileName).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 140) || `respaldo.${extensionFor(mimeType)}`,
    mimeType,
    size: bytes.byteLength,
    uploadedAt: new Date().toISOString(),
  };
  const base = path.join(directory, id);
  await writeFile(`${base}.${extensionFor(mimeType)}`, bytes, { flag: "wx", mode: 0o600 });
  await writeFile(`${base}.json`, JSON.stringify(manifest), { flag: "wx", mode: 0o600 });
  return manifest;
}

export async function deleteStagedContractEvidence(username: string, sessionId: string, id: string) {
  if (!isEvidenceIdentifier(id)) return;
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

  const stagingDirectory = userStagingDirectory(username, sessionId);
  const finalDirectory = path.join(evidenceRoot(), "contracts", contractId);
  const manifests = await Promise.all(evidenceIds.map(async (id) => {
    const manifestPath = path.join(stagingDirectory, `${id}.json`);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as StagedEvidenceManifest;
    if (manifest.id !== id || !["image/webp", "image/jpeg", "image/png"].includes(manifest.mimeType) || manifest.size > MAX_CONTRACT_EVIDENCE_BYTES) {
      throw new Error("Una de las imágenes no es válida o supera el tamaño permitido.");
    }
    const extension = extensionFor(manifest.mimeType);
    const sourcePath = path.join(stagingDirectory, `${id}.${extension}`);
    const sourceStat = await stat(sourcePath);
    if (!sourceStat.isFile() || sourceStat.size !== manifest.size) throw new Error("No se encontró una de las imágenes cargadas.");
    return { manifest, sourcePath, extension };
  }));

  await mkdir(finalDirectory, { recursive: true, mode: 0o700 });
  try {
    await Promise.all(manifests.map(({ manifest, sourcePath, extension }) =>
      copyFile(sourcePath, path.join(finalDirectory, `${manifest.id}.${extension}`))));
    await rm(stagingDirectory, { recursive: true, force: true });
  } catch (error) {
    await rm(finalDirectory, { recursive: true, force: true });
    throw error;
  }
  return manifests.map(({ manifest }) => manifest);
}

export async function removeContractEvidenceFiles(contractId: string) {
  if (!safeSegment(contractId)) return;
  await rm(path.join(evidenceRoot(), "contracts", contractId), { recursive: true, force: true });
}

export async function readContractEvidenceFile(contractId: string, evidence: ContractEvidence) {
  if (!safeSegment(contractId) || !isEvidenceIdentifier(evidence.id)) throw new Error("Identificador de archivo inválido.");
  return readFile(path.join(evidenceRoot(), "contracts", contractId, `${evidence.id}.${extensionFor(evidence.mimeType)}`));
}

async function cleanupExpiredStaging(username: string) {
  if (!safeSegment(username)) return;
  const userDirectory = path.join(evidenceRoot(), "staging", username);
  let sessions: string[];
  try {
    sessions = await readdir(userDirectory);
  } catch {
    return;
  }
  const expireBefore = Date.now() - 24 * 60 * 60 * 1000;
  await Promise.all(sessions.filter(isEvidenceIdentifier).map(async (sessionId) => {
    const directory = path.join(userDirectory, sessionId);
    try {
      if ((await stat(directory)).mtimeMs < expireBefore) await rm(directory, { recursive: true, force: true });
    } catch {
      // La limpieza es oportunista; no debe impedir una carga válida.
    }
  }));
}
