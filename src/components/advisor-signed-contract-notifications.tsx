"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Contract } from "@/lib/contracts";
import { typeLabel } from "@/lib/contract-types";
import { markSignedContractNotificationReadAction } from "@/app/actions";

export function AdvisorSignedContractNotifications({
  contracts,
  isAdvisor,
  readContractIds,
}: {
  contracts: Contract[];
  isAdvisor: boolean;
  readContractIds: string[];
}) {
  const router = useRouter();
  const [readIds, setReadIds] = useState(() => new Set(readContractIds));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!isAdvisor) return null;

  const notifications = contracts
    .filter((contract) => contract.estado === "firmado" && !readIds.has(contract.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (!notifications.length && !error) return null;

  async function openNotification(event: MouseEvent<HTMLAnchorElement>, id: string, href: string, download = false) {
    event.preventDefault();
    if (busyId) return;

    const previousReadIds = readIds;
    setReadIds((current) => new Set(current).add(id));
    setBusyId(id);
    setError("");

    try {
      await markSignedContractNotificationReadAction(id);
      if (download) window.location.assign(href);
      else router.push(href);
    } catch {
      setReadIds(previousReadIds);
      setError("No se pudo actualizar el aviso. Intenta nuevamente.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-label="Contratos firmados pendientes de revisar" aria-live="polite" className="panel overflow-hidden border border-emerald-200 dark:border-emerald-500/30">
      <div className="flex flex-col gap-3 border-b border-emerald-100 bg-emerald-50/80 px-5 py-4 dark:border-carbon-800 dark:bg-emerald-500/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.2 4.2L19 7" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">Contratos aprobados y firmados</h2>
            <p className="mt-1 text-sm text-emerald-900/90 dark:text-carbon-200">Abre o descarga cada documento para retirar su aviso de esta lista.</p>
          </div>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 dark:bg-carbon-900 dark:text-emerald-200 dark:ring-emerald-500/30">
          {notifications.length} pendiente{notifications.length === 1 ? "" : "s"}
        </span>
      </div>

      {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 sm:px-6">{error}</p>}

      <ul className="divide-y divide-stone-100 dark:divide-carbon-800">
        {notifications.map((contract) => (
          <li key={contract.id} role="status" className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-stone-50/70 dark:hover:bg-carbon-800/30 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink dark:text-white">{contract.cliente} <span className="font-normal text-ink-mute dark:text-carbon-400">·</span> {contract.propiedad}</p>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Firmado por Legal y listo para imprimir.</p>
              <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">
                Código {contract.id} · {typeLabel(contract.tipo)} · {new Date(contract.updatedAt).toLocaleString("es-BO")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href={`/contratos/${contract.id}`}
                aria-disabled={busyId === contract.id}
                onClick={(event) => void openNotification(event, contract.id, `/contratos/${contract.id}`)}
                className="btn-ghost"
              >
                Ver contrato
              </a>
              {contract.templateVersionId && (
                <a
                  href={`/api/contratos/${contract.id}/document?download=1`}
                  aria-disabled={busyId === contract.id}
                  onClick={(event) => void openNotification(event, contract.id, `/api/contratos/${contract.id}/document?download=1`, true)}
                  className="btn"
                >
                  {busyId === contract.id ? "Preparando…" : "Descargar para imprimir"}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
