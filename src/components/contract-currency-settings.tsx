"use client";

import { useFormState } from "react-dom";
import { saveContractCurrencyAction, FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import type { ContractType, Currency } from "@/lib/contract-types";

function CurrencySetting({ type, currency, currencies }: { type: ContractType; currency: Currency; currencies: readonly Currency[] }) {
  const [state, action] = useFormState<FormState, FormData>(saveContractCurrencyAction, {});
  return (
    <form action={action} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
      <input type="hidden" name="tipo" value={type.id} />
      <div>
        <h3 className="text-sm font-semibold text-ink dark:text-white">{type.label}</h3>
        <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">
          {type.templateBased ? "Los contratos nuevos usarán esta divisa en el formulario y en el Word." : "Los registros nuevos usarán esta divisa."}
        </p>
        {state.error && <p role="alert" className="mt-2 text-xs text-red-700">{state.error}</p>}
        {state.ok && <p role="status" className="mt-2 text-xs text-emerald-700">{state.ok}</p>}
      </div>
      <div className="flex items-end gap-3">
        <div className="min-w-36">
          <label className="label" htmlFor={`currency-${type.id}`}>Divisa</label>
          <select id={`currency-${type.id}`} name="moneda" defaultValue={currency} className="input">
            {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <SubmitButton>Guardar</SubmitButton>
      </div>
    </form>
  );
}

export function ContractCurrencySettings({ types, currencies, values }: {
  types: ContractType[];
  currencies: readonly Currency[];
  values: Record<string, Currency>;
}) {
  return <div className="grid gap-4 xl:grid-cols-2">
    {types.map((type) => <CurrencySetting key={type.id} type={type} currency={values[type.id] ?? "BOB"} currencies={currencies} />)}
  </div>;
}
