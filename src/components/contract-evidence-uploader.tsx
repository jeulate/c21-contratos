"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import { MAX_CONTRACT_EVIDENCE_BYTES, MAX_CONTRACT_EVIDENCE_IMAGES, MIN_CONTRACT_EVIDENCE_IMAGES } from "@/lib/contract-evidence-constants";

type UploadItem = {
  id: string;
  fileName: string;
  previewUrl: string;
  originalSize: number;
  compressedSize?: number;
  progress: number;
  status: "compressing" | "uploading" | "uploaded" | "error";
  error?: string;
};

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function compressImage(source: File) {
  const bitmap = await createImageBitmap(source);
  try {
    for (const maxDimension of [1920, 1600, 1280]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("El navegador no pudo preparar la imagen.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error("No se pudo comprimir la imagen.")), "image/webp", quality);
        });
        if (blob.size <= MAX_CONTRACT_EVIDENCE_BYTES && allowedTypes.has(blob.type)) {
          const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
          const baseName = source.name.replace(/\.[^.]+$/, "").slice(0, 100) || "respaldo";
          return new File([blob], `${baseName}.${extension}`, { type: blob.type, lastModified: Date.now() });
        }
      }
    }
    throw new Error("No se pudo reducir la imagen a 1 MB. Prueba con otra imagen.");
  } finally {
    bitmap.close();
  }
}

