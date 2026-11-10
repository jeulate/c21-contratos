import Link from "next/link";
import type { Contract } from "@/lib/contracts";
import { typeLabel } from "@/lib/contract-types";

export function AdvisorObservationNotifications({ contracts, isAdvisor }: { contracts: Contract[]; isAdvisor: boolean }) {
  if (!isAdvisor) return null;

  const notifications = contracts.flatMap((contract) => {
    if (contract.estado !== "observado") return [];
    const pending = (contract.observations ?? []).filter((observation) => !observation.resolvedAt);
    if (pending.length) return pending.map((observation) => ({ contract, observation }));
    if (contract.observacion) return [{ contract, observation: { id: `legacy-${contract.id}`, message: contract.observacion, at: contract.updatedAt } }];
    return [{ contract, observation: { id: `missing-${contract.id}`, message: "Legal dejó una observación para este contrato.", at: contract.updatedAt } }];
  }).sort((a, b) => b.observation.at.localeCompare(a.observation.at));

  if (!notifications.length) return null;

  return (
    <section aria-label="Notificaciones del asesor" aria-live="polite" className="panel overflow-hidden border-amber-400 dark:border-gold-500/50">
      <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 dark:border-carbon-800 dark:bg-gold-500/10 sm:px-6">
        <h2 className="text-sm font-bold text-amber-950 dark:text-gold-100">Notificaciones · observaciones de Legal</h2>
        <p className="mt-1 text-sm text-amber-900 dark:text-carbon-200">Tienes {notifications.length} observación{notifications.length === 1 ? "" : "es"} pendiente{notifications.length === 1 ? "" : "s"}. Abre cada aviso para corregir el contrato.</p>
      </div>
      <ul className="divide-y divide-stone-100 dark:divide-carbon-800">
        {notifications.map(({ contract, observation }) => <li key={observation.id} role="alert" className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink dark:text-white">{contract.cliente} · {contract.propiedad}</p>
            <p className="mt-1 line-clamp-2 text-sm text-amber-900 dark:text-carbon-200">{observation.message}</p>
            <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Código {contract.id} · {typeLabel(contract.tipo)} · {new Date(observation.at).toLocaleString("es-BO")}</p>
          </div>
          <Link href={`/contratos/${contract.id}`} className="btn-ghost shrink-0">Corregir contrato</Link>
        </li>)}
      </ul>
    </section>
  );
}
