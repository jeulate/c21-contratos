import { AppShell } from "@/components/app-shell";
import { requireSession, isStaff } from "@/lib/auth";
import { logout } from "../actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const links = [
    ...(isStaff(session) ? [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" as const }] : []),
    { href: "/contratos", label: "Contratos", icon: "contracts" as const },
    ...(session.role !== "legal" ? [{ href: "/contratos/nuevo", label: "Nuevo contrato", icon: "new" as const }] : []),
    ...(session.role === "asesor" ? [{ href: "/perfil", label: "Mi perfil", icon: "users" as const }] : []),
    ...(session.role === "admin" ? [{ href: "/usuarios", label: "Usuarios", icon: "users" as const }] : []),
  ];

  return (
    <AppShell
      user={{ name: session.name, username: session.username, role: session.role }}
      links={links}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