export function ContractEvidenceUploader({
  sessionId,
  onChange,
}: {
  sessionId: string;
  onChange: (ids: string[], uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const uploadedIds = useMemo(() => items.filter((item) => item.status === "uploaded").map((item) => item.id), [items]);
  const uploading = items.some((item) => item.status === "compressing" || item.status === "uploading");

  useEffect(() => {
    onChange(uploadedIds, uploading);
  }, [items, onChange, uploadedIds, uploading]);

  function updateItem(id: string, update: Partial<UploadItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  }

  function uploadCompressedFile(id: string, file: File) {
    return new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      requests.current.set(id, request);
      request.open("POST", "/api/contract-evidence/staging");
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) updateItem(id, { progress: 20 + Math.round((event.loaded / event.total) * 80) });
      };
      request.onload = () => {
        requests.current.delete(id);
        if (request.status >= 200 && request.status < 300) {
          updateItem(id, { status: "uploaded", progress: 100, compressedSize: file.size, fileName: file.name });
          resolve();
          return;
        }
        let message = "No se pudo subir la imagen.";
        try { message = JSON.parse(request.responseText) as string; } catch { if (request.responseText) message = request.responseText; }
        reject(new Error(message));
      };
      request.onerror = () => { requests.current.delete(id); reject(new Error("Error de red durante la carga.")); };
      request.onabort = () => { requests.current.delete(id); reject(new Error("Carga cancelada.")); };
      const data = new FormData();
      data.append("sessionId", sessionId);
      data.append("id", id);
      data.append("file", file, file.name);
      request.send(data);
    });
  }

  async function processItem(item: UploadItem, source: File) {
    try {
      const compressed = await compressImage(source);
      const previewUrl = URL.createObjectURL(compressed);
      setItems((current) => current.map((existing) => {
        if (existing.id !== item.id) return existing;
        URL.revokeObjectURL(existing.previewUrl);
        return { ...existing, previewUrl, fileName: compressed.name, compressedSize: compressed.size, status: "uploading", progress: 20 };
      }));
      await uploadCompressedFile(item.id, compressed);
    } catch (error) {
      updateItem(item.id, { status: "error", error: error instanceof Error ? error.message : "No se pudo preparar la imagen." });
    }
  }

  function acceptFiles(fileList: FileList | File[]) {
    setSelectionError("");
    const selected = Array.from(fileList);
    const room = MAX_CONTRACT_EVIDENCE_IMAGES - items.length;
    if (room <= 0) {
      setSelectionError(`Puedes adjuntar hasta ${MAX_CONTRACT_EVIDENCE_IMAGES} imágenes.`);
      return;
    }
    const additions: { item: UploadItem; file: File }[] = [];
    for (const file of selected) {
      if (additions.length >= room) break;
      if (!allowedTypes.has(file.type)) {
        setSelectionError("Usa imágenes JPG, PNG o WebP. Los archivos SVG y HEIC no están admitidos.");
        continue;
      }
      if (file.size > MAX_ORIGINAL_BYTES) {
        setSelectionError("Cada imagen original debe pesar menos de 20 MB.");
        continue;
      }
      const id = crypto.randomUUID();
      additions.push({
        file,
        item: {
          id,
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          originalSize: file.size,
          progress: 5,
          status: "compressing",
        },
      });
    }
    if (selected.length > room) setSelectionError(`Se agregaron hasta ${MAX_CONTRACT_EVIDENCE_IMAGES} imágenes.`);
    if (!additions.length) return;
    setItems((current) => [...current, ...additions.map(({ item }) => item)]);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(3, additions.length) }, async () => {
      while (nextIndex < additions.length) {
        const currentIndex = nextIndex++;
        const { item, file } = additions[currentIndex];
        await processItem(item, file);
      }
    });
    void Promise.all(workers);
  }

  function handleSelection(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) acceptFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFiles(event.dataTransfer.files);
  }

  function removeItem(item: UploadItem) {
    requests.current.get(item.id)?.abort();
    URL.revokeObjectURL(item.previewUrl);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (item.status === "uploaded" || item.status === "uploading") {
      void fetch(`/api/contract-evidence/staging?sessionId=${encodeURIComponent(sessionId)}&id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    }
  }

  const uploadedCount = uploadedIds.length;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-carbon-800 dark:bg-carbon-900 sm:p-5 lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Documentación de respaldo</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">
            Adjunta al menos {MIN_CONTRACT_EVIDENCE_IMAGES} imágenes. Se comprimen automáticamente a un máximo de 1 MB cada una.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${uploadedCount >= MIN_CONTRACT_EVIDENCE_IMAGES ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-amber-100 text-amber-900 dark:bg-gold-500/15 dark:text-gold-100"}`}>
          {uploadedCount} / {MIN_CONTRACT_EVIDENCE_IMAGES} mínimo · {items.length}/{MAX_CONTRACT_EVIDENCE_IMAGES} seleccionadas
        </span>
      </div>

      <div
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${dragging ? "border-gold-600 bg-gold-50 dark:bg-gold-500/10" : "border-stone-300 bg-stone-50/70 dark:border-carbon-700 dark:bg-carbon-950/40"}`}
      >
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-gold-700 shadow-sm dark:bg-carbon-800 dark:text-gold-300">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5 5 5M4 16.5v1A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-1" /></svg>
        </span>
        <p className="mt-3 text-sm font-semibold text-ink dark:text-white">Arrastra y suelta tus imágenes aquí</p>
        <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">JPG, PNG o WebP · máximo 20 MB por imagen original</p>
        <button type="button" className="btn-ghost mt-4" onClick={() => inputRef.current?.click()} disabled={items.length >= MAX_CONTRACT_EVIDENCE_IMAGES}>Seleccionar imágenes</button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleSelection} />
      </div>

      {selectionError && <p role="alert" className="mt-3 text-sm text-amber-800 dark:text-gold-200">{selectionError}</p>}

      {items.length > 0 && <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <li key={item.id} className="flex min-w-0 gap-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-carbon-800 dark:bg-carbon-950/50">
            <Image src={item.previewUrl} alt={`Vista previa de ${item.fileName}`} width={96} height={96} unoptimized className="h-16 w-16 shrink-0 rounded-lg bg-stone-100 object-cover dark:bg-carbon-800" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-xs font-medium text-ink dark:text-carbon-100">{index + 1}. {item.fileName}</p>
                <button type="button" onClick={() => removeItem(item)} aria-label={`Quitar ${item.fileName}`} className="text-xs font-semibold text-ink-mute hover:text-red-700 dark:text-carbon-400 dark:hover:text-red-300">Quitar</button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink-mute dark:text-carbon-400">
                <span>{item.status === "compressing" ? "Comprimiendo…" : item.status === "uploading" ? "Subiendo…" : item.status === "uploaded" ? "Lista" : "No se pudo cargar"}</span>
                <span>{item.compressedSize ? `${(item.compressedSize / 1024).toFixed(0)} KB` : `${(item.originalSize / 1024).toFixed(0)} KB original`}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-carbon-800" role="progressbar" aria-label={`Carga de ${item.fileName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}>
                <div className={`h-full rounded-full transition-[width] duration-200 ${item.status === "error" ? "bg-red-500" : item.status === "uploaded" ? "bg-emerald-500" : "bg-gold-600"}`} style={{ width: `${item.status === "error" ? 100 : item.progress}%` }} />
              </div>
              {item.error && <p role="alert" className="mt-1 text-[11px] text-red-700 dark:text-red-300">{item.error}</p>}
            </div>
          </li>
        ))}
      </ul>}
    </section>
  );
}
