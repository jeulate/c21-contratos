"use client";

import { useFormState } from "react-dom";
import { saveContractCurrencyAction, saveCurrencyDefinitionAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import type { ContractType } from "@/lib/contract-types";
import type { CurrencyDefinition } from "@/lib/contract-currencies";

function CurrencySetting({ type, currency, currencies }: { type: ContractType; currency: string; currencies: CurrencyDefinition[] }) {
  const [state, action] = useFormState<FormState, FormData>(saveContractCurrencyAction, {});
  return (
    <form action={action} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
      <input type="hidden" name="tipo" value={type.id} />
      <div>
        <h3 className="text-sm font-semibold text-ink dark:text-white">{type.label}</h3>
        <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">
          {type.templateBased ? "Los contratos nuevos usarán esta divisa en el formulario y en el documento." : "Los registros nuevos usarán esta divisa."}
        </p>
        {state.error && <p role="alert" className="mt-2 text-xs text-red-700">{state.error}</p>}
        {state.ok && <p role="status" className="mt-2 text-xs text-emerald-700">{state.ok}</p>}
      </div>
      <div className="flex items-end gap-3">
        <div className="min-w-40">
          <label className="label" htmlFor={`currency-${type.id}`}>Divisa</label>
          <select id={`currency-${type.id}`} name="moneda" defaultValue={currency} className="input">
            {currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}
          </select>
        </div>
        <SubmitButton>Guardar</SubmitButton>
      </div>
    </form>
  );
}

function CurrencyEditor({ currency, isNew = false }: { currency?: CurrencyDefinition; isNew?: boolean }) {
  const [state, action] = useFormState<FormState, FormData>(saveCurrencyDefinitionAction, {});
  const isBase = currency?.code === "BOB";
  return (
    <form action={action} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-carbon-700 dark:bg-carbon-950">
      <input type="hidden" name="isNew" value={String(isNew)} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="label">Código ISO</label>
          <input className="input uppercase" name="code" defaultValue={currency?.code ?? ""} placeholder="PYG" maxLength={3} readOnly={!isNew} required />
        </div>
        <div className="xl:col-span-2">
          <label className="label">Nombre plural</label>
          <input className="input" name="name" defaultValue={currency?.name ?? ""} placeholder="Guaraníes Paraguayos" maxLength={60} required />
        </div>
        <div className="xl:col-span-2">
          <label className="label">Nombre singular</label>
          <input className="input" name="singularName" defaultValue={currency?.singularName ?? ""} placeholder="Guaraní Paraguayo" maxLength={60} required />
        </div>
        <div>
          <label className="label">Símbolo</label>
          <input className="input" name="symbol" defaultValue={currency?.symbol ?? ""} placeholder="₲" maxLength={8} required />
        </div>
        <div className="sm:col-span-2 xl:col-span-2">
          <label className="label">Equivalencia: Bs. por 1 {currency?.code ?? "unidad"}</label>
          {isBase ? <><input className="input" value="1" readOnly /><input type="hidden" name="bobPerUnit" value="1" /></> : <input className="input" name="bobPerUnit" type="number" min="0.000001" max="1000000" step="any" inputMode="decimal" defaultValue={currency?.bobPerUnit ?? ""} placeholder="Ingresa el tipo de cambio" />}
        </div>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink-soft dark:text-carbon-300">
          <input type="checkbox" name="enabled" value="true" defaultChecked={currency?.enabled ?? true} disabled={isBase} />
          {isBase && <input type="hidden" name="enabled" value="true" />}
          Disponible en contratos nuevos
        </label>
        <div className="flex items-end"><SubmitButton>{isNew ? "Agregar divisa" : "Guardar cambios"}</SubmitButton></div>
      </div>
      {state.error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{state.error}</p>}
      {state.ok && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{state.ok}</p>}
    </form>
  );
}

export function ContractCurrencySettings({ types, currencies, values }: {
  types: ContractType[];
  currencies: CurrencyDefinition[];
  values: Record<string, string>;
}) {
  const enabled = currencies.filter((currency) => currency.enabled && currency.bobPerUnit !== null);
  return <div className="space-y-5">
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-ink dark:text-white">Divisas por tipo de contrato</h3>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Cada tipo usará la divisa elegida al crear contratos nuevos.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">{types.map((type) => <CurrencySetting key={type.id} type={type} currency={values[type.id] ?? "BOB"} currencies={enabled} />)}</div>
    </section>
    <section className="panel space-y-4 p-5">
      <div>
        <h3 className="text-base font-semibold text-ink dark:text-white">Catálogo de divisas y tipos de cambio</h3>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-ink-mute dark:text-carbon-400">Administra códigos, nombres, símbolos y equivalencias manuales frente al boliviano. Una divisa solo estará disponible al activarla y definir cuántos Bs. equivale una unidad. BOB es la divisa base del dashboard. Desactivar una divisa no altera contratos existentes.</p>
      </div>
      <div className="space-y-3">{currencies.map((currency) => <CurrencyEditor key={currency.code} currency={currency} />)}</div>
      <div className="border-t border-stone-200 pt-4 dark:border-carbon-700">
        <h4 className="mb-3 text-sm font-semibold text-ink dark:text-white">Agregar una divisa</h4>
        <CurrencyEditor isNew />
      </div>
    </section>
  </div>;
}
