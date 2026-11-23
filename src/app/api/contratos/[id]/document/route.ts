import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { getContract } from "@/lib/contracts";
import { getTemplateVersion } from "@/lib/contract-templates";
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
  if (download && session.role === "asesor" && contract.estado !== "firmado") {
    return new NextResponse("La descarga estará disponible cuando el contrato se encuentre firmado.", { status: 403 });
  }
  if (!contract.templateVersionId) return new NextResponse("Este contrato no tiene una plantilla Word asignada.", { status: 409 });
  const template = await getTemplateVersion(contract.templateVersionId);
  if (!template) return new NextResponse("No se encontró la versión Word usada por este contrato.", { status: 410 });

  try {
    if (template.format === "html" || template.htmlContent) {
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
