"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { saveContract, FormState } from "@/app/actions";
import { amountInWords } from "@/lib/amount-in-words";
import { CONTRACT_TYPES, CURRENCY_NAMES, CURRENCY_SYMBOLS, isTemplateBasedContract, STATES, type Currency } from "@/lib/contract-types";
import type { Contract } from "@/lib/contracts";
import type { AdvisorProfile } from "@/lib/users";
import { SubmitButton } from "./submit-button";

export function ContractForm({ contract, advisorProfile, currencyByType, canManageState = true }: { contract?: Contract; advisorProfile?: AdvisorProfile; currencyByType?: Record<string, Currency>; canManageState?: boolean }) {
  const [tipo, setTipo] = useState(contract?.tipo ?? CONTRACT_TYPES[0].id);
  const [monto, setMonto] = useState(contract ? String(contract.monto) : "");
  const [state, action] = useFormState<FormState, FormData>(saveContract.bind(null, contract?.id ?? null), {});
  const contractType = CONTRACT_TYPES.find((item) => item.id === tipo);
  const extras = contractType?.extras ?? [];
  const templateBased = isTemplateBasedContract(tipo);
  const selectedCurrency = (contract?.moneda ?? currencyByType?.[tipo] ?? "BOB") as Currency;
  const selectedProfile = contract?.asesorProfileSnapshot ?? advisorProfile;
  const today = new Date().toISOString().slice(0, 10);
  const sections = [...new Set(extras.map((field) => field.section ?? "Datos adicionales"))];
  const amountLabel = tipo === "exclusiva-alquiler" ? "Canon de arrendamiento mensual" : tipo === "exclusiva-anticretico" ? "Monto referencial de anticrético" : tipo === "exclusiva-rural" ? "Precio total referencial" : "Precio referencial de venta";
  const amountWords = amountInWords(monto, selectedCurrency);

  return (
    <form action={action} className="panel space-y-5 p-5 sm:p-6">
      <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-carbon-800 dark:bg-carbon-950/40">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink dark:text-white">Identificación del contrato</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Selecciona el modelo y registra la fecha del documento.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tipo">Tipo de contrato</label>
            <select id="tipo" name="tipo" value={tipo} onChange={(event) => setTipo(event.target.value)} className="input">
              {CONTRACT_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="fecha">Fecha del contrato</label>
            <input id="fecha" name="fecha" type="date" defaultValue={contract?.fecha ?? today} className="input" required />
          </div>
          {canManageState ? <div>
            <label className="label" htmlFor="estado">Estado</label>
            <select id="estado" name="estado" defaultValue={contract?.estado ?? "borrador"} className="input">
              {STATES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div> : <input type="hidden" name="estado" value={contract?.estado ?? "revision"} />}
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 p-4 dark:border-carbon-800">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink dark:text-white">Cliente o propietario principal</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Ingresa los datos de identificación que aparecerán en el contrato.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cliente">{templateBased ? "Nombre completo del propietario/a" : "Cliente"}</label>
            <input id="cliente" name="cliente" defaultValue={contract?.cliente} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="clienteDoc">{templateBased ? "Cédula de identidad" : "CI / NIT del cliente"}</label>
            <input id="clienteDoc" name="clienteDoc" defaultValue={contract?.clienteDoc} className="input" />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 p-4 dark:border-carbon-800">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink dark:text-white">Inmueble</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Registra una dirección o referencia que permita identificar la propiedad.</p>
        </div>
        <div>
          <label className="label" htmlFor="propiedad">{tipo === "exclusiva-rural" ? "Referencia / ubicación de la propiedad" : "Dirección o referencia del inmueble"}</label>
          <input id="propiedad" name="propiedad" defaultValue={contract?.propiedad} className="input" required />
        </div>
      </section>

      <section className="rounded-xl border border-gold-200 bg-gold-50/40 p-4 dark:border-carbon-700 dark:bg-carbon-950/40">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink dark:text-white">Monto y condiciones</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">La divisa la define el administrador. El monto en palabras se completa desde el importe numérico.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="monto">{templateBased ? amountLabel : "Monto"}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="moneda" value={selectedCurrency} />
              <div className="input flex shrink-0 flex-col justify-center bg-white sm:w-44 dark:bg-carbon-900" aria-label={`Divisa ${selectedCurrency}`}>
                <span className="text-sm font-semibold">{selectedCurrency} · {CURRENCY_SYMBOLS[selectedCurrency as Currency]}</span>
                <span className="text-[10px] text-ink-mute dark:text-carbon-400">{CURRENCY_NAMES[selectedCurrency as Currency]}</span>
              </div>
              <input id="monto" name="monto" type="number" step="0.01" min="0" value={monto} onChange={(event) => setMonto(event.target.value)} className="input" required />
            </div>
          </div>
          {!templateBased && <div>
            <label className="label" htmlFor="comision">Comisión (%)</label>
            <input id="comision" name="comision" type="number" step="0.01" min="0" max="100" defaultValue={contract?.comision ?? 3} className="input" />
          </div>}
          {templateBased && <input type="hidden" name="comision" value="0" />}
        </div>
      </section>

      {templateBased && selectedProfile && <section className="rounded-xl border border-gold-200 bg-gold-50/60 p-4 dark:border-carbon-700 dark:bg-carbon-950/50">
        <h2 className="text-sm font-semibold text-ink dark:text-white">Datos del asesor</h2>
        <p className="mt-1 text-sm text-ink-soft dark:text-carbon-300">Se incorporan desde tu perfil: {selectedProfile.fullName} · C.I. {selectedProfile.identityNumber} · {selectedProfile.mobile} · {selectedProfile.email}</p>
      </section>}

      {sections.map((section) => (
        <fieldset key={`${tipo}-${section}`} className="rounded-xl border border-stone-200 p-4 dark:border-carbon-800">
          <legend className="px-1 text-sm font-semibold text-ink dark:text-white">{section}</legend>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            {extras.filter((field) => (field.section ?? "Datos adicionales") === section).map((field) => {
              const fieldId = `x_${field.key}`;
              const fieldLabel = field.key === "amountInWords" ? `Monto en palabras (${selectedCurrency})` : field.key === "pricePerHectare" ? `Precio por hectárea (${selectedCurrency})` : field.label;
              const isAmountInWords = field.key === "amountInWords";
              const defaultValue = contract?.tipo === tipo ? contract.extras[field.key] : "";
              return (
                <div key={`${tipo}-${field.key}`} className={field.type === "textarea" || isAmountInWords ? "sm:col-span-2" : ""}>
                  <label className="label" htmlFor={fieldId}>{fieldLabel}{field.required ? "" : " (opcional)"}</label>
                  {field.type === "textarea" ? <textarea id={fieldId} name={fieldId} rows={3} defaultValue={defaultValue} className="input" required={field.required} /> : isAmountInWords ? <input id={fieldId} name={fieldId} value={amountWords} readOnly className="input bg-stone-50 uppercase dark:bg-carbon-950" aria-describedby="amountInWordsHelp" required={field.required} /> : <input id={fieldId} name={fieldId} type={field.type === "number" || field.type === "date" ? field.type : "text"} defaultValue={defaultValue} className="input" required={field.required} />}
                  {isAmountInWords && <p id="amountInWordsHelp" className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Se actualiza automáticamente al cambiar el monto.</p>}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <section className="rounded-xl border border-stone-200 p-4 dark:border-carbon-800">
        <label className="label" htmlFor="notas">Notas internas (opcional)</label>
        <textarea id="notas" name="notas" rows={3} defaultValue={contract?.notas} className="input" />
      </section>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
      <SubmitButton>{contract ? "Guardar cambios" : "Crear contrato"}</SubmitButton>
    </form>
  );
}
