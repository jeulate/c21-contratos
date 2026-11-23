import type { Contract } from "./contracts";
import type { ContractTemplateVersion } from "./contract-templates";
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

export function renderContractHtml(contract: Contract, template: ContractTemplateVersion) {
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
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@page { size: A4 portrait; margin: 20mm; }
html, body { margin: 0; padding: 0; color: #111; background: #fff; font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.45; }
body { box-sizing: border-box; }
img { max-width: 100%; height: auto; }
table { max-width: 100%; border-collapse: collapse; }
@media screen { body { width: 210mm; min-height: 297mm; margin: 20px auto; padding: 20mm; box-shadow: 0 1px 12px #0002; } }
@media print { html, body { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; } .page-break { break-before: page; page-break-before: always; } }
${styles}
@page { size: A4 portrait; margin: 20mm; }
</style></head><body>${safeTemplateFragment(content)}</body></html>`;
}

export function validateHtmlTemplateMarkers(source: string, supported: Set<string>) {
  const tags = [...new Set([...source.matchAll(/\{\{\s*([#/])?\s*([\w.]+)\s*\}\}/g)].map((match) => match[2]))];
  const unsupported = tags.filter((tag) => !supported.has(tag));
  return { tags, unsupported };
}
