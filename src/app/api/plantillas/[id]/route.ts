import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTemplateVersion } from "@/lib/contract-templates";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["admin", "legal"].includes(session.role)) return new NextResponse("No autorizado", { status: 403 });
  const { id } = await params;
  const template = await getTemplateVersion(id);
  if (!template) return new NextResponse("Plantilla no encontrada", { status: 404 });
  const bytes = Buffer.from(template.contentBase64, "base64");
  const safeName = template.fileName.replace(/[\r\n"\\]/g, "_");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": template.contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
