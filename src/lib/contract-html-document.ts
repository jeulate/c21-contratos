import type { Contract } from "./contracts";
import type { ContractTemplateVersion } from "./contract-templates";
import type { ContractPrintSettings } from "./contract-print-settings";
import { buildContractTemplateData } from "./contract-document";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

function getPathValue(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, data);
}

function renderFragment(fragment: string, scope: Record<string, unknown>, root: Record<string, unknown>) {
  let html = fragment.replace(/\{\{#owner2\.fullName\}\}([\s\S]*?)\{\{\/owner2\.fullName\}\}/g, (_match, body: string) =>
    String(getPathValue(root, "owner2.fullName") ?? "").trim() ? body : "");
  html = html.replace(/\{\{#owners\}\}([\s\S]*?)\{\{\/owners\}\}/g, (_match, body: string) => {
    const owners = Array.isArray(root.owners) ? root.owners as Record<string, unknown>[] : [];
    return owners.map((owner, index) => renderFragment(body, {
      ...owner,
      separator: index === 0 ? "" : index === owners.length - 1 ? " y " : ", ",
    }, root)).join("");
  });
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    const value = path.includes(".") ? getPathValue(root, path) : scope[path] ?? getPathValue(root, path);
    return escapeHtml(value);
  });
}

function safeTemplateFragment(source: string) {
  // The print preview runs in a sandboxed iframe; remove active content and event handlers from legal-authored HTML.
  return source
    .replace(/<\s*(script|iframe|object|embed|form|base|meta|link)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|base|meta|link)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "$1=\"#\"");
}

export function renderContractHtml(contract: Contract, template: ContractTemplateVersion, printSettings: ContractPrintSettings = { watermarkMode: "text" }, wordHeaderLogos: string[] = []) {
  if (!template.htmlContent) throw new Error("La versión HTML no contiene contenido editable.");
  const data = buildContractTemplateData(contract) as Record<string, unknown>;
  const embeddedStyles: string[] = [];
  const source = template.htmlContent.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (_match, css: string) => {
    embeddedStyles.push(css);
    return "";
  });
  const content = renderFragment(source, data, data);
  const styles = [template.htmlStyles ?? "", ...embeddedStyles]
    .join("\n")
    .replace(/@import\s+[^;]+;?/gi, "")
    .replace(/<\/style/gi, "");
  const logoLeft = template.headerLogoLeft || wordHeaderLogos[0] || "";
  const logoRight = template.headerLogoRight || wordHeaderLogos[1] || "";
  const headerImages = [
    logoLeft ? `<img class="c21-print-header__left" src="${escapeHtml(logoLeft)}" alt="">` : "",
    logoRight ? `<img class="c21-print-header__right" src="${escapeHtml(logoRight)}" alt="">` : "",
  ].filter(Boolean).join("");
  const header = headerImages ? `<header class="c21-print-header" aria-hidden="true">${headerImages}</header>` : "";
  const watermark = printSettings.watermarkMode === "image" && printSettings.watermarkImage
    ? `.c21-print-watermark { display: flex !important; position: fixed !important; z-index: 0 !important; inset: 0 !important; align-items: center !important; justify-content: center !important; pointer-events: none !important; } .c21-print-watermark img { display: block !important; width: 100mm !important; max-height: 100mm !important; opacity: .14 !important; object-fit: contain !important; transform: rotate(-32deg); } .c21-print-document::before, .c21-print-document::after { content: none; }`
    : printSettings.watermarkMode === "none"
      ? `.c21-print-document::before, .c21-print-document::after { content: none; } .c21-print-watermark { display: none !important; }`
      : `.c21-print-watermark { display: none !important; } .c21-print-document::before { content: "CENTURY 21"; top: 46%; left: 50%; font-size: 34pt; letter-spacing: .08em; white-space: nowrap; transform: translate(-50%, -50%) rotate(-32deg); } .c21-print-document::after { content: "21"; top: 50%; left: 50%; display: grid; width: 34mm; height: 34mm; place-items: center; border: 2px solid currentColor; border-radius: 50%; font-size: 24pt; transform: translate(-50%, -50%) rotate(-32deg); }`;
  const watermarkElement = printSettings.watermarkMode === "image" && printSettings.watermarkImage
    ? `<div class="c21-print-watermark" aria-hidden="true"><img src="${escapeHtml(printSettings.watermarkImage)}" alt=""></div>`
    : "";
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@page { size: A4 portrait; margin: 0; }
html, body { margin: 0; padding: 0; color: #111; background: #fff; font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.45; }
body { box-sizing: border-box; }
img { max-width: 100%; height: auto; }
table { max-width: 100%; border-collapse: collapse; }
@media screen { body { width: 210mm; min-height: 297mm; margin: 20px auto; padding: 20mm; box-shadow: 0 1px 12px #0002; } }
.c21-print-header { display: flex; align-items: center; justify-content: space-between; gap: 8mm; min-height: 10mm; margin-bottom: 5mm; }
.c21-print-header img { display: block; max-width: 48mm; max-height: 12mm; width: auto; height: auto; object-fit: contain; }
${styles}
/* Keep print behavior after legal template styles so the generated watermark and layout rules remain active. */
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { width: auto; min-height: 0; margin: 0; padding: 0; }
  .c21-print-document {
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    padding: 18mm 20mm;
  }
  .c21-print-document > .c21-print-header {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: fixed !important;
    z-index: 2 !important;
    top: 4mm !important;
    right: 20mm !important;
    left: 20mm !important;
    height: 10mm !important;
    min-height: 0 !important;
    margin: 0 !important;
  }
  .c21-print-document > .c21-print-header img {
    display: block !important;
    visibility: visible !important;
    position: static !important;
    float: none !important;
    opacity: 1 !important;
    filter: none !important;
    max-width: 48mm !important;
    max-height: 12mm !important;
    object-fit: contain !important;
  }
  .c21-print-document::before,
  .c21-print-document::after { position: fixed; z-index: 0; pointer-events: none; color: #b7a56c; opacity: .14; font-family: Arial, sans-serif; font-weight: 700; }
  ${watermark}
  .c21-print-document > * { position: relative; z-index: 1; }
  .c21-contract-closing, [data-c21-closing], .c21-contract-signatures, [data-c21-signatures] { break-inside: avoid-page; page-break-inside: avoid; }
  .page-break { break-before: page; page-break-before: always; }
}
</style></head><body>${watermarkElement}<main class="c21-print-document">${header}${safeTemplateFragment(content)}</main></body></html>`;
}

export function validateHtmlTemplateMarkers(source: string, supported: Set<string>) {
  const tags = [...new Set([...source.matchAll(/\{\{\s*([#/])?\s*([\w.]+)\s*\}\}/g)].map((match) => match[2]))];
  const unsupported = tags.filter((tag) => !supported.has(tag));
  return { tags, unsupported };
}
