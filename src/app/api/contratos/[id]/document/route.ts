import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { getContract } from "@/lib/contracts";
import { getTemplateVersion, listTemplateVersions } from "@/lib/contract-templates";
import { renderContractDocx } from "@/lib/contract-document";
import { renderContractHtml } from "@/lib/contract-html-document";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract || (!isStaff(session) && contract.asesor !== session.username)) return new NextResponse("Contrato no encontrado", { status: 404 });
  const download = new URL(request.url).searchParams.has("download");
  const requestedFormat = new URL(request.url).searchParams.get("download");
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
      const html = renderContractHtml(contract, template);
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
