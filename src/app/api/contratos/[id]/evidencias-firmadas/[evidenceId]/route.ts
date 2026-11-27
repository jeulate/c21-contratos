import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContract, requestSignedEvidenceReplacement } from "@/lib/contracts";
import { deleteSignedContractEvidenceFile, readContractEvidenceFile, saveSignedContractEvidenceFile } from "@/lib/contract-evidence";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado.", { status: 401 });
  if (session.role !== "admin" && session.role !== "legal") return new NextResponse("Solo Legal o Administración puede solicitar el reemplazo de una fotografía.", { status: 403 });

  const { id, evidenceId } = await params;
  const contract = await getContract(id);
  if (!contract || contract.estado !== "firmado") return new NextResponse("Contrato firmado no encontrado.", { status: 404 });
  const evidence = contract.evidenciasFirmadas?.find((item) => item.id === evidenceId);
  if (!evidence) return new NextResponse("La fotografía ya no está asociada al contrato.", { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readContractEvidenceFile(id, evidence, true);
    await deleteSignedContractEvidenceFile(id, evidence);
  } catch {
    return new NextResponse("No se pudo retirar la fotografía del almacenamiento.", { status: 500 });
  }

  try {
    await requestSignedEvidenceReplacement(id, evidenceId, session.username);
  } catch (error) {
    await saveSignedContractEvidenceFile(id, evidence, bytes).catch(() => undefined);
    return new NextResponse(error instanceof Error ? error.message : "No se pudo registrar la solicitud de reemplazo.", { status: 500 });
  }

  revalidatePath(`/contratos/${id}`);
  revalidatePath("/contratos");
  return NextResponse.json({ ok: "La fotografía se retiró y se notificó al asesor para que la reemplace." }, { headers: { "Cache-Control": "no-store" } });
}
