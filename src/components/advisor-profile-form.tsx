"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFormState } from "react-dom";
import { saveAdvisorProfile, type FormState } from "@/app/actions";
import type { AdvisorProfile } from "@/lib/users";
import { isAdvisorProfileComplete } from "@/lib/advisor-profile";
import type { ContractFormOptions } from "@/lib/contract-form-option-defaults";
import { CorporateSelect } from "./corporate-select";
import { SubmitButton } from "./submit-button";

const fields = [
  { name: "fullName", label: "Nombre legal completo", type: "text", autoComplete: "name", wide: true },
  { name: "identityNumber", label: "Cédula de identidad", type: "text", autoComplete: "off" },
  { name: "address", label: "Domicilio", type: "text", autoComplete: "street-address", wide: true },
  { name: "mobile", label: "Teléfono móvil", type: "tel", autoComplete: "tel" },
  { name: "whatsapp", label: "WhatsApp", type: "tel", autoComplete: "off" },
  { name: "email", label: "Correo electrónico", type: "email", autoComplete: "email" },
] as const;

type ProfileFormProps = { profile?: AdvisorProfile; identityCities: string[] };

export function AdvisorProfileForm({ profile, identityCities }: ProfileFormProps) {
  const [state, action] = useFormState<FormState, FormData>(saveAdvisorProfile, {});
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const handledSaveRevision = useRef(state.revision ?? "");
  const complete = isAdvisorProfileComplete(profile);
  const [editing, setEditing] = useState(!complete);
  const [photoId, setPhotoId] = useState(profile?.photoId ?? "");
  const [photoMimeType, setPhotoMimeType] = useState(profile?.photoMimeType ?? "");
  const [previewUrl, setPreviewUrl] = useState(profile?.photoId ? `/api/profile/avatar?id=${encodeURIComponent(profile.photoId)}` : "");
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (state.ok && state.revision && state.revision !== handledSaveRevision.current) {
      handledSaveRevision.current = state.revision;
      setEditing(false);
      if (photoId) setPreviewUrl(`/api/profile/avatar?id=${encodeURIComponent(photoId)}`);
      router.refresh();
    }
  }, [photoId, router, state.ok, state.revision]);

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setPhotoError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Usa una imagen JPG, PNG o WebP.");
      event.currentTarget.value = "";
      return;
    }
    if (file.size > 1024 * 1024) {
      setPhotoError("La foto debe pesar como máximo 1 MB.");
      event.currentTarget.value = "";
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: data });
      if (!response.ok) throw new Error((await response.text()) || "No se pudo cargar la foto.");
      const result = await response.json() as { id: string };
      setPhotoId(result.id);
      setPhotoMimeType(file.type);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "No se pudo cargar la foto.");
    } finally {
      setUploading(false);
      event.currentTarget.value = "";
    }
  }

  const image = previewUrl ? (
    <Image src={previewUrl} alt={`Foto de ${profile?.fullName ?? "perfil del asesor"}`} width={96} height={96} unoptimized className="h-20 w-20 rounded-full object-cover ring-4 ring-white dark:ring-carbon-800 sm:h-24 sm:w-24" />
  ) : (
    <span className="grid h-20 w-20 place-items-center rounded-full bg-gold-100 text-2xl font-semibold text-gold-800 ring-4 ring-white dark:bg-gold-500/15 dark:text-gold-200 dark:ring-carbon-800">{(profile?.fullName ?? "A").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}</span>
  );

  return (
    <section className="panel p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink dark:text-white">Información personal</h2>
          <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Estos datos se reutilizarán en tus contratos.</p>
        </div>
        {complete && !editing && <button type="button" className="btn-ghost gap-2" onClick={() => setEditing(true)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m15 5 4 4M4 20l4-.8L19 8a2.12 2.12 0 0 0-3-3L5 16l-1 4Z" /></svg>
          Editar
        </button>}
      </div>

      {!editing ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-4 border-b border-stone-200 pb-6 dark:border-carbon-700">
            {image}
            <div><h3 className="text-lg font-semibold text-ink dark:text-white">{profile?.fullName}</h3><p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Asesor · Cédula {profile?.identityNumber}</p></div>
          </div>
          <dl className="grid gap-x-8 gap-y-5 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Lugar de expedición", profile?.identityIssuedIn], ["Domicilio", profile?.address], ["Teléfono móvil", profile?.mobile],
              ["WhatsApp", profile?.whatsapp], ["Correo electrónico", profile?.email],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-mute dark:text-carbon-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-ink dark:text-carbon-100">{value}</dd></div>)}
          </dl>
          {profile?.updatedAt && <p className="mt-6 text-xs text-ink-mute dark:text-carbon-400">Última actualización: {new Date(profile.updatedAt).toLocaleString("es-BO")}</p>}
        </div>
      ) : (
        <form action={action} className="mt-6 space-y-5">
          <input type="hidden" name="photoId" value={photoId} />
          <input type="hidden" name="photoMimeType" value={photoMimeType} />
          <div className="flex flex-wrap items-center gap-5 rounded-xl border border-stone-200 p-4 dark:border-carbon-700">
            {image}
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink dark:text-white">Foto de perfil</p>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectPhoto} />
                <button type="button" className="btn-ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Cargando…" : "Subir foto"}</button>
              </div>
              <p className="text-xs text-ink-mute dark:text-carbon-400">JPG, PNG o WebP · máximo 1 MB</p>
              {photoError && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{photoError}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.slice(0, 2).map((field) => (
              <div key={field.name} className={"wide" in field && field.wide ? "sm:col-span-2" : ""}>
                <label className="label" htmlFor={field.name}>{field.label}</label>
                <input id={field.name} name={field.name} type={field.type} defaultValue={profile?.[field.name] ?? ""} className="input" autoComplete={field.autoComplete} required />
              </div>
            ))}
            <div>
              <label className="label" htmlFor="identityIssuedIn">Lugar de expedición</label>
              <CorporateSelect id="identityIssuedIn" name="identityIssuedIn" defaultValue={profile?.identityIssuedIn ?? ""} options={[...new Set([...identityCities, ...(profile?.identityIssuedIn ? [profile.identityIssuedIn] : [])])].map((city) => ({ value: city, label: city }))} searchable searchPlaceholder="Buscar ciudad..." required />
            </div>
            {fields.slice(2).map((field) => (
              <div key={field.name} className={"wide" in field && field.wide ? "sm:col-span-2" : ""}>
                <label className="label" htmlFor={field.name}>{field.label}</label>
                <input id={field.name} name={field.name} type={field.type} defaultValue={profile?.[field.name] ?? ""} className="input" autoComplete={field.autoComplete} required />
              </div>
            ))}
          </div>
          {profile?.updatedAt && <p className="text-xs text-ink-mute dark:text-carbon-400">Última actualización: {new Date(profile.updatedAt).toLocaleString("es-BO")}</p>}
          {state.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
          {state.ok && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{state.ok}</p>}
          <div className="flex flex-wrap gap-2">
            <SubmitButton disabled={uploading}>Guardar perfil</SubmitButton>
            {complete && <button type="button" className="btn-ghost" onClick={() => { setEditing(false); setPhotoId(profile?.photoId ?? ""); setPhotoMimeType(profile?.photoMimeType ?? ""); setPreviewUrl(profile?.photoId ? `/api/profile/avatar?id=${encodeURIComponent(profile.photoId)}` : ""); setPhotoError(""); }}>Cancelar</button>}
          </div>
        </form>
      )}
    </section>
  );
}
