import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { MAX_CONTRACT_EVIDENCE_BYTES, isEvidenceIdentifier, saveStagedContractEvidence, deleteStagedContractEvidence } from "@/lib/contract-evidence";

export const dynamic = "force-dynamic";

const isSupportedImage = (bytes: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
};

async function advisorOrStaff() {
  const session = await getSession();
  if (!session) return { response: new NextResponse("No autorizado", { status: 401 }) };
  if (session.role === "legal") return { response: new NextResponse("Este perfil no puede adjuntar evidencias.", { status: 403 }) };
  return { session };
}

export async function POST(request: Request) {
  const access = await advisorOrStaff();
  if (access.response) return access.response;

  const data = await request.formData();
  const sessionId = String(data.get("sessionId") ?? "");
  const id = String(data.get("id") ?? "");
  const file = data.get("file");
  if (!isEvidenceIdentifier(sessionId) || !isEvidenceIdentifier(id)) return new NextResponse("La sesión de carga no es válida.", { status: 400 });
  if (!(file instanceof File) || file.size === 0) return new NextResponse("Selecciona una imagen para adjuntar.", { status: 400 });
  if (file.size > MAX_CONTRACT_EVIDENCE_BYTES) return new NextResponse("La imagen comprimida supera 1 MB.", { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isSupportedImage(bytes, file.type)) return new NextResponse("El archivo no coincide con el formato de imagen indicado.", { status: 415 });
  try {
    const evidence = await saveStagedContractEvidence(access.session.username, sessionId, id, file.name, file.type as "image/webp" | "image/jpeg" | "image/png", bytes);
    return NextResponse.json(evidence, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "No se pudo guardar la imagen.", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await advisorOrStaff();
  if (access.response) return access.response;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const id = url.searchParams.get("id") ?? "";
  if (!isEvidenceIdentifier(sessionId) || !isEvidenceIdentifier(id)) return new NextResponse("La imagen indicada no es válida.", { status: 400 });
  await deleteStagedContractEvidence(access.session.username, sessionId, id);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
