import { requireSession } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { resetPassword, toggleUser } from "../../actions";
import { UserCreateForm } from "@/components/user-create-form";

const roleLabel = { admin: "Administrador", administrativo: "Administrativo", legal: "Legal", asesor: "Asesor" } as const;

export default async function UsuariosPage() {
  const me = await requireSession(["admin"]);
  const users = await listUsers();
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="space-y-4">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-ink dark:text-white">Crear usuario</h2>
          <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Asigna un nombre de usuario y un rol para el acceso al sistema.</p>
        </div>
      <UserCreateForm />
      </section>
      <section className="panel overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-4 dark:border-carbon-800 sm:px-6">
          <h2 className="text-sm font-semibold text-ink dark:text-white">Usuarios del equipo</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">{users.length} cuenta{users.length === 1 ? "" : "s"} registrada{users.length === 1 ? "" : "s"}</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-stone-200 bg-stone-50/70 dark:border-carbon-800 dark:bg-carbon-950/50">
            <tr><th className="th">Nombre</th><th className="th">Usuario</th><th className="th">Rol</th><th className="th">Estado</th><th className="th">Nueva contraseña</th><th className="th" /></tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-carbon-800">
            {users.map((u) => (
              <tr key={u.username} className="transition hover:bg-stone-50/70 dark:hover:bg-carbon-800/50">
                <td className="td font-medium text-ink dark:text-carbon-100">{u.name}</td>
                <td className="td">{u.username}</td>
                <td className="td"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-ink-soft dark:bg-carbon-800 dark:text-carbon-300">{roleLabel[u.role]}</span></td>
                <td className="td"><span className={`inline-flex items-center gap-2 text-xs font-medium ${u.active ? "text-emerald-700 dark:text-emerald-400" : "text-ink-mute dark:text-carbon-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${u.active ? "bg-emerald-500" : "bg-carbon-400"}`} />{u.active ? "Activo" : "Desactivado"}</span></td>
                <td className="td">
                  <form action={resetPassword.bind(null, u.username)} className="flex gap-2">
                    <input name="password" type="password" minLength={8} placeholder="Mínimo 8 caracteres" className="input w-44" aria-label={`Nueva contraseña de ${u.username}`} />
                    <button className="btn-ghost">Cambiar</button>
                  </form>
                </td>
                <td className="td">
                  {u.username !== me.username && (
                    <form action={toggleUser.bind(null, u.username, !u.active)}>
                      <button className="btn-ghost">{u.active ? "Desactivar" : "Activar"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
