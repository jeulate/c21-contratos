"use client";

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

export function ContractDocumentPreview({ contractId, canDownload = true }: { contractId: string; canDownload?: boolean }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const htmlFrameRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Cargando vista previa Word...");
  const [error, setError] = useState("");
  const [htmlDocument, setHtmlDocument] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        setError("");
        setHtmlDocument("");
        setPageCount(null);
        const response = await fetch(`/api/contratos/${contractId}/document`, { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        if (response.headers.get("content-type")?.includes("text/html")) {
          const html = await response.text();
          if (!cancelled) {
            setHtmlDocument(html);
            setStatus("");
          }
          return;
        }
        const bytes = await response.arrayBuffer();
        if (cancelled || !bodyRef.current || !styleRef.current) return;
        bodyRef.current.replaceChildren();
        styleRef.current.replaceChildren();
        await renderAsync(bytes, bodyRef.current, styleRef.current, { className: "c21-contract-docx", inWrapper: true, breakPages: true });
        const pages = bodyRef.current.querySelectorAll("section.docx").length;
        if (pages) setPageCount(pages);
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

  function measureHtmlPages() {
    const document = htmlFrameRef.current?.contentDocument;
    if (!document) return;
    const explicitPages = document.querySelectorAll(".docx-wrapper > section.docx, .page").length;
    const contentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    setPageCount(explicitPages || Math.max(1, Math.ceil(contentHeight / 1046)));
  }

  function printHtml() {
    htmlFrameRef.current?.contentWindow?.focus();
    htmlFrameRef.current?.contentWindow?.print();
  }

  function printWordPreview() {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !bodyRef.current || !styleRef.current) return;
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Contrato ${contractId}</title>${styleRef.current.innerHTML}<style>@media print{body{margin:0!important;background:#fff!important}.docx-wrapper{padding:0!important;background:#fff!important}}</style></head><body>${bodyRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  }

  function printDocument() {
    if (htmlDocument) printHtml();
    else printWordPreview();
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 dark:border-carbon-800 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Vista previa del contrato</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Se genera con la versión de plantilla asignada a este contrato.</p>
          {pageCount !== null && <p className="mt-1 text-xs font-medium text-gold-800 dark:text-gold-300">{pageCount} {pageCount === 1 ? "página" : "páginas"}{htmlDocument ? " · A4 vertical · impresión" : " · formato definido en Word"}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canDownload && !status && !error && <>
            <button type="button" className="btn-ghost" onClick={printDocument}>Imprimir</button>
            <button type="button" className="btn" onClick={printDocument}>Descargar PDF</button>
          </>}
          {!canDownload && <p className="text-right text-xs font-medium text-ink-mute dark:text-carbon-400">La descarga estará disponible cuando Legal marque el contrato como firmado.</p>}
        </div>
      </div>
      {canDownload && !status && !error && <p className="border-b border-stone-100 px-5 py-2 text-xs text-ink-mute dark:border-carbon-800 dark:text-carbon-400 sm:px-6">Para descargarlo como PDF, selecciona “Guardar como PDF” en el diálogo de impresión.</p>}
      {status && <p className="p-5 text-sm text-ink-mute dark:text-carbon-400">{status}</p>}
      {error && <p role="alert" className="p-5 text-sm text-red-700">{error}</p>}
      {htmlDocument && <div className="max-h-[80vh] overflow-auto bg-stone-100 p-3 dark:bg-carbon-950 sm:p-6">
        <iframe ref={htmlFrameRef} title="Vista previa imprimible del contrato" srcDoc={htmlDocument} sandbox="allow-same-origin allow-modals" onLoad={measureHtmlPages} className="h-[75vh] w-full rounded-lg border border-stone-200 bg-white dark:border-carbon-700" />
      </div>}
      {!htmlDocument && <div className="max-h-[80vh] overflow-auto bg-stone-100 p-3 dark:bg-carbon-950 sm:p-6">
        <div ref={styleRef} />
        <div ref={bodyRef} />
      </div>}
    </section>
  );
}
