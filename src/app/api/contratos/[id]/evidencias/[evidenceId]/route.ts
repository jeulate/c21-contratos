import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { getContract } from "@/lib/contracts";
import { readContractEvidenceFile } from "@/lib/contract-evidence";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });

  const { id, evidenceId } = await params;
  const contract = await getContract(id);
  if (!contract || (!isStaff(session) && contract.asesor !== session.username)) return new NextResponse("Contrato no encontrado", { status: 404 });
  const evidence = contract.evidencias?.find((item) => item.id === evidenceId);
  if (!evidence) return new NextResponse("Imagen no encontrada", { status: 404 });

  try {
    const file = await readContractEvidenceFile(contract.id, evidence);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": evidence.mimeType,
        "Content-Length": String(file.byteLength),
        "Content-Disposition": `inline; filename="${evidence.id}.${evidence.mimeType.split("/")[1]}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("No se pudo leer la imagen adjunta.", { status: 404 });
  }
}
