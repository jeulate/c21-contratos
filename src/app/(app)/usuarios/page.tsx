import { requireSession } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { resetPassword, toggleUser } from "../../actions";
import { UserCreateForm } from "@/components/user-create-form";

const roleLabel = { admin: "Administrador", administrativo: "Administrativo", asesor: "Asesor" } as const;

export default async function UsuariosPage() {
  const me = await requireSession(["admin"]);
  const users = await listUsers();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <UserCreateForm />
      <div className="panel overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr><th className="th">Nombre</th><th className="th">Usuario</th><th className="th">Rol</th><th className="th">Estado</th><th className="th">Nueva contraseña</th><th className="th" /></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => (
              <tr key={u.username}>
                <td className="td">{u.name}</td>
                <td className="td">{u.username}</td>
                <td className="td">{roleLabel[u.role]}</td>
                <td className="td">{u.active ? "Activo" : "Desactivado"}</td>
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
    </div>
  );
}
