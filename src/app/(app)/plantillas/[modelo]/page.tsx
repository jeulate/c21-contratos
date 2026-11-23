import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getActiveTemplate, listTemplateVersions } from "@/lib/contract-templates";
import { listContracts } from "@/lib/contracts";
import { TEMPLATE_CONTRACT_TYPES } from "@/lib/contract-types";
import { ActivateTemplateForm, DeleteTemplateForm, TemplateRevisionForm, TemplateUploadForm } from "@/components/contract-template-actions";
import { ContractTemplateHtmlEditor } from "@/components/contract-template-html-editor";

const modelBySlug: Record<string, string> = {
  ventas: "exclusiva-venta",
  alquiler: "exclusiva-alquiler",
  anticretico: "exclusiva-anticretico",
  rural: "exclusiva-rural",
};
const statusLabel = { borrador: "Borrador", activa: "Activa", archivada: "Archivada" } as const;
const statusStyle = {
  borrador: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  activa: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  archivada: "bg-stone-100 text-stone-600 dark:bg-carbon-800 dark:text-carbon-300",
} as const;

export default async function ContractTemplateTypePage({ params }: { params: Promise<{ modelo: string }> }) {
  await requireSession(["admin", "legal"]);
  const { modelo } = await params;
  const typeId = modelBySlug[modelo];
  const type = TEMPLATE_CONTRACT_TYPES.find((item) => item.id === typeId);
  if (!type) notFound();

  const [active, versions, contracts] = await Promise.all([
    getActiveTemplate(type.id),
    listTemplateVersions(type.id),
    listContracts(),
  ]);
  const references = new Map<string, number>();
  for (const contract of contracts) {
    if (contract.templateVersionId) references.set(contract.templateVersionId, (references.get(contract.templateVersionId) ?? 0) + 1);
  }

  return <div className="w-full space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/plantillas" className="btn-ghost">← Todos los modelos</Link>
      <div className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-ink-soft dark:bg-carbon-800 dark:text-carbon-300">
        {active ? `Versión activa v${active.version}` : "Sin versión activa"} · {versions.length} {versions.length === 1 ? "versión" : "versiones"}
      </div>
    </div>

    <TemplateUploadForm selectedType={type.id} />

    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 dark:border-carbon-800 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-ink dark:text-white">Historial de versiones · {type.label}</h2>
          <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Edita HTML en este espacio, prepara revisiones y activa una versión para contratos nuevos.</p>
        </div>
        {active && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Activa · v{active.version}</span>}
      </header>

      {!versions.length ? <p className="p-6 text-sm text-ink-mute dark:text-carbon-400">Aún no hay versiones. Carga el modelo Word para iniciar.</p> :
        <div className="divide-y divide-stone-100 dark:divide-carbon-800">
          {versions.map((version) => {
            const usedBy = references.get(version.id) ?? 0;
            const removable = version.status !== "activa" && usedBy === 0;
            return <details key={version.id} className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-stone-50 dark:hover:bg-carbon-800/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="min-w-8 text-xs font-semibold text-ink-mute dark:text-carbon-400">v{version.version}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink dark:text-white" title={version.fileName}>{version.fileName}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-ink-soft dark:bg-carbon-800 dark:text-carbon-300">{version.format === "html" || version.htmlContent ? "HTML" : "Word"}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyle[version.status]}`}>{statusLabel[version.status]}</span>
                {usedBy > 0 && <span className="hidden rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-ink-soft dark:bg-carbon-800 dark:text-carbon-300 sm:inline">En uso · {usedBy}</span>}
                <span className="text-xs text-ink-mute transition-transform group-open:rotate-180 dark:text-carbon-400" aria-hidden="true">⌄</span>
              </summary>
              <div className="space-y-5 border-t border-stone-100 bg-stone-50/50 p-4 dark:border-carbon-800 dark:bg-carbon-950/40 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-mute dark:text-carbon-400">{new Date(version.createdAt).toLocaleString("es-BO")} · {version.uploadedBy}</p>
                  {version.contentBase64 && <a className="btn-ghost text-xs" href={`/api/plantillas/${version.id}`}>Descargar Word</a>}
                </div>
                <details className="text-sm text-ink-soft dark:text-carbon-300">
                  <summary className="cursor-pointer">Ver marcadores ({version.tags.length})</summary>
                  <div className="mt-3 flex flex-wrap gap-1.5">{version.tags.map((tag) => <code key={tag} className="rounded bg-stone-100 px-2 py-1 text-xs dark:bg-carbon-800">{`{{${tag}}}`}</code>)}</div>
                </details>
                <details className="rounded-xl border border-stone-200 p-4 dark:border-carbon-800">
                  <summary className="cursor-pointer text-sm font-medium text-ink dark:text-white">Crear una revisión Word</summary>
                  <p className="mt-2 text-sm text-ink-mute dark:text-carbon-400">Sube un Word actualizado para guardarlo como una nueva versión borrador.</p>
                  {version.contentBase64 && <a className="btn-ghost mt-3 text-xs" href={`/api/plantillas/${version.id}`}>Descargar para editar</a>}
                  <TemplateRevisionForm id={version.id} tipo={type.id} />
                </details>
                <ContractTemplateHtmlEditor version={version} />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4 dark:border-carbon-800">
                  {version.status !== "activa" ? <ActivateTemplateForm id={version.id} /> : <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Versión activa para contratos nuevos</span>}
                  {removable ? <DeleteTemplateForm id={version.id} version={version.version} fileName={version.fileName} /> : <span className="text-right text-xs text-ink-mute dark:text-carbon-400">{version.status === "activa" ? "No se puede eliminar la versión activa." : `Conservada porque está vinculada a ${usedBy} ${usedBy === 1 ? "contrato" : "contratos"}.`}</span>}
                </div>
              </div>
            </details>;
          })}
        </div>}
    </section>
  </div>;
}
