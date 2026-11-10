import Link from "next/link";
import type { Contract } from "@/lib/contracts";
import { typeLabel } from "@/lib/contract-types";

export function AdvisorSignedContractNotifications({ contracts, isAdvisor }: { contracts: Contract[]; isAdvisor: boolean }) {
  if (!isAdvisor) return null;

  const signedContracts = contracts
    .filter((contract) => contract.estado === "firmado")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (!signedContracts.length) return null;

  return (
    <section aria-label="Notificaciones de contratos firmados" aria-live="polite" className="panel overflow-hidden border-emerald-400 dark:border-emerald-500/50">
      <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-carbon-800 dark:bg-emerald-500/10 sm:px-6">
        <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
          Contratos aprobados y firmados · listos para imprimir
        </h2>
        <p className="mt-1 text-sm text-emerald-900 dark:text-carbon-200">
          {signedContracts.length === 1
            ? "Legal aprobó y firmó este contrato. Ya puedes descargarlo para imprimir."
            : `Legal aprobó y firmó ${signedContracts.length} contratos. Ya puedes descargarlos para imprimir.`}
        </p>
      </div>
      <ul className="divide-y divide-stone-100 dark:divide-carbon-800">
        {signedContracts.map((contract) => (
          <li key={contract.id} role="status" className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-white">{contract.cliente} · {contract.propiedad}</p>
              <p className="mt-1 text-sm text-emerald-900 dark:text-carbon-200">Aprobado y firmado por Legal. El documento está listo para impresión.</p>
              <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">
                Código {contract.id} · {typeLabel(contract.tipo)} · {new Date(contract.updatedAt).toLocaleString("es-BO")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={`/contratos/${contract.id}`} className="btn-ghost">Ver contrato</Link>
              {contract.templateVersionId && (
                <a href={`/api/contratos/${contract.id}/document?download=1`} className="btn">
                  Descargar para imprimir
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
