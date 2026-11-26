"use client";

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

function scopePdfSelector(selector: string) {
  const parts = selector.split(",").map((part) => {
    const trimmed = part.trim();
    if (/^(html|body|:root)(?=$|[\s.#:[>+~])/.test(trimmed)) {
      return trimmed.replace(/^(html|body|:root)/, ".c21-pdf-export");
    }
    return `.c21-pdf-export ${trimmed}`;
  });
  return parts.join(",");
}

function collectPdfCssRules(rules: CSSRuleList): string {
  let css = "";
  for (const rule of Array.from(rules)) {
    if (rule.type === CSSRule.MEDIA_RULE) {
      const mediaRule = rule as CSSMediaRule;
      if (/\bprint\b/i.test(mediaRule.conditionText)) css += collectPdfCssRules(mediaRule.cssRules);
      continue;
    }
    if (rule.type === CSSRule.STYLE_RULE) {
      const styleRule = rule as CSSStyleRule;
      css += `${scopePdfSelector(styleRule.selectorText)}{${styleRule.style.cssText}}`;
      continue;
    }
    if (rule.type === CSSRule.FONT_FACE_RULE || rule.type === CSSRule.KEYFRAMES_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
      if (rule.type === CSSRule.SUPPORTS_RULE) {
        css += collectPdfCssRules((rule as CSSSupportsRule).cssRules);
      } else {
        css += rule.cssText;
      }
    }
  }
  return css;
}

export function ContractDocumentPreview({ contractId, canDownload = true }: { contractId: string; canDownload?: boolean }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const htmlFrameRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState("Cargando vista previa Word...");
  const [error, setError] = useState("");
  const [htmlDocument, setHtmlDocument] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  async function downloadPdf() {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    setError("");
    let pdfRoot: HTMLDivElement | null = null;
    const headerLogos: Array<{ data: string; side: "left" | "right"; aspectRatio: number }> = [];
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      pdfRoot = document.createElement("div");
      pdfRoot.className = "c21-pdf-export";
      Object.assign(pdfRoot.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "210mm",
        minHeight: "297mm",
        boxSizing: "border-box",
        overflow: "visible",
        background: "#fff",
        color: "#111",
        opacity: "0",
        zIndex: "-1",
      });

      if (htmlDocument) {
        const sourceDocument = htmlFrameRef.current?.contentDocument;
        if (!sourceDocument) throw new Error("La vista previa HTML todavía no está lista.");
        const style = document.createElement("style");
        style.textContent = Array.from(sourceDocument.styleSheets).map((sheet) => {
          try { return collectPdfCssRules(sheet.cssRules); } catch { return ""; }
        }).join("\n") + `
          .c21-pdf-export .c21-print-document {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            line-height: 1.5 !important;
            text-align: justify !important;
            overflow: visible !important;
          }
          .c21-pdf-export .c21-print-document p,
          .c21-pdf-export .c21-print-document li,
          .c21-pdf-export .c21-print-document td,
          .c21-pdf-export .c21-print-document th,
          .c21-pdf-export .c21-print-document blockquote {
            line-height: 1.5 !important;
            text-align: justify !important;
            margin-block-start: 0 !important;
            margin-block-end: 1.5em !important;
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
            orphans: 3;
            widows: 3;
          }
          .c21-pdf-export .c21-print-document h1,
          .c21-pdf-export .c21-print-document h2,
          .c21-pdf-export .c21-print-document h3,
          .c21-pdf-export .c21-print-document h4,
          .c21-pdf-export .c21-print-document h5,
          .c21-pdf-export .c21-print-document h6 {
            line-height: 1.5 !important;
            break-after: avoid-page !important;
            page-break-after: avoid !important;
          }
          .c21-pdf-export .c21-print-document > .c21-print-header { display: none !important; }
        `;
        pdfRoot.appendChild(style);
        const watermark = sourceDocument.body.querySelector(".c21-print-watermark")?.cloneNode(true);
        if (watermark) pdfRoot.appendChild(watermark);
        const main = sourceDocument.body.querySelector(".c21-print-document")?.cloneNode(true);
        if (!main) throw new Error("No se encontró el contenido del contrato para generar el PDF.");
        pdfRoot.appendChild(main);
      } else {
        if (!bodyRef.current || !styleRef.current) throw new Error("La vista previa Word todavía no está lista.");
        pdfRoot.innerHTML = `${styleRef.current.innerHTML}${bodyRef.current.innerHTML}`;
      }

      document.body.appendChild(pdfRoot);
      await document.fonts.ready;
      await Promise.all(Array.from(pdfRoot.querySelectorAll("img")).map(async (image) => {
        if (!image.complete) await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
        if (image.complete && image.naturalWidth > 0 && typeof image.decode === "function") {
          await image.decode().catch(() => undefined);
        }
      }));

      if (htmlDocument) {
        for (const image of Array.from(pdfRoot.querySelectorAll<HTMLImageElement>(".c21-print-header img"))) {
          if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) continue;
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) continue;
          context.drawImage(image, 0, 0);
          headerLogos.push({
            data: canvas.toDataURL("image/png"),
            side: image.classList.contains("c21-print-header__right") ? "right" : "left",
            aspectRatio: image.naturalWidth / image.naturalHeight,
          });
        }
      }

      const scale = Math.max(1, Math.min(2, Math.sqrt(24_000_000 / Math.max(1, pdfRoot.scrollWidth * pdfRoot.scrollHeight))));
      const options = {
        margin: [22, 0, 20, 0] as [number, number, number, number],
        filename: `contrato-${contractId.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (clonedDocument: Document) => {
            const clonedRoot = clonedDocument.querySelector<HTMLElement>(".html2pdf__container .c21-pdf-export");
            if (!clonedRoot) return;
            clonedRoot.style.position = "relative";
            clonedRoot.style.top = "auto";
            clonedRoot.style.left = "auto";
            clonedRoot.style.opacity = "1";
            clonedRoot.style.zIndex = "auto";
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ["css", "legacy"], avoid: ["p", "li", "tr", "img", "h1", "h2", "h3", "h4", "h5", "h6"] },
      };
      const worker = html2pdf().set(options).from(pdfRoot);
      await worker.toPdf();
      const pdf = await worker.get("pdf");
      const pageWidth = pdf.internal.pageSize.getWidth();
      for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
        pdf.setPage(page);
        for (const logo of headerLogos) {
          const maxWidth = logo.side === "left" ? 46 : 12;
          const width = Math.min(maxWidth, 11 * logo.aspectRatio);
          const height = width / logo.aspectRatio;
          const x = logo.side === "left" ? 20 : pageWidth - 20 - width;
          pdf.addImage(logo.data, "PNG", x, 7, width, height);
        }
      }
      await worker.save();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo generar el archivo PDF.");
    } finally {
      pdfRoot?.remove();
      setDownloadingPdf(false);
    }
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
          {canDownload && !status && <>
            <button type="button" className="btn-ghost" onClick={printDocument}>Imprimir</button>
            <button type="button" className="btn" disabled={downloadingPdf} onClick={downloadPdf}>{downloadingPdf ? "Generando PDF…" : "Descargar PDF"}</button>
          </>}
          {!canDownload && <p className="text-right text-xs font-medium text-ink-mute dark:text-carbon-400">La descarga estará disponible cuando Legal marque el contrato como firmado.</p>}
        </div>
      </div>
      {canDownload && !status && <p className="border-b border-stone-100 px-5 py-2 text-xs text-ink-mute dark:border-carbon-800 dark:text-carbon-400 sm:px-6">El archivo PDF se genera y descarga directamente.</p>}
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
