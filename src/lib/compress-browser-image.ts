import { MAX_CONTRACT_EVIDENCE_BYTES } from "@/lib/contract-evidence-constants";

/** Compresses a browser-decodable image to WebP, capped at the evidence storage limit. */
export async function compressBrowserImageToWebp(source: File) {
  const bitmap = await createImageBitmap(source);
  try {
    for (const maxDimension of [1920, 1600, 1280, 1024, 800, 640]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("El navegador no pudo preparar la imagen.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (value) => value ? resolve(value) : reject(new Error("No se pudo comprimir la imagen.")),
            "image/webp",
            quality,
          );
        });
        if (blob.type === "image/webp" && blob.size <= MAX_CONTRACT_EVIDENCE_BYTES) {
          const baseName = source.name.replace(/\.[^.]+$/, "").slice(0, 100) || "imagen";
          return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
        }
      }
    }
    throw new Error("No se pudo reducir la imagen a 1 MB. Prueba con otra imagen.");
  } finally {
    bitmap.close();
  }
}
