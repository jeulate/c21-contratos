"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { activateContractTemplateAction, deleteContractTemplateAction, uploadContractTemplateAction, FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import { TEMPLATE_CONTRACT_TYPES } from "@/lib/contract-types";

export function TemplateUploadForm({ selectedType }: { selectedType?: string }) {
  const [state, action] = useFormState<FormState, FormData>(uploadContractTemplateAction, {});
  return (
    <form action={action} className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-ink dark:text-white">Cargar una versión Word</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Los archivos se guardan en Redis privado como borradores. La plantilla no se usa hasta que Legal la active.</p>
      </div>
      {selectedType ? <input type="hidden" name="tipo" value={selectedType} /> : <div>
        <label className="label" htmlFor="tipo">Modelo de contrato</label>
        <select id="tipo" name="tipo" className="input" required>
          {TEMPLATE_CONTRACT_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>}
      <div className={selectedType ? "sm:col-span-2" : ""}>
        <label className="label" htmlFor="archivo">Documento Word (.docx, máximo 5 MB)</label>
        <input id="archivo" name="archivo" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="input" required />
      </div>
      <div className="sm:col-span-2 rounded-xl bg-stone-50 p-4 text-xs text-ink-soft dark:bg-carbon-950 dark:text-carbon-300">
        <p className="font-semibold">Marcadores disponibles</p>
        <p className="mt-1">Usa doble llave en Word. Ejemplos: <code>{"{{owner1.fullName}}"}</code>, <code>{"{{property.address}}"}</code>, <code>{"{{contract.amount}}"}</code>, <code>{"{{advisor.fullName}}"}</code>.</p>
        <p className="mt-1">También se admiten <code>{"{{owner2.identityNumber}}"}</code>, <code>{"{{contract.amountInWords}}"}</code>, <code>{"{{property.hectares}}"}</code> y campos de formulario como <code>{"{{extras.propertyZone}}"}</code>. El sistema muestra la lista detectada en cada versión.</p>
        <p className="mt-1">Para datos opcionales del segundo propietario, encierra el bloque con <code>{"{{#owner2.fullName}}...{{/owner2.fullName}}"}</code>; así se omite si no se registró un segundo propietario.</p>
        <p className="mt-1">Para incluir todos los propietarios en el Word, reemplaza el bloque de nombres individuales por este bloque repetible: <code>{"{{#owners}}{{number}}. {{fullName}} · C.I. {{identityNumber}} · {{identityIssuedIn}} · {{address}}{{/owners}}"}</code>. Conserva los demás marcadores. Al cargar esta revisión, la lista puede reemplazar los marcadores individuales de owner1 y owner2.</p>
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

export function DeleteTemplateForm({ id, version, compact = false, fileName }: { id: string; version: number; compact?: boolean; fileName?: string }) {
  const [state, action] = useFormState<FormState, FormData>(deleteContractTemplateAction, {});
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const confirmed = confirmation.trim().toLocaleUpperCase() === "ELIMINAR";
  return (
    <>
      <button
        type="button"
        onClick={() => { setConfirmation(""); setOpen(true); }}
        className={`btn border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-carbon-900 dark:text-red-300 dark:hover:bg-red-950 ${compact ? "!px-2.5 !py-1.5 !text-xs" : ""}`}
        aria-label={`Eliminar versión ${version}`}
      >
        {compact ? "Eliminar" : "Eliminar versión"}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
        >
          <section className="panel w-full max-w-md space-y-4 p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby={`delete-template-title-${id}`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Acción permanente</p>
              <h2 id={`delete-template-title-${id}`} className="mt-1 text-lg font-semibold text-ink dark:text-white">¿Eliminar la versión v{version}?</h2>
              {fileName && <p className="mt-1 break-words text-sm text-ink-soft dark:text-carbon-300">{fileName}</p>}
              <p className="mt-2 text-sm text-ink-mute dark:text-carbon-400">El archivo dejará de estar disponible como versión de plantilla. Esta acción no se puede deshacer.</p>
            </div>
            <form action={action} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div>
                <label className="label" htmlFor={`confirm-delete-template-${id}`}>Escribe <strong>ELIMINAR</strong> para confirmar</label>
                <input
                  id={`confirm-delete-template-${id}`}
                  className="input"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  autoFocus
                  required
                />
              </div>
              {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <SubmitButton disabled={!confirmed} className="bg-red-700 hover:bg-red-800 disabled:bg-red-300 dark:bg-red-700 dark:hover:bg-red-600">Confirmar eliminación</SubmitButton>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function TemplateRevisionForm({ id, tipo }: { id: string; tipo: string }) {
  const [state, action] = useFormState<FormState, FormData>(uploadContractTemplateAction, {});
  return (
    <form action={action} className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-carbon-800 dark:bg-carbon-950 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="versionOrigen" value={id} />
      <div>
        <label className="label" htmlFor={`revision-${id}`}>Subir el Word actualizado (.docx, máximo 5 MB)</label>
        <input id={`revision-${id}`} name="archivo" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="input" required />
      </div>
      <SubmitButton>Guardar nueva versión</SubmitButton>
      {state.error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{state.ok}</p>}
    </form>
  );
}
