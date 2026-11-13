import Image from "next/image";
import type { ContractEvidence } from "@/lib/contract-evidence";

export function ContractEvidenceGallery({ contractId, evidencias }: { contractId: string; evidencias: ContractEvidence[] }) {
  if (!evidencias.length) return null;

  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Documentación de respaldo</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Imágenes adjuntas a este contrato</p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-ink-soft dark:bg-carbon-800 dark:text-carbon-200">{evidencias.length} imágenes</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {evidencias.map((evidence, index) => {
          const src = `/api/contratos/${contractId}/evidencias/${evidence.id}`;
          return (
            <li key={evidence.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-carbon-800 dark:bg-carbon-950/50">
              <a href={src} target="_blank" rel="noreferrer" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-600">
                <Image src={src} alt={`Imagen de respaldo ${index + 1} del contrato ${contractId}`} width={640} height={480} unoptimized className="aspect-[4/3] w-full bg-stone-100 object-cover dark:bg-carbon-900" />
              </a>
              <div className="px-3 py-2.5">
                <p className="truncate text-xs font-medium text-ink dark:text-carbon-100">{evidence.fileName}</p>
                <p className="mt-1 text-[11px] text-ink-mute dark:text-carbon-400">{(evidence.size / 1024).toFixed(0)} KB · Imagen {index + 1}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
