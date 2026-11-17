import { requireSession } from "@/lib/auth";
import { TEMPLATE_CONTRACT_TYPES } from "@/lib/contract-types";
import { getActiveTemplate, listTemplateVersions } from "@/lib/contract-templates";
import { listContracts } from "@/lib/contracts";
import { ActivateTemplateForm, DeleteTemplateForm, TemplateRevisionForm, TemplateUploadForm } from "@/components/contract-template-actions";

const statusLabel = { borrador: "Borrador", activa: "Activa", archivada: "Archivada" } as const;
const statusStyle = {
  borrador: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  activa: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  archivada: "bg-stone-100 text-stone-600 dark:bg-carbon-800 dark:text-carbon-300",
} as const;

function ContractTypeIcon({ type }: { type: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700 dark:bg-carbon-800 dark:text-gold-300" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...common}>
        {type === "exclusiva-venta" && <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" /><path d="M8 10h.01M16 10h.01" /></>}
        {type === "exclusiva-alquiler" && <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8 2 2-2 2 1 1-2 2-1-1-3 3M8 15h.01" /></>}
        {type === "exclusiva-anticretico" && <><path d="M4 12h4l2-2h4l2 2h4v6h-4l-2 2h-4l-2-2H4z" /><path d="m10 13 2 2 4-4M7 12V9h3M17 12V9h-3" /></>}
        {type === "exclusiva-rural" && <><path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6" /><path d="M3 9h18M8 9V7m8 2V7" /></>}
      </svg>
    </span>
  );
}

export default async function PlantillasPage() {
  await requireSession(["admin", "legal"]);
  const [groups, contracts] = await Promise.all([
    Promise.all(TEMPLATE_CONTRACT_TYPES.map(async (type) => ({
      type,
      active: await getActiveTemplate(type.id),
      versions: await listTemplateVersions(type.id),
    }))),
    listContracts(),
  ]);
  const references = new Map<string, number>();
  for (const contract of contracts) {
    if (contract.templateVersionId) references.set(contract.templateVersionId, (references.get(contract.templateVersionId) ?? 0) + 1);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-ink dark:text-white">Plantillas legales</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Gestiona las versiones de cada modelo. Las versiones activas y las vinculadas a contratos se protegen automáticamente.</p>
      </header>
      <TemplateUploadForm />
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map(({ type, active, versions }) => (
          <section key={type.id} className="panel overflow-hidden">
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3 dark:border-carbon-800 sm:px-5">
              <ContractTypeIcon type={type.id} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-ink dark:text-white">{type.label}</h3>
                <p className="mt-0.5 text-xs text-ink-mute dark:text-carbon-400">{versions.length} {versions.length === 1 ? "versión" : "versiones"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${active ? statusStyle.activa : statusStyle.borrador}`}>
                {active ? `Activa · v${active.version}` : "Sin versión activa"}
              </span>
            </div>

            {!versions.length ? (
              <p className="p-4 text-sm text-ink-mute dark:text-carbon-400">Aún no hay versiones cargadas.</p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-carbon-800">
                {versions.map((version) => {
                  const usedBy = references.get(version.id) ?? 0;
                  const removable = version.status !== "activa" && usedBy === 0;
                  return (
                    <div key={version.id} className="flex items-start gap-1 px-2 sm:px-3">
                    <details className="group min-w-0 flex-1">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-2 py-3 hover:bg-stone-50 dark:hover:bg-carbon-900 sm:px-2 [&::-webkit-details-marker]:hidden">
                        <span className="text-xs font-semibold text-ink-mute dark:text-carbon-400">v{version.version}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink dark:text-white" title={version.fileName}>{version.fileName}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${statusStyle[version.status]}`}>{statusLabel[version.status]}</span>
                        {usedBy > 0 && <span className="hidden shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600 dark:bg-carbon-800 dark:text-carbon-300 sm:inline">En uso</span>}
                        <span className="text-xs text-ink-mute transition-transform group-open:rotate-180 dark:text-carbon-400" aria-hidden="true">⌄</span>
                      </summary>
                      <div className="space-y-3 border-t border-stone-100 bg-stone-50/60 p-4 dark:border-carbon-800 dark:bg-carbon-950/40 sm:px-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-mute dark:text-carbon-400">
                          <span>{new Date(version.createdAt).toLocaleString("es-BO")} · {version.uploadedBy}</span>
                          <a className="btn-ghost text-xs" href={`/api/plantillas/${version.id}`}>Descargar Word</a>
                        </div>
                        <details className="text-xs text-ink-soft dark:text-carbon-300">
                          <summary className="cursor-pointer">Ver marcadores ({version.tags.length})</summary>
                          <div className="mt-2 flex flex-wrap gap-1.5">{version.tags.map((tag) => <code key={tag} className="rounded bg-stone-100 px-2 py-1 dark:bg-carbon-800">{`{{${tag}}}`}</code>)}</div>
                        </details>
                        <details className="rounded-lg border border-stone-200 p-3 dark:border-carbon-800">
                          <summary className="cursor-pointer text-sm font-medium text-ink dark:text-white">Crear una revisión</summary>
                          <p className="mt-2 text-xs leading-5 text-ink-mute dark:text-carbon-400">Edita el archivo Word y cárgalo como una versión nueva. La versión actual permanece disponible hasta activar la nueva.</p>
                          <a className="btn-ghost mt-2 text-xs" href={`/api/plantillas/${version.id}`}>Descargar para editar</a>
                          <TemplateRevisionForm id={version.id} tipo={type.id} />
                        </details>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          {version.status !== "activa" ? <ActivateTemplateForm id={version.id} /> : <span className="text-xs text-emerald-700 dark:text-emerald-300">Versión activa para contratos nuevos</span>}
                          {!removable && (
                            <span className="max-w-64 text-right text-xs text-ink-mute dark:text-carbon-400">
                              {version.status === "activa" ? "No se puede eliminar la versión activa." : `Conservada: vinculada a ${usedBy} ${usedBy === 1 ? "contrato" : "contratos"}.`}
                            </span>
                          )}
                        </div>
                      </div>
                    </details>
                    {removable && <div className="pt-1.5"><DeleteTemplateForm id={version.id} version={version.version} fileName={version.fileName} compact /></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
