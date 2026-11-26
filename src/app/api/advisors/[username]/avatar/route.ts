import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readAdvisorProfilePhoto } from "@/lib/contract-evidence";
import { getUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  if (!session || !["admin", "administrativo", "legal"].includes(session.role)) {
    return new NextResponse("No autorizado", { status: 401 });
  }
  const { username } = await params;
  const user = await getUser(username);
  const profile = user?.role === "asesor" ? user.advisorProfile : undefined;
  if (!user || user.role !== "asesor" || !profile?.photoId || !profile.photoMimeType) return new NextResponse("Foto no encontrada", { status: 404 });

  try {
    const bytes = await readAdvisorProfilePhoto(user.username, profile.photoId, profile.photoMimeType);
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
