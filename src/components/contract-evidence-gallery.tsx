"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ContractEvidence } from "@/lib/contract-evidence";

export function ContractEvidenceGallery({ contractId, evidencias, title = "Documentación de respaldo", showUploadDetails = false }: { contractId: string; evidencias: ContractEvidence[]; title?: string; showUploadDetails?: boolean }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [viewerBounds, setViewerBounds] = useState({ width: 1200, height: 800 });
  const viewerRef = useRef<HTMLDivElement>(null);
  const activeEvidence = activeIndex === null ? null : evidencias[activeIndex];
  const activeSrc = activeEvidence ? `/api/contratos/${contractId}/evidencias/${activeEvidence.id}` : "";
  const fitScale = naturalSize ? Math.min(viewerBounds.width / naturalSize.width, viewerBounds.height / naturalSize.height, 1) : 1;
  const renderedWidth = naturalSize ? Math.max(1, Math.round(naturalSize.width * fitScale * zoom)) : undefined;
  const renderedHeight = naturalSize ? Math.max(1, Math.round(naturalSize.height * fitScale * zoom)) : undefined;

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setNaturalSize(null);
    setZoom(1);
    const measureViewer = () => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      setViewerBounds({ width: Math.max(160, viewer.clientWidth - 72), height: Math.max(160, viewer.clientHeight - 24) });
    };
    measureViewer();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "+" || event.key === "=") setZoom((current) => Math.min(5, Number((current + 0.25).toFixed(2))));
      if (event.key === "-") setZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))));
      if (event.key === "ArrowRight") setActiveIndex((current) => current === null ? null : (current + 1) % evidencias.length);
      if (event.key === "ArrowLeft") setActiveIndex((current) => current === null ? null : (current - 1 + evidencias.length) % evidencias.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", measureViewer);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", measureViewer);
    };
  }, [activeIndex, evidencias.length]);

  function showImage(index: number) {
    setActiveIndex(index);
    setZoom(1);
  }

  if (!evidencias.length) return null;

  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">{title}</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Selecciona una imagen para ampliarla y revisar sus detalles sin salir del contrato.</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-ink-soft dark:bg-carbon-800 dark:text-carbon-200">{evidencias.length} imágenes</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {evidencias.map((evidence, index) => {
          return (
            <li key={evidence.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-carbon-800 dark:bg-carbon-950/50">
              <button type="button" onClick={() => showImage(index)} aria-label={`Ampliar imagen ${index + 1}: ${evidence.fileName}`} className="flex h-60 w-full items-center justify-center bg-stone-50 p-2 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-600 dark:bg-carbon-900 dark:hover:bg-carbon-800 sm:h-72">
                <Image src={`/api/contratos/${contractId}/evidencias/${evidence.id}`} alt={`Imagen de respaldo ${index + 1} del contrato ${contractId}`} width={1200} height={900} unoptimized className="h-full w-full object-contain" />
              </button>
              <div className="px-3 py-2.5">
                <p className="truncate text-xs font-medium text-ink dark:text-carbon-100">{evidence.fileName}</p>
                <p className="mt-1 text-[11px] text-ink-mute dark:text-carbon-400">{(evidence.size / 1024).toFixed(0)} KB · Imagen {index + 1}</p>
                {showUploadDetails && <p className="mt-1 text-[11px] text-ink-mute dark:text-carbon-400">{evidence.uploadedByName ?? evidence.uploadedBy ?? "Usuario"} · {new Date(evidence.uploadedAt).toLocaleString("es-BO")}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      {activeEvidence && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveIndex(null); }} className="fixed inset-0 z-[100] flex flex-col bg-black/95 p-3 text-white backdrop-blur-sm sm:p-5">
        <div role="dialog" aria-modal="true" aria-label={`Vista ampliada de ${activeEvidence.fileName}`} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activeEvidence.fileName}</p>
              <p className="mt-1 text-xs text-white/65">Imagen {(activeIndex ?? 0) + 1} de {evidencias.length} · Ajustada a pantalla · Zoom {Math.round(zoom * 100)}%</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))} disabled={zoom <= 1} aria-label="Alejar" className="rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40">−</button>
              <button type="button" onClick={() => setZoom(1)} aria-label="Restablecer zoom" className="rounded-lg border border-white/25 px-3 py-2 text-xs hover:bg-white/10">Ajustar</button>
              <button type="button" onClick={() => setZoom((value) => Math.min(5, Number((value + 0.25).toFixed(2))))} disabled={zoom >= 5} aria-label="Acercar" className="rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40">+</button>
              <a href={activeSrc} download={activeEvidence.fileName} className="hidden rounded-lg border border-white/25 px-3 py-2 text-xs hover:bg-white/10 sm:inline-flex">Descargar</a>
              <button type="button" onClick={() => setActiveIndex(null)} aria-label="Cerrar imagen" className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Cerrar <span aria-hidden="true">×</span></button>
            </div>
          </div>
          <div ref={viewerRef} className="relative mt-3 flex min-h-0 flex-1 overflow-auto rounded-xl bg-black/40">
            {evidencias.length > 1 && <button type="button" onClick={() => { setActiveIndex((activeIndex! - 1 + evidencias.length) % evidencias.length); setZoom(1); }} aria-label="Imagen anterior" className="absolute left-2 z-10 rounded-full bg-black/60 px-4 py-3 text-xl hover:bg-black/80 sm:left-4">‹</button>}
            <div className="flex min-h-full min-w-full shrink-0 items-center justify-center p-3" style={renderedWidth && renderedHeight ? { width: Math.max(viewerBounds.width + 72, renderedWidth + 24), height: Math.max(viewerBounds.height + 24, renderedHeight + 24) } : undefined}>
              <Image
                src={activeSrc}
                alt={activeEvidence.fileName}
                width={1800}
                height={1400}
                unoptimized
                draggable={false}
                onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                className="shrink-0 object-contain"
                style={renderedWidth && renderedHeight
                  ? { width: renderedWidth, height: renderedHeight, maxWidth: "none", maxHeight: "none" }
                  : { width: "auto", height: "auto", maxWidth: "calc(100vw - 104px)", maxHeight: "calc(100dvh - 176px)" }}
              />
            </div>
            {evidencias.length > 1 && <button type="button" onClick={() => { setActiveIndex((activeIndex! + 1) % evidencias.length); setZoom(1); }} aria-label="Imagen siguiente" className="absolute right-2 z-10 rounded-full bg-black/60 px-4 py-3 text-xl hover:bg-black/80 sm:right-4">›</button>}
          </div>
        </div>
      </div>}
    </section>
  );
}
