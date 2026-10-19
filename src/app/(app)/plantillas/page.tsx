import { requireSession } from "@/lib/auth";
import { TEMPLATE_CONTRACT_TYPES } from "@/lib/contract-types";
import { getActiveTemplate, listTemplateVersions } from "@/lib/contract-templates";
import { ActivateTemplateForm, TemplateUploadForm } from "@/components/contract-template-actions";

const statusLabel = { borrador: "Borrador", activa: "Activa", archivada: "Archivada" } as const;

export default async function PlantillasPage() {
  await requireSession(["admin", "legal"]);
  const groups = await Promise.all(TEMPLATE_CONTRACT_TYPES.map(async (type) => ({
    type,
    active: await getActiveTemplate(type.id),
    versions: await listTemplateVersions(type.id),
  })));

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-ink dark:text-white">Plantillas legales</h2>
        <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Legal prepara una versión en Word, la revisa y la activa para los nuevos contratos. Las versiones usadas se conservan.</p>
      </header>
      <TemplateUploadForm />
      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map(({ type, active, versions }) => (
          <section key={type.id} className="panel overflow-hidden">
            <div className="border-b border-stone-100 px-5 py-4 dark:border-carbon-800">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink dark:text-white">{type.label}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                  {active ? `Activa · v${active.version}` : "Sin versión activa"}
                </span>
              </div>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-carbon-800">
              {!versions.length && <p className="p-5 text-sm text-ink-mute dark:text-carbon-400">Todavía no hay versiones cargadas.</p>}
              {versions.map((version) => (
                <article key={version.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-white">v{version.version} · {version.fileName}</p>
                      <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">{statusLabel[version.status]} · Cargada por {version.uploadedBy} · {new Date(version.createdAt).toLocaleString("es-BO")}</p>
                    </div>
                    <a className="btn-ghost text-xs" href={`/api/plantillas/${version.id}`}>Descargar Word</a>
                  </div>
                  <details className="text-xs text-ink-soft dark:text-carbon-300">
                    <summary className="cursor-pointer">Marcadores detectados ({version.tags.length})</summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">{version.tags.map((tag) => <code key={tag} className="rounded bg-stone-100 px-2 py-1 dark:bg-carbon-800">{`{{${tag}}}`}</code>)}</div>
                  </details>
                  {version.status !== "activa" && <ActivateTemplateForm id={version.id} />}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
