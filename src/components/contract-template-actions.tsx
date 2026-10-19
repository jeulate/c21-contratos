"use client";

import { useFormState } from "react-dom";
import { activateContractTemplateAction, uploadContractTemplateAction, FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import { TEMPLATE_CONTRACT_TYPES } from "@/lib/contract-types";

export function TemplateUploadForm() {
  const [state, action] = useFormState<FormState, FormData>(uploadContractTemplateAction, {});
  return (
    <form action={action} className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-ink dark:text-white">Cargar una versión Word</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Los archivos se guardan en Redis privado como borradores. La plantilla no se usa hasta que Legal la active.</p>
      </div>
      <div>
        <label className="label" htmlFor="tipo">Modelo de contrato</label>
        <select id="tipo" name="tipo" className="input" required>
          {TEMPLATE_CONTRACT_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="archivo">Documento Word (.docx, máximo 5 MB)</label>
        <input id="archivo" name="archivo" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="input" required />
      </div>
      <div className="sm:col-span-2 rounded-xl bg-stone-50 p-4 text-xs text-ink-soft dark:bg-carbon-950 dark:text-carbon-300">
        <p className="font-semibold">Marcadores disponibles</p>
        <p className="mt-1">Usa doble llave en Word. Ejemplos: <code>{"{{owner1.fullName}}"}</code>, <code>{"{{property.address}}"}</code>, <code>{"{{contract.amount}}"}</code>, <code>{"{{advisor.fullName}}"}</code>.</p>
        <p className="mt-1">También se admiten <code>{"{{owner2.identityNumber}}"}</code>, <code>{"{{contract.amountInWords}}"}</code>, <code>{"{{property.hectares}}"}</code> y campos de formulario como <code>{"{{extras.propertyZone}}"}</code>. El sistema muestra la lista detectada en cada versión.</p>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{state.ok}</p>}
      <div className="sm:col-span-2"><SubmitButton>Cargar como borrador</SubmitButton></div>
    </form>
  );
}

export function ActivateTemplateForm({ id }: { id: string }) {
  const [state, action] = useFormState<FormState, FormData>(activateContractTemplateAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      {state.error && <p role="alert" className="text-xs text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-xs text-emerald-700">{state.ok}</p>}
      <SubmitButton>Activar esta versión</SubmitButton>
    </form>
  );
}
