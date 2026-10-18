"use client";
import { useFormState } from "react-dom";
import { login } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage() {
  const [state, action] = useFormState(login, {});
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action={action} className="panel w-full max-w-sm space-y-4 p-8">
        <div className="mb-2 border-l-4 border-gold-500 pl-3">
          <h1 className="text-lg font-semibold">Registro de contratos</h1>
          <p className="text-sm text-ink-mute">Century 21</p>
        </div>
        <div>
          <label className="label" htmlFor="username">Usuario</label>
          <input id="username" name="username" className="input" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        <SubmitButton>Ingresar</SubmitButton>
      </form>
    </main>
  );
}
