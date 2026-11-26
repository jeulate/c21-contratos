"use client";

import { useFormState } from "react-dom";
import { saveDashboardExchangeRateAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function DashboardExchangeRateForm({ exchangeRate }: { exchangeRate: number }) {
  const [state, action] = useFormState<FormState, FormData>(saveDashboardExchangeRateAction, {});

  return (
    <form action={action} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-ink dark:text-white">Tipo de cambio del dashboard</h3>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-mute dark:text-carbon-400">
          Define cuántos bolivianos equivale 1 USD. El dashboard convertirá a Bs. los contratos firmados en USD y mostrará debajo el equivalente en dólares. Valor inicial: 6,96; se puede ajustar manualmente y no se actualiza automáticamente.
        </p>
        {state.error && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{state.error}</p>}
        {state.ok && <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{state.ok}</p>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-48">
          <label className="label" htmlFor="dashboard-exchange-rate">T.C. (Bs. por USD)</label>
          <input
            id="dashboard-exchange-rate"
            name="exchangeRate"
            type="number"
            min="0.0001"
            max="1000000"
            step="0.0001"
            inputMode="decimal"
            defaultValue={exchangeRate}
            className="input"
            required
          />
        </div>
        <SubmitButton>Guardar tipo de cambio</SubmitButton>
      </div>
    </form>
  );
}
