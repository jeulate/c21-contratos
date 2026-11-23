"use client";

import { useFormState } from "react-dom";
import { saveContractFormOptionsAction, FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import type { ContractFormOptions } from "@/lib/contract-form-option-defaults";

export function ContractFormOptionSettings({ options }: { options: ContractFormOptions }) {
  const [state, action] = useFormState<FormState, FormData>(saveContractFormOptionsAction, {});
  return (
    <form action={action} className="panel space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-white">Opciones del formulario de contratos</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Administra las opciones que aparecen al registrar las características del inmueble y el lugar de expedición de documentos.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label className="label" htmlFor="propertyTypes">Tipos de inmueble</label>
          <textarea id="propertyTypes" name="propertyTypes" rows={7} defaultValue={options.propertyTypes.join("\n")} className="input resize-y" required />
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Una opción por línea. Al iniciar: Casa y Departamento.</p>
        </div>
        <div>
          <label className="label" htmlFor="identityCities">Ciudades para lugar de expedición</label>
          <textarea id="identityCities" name="identityCities" rows={7} defaultValue={options.identityCities.join("\n")} className="input resize-y" required />
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Una ciudad por línea. Puedes agregar o quitar opciones.</p>
        </div>
        <div className="lg:col-span-2">
          <label className="label" htmlFor="countryCallingCodes">Países y prefijos telefónicos de WhatsApp</label>
          <textarea
            id="countryCallingCodes"
            name="countryCallingCodes"
            rows={8}
            defaultValue={options.countryCallingCodes.map((item) => `${item.code}|${item.dial}|${item.name}`).join("\n")}
            className="input max-h-72 resize-y overflow-y-auto font-mono text-sm"
            required
            spellCheck={false}
            aria-describedby="countryCallingCodesHelp"
          />
          <p id="countryCallingCodesHelp" className="mt-1 text-xs text-ink-mute dark:text-carbon-400">
            Una opción por línea, con formato CÓDIGO ISO de dos letras|PREFIJO|PAÍS. Ejemplo: BO|+591|Bolivia. El selector muestra la bandera y el prefijo; permite buscar por nombre y desplazarse por la lista.
          </p>
        </div>
      </div>
      {state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{state.ok}</p>}
      <SubmitButton>Guardar opciones</SubmitButton>
    </form>
  );
}
