"use client";

import { useFormState } from "react-dom";
import { saveAdvisorProfile, FormState } from "@/app/actions";
import type { AdvisorProfile } from "@/lib/users";
import { SubmitButton } from "./submit-button";

const fields: { name: keyof Omit<AdvisorProfile, "updatedAt">; label: string; type?: string }[] = [
  { name: "fullName", label: "Nombre legal completo" },
  { name: "identityNumber", label: "Cédula de identidad" },
  { name: "identityIssuedIn", label: "Lugar de expedición" },
  { name: "address", label: "Domicilio" },
  { name: "mobile", label: "Teléfono móvil", type: "tel" },
  { name: "whatsapp", label: "WhatsApp", type: "tel" },
  { name: "email", label: "Correo electrónico", type: "email" },
];

export function AdvisorProfileForm({ profile }: { profile?: AdvisorProfile }) {
  const [state, action] = useFormState<FormState, FormData>(saveAdvisorProfile, {});
  return (
    <form action={action} className="panel space-y-5 p-5 sm:p-6">
      <p className="text-sm text-ink-mute dark:text-carbon-400">
        Estos datos se reutilizarán en los contratos y quedarán asociados al perfil del asesor.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ name, label, type }) => (
          <div key={name} className={name === "fullName" || name === "address" ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor={name}>{label}</label>
            <input
              id={name}
              name={name}
              type={type ?? "text"}
              defaultValue={profile?.[name] ?? ""}
              className="input"
              autoComplete="off"
              required
            />
          </div>
        ))}
      </div>
      {profile?.updatedAt && (
        <p className="text-xs text-ink-mute dark:text-carbon-400">
          Última actualización: {new Date(profile.updatedAt).toLocaleString("es-BO")}
        </p>
      )}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
      <SubmitButton>Guardar perfil</SubmitButton>
    </form>
  );
}
