import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { getContract } from "@/lib/contracts";
import { getTemplateVersion, listTemplateVersions } from "@/lib/contract-templates";
import { renderContractDocx } from "@/lib/contract-document";
import { renderContractHtml } from "@/lib/contract-html-document";
import { getContractPrintSettings } from "@/lib/contract-print-settings";
import PizZip from "pizzip";

export const dynamic = "force-dynamic";

function xmlAttribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tag.match(new RegExp(`\\b${escaped}\\s*=\\s*([\"'])(.*?)\\1`, "i"))?.[2]
    ?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function wordHeaderLogos(contentBase64: string): string[] {
  try {
    const zip = new PizZip(Buffer.from(contentBase64, "base64"));
    const headers = zip.file(/^word\/header\d*\.xml$/).sort((a, b) => a.name.localeCompare(b.name));
    const images: string[] = [];
    const used = new Set<string>();
    for (const header of headers) {
      const relPath = header.name.replace("word/", "word/_rels/") + ".rels";
      const rels = zip.file(relPath)?.asText() ?? "";
      const relationships = new Map<string, string>();
      for (const match of rels.matchAll(/<Relationship\b[^>]*\/?\s*>/gi)) {
        const tag = match[0];
        const id = xmlAttribute(tag, "Id");
        const target = xmlAttribute(tag, "Target");
        const type = xmlAttribute(tag, "Type") ?? "";
        if (id && target && type.endsWith("/image")) relationships.set(id, target);
      }
      for (const match of header.asText().matchAll(/<a:blip\b[^>]*\/?\s*>/gi)) {
        const id = xmlAttribute(match[0], "r:embed");
        const target = id ? relationships.get(id) : undefined;
        if (!target) continue;
        const pathParts = (target.startsWith("/") ? target.slice(1) : `word/${target}`).split("/");
        const normalized: string[] = [];
        for (const part of pathParts) {
          if (!part || part === ".") continue;
          if (part === "..") normalized.pop();
          else normalized.push(part);
        }
        const path = normalized.join("/");
        if (!path.startsWith("word/media/") || used.has(path)) continue;
        const file = zip.file(path);
        if (!file) continue;
        const bytes = file.asUint8Array();
        let mime: string | undefined;
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) mime = "image/png";
        else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = "image/jpeg";
        else if (Buffer.from(bytes).subarray(0, 3).toString("ascii") === "GIF") mime = "image/gif";
        if (!mime) continue;
        used.add(path);
        images.push(`data:${mime};base64,${Buffer.from(bytes).toString("base64")}`);
        if (images.length === 2) return images;
      }
    }
    return images;
  } catch (error) {
    console.error("No se pudieron extraer los logos del encabezado Word:", error);
    return [];
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract || (!isStaff(session) && contract.asesor !== session.username)) return new NextResponse("Contrato no encontrado", { status: 404 });
  const download = new URL(request.url).searchParams.has("download");
  const requestedFormat = new URL(request.url).searchParams.get("download");
  if (download && contract.estado === "firmado") {
    return new NextResponse("Los contratos firmados se imprimen o se guardan como PDF desde la vista previa.", { status: 403 });
  }
  if (download && session.role === "asesor" && contract.estado !== "firmado") {
    return new NextResponse("La descarga estará disponible cuando el contrato se encuentre firmado.", { status: 403 });
  }
  if (!contract.templateVersionId) return new NextResponse("Este contrato no tiene una plantilla Word asignada.", { status: 409 });
  const template = await getTemplateVersion(contract.templateVersionId);
  if (!template) return new NextResponse("No se encontró la versión Word usada por este contrato.", { status: 410 });

  try {
    if (template.format === "html" || template.htmlContent) {
      if (requestedFormat === "word") {
        const versions = template.sourceDocxVersionId
          ? []
          : await listTemplateVersions(template.tipo);
        const sourceDocxVersion = template.sourceDocxVersionId
          ? await getTemplateVersion(template.sourceDocxVersionId)
          : versions
            .filter((item) => item.version < template.version && item.contentBase64 && !item.htmlContent)
            .sort((a, b) => b.version - a.version)[0];
        if (!sourceDocxVersion?.contentBase64 || sourceDocxVersion.tipo !== template.tipo || sourceDocxVersion.htmlContent) {
          return new NextResponse("Esta versión HTML no tiene una plantilla Word original asociada. Legal debe guardar una nueva revisión HTML desde una versión Word.", { status: 409 });
        }
        const file = renderContractDocx(contract, { ...template, contentBase64: sourceDocxVersion.contentBase64 });
        return new NextResponse(new Uint8Array(file), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="contrato-${contract.id}-v${template.version}.docx"`,
            "Cache-Control": "private, no-store",
          },
        });
      }
      const [printSettings, versions] = await Promise.all([
        getContractPrintSettings(),
        (template.headerLogoLeft && template.headerLogoRight) || template.sourceDocxVersionId
          ? Promise.resolve([])
          : listTemplateVersions(template.tipo),
      ]);
      const sourceDocxVersion = template.headerLogoLeft && template.headerLogoRight
        ? null
        : template.sourceDocxVersionId
          ? await getTemplateVersion(template.sourceDocxVersionId)
          : versions.filter((item) => item.version < template.version && item.contentBase64 && !item.htmlContent).sort((a, b) => b.version - a.version)[0];
      const wordLogos = sourceDocxVersion?.contentBase64 ? wordHeaderLogos(sourceDocxVersion.contentBase64) : [];
      const html = renderContractHtml(contract, template, printSettings, wordLogos);
      const disposition = download ? "attachment" : "inline";
      const fileName = `contrato-${contract.id}-v${template.version}.html`;
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `${disposition}; filename="${fileName}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (!template.contentBase64) return new NextResponse("La versión Word no tiene contenido disponible.", { status: 410 });
    const file = renderContractDocx(contract, template);
    const disposition = download ? "attachment" : "inline";
    const fileName = `contrato-${contract.id}-v${template.version}.docx`;
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": template.contentType,
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error generando contrato Word:", error);
    return new NextResponse("No se pudo generar el documento. Revisa que los marcadores de la plantilla sean válidos.", { status: 422 });
  }
}
