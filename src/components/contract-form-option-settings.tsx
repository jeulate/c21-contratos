"use client";

import { useFormState } from "react-dom";
import { saveContractFormOptionsAction, FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import type { ContractFormOptions } from "@/lib/contract-form-option-defaults";
import { CONTRACT_VALIDITY_UNITS, type ContractValidityUnit } from "@/lib/contract-validity";

const validityUnitLabels: Record<ContractValidityUnit, string> = { dias: "Días", meses: "Meses", años: "Años" };

export function ContractFormOptionSettings({ options }: { options: ContractFormOptions }) {
  const [state, action] = useFormState<FormState, FormData>(saveContractFormOptionsAction, {});
  return (
    <form action={action} className="panel space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-white">Opciones del formulario de contratos</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Administra las opciones que aparecen en los formularios de contratos, perfiles y datos de contacto.</p>
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
        <fieldset className="rounded-xl border border-stone-200 p-4 dark:border-carbon-700">
          <legend className="px-1 text-sm font-semibold text-ink dark:text-white">Unidades de vigencia disponibles</legend>
          <p className="mb-3 text-xs text-ink-mute dark:text-carbon-400">Activa las unidades que los asesores podrán elegir al registrar la duración del contrato. Debe quedar al menos una opción.</p>
          <div className="flex flex-wrap gap-3">
            {CONTRACT_VALIDITY_UNITS.map((unit) => <label key={unit} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-carbon-700">
              <input type="checkbox" name="validityUnits" value={unit} defaultChecked={options.validityUnits.includes(unit)} className="accent-gold-600" />
              {validityUnitLabels[unit]}
            </label>)}
          </div>
          <p className="mt-3 text-xs text-ink-mute dark:text-carbon-400">Al desactivar una unidad, los contratos existentes la conservan y siguen mostrando su vigencia.</p>
        </fieldset>
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
