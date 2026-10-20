"use client";
import { useState } from "react";
import { useFormState } from "react-dom";
import { saveContract, FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import { CONTRACT_TYPES, CURRENCY_NAMES, CURRENCY_SYMBOLS, isTemplateBasedContract, STATES, type Currency } from "@/lib/contract-types";
import type { Contract } from "@/lib/contracts";
import type { AdvisorProfile } from "@/lib/users";

export function ContractForm({ contract, advisorProfile, currencyByType, canManageState = true }: { contract?: Contract; advisorProfile?: AdvisorProfile; currencyByType?: Record<string, Currency>; canManageState?: boolean }) {
  const [tipo, setTipo] = useState(contract?.tipo ?? CONTRACT_TYPES[0].id);
  const [state, action] = useFormState<FormState, FormData>(saveContract.bind(null, contract?.id ?? null), {});
  const contractType = CONTRACT_TYPES.find((t) => t.id === tipo);
  const extras = contractType?.extras ?? [];
  const templateBased = isTemplateBasedContract(tipo);
  const selectedCurrency = contract?.moneda ?? currencyByType?.[tipo] ?? "BOB";
  const selectedProfile = contract?.asesorProfileSnapshot ?? advisorProfile;
  const today = new Date().toISOString().slice(0, 10);
  const sections = [...new Set(extras.map((field) => field.section ?? "Datos específicos"))];
  const amountLabel = tipo === "exclusiva-alquiler" ? "Canon de arrendamiento mensual" : tipo === "exclusiva-anticretico" ? "Monto referencial de anticrético" : tipo === "exclusiva-rural" ? "Precio total referencial" : "Precio referencial de venta";

  return (
    <form action={action} className="panel space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tipo">Tipo de contrato</label>
          <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="input">
            {CONTRACT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        {canManageState ? <div>
          <label className="label" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={contract?.estado ?? "borrador"} className="input">
            {STATES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div> : <input type="hidden" name="estado" value={contract?.estado ?? "borrador"} />}
        <div>
          <label className="label" htmlFor="cliente">{templateBased ? "Propietario/a principal" : "Cliente"}</label>
          <input id="cliente" name="cliente" defaultValue={contract?.cliente} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="clienteDoc">{templateBased ? "Cédula del propietario/a principal" : "CI / NIT del cliente"}</label>
          <input id="clienteDoc" name="clienteDoc" defaultValue={contract?.clienteDoc} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="propiedad">{tipo === "exclusiva-rural" ? "Referencia / ubicación de la propiedad" : "Propiedad (dirección o código)"}</label>
          <input id="propiedad" name="propiedad" defaultValue={contract?.propiedad} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="monto">{templateBased ? amountLabel : "Monto"}</label>
          <div className="flex gap-2">
            <input type="hidden" name="moneda" value={selectedCurrency} />
            <div className="input flex w-40 shrink-0 flex-col justify-center bg-stone-50 dark:bg-carbon-900" aria-label={`Divisa ${selectedCurrency}`}>
              <span className="text-sm font-semibold">{selectedCurrency} · {CURRENCY_SYMBOLS[selectedCurrency as Currency]}</span>
              <span className="text-[10px] text-ink-mute dark:text-carbon-400">{CURRENCY_NAMES[selectedCurrency as Currency]}</span>
            </div>
            <input id="monto" name="monto" type="number" step="0.01" min="0" defaultValue={contract?.monto} className="input" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="fecha">Fecha</label>
            <input id="fecha" name="fecha" type="date" defaultValue={contract?.fecha ?? today} className="input" required />
          </div>
          {!templateBased && <div>
            <label className="label" htmlFor="comision">Comisión (%)</label>
            <input id="comision" name="comision" type="number" step="0.01" min="0" max="100" defaultValue={contract?.comision ?? 3} className="input" />
          </div>}
        </div>
        {templateBased && <input type="hidden" name="comision" value="0" />}
      </div>

      {templateBased && selectedProfile && <section className="rounded-xl border border-gold-200 bg-gold-50/60 p-4 dark:border-carbon-700 dark:bg-carbon-950/50">
        <h3 className="text-sm font-semibold text-ink dark:text-white">Asesor (desde el perfil)</h3>
        <p className="mt-1 text-sm text-ink-soft dark:text-carbon-300">{selectedProfile.fullName} · C.I. {selectedProfile.identityNumber} · {selectedProfile.mobile} · {selectedProfile.email}</p>
      </section>}
      {sections.map((section) => (
        <fieldset key={`${tipo}-${section}`} className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-medium">{section}</legend>
          {extras.filter((field) => (field.section ?? "Datos específicos") === section).map((field) => (
            <div key={`${tipo}-${field.key}`} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={`x_${field.key}`}>
                {field.key === "amountInWords" ? `Monto en palabras (${selectedCurrency})` : field.key === "pricePerHectare" ? `Precio por hectárea (${selectedCurrency})` : field.label}
                {field.required ? "" : " (opcional)"}
              </label>
              {field.type === "textarea" ? <textarea id={`x_${field.key}`} name={`x_${field.key}`} rows={3} defaultValue={contract?.tipo === tipo ? contract.extras[field.key] : ""} className="input" required={field.required} /> : <input id={`x_${field.key}`} name={`x_${field.key}`} type={field.type === "number" || field.type === "date" ? field.type : "text"} defaultValue={contract?.tipo === tipo ? contract.extras[field.key] : ""} className="input" required={field.required} />}
            </div>
          ))}
        </fieldset>
      ))}

      <div>
        <label className="label" htmlFor="notas">Notas internas</label>
        <textarea id="notas" name="notas" rows={3} defaultValue={contract?.notas} className="input" />
      </div>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
      <SubmitButton>{contract ? "Guardar cambios" : "Crear contrato"}</SubmitButton>
    </form>
  );
}
