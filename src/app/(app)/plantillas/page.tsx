import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { TEMPLATE_CONTRACT_TYPES } from "@/lib/contract-types";
import { getActiveTemplate, listTemplateVersions } from "@/lib/contract-templates";

const routes: Record<string, string> = {
  "exclusiva-venta": "ventas",
  "exclusiva-alquiler": "alquiler",
  "exclusiva-anticretico": "anticretico",
  "exclusiva-rural": "rural",
};

const icons: Record<string, string> = {
  "exclusiva-venta": "⌂",
  "exclusiva-alquiler": "⚿",
  "exclusiva-anticretico": "▱",
  "exclusiva-rural": "♧",
};

export default async function PlantillasPage() {
  await requireSession(["admin", "legal"]);
  const templates = await Promise.all(TEMPLATE_CONTRACT_TYPES.map(async (type) => {
    const [active, versions] = await Promise.all([getActiveTemplate(type.id), listTemplateVersions(type.id)]);
    return { type, active, versions };
  }));

  return <div className="space-y-6">
    <header className="panel flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-ink dark:text-white">Biblioteca de plantillas</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-mute dark:text-carbon-400">Abre un modelo para revisar sus versiones, convertir una plantilla Word y editar su contenido en un espacio de trabajo amplio.</p>
      </div>
      <span className="rounded-full bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-800 dark:bg-gold-500/10 dark:text-gold-300">{templates.length} modelos</span>
    </header>
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {templates.map(({ type, active, versions }) => <Link key={type.id} href={`/plantillas/${routes[type.id]}`} className="panel group flex min-h-44 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-md dark:hover:border-gold-500/50">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-50 text-2xl text-gold-700 dark:bg-carbon-800 dark:text-gold-300" aria-hidden="true">{icons[type.id]}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-ink dark:text-white">{type.label}</h3>
            <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">{versions.length} {versions.length === 1 ? "versión" : "versiones"}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"}`}>
            {active ? `Activa · v${active.version}` : "Sin activar"}
          </span>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3 text-sm dark:border-carbon-800">
          <span className="text-ink-mute dark:text-carbon-400">{active?.format === "html" ? "Plantilla HTML activa" : active ? "Plantilla Word activa" : "Carga la primera plantilla"}</span>
          <span className="font-semibold text-gold-700 group-hover:translate-x-0.5 dark:text-gold-300">Gestionar →</span>
        </div>
      </Link>)}
    </div>
  </div>;
}
