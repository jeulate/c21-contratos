import Link from "next/link";
import { requireSession, isStaff } from "@/lib/auth";
import { logout } from "../actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const links = [
    ...(isStaff(s) ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    { href: "/contratos", label: "Contratos" },
    ...(s.role === "admin" ? [{ href: "/usuarios", label: "Usuarios" }] : []),
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="border-l-4 border-gold-500 pl-2 text-sm font-semibold">Contratos C21</span>
          <nav className="flex gap-1 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded px-3 py-1.5 text-ink-soft hover:bg-stone-100 hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-mute">
            <span>{s.name}</span>
            <form action={logout}><button className="btn-ghost">Salir</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
