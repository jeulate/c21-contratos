"use client";

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

export function ContractDocumentPreview({ contractId }: { contractId: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Cargando vista previa Word...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        setError("");
        const response = await fetch(`/api/contratos/${contractId}/document`, { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        const bytes = await response.arrayBuffer();
        if (cancelled || !bodyRef.current || !styleRef.current) return;
        bodyRef.current.replaceChildren();
        styleRef.current.replaceChildren();
        await renderAsync(bytes, bodyRef.current, styleRef.current, { className: "c21-contract-docx", inWrapper: true, breakPages: true });
        if (!cancelled) setStatus("");
      } catch (cause) {
        if (!cancelled) {
          setStatus("");
          setError(cause instanceof Error ? cause.message : "No se pudo preparar la vista previa.");
        }
      }
    }
    void render();
    return () => { cancelled = true; };
  }, [contractId]);

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 dark:border-carbon-800 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Vista previa del contrato Word</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Se genera con la versión de plantilla asignada a este contrato.</p>
        </div>
        <a href={`/api/contratos/${contractId}/document?download=1`} className="btn-ghost">Descargar Word</a>
      </div>
      {status && <p className="p-5 text-sm text-ink-mute dark:text-carbon-400">{status}</p>}
      {error && <p role="alert" className="p-5 text-sm text-red-700">{error}</p>}
      <div className="max-h-[80vh] overflow-auto bg-stone-100 p-3 dark:bg-carbon-950 sm:p-6">
        <div ref={styleRef} />
        <div ref={bodyRef} />
      </div>
    </section>
  );
}
