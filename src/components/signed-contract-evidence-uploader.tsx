"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { MAX_CONTRACT_EVIDENCE_IMAGES } from "@/lib/contract-evidence-constants";
import { compressBrowserImageToWebp } from "@/lib/compress-browser-image";

type UploadPhoto = {
  id: string;
  name: string;
  previewUrl: string;
  status: "queued" | "compressing" | "uploading" | "uploaded" | "error";
  error?: string;
};

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function SignedContractEvidenceUploader({ contractId, existingCount }: { contractId: string; existingCount: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<UploadPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  useEffect(() => {
    setPhotos((current) => current.filter((photo) => photo.status !== "uploaded"));
  }, [existingCount]);
  const uploadedInThisView = useMemo(() => photos.filter((photo) => photo.status === "uploaded").length, [photos]);
  const reservedSlots = photos.filter((photo) => photo.status !== "uploaded").length;
  const totalCount = existingCount + uploadedInThisView;
  const remaining = Math.max(0, MAX_CONTRACT_EVIDENCE_IMAGES - totalCount - reservedSlots);

  function updatePhoto(id: string, update: Partial<UploadPhoto>) {
    setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, ...update } : photo));
  }

  async function uploadPhoto(photo: UploadPhoto, source: File) {
    try {
      updatePhoto(photo.id, { status: "compressing", error: undefined });
      const compressed = await compressBrowserImageToWebp(source);
      updatePhoto(photo.id, { status: "uploading", name: compressed.name });
      const body = new FormData();
      body.append("file", compressed, compressed.name);
      const response = await fetch(`/api/contratos/${encodeURIComponent(contractId)}/evidencias-firmadas`, { method: "POST", body });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "No se pudo guardar la fotografía.");
      }
      updatePhoto(photo.id, { status: "uploaded" });
      return true;
    } catch (error) {
      updatePhoto(photo.id, { status: "error", error: error instanceof Error ? error.message : "No se pudo preparar la fotografía." });
      return false;
    }
  }

  async function acceptFiles(fileList: FileList | File[]) {
    if (busy) return;
    setSelectionError("");
    const selected = Array.from(fileList);
    const available = Math.max(0, MAX_CONTRACT_EVIDENCE_IMAGES - existingCount - photos.length);
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
      additions.push({
        file,
        photo: { id: crypto.randomUUID(), name: file.name, previewUrl: URL.createObjectURL(file), status: "queued" },
      });
    }
    if (selected.length > available) setSelectionError(`Puedes guardar hasta ${MAX_CONTRACT_EVIDENCE_IMAGES} fotografías firmadas por contrato.`);
    if (!additions.length) return;

    setPhotos((current) => [...current, ...additions.map(({ photo }) => photo)]);
    setBusy(true);
    let uploaded = false;
    for (const { photo, file } of additions) uploaded = (await uploadPhoto(photo, file)) || uploaded;
    setBusy(false);
    if (uploaded) router.refresh();
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

  function removeFailed(photo: UploadPhoto) {
    URL.revokeObjectURL(photo.previewUrl);
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
  }

  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Respaldo del contrato firmado</h2>
          <p className="mt-1 max-w-3xl text-xs text-ink-mute dark:text-carbon-400">Después de imprimir y reunir las firmas, carga fotografías legibles de todas las páginas firmadas. Cada imagen se comprime a WebP y se guarda junto al contrato.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${totalCount >= MAX_CONTRACT_EVIDENCE_IMAGES ? "bg-stone-100 text-ink-soft dark:bg-carbon-800 dark:text-carbon-200" : "bg-amber-100 text-amber-900 dark:bg-gold-500/15 dark:text-gold-100"}`}>
          {totalCount} / {MAX_CONTRACT_EVIDENCE_IMAGES} fotografías
        </span>
      </div>

      <div
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${dragging ? "border-gold-600 bg-gold-50 dark:bg-gold-500/10" : "border-stone-300 bg-stone-50/70 dark:border-carbon-700 dark:bg-carbon-950/40"}`}
      >
        <p className="text-sm font-semibold text-ink dark:text-white">Arrastra las fotografías aquí</p>
        <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Selecciona de 1 a 20 imágenes JPG, PNG o WebP · hasta 20 MB originales por imagen.</p>
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
            <p className="truncate text-xs font-medium text-ink dark:text-carbon-100">{photo.name}</p>
            <p className="mt-1 text-[11px] text-ink-mute dark:text-carbon-400">
              {photo.status === "queued" ? "En espera" : photo.status === "compressing" ? "Comprimiendo a WebP…" : photo.status === "uploading" ? "Guardando en el contrato…" : photo.status === "uploaded" ? "Guardada" : "No se pudo cargar"}
            </p>
            {photo.error && <p role="alert" className="mt-1 text-[11px] text-red-700 dark:text-red-300">{photo.error}</p>}
            {photo.status === "error" && <button type="button" onClick={() => removeFailed(photo)} className="mt-1 text-xs font-semibold text-ink-mute hover:text-red-700 dark:text-carbon-400 dark:hover:text-red-300">Quitar para volver a intentar</button>}
          </div>
        </li>)}
      </ul>}
      <p className="text-[11px] text-ink-mute dark:text-carbon-400">Las fotografías guardadas quedan asociadas al historial del contrato con usuario, fecha y hora de carga.</p>
    </section>
  );
}
