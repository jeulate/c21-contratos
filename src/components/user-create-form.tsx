"use client";
import { useFormState } from "react-dom";
import { createUserAction } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function UserCreateForm() {
  const [state, action] = useFormState(createUserAction, {});
  return (
    <form action={action} className="panel grid gap-4 p-5 sm:grid-cols-2">
      <div><label className="label" htmlFor="name">Nombre completo</label><input id="name" name="name" className="input" required /></div>
      <div><label className="label" htmlFor="username">Usuario</label><input id="username" name="username" className="input" autoComplete="off" required /></div>
      <div>
        <label className="label" htmlFor="role">Rol</label>
        <select id="role" name="role" className="input" defaultValue="asesor">
          <option value="asesor">Asesor</option>
          <option value="legal">Legal</option>
          <option value="administrativo">Administrativo</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div><label className="label" htmlFor="password">Contraseña inicial</label><input id="password" name="password" type="password" minLength={8} className="input" autoComplete="new-password" required /></div>
      <div className="sm:col-span-2 flex items-center gap-4">
        <SubmitButton>Crear usuario</SubmitButton>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
      </div>
    </form>
  );
}
