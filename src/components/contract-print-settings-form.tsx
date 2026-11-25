"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import Image from "next/image";
import { saveContractPrintSettingsAction, type FormState } from "@/app/actions";
import type { ContractPrintSettings } from "@/lib/contract-print-settings";
import { SubmitButton } from "./submit-button";

export function ContractPrintSettingsForm({ settings }: { settings: ContractPrintSettings }) {
  const [state, action] = useFormState<FormState, FormData>(saveContractPrintSettingsAction, {});
  const [mode, setMode] = useState(settings.watermarkMode);
  const [watermarkImage, setWatermarkImage] = useState(settings.watermarkImage ?? "");
  const [imageError, setImageError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function loadImage(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setImageError("Usa una imagen PNG, JPG o WebP.");
      return;
    }
    if (file.size > 300 * 1024) {
      setImageError("La imagen debe pesar máximo 300 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result.startsWith(`data:${file.type};base64,`)) {
        setImageError("No se pudo leer la imagen. Vuelve a seleccionarla.");
        return;
      }
      setWatermarkImage(reader.result);
      setMode("image");
      setImageError("");
    };
    reader.onerror = () => setImageError("No se pudo leer la imagen. Vuelve a seleccionarla.");
    reader.readAsDataURL(file);
  }

  return <form action={action} className="panel space-y-5 p-5 sm:p-6">
    <div>
      <h3 className="text-sm font-semibold text-ink dark:text-white">Diseño de impresión</h3>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-mute dark:text-carbon-400">Esta marca se aplica a las versiones HTML que se imprimen o guardan como PDF. Los documentos Word conservan su propio diseño y marca.</p>
    </div>
    <input type="hidden" name="watermarkMode" value={mode} />
    <input type="hidden" name="watermarkImage" value={watermarkImage} />
    <fieldset className="grid gap-3 md:grid-cols-3">
      <legend className="sr-only">Marca de agua</legend>
      {([
        ["text", "Marca tipográfica Century 21", "Usa la marca actual."],
        ["image", "Usar una imagen", "Reemplaza la marca tipográfica por tu imagen."],
        ["none", "Sin marca de agua", "El documento se imprime limpio."],
      ] as const).map(([value, title, description]) => <label key={value} className={`cursor-pointer rounded-lg border p-4 transition ${mode === value ? "border-[#8f7a4a] bg-[#BEAF87]/20 ring-2 ring-[#BEAF87]/50" : "border-stone-200 hover:border-[#BEAF87] dark:border-carbon-700"}`}>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white"><input type="radio" checked={mode === value} onChange={() => setMode(value)} className="accent-[#8f7a4a]" />{title}</span>
        <span className="mt-2 block text-xs leading-5 text-ink-mute dark:text-carbon-400">{description}</span>
      </label>)}
    </fieldset>
    {mode === "image" && <div className="rounded-lg border border-stone-200 p-4 dark:border-carbon-700">
      <label htmlFor="print-watermark-image" className="label">Imagen de marca de agua</label>
      <p className="mb-3 text-xs text-ink-mute dark:text-carbon-400">PNG, JPG o WebP; máximo 300 KB. Se mostrará centrada, inclinada y con transparencia para conservar la legibilidad del contrato.</p>
      {watermarkImage && <div className="mb-3 flex min-h-28 items-center justify-center rounded-md bg-white p-3">
        <Image src={watermarkImage} alt="Vista previa de la marca de agua" width={320} height={160} unoptimized className="max-h-32 max-w-full object-contain" />
      </div>}
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} id="print-watermark-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => loadImage(event.target.files?.[0])} className="input max-w-xl text-xs" />
        {watermarkImage && <button type="button" onClick={() => { setWatermarkImage(""); setMode("none"); if (inputRef.current) inputRef.current.value = ""; }} className="btn-ghost text-xs">Quitar imagen</button>}
      </div>
      {imageError && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{imageError}</p>}
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-3xl text-xs text-ink-mute dark:text-carbon-400">La nueva configuración se aplicará al abrir o imprimir los documentos HTML.</p>
      <SubmitButton>Guardar diseño de impresión</SubmitButton>
    </div>
    {state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>}
    {state.ok && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{state.ok}</p>}
  </form>;
}
