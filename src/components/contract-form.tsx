"use client";
import { useState } from "react";
import { useFormState } from "react-dom";
import { saveContract, FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import { CONTRACT_TYPES, CURRENCIES, STATES } from "@/lib/contract-types";
import type { Contract } from "@/lib/contracts";

export function ContractForm({ contract }: { contract?: Contract }) {
  const [tipo, setTipo] = useState(contract?.tipo ?? CONTRACT_TYPES[0].id);
  const [state, action] = useFormState<FormState, FormData>(saveContract.bind(null, contract?.id ?? null), {});
  const extras = CONTRACT_TYPES.find((t) => t.id === tipo)?.extras ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="panel space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tipo">Tipo de contrato</label>
          <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="input">
            {CONTRACT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={contract?.estado ?? "borrador"} className="input">
            {STATES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cliente">Cliente</label>
          <input id="cliente" name="cliente" defaultValue={contract?.cliente} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="clienteDoc">CI / NIT del cliente</label>
          <input id="clienteDoc" name="clienteDoc" defaultValue={contract?.clienteDoc} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="propiedad">Propiedad (dirección o código)</label>
          <input id="propiedad" name="propiedad" defaultValue={contract?.propiedad} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="monto">Monto</label>
          <div className="flex gap-2">
            <select name="moneda" defaultValue={contract?.moneda ?? "USD"} className="input w-24" aria-label="Moneda">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input id="monto" name="monto" type="number" step="0.01" min="0" defaultValue={contract?.monto} className="input" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="fecha">Fecha</label>
            <input id="fecha" name="fecha" type="date" defaultValue={contract?.fecha ?? today} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="comision">Comisión (%)</label>
            <input id="comision" name="comision" type="number" step="0.01" min="0" max="100" defaultValue={contract?.comision ?? 3} className="input" />
          </div>
        </div>
      </div>

      <fieldset className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-medium">Datos específicos del contrato</legend>
        {extras.map((f) => (
          <div key={`${tipo}-${f.key}`} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor={`x_${f.key}`}>{f.label}{f.required ? "" : " (opcional)"}</label>
            <input
              id={`x_${f.key}`}
              name={`x_${f.key}`}
              type={f.type === "number" || f.type === "date" ? f.type : "text"}
              defaultValue={contract?.tipo === tipo ? contract.extras[f.key] : ""}
              className="input"
              required={f.required}
            />
          </div>
        ))}
      </fieldset>

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
