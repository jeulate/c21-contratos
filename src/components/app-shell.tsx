"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@/lib/session";

type AppLink = { href: string; label: string; icon: "dashboard" | "contracts" | "users" | "new" };

function Icon({ name, className = "h-5 w-5" }: { name: AppLink["icon"] | "menu" | "logout" | "chevron"; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    contracts: <><path d="M7 3.75h7l4 4v12.5a1.75 1.75 0 0 1-1.75 1.75h-9.5A1.75 1.75 0 0 1 5 20.25V5.5a1.75 1.75 0 0 1 2-1.75Z" /><path d="M14 4v4h4M8.5 13h7m-7 3.5h7" /></>,
    users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7" r="3.5" /><path d="M17 11a3.5 3.5 0 0 0 0-7m4 16v-1.5a4 4 0 0 0-3-3.87" /></>,
    new: <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v8m-4-4h8" /></>,
    menu: <><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></>,
    logout: <><path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5m5 5H3" /><path strokeLinecap="round" d="M12 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
    chevron: <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

const roleName: Record<Role, string> = { admin: "Administrador", administrativo: "Administrativo", legal: "Legal", asesor: "Asesor" };
const pageName: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contratos": "Contratos",
  "/contratos/nuevo": "Nuevo contrato",
  "/usuarios": "Usuarios",
  "/perfil": "Mi perfil",
  "/configuracion-contratos": "Divisas de contratos",
};

export function AppShell({
  children,
  user,
  links,
  logoutAction,
}: {
  children: React.ReactNode;
  user: { name: string; username: string; role: Role };
  links: AppLink[];
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = pageName[pathname] ?? (pathname.startsWith("/contratos/") ? "Detalle de contrato" : "C21 Contratos");
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return (
    <div className="min-h-screen bg-stone-50 text-ink dark:bg-carbon-950 dark:text-carbon-100 lg:flex">
      {mobileOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-carbon-950/50 backdrop-blur-[1px] lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,86vw)] flex-col border-r border-stone-200 bg-white transition-transform duration-200 dark:border-carbon-800 dark:bg-carbon-900 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-stone-100 px-6 dark:border-carbon-800">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-500 text-sm font-bold tracking-tight text-white shadow-sm">C21</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink dark:text-white">Contratos</p>
            <p className="text-xs text-ink-mute dark:text-carbon-400">Century 21 · local</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="ml-auto rounded-lg p-2 text-ink-mute hover:bg-stone-100 dark:hover:bg-carbon-800 lg:hidden" aria-label="Cerrar menú">
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="px-4 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-mute dark:text-carbon-500">Espacio de trabajo</div>
        <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {links.map((link) => {
            const active = pathname === link.href || (link.href === "/contratos" && pathname.startsWith("/contratos/") && pathname !== "/contratos/nuevo");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${active ? "bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300" : "text-ink-soft hover:bg-stone-50 hover:text-ink dark:text-carbon-400 dark:hover:bg-carbon-800 dark:hover:text-white"}`}
              >
                <Icon name={link.icon} className={`h-[19px] w-[19px] shrink-0 ${active ? "text-gold-700 dark:text-gold-300" : "text-ink-mute group-hover:text-ink-soft dark:text-carbon-500"}`} />
                <span>{link.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-600 dark:bg-gold-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="m-4 rounded-2xl border border-gold-100 bg-gold-50/70 p-4 dark:border-carbon-700 dark:bg-carbon-800/70">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
            <span className="text-xs font-semibold text-ink dark:text-carbon-200">Entorno de desarrollo</span>
          </div>
          <p className="text-xs leading-5 text-ink-mute dark:text-carbon-400">Los datos de prueba se guardan en Redis local.</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-stone-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8 dark:border-carbon-800 dark:bg-carbon-900/95">
          <button onClick={() => setMobileOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-ink-soft hover:bg-stone-50 dark:border-carbon-700 dark:text-carbon-300 dark:hover:bg-carbon-800 lg:hidden" aria-label="Abrir menú">
            <Icon name="menu" />
          </button>
          <div className="hidden items-center gap-2 text-sm text-ink-mute sm:flex dark:text-carbon-500">
            <span>Workspace</span><Icon name="chevron" className="h-4 w-4" /><span className="font-semibold text-ink dark:text-carbon-100">{pageTitle}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <span className="hidden h-8 w-px bg-stone-200 sm:block dark:bg-carbon-700" />
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm font-semibold text-ink dark:text-white">{user.name}</p>
              <p className="text-xs text-ink-mute dark:text-carbon-400">{roleName[user.role]}</p>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold-200 bg-gold-50 text-xs font-bold text-gold-700 dark:border-gold-500/30 dark:bg-gold-500/10 dark:text-gold-300" aria-label={`Usuario ${user.name}`}>
              {initials || "C21"}
            </div>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-medium text-ink-mute transition hover:bg-stone-100 hover:text-ink dark:text-carbon-400 dark:hover:bg-carbon-800 dark:hover:text-white" aria-label="Cerrar sesión">
                <Icon name="logout" className="h-[18px] w-[18px]" /><span className="hidden xl:inline">Salir</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
          <div className="mb-6 sm:mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700 dark:text-gold-300">Century 21 · Gestión</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink dark:text-white sm:text-[28px]">{pageTitle}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
