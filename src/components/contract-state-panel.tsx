"use client";

import { useFormState } from "react-dom";
import { changeContractStateAction, FormState } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import { STATES } from "@/lib/contract-types";

export function ContractStatePanel({ id, currentState, allowedStates }: { id: string; currentState: string; allowedStates: string[] }) {
  const [state, action] = useFormState<FormState, FormData>(changeContractStateAction.bind(null, id), {});
  const options = STATES.filter((item) => allowedStates.includes(item.id));
  if (!options.length) return <section className="panel p-5"><h2 className="text-sm font-semibold">Estado final</h2><p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">El estado {currentState} no tiene transiciones disponibles.</p></section>;

  return (
    <form action={action} className="panel space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-white">Revisión legal</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Los cambios de estado quedan registrados en el historial del contrato.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="estado">Cambiar estado a</label>
          <select id="estado" name="estado" className="input" defaultValue={options[0].id}>
            {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="comentario">Observación o motivo</label>
          <input id="comentario" name="comentario" className="input" minLength={3} required placeholder="Ej.: documentación validada" />
        </div>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
      <SubmitButton>Guardar revisión</SubmitButton>
    </form>
  );
}
