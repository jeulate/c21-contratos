"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { saveSignedContractEvidenceAction, type FormState } from "@/app/actions";
import { MAX_CONTRACT_EVIDENCE_IMAGES } from "@/lib/contract-evidence-constants";
import { compressBrowserImageToWebp } from "@/lib/compress-browser-image";

type UploadPhoto = {
  id: string;
  name: string;
  previewUrl: string;
  status: "queued" | "compressing" | "uploading" | "staged" | "error";
  error?: string;
};

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function SignedContractEvidenceUploader({ contractId, existingCount, locked, replacementCount = 0 }: { contractId: string; existingCount: number; locked: boolean; replacementCount?: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [photos, setPhotos] = useState<UploadPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [actionState, setActionState] = useState<FormState>({});
  const stagedIds = photos.filter((photo) => photo.status === "staged").map((photo) => photo.id);
  const hasFailedPhotos = photos.some((photo) => photo.status === "error");
  const canSave = stagedIds.length > 0 && photos.length === stagedIds.length && !hasFailedPhotos && (replacementCount === 0 || stagedIds.length === replacementCount);
  const remaining = Math.max(0, MAX_CONTRACT_EVIDENCE_IMAGES - existingCount - photos.length);

  function updatePhoto(id: string, update: Partial<UploadPhoto>) {
    setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, ...update } : photo));
  }

  async function stagePhoto(photo: UploadPhoto, source: File) {
    try {
      updatePhoto(photo.id, { status: "compressing", error: undefined });
      const compressed = await compressBrowserImageToWebp(source);
      const previewUrl = URL.createObjectURL(compressed);
      setPhotos((current) => current.map((item) => {
        if (item.id !== photo.id) return item;
        URL.revokeObjectURL(item.previewUrl);
        return { ...item, previewUrl, name: compressed.name, status: "uploading" };
      }));

      const data = new FormData();
      data.append("sessionId", sessionId);
      data.append("id", photo.id);
      data.append("file", compressed, compressed.name);
      const response = await fetch("/api/contract-evidence/staging", { method: "POST", body: data });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "No se pudo preparar la fotografía.");
      }
      updatePhoto(photo.id, { status: "staged" });
      return true;
    } catch (error) {
      updatePhoto(photo.id, { status: "error", error: error instanceof Error ? error.message : "No se pudo preparar la fotografía." });
      return false;
    }
  }

  async function acceptFiles(fileList: FileList | File[]) {
    if (busy || locked) return;
    setSelectionError("");
    setActionState({});
    const selected = Array.from(fileList);
    const available = Math.max(0, Math.min(MAX_CONTRACT_EVIDENCE_IMAGES - existingCount - photos.length, replacementCount > 0 ? replacementCount - photos.length : Number.POSITIVE_INFINITY));
    const additions: { photo: UploadPhoto; file: File }[] = [];
    for (const file of selected) {
      if (additions.length >= available) break;
      if (!allowedTypes.has(file.type)) {
        setSelectionError("Usa fotografías JPG, PNG o WebP. Los archivos HEIC y SVG no están admitidos.");
        continue;
      }
      if (file.size > MAX_ORIGINAL_BYTES) {
        setSelectionError("Cada fotografía original debe pesar como máximo 20 MB.");
        continue;
      }
      additions.push({ file, photo: { id: crypto.randomUUID(), name: file.name, previewUrl: URL.createObjectURL(file), status: "queued" } });
    }
    if (selected.length > available) setSelectionError(replacementCount > 0
      ? `Legal o Administración solicitó ${replacementCount} fotografía${replacementCount === 1 ? "" : "s"} de reemplazo.`
      : `Puedes guardar hasta ${MAX_CONTRACT_EVIDENCE_IMAGES} fotografías firmadas en total.`);
    if (!additions.length) return;

    setPhotos((current) => [...current, ...additions.map(({ photo }) => photo)]);
    setBusy(true);
    for (const { photo, file } of additions) await stagePhoto(photo, file);
    setBusy(false);
  }

  function handleSelection(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void acceptFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void acceptFiles(event.dataTransfer.files);
  }

  async function removePhoto(photo: UploadPhoto) {
    if (busy) return;
    if (photo.status === "staged" || photo.status === "uploading") {
      await fetch(`/api/contract-evidence/staging?sessionId=${encodeURIComponent(sessionId)}&id=${encodeURIComponent(photo.id)}`, { method: "DELETE" });
    }
    URL.revokeObjectURL(photo.previewUrl);
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
  }

  async function confirmSave() {
    if (busy || stagedIds.length === 0 || hasFailedPhotos) return;
    setBusy(true);
    setActionState({});
    const data = new FormData();
    data.set("sessionId", sessionId);
    data.set("evidenceIds", JSON.stringify(stagedIds));
    const result = await saveSignedContractEvidenceAction(contractId, data);
    setActionState(result);
    setBusy(false);
    setConfirmOpen(false);
    if (result.ok) {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos([]);
      router.refresh();
    }
  }

  if (locked) return (
    <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10 sm:p-6">
      <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Respaldo enviado · carga bloqueada</h2>
      <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">Las fotografías quedaron guardadas. Para reemplazar alguna, espera la solicitud de Legal o Administración.</p>
    </section>
  );

  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Respaldo del contrato firmado</h2>
          <p className="mt-1 max-w-3xl text-xs text-ink-mute dark:text-carbon-400">Después de reunir las firmas, carga fotografías legibles de todas las páginas. Se comprimen a WebP; al guardarlas quedarán bloqueadas hasta que Legal o Administración solicite un reemplazo.</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-gold-500/15 dark:text-gold-100">{existingCount + stagedIds.length} / {MAX_CONTRACT_EVIDENCE_IMAGES} fotografías</span>
      </div>

      <div
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${dragging ? "border-gold-600 bg-gold-50 dark:bg-gold-500/10" : "border-stone-300 bg-stone-50/70 dark:border-carbon-700 dark:bg-carbon-950/40"}`}
      >
        <p className="text-sm font-semibold text-ink dark:text-white">Arrastra las fotografías aquí</p>
        <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">{replacementCount > 0 ? `Selecciona exactamente ${replacementCount} fotografía${replacementCount === 1 ? "" : "s"} para reemplazar las solicitadas.` : "JPG, PNG o WebP · hasta 20 MB originales por imagen."}</p>
        <button type="button" className="btn-ghost mt-4" onClick={() => inputRef.current?.click()} disabled={busy || remaining <= 0}>
          {busy ? "Procesando fotografías…" : remaining <= 0 ? "Límite alcanzado" : "Seleccionar fotografías"}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleSelection} />
      </div>
      {selectionError && <p role="alert" className="text-sm text-amber-800 dark:text-gold-200">{selectionError}</p>}

      {photos.length > 0 && <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => <li key={photo.id} className="flex min-w-0 gap-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-carbon-800 dark:bg-carbon-950/50">
          <Image src={photo.previewUrl} alt={`Vista previa de ${photo.name}`} width={96} height={96} unoptimized className="h-16 w-16 shrink-0 rounded-lg bg-stone-100 object-cover dark:bg-carbon-800" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-medium text-ink dark:text-carbon-100">{photo.name}</p><button type="button" onClick={() => void removePhoto(photo)} disabled={busy} className="text-xs font-semibold text-ink-mute hover:text-red-700 disabled:opacity-50 dark:text-carbon-400">Quitar</button></div>
            <p className="mt-1 text-[11px] text-ink-mute dark:text-carbon-400">{photo.status === "queued" ? "En espera" : photo.status === "compressing" ? "Comprimiendo a WebP…" : photo.status === "uploading" ? "Subiendo temporalmente…" : photo.status === "staged" ? "Lista para guardar" : "No se pudo preparar"}</p>
            {photo.error && <p role="alert" className="mt-1 text-[11px] text-red-700 dark:text-red-300">{photo.error}</p>}
          </div>
        </li>)}
      </ul>}

      {stagedIds.length > 0 && <button type="button" className="btn" disabled={busy || !canSave} onClick={() => setConfirmOpen(true)}>Guardar imágenes</button>}
      {replacementCount > 0 && stagedIds.length > 0 && stagedIds.length !== replacementCount && <p className="text-sm text-amber-800 dark:text-gold-200">Faltan {replacementCount - stagedIds.length} fotografía{replacementCount - stagedIds.length === 1 ? "" : "s"} solicitada{replacementCount - stagedIds.length === 1 ? "" : "s"} para poder guardar.</p>}
      {actionState.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{actionState.error}</p>}
      {actionState.ok && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{actionState.ok}</p>}
      <p className="text-[11px] text-ink-mute dark:text-carbon-400">Las fotografías se guardan con registro de usuario y fecha. No se incorporarán al contrato hasta confirmar «Guardar imágenes».</p>

      {confirmOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setConfirmOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="signed-evidence-confirm-title" className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-6 shadow-2xl dark:border-carbon-700 dark:bg-carbon-900">
          <h2 id="signed-evidence-confirm-title" className="text-base font-bold text-ink dark:text-white">Confirmar respaldo firmado</h2>
          <p className="mt-2 text-sm text-ink-soft dark:text-carbon-200">Se guardarán {stagedIds.length} fotografía{stagedIds.length === 1 ? "" : "s"} en este contrato. Después de confirmar, la carga quedará bloqueada hasta que Legal o Administración solicite un reemplazo.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setConfirmOpen(false)}>Revisar imágenes</button>
            <button type="button" className="btn" disabled={busy} onClick={() => void confirmSave()}>{busy ? "Guardando…" : "Confirmar y guardar"}</button>
          </div>
        </section>
      </div>}
    </section>
  );
}
