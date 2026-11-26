import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUser } from "@/lib/users";
import { isAdvisorProfileComplete } from "@/lib/advisor-profile";
import { readAdvisorProfilePhoto, saveAdvisorProfilePhoto } from "@/lib/contract-evidence";

export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 1024 * 1024;
const mimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
type PhotoMimeType = typeof mimeTypes[number];

function hasValidImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "asesor") return new NextResponse("No autorizado", { status: 401 });

  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) return new NextResponse("Selecciona una foto de perfil.", { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return new NextResponse("La foto debe pesar como máximo 1 MB.", { status: 413 });
  if (!mimeTypes.includes(file.type as PhotoMimeType)) return new NextResponse("Usa una imagen JPG, PNG o WebP.", { status: 415 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, file.type)) return new NextResponse("El archivo no coincide con el formato de imagen indicado.", { status: 415 });

  const id = crypto.randomUUID();
  try {
    await saveAdvisorProfilePhoto(session.username, id, file.type as PhotoMimeType, bytes);
    return NextResponse.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "No se pudo guardar la foto.", { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "asesor") return new NextResponse("No autorizado", { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const user = await getUser(session.username);
  const profile = user?.advisorProfile;
  if (!profile?.photoId || profile.photoId !== id || !profile.photoMimeType || !isAdvisorProfileComplete(profile)) {
    return new NextResponse("Foto no encontrada", { status: 404 });
  }
  try {
    const bytes = await readAdvisorProfilePhoto(session.username, profile.photoId, profile.photoMimeType);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": profile.photoMimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Foto no encontrada", { status: 404 });
  }
}
