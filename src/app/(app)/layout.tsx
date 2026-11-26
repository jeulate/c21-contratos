import { AppShell } from "@/components/app-shell";
import { requireSession, isStaff } from "@/lib/auth";
import { logout } from "../actions";
import { getUser } from "@/lib/users";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const links = [
    ...(isStaff(session) ? [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" as const }] : []),
    { href: "/contratos", label: "Contratos", icon: "contracts" as const },
    ...(session.role !== "legal" ? [{ href: "/contratos/nuevo", label: "Nuevo contrato", icon: "new" as const }] : []),
    ...(session.role === "asesor" ? [{ href: "/perfil", label: "Mi perfil", icon: "users" as const }] : []),
    ...(session.role === "admin" || session.role === "legal" ? [{ href: "/plantillas", label: "Plantillas legales", icon: "contracts" as const }] : []),
    ...(session.role === "admin" ? [{ href: "/configuracion-contratos", label: "Configuración de contratos", icon: "contracts" as const }] : []),
    ...(session.role === "admin" ? [{ href: "/usuarios", label: "Usuarios", icon: "users" as const }] : []),
  ];
  const advisor = session.role === "asesor" ? await getUser(session.username) : null;

  return (
    <AppShell
      user={{ name: session.name, username: session.username, role: session.role, avatarUrl: advisor?.advisorProfile?.photoId ? `/api/profile/avatar?id=${encodeURIComponent(advisor.advisorProfile.photoId)}` : undefined }}
      links={links}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
