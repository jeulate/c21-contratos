import { NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { appendSignedContractEvidence, getContract } from "@/lib/contracts";
import {
  MAX_CONTRACT_EVIDENCE_BYTES,
  deleteSignedContractEvidenceFile,
  saveSignedContractEvidenceFile,
  type ContractEvidence,
} from "@/lib/contract-evidence";

export const dynamic = "force-dynamic";

const validImage = (bytes: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado.", { status: 401 });

  const { id } = await params;
  const contract = await getContract(id);
  if (!contract || (!isStaff(session) && contract.asesor !== session.username)) {
    return new NextResponse("Contrato no encontrado.", { status: 404 });
  }
  if (contract.estado !== "firmado") {
    return new NextResponse("Las fotografías solo se pueden adjuntar cuando Legal haya aprobado y firmado el contrato.", { status: 409 });
  }
  if ((contract.evidenciasFirmadas?.length ?? 0) >= 20) {
    return new NextResponse("Este contrato ya alcanzó el máximo de 20 fotografías firmadas.", { status: 409 });
  }

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return new NextResponse("No se pudo leer la imagen enviada.", { status: 400 });
  }
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) return new NextResponse("Selecciona una fotografía para adjuntar.", { status: 400 });
  if (file.size > MAX_CONTRACT_EVIDENCE_BYTES) return new NextResponse("La imagen comprimida supera 1 MB.", { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImage(bytes, file.type)) return new NextResponse("El archivo no coincide con un formato de imagen válido.", { status: 415 });
  const evidence: ContractEvidence = {
    id: crypto.randomUUID(),
    fileName: file.name.replace(/[\\/\u0000-\u001f\u007f]/g, "").slice(0, 140) || "contrato-firmado.webp",
    mimeType: file.type as ContractEvidence["mimeType"],
    size: bytes.byteLength,
    uploadedAt: new Date().toISOString(),
  };

  try {
    await saveSignedContractEvidenceFile(id, evidence, bytes);
    try {
      await appendSignedContractEvidence(id, evidence, session.username, session.name);
    } catch (error) {
      await deleteSignedContractEvidenceFile(id, evidence).catch(() => undefined);
      return new NextResponse(error instanceof Error ? error.message : "No se pudo asociar la fotografía al contrato.", { status: 409 });
    }
    return NextResponse.json(evidence, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "No se pudo almacenar la fotografía.", { status: 500 });
  }
}
