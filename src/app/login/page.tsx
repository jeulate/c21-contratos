"use client";

import { useFormState } from "react-dom";
import { login } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

export default function LoginPage() {
  const [state, action] = useFormState(login, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="relative grid min-h-screen bg-white dark:bg-carbon-950 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6 lg:right-8 lg:top-8"><ThemeToggle /></div>

      <section className="relative hidden min-h-screen overflow-hidden bg-[#f4f0e7] p-12 dark:bg-carbon-900 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-40 -top-32 h-[34rem] w-[34rem] rounded-full border border-gold-500/20" />
        <div className="absolute -right-20 -top-12 h-[26rem] w-[26rem] rounded-full border border-gold-500/20" />
        <div className="absolute bottom-[-14rem] left-[-8rem] h-[34rem] w-[34rem] rounded-full bg-gold-500/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-500 text-sm font-bold text-white shadow-lg shadow-gold-700/15">C21</span>
          <div><p className="text-sm font-semibold text-ink dark:text-white">Century 21</p><p className="text-xs text-ink-mute dark:text-carbon-400">Gestión de contratos</p></div>
        </div>
        <div className="relative max-w-xl pb-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-gold-700 dark:text-gold-300">Espacio de trabajo</p>
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-ink dark:text-white xl:text-5xl">Cada acuerdo, con su lugar.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-ink-soft dark:text-carbon-300">Administra contratos, acompaña cada etapa y mantén la información del equipo organizada desde un solo panel.</p>
          <div className="mt-10 flex items-center gap-3 text-sm text-ink-mute dark:text-carbon-400"><span className="h-px w-10 bg-gold-600" /> Plataforma interna de gestión</div>
        </div>
        <p className="relative text-xs text-ink-mute dark:text-carbon-500">Century 21 · Gestión de contratos</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-24 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:mb-10">
            <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-gold-500 text-xs font-bold text-white lg:hidden">C21</span>
            <p className="text-sm font-medium text-gold-700 dark:text-gold-300">Bienvenido</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink dark:text-white">Ingresa a tu cuenta</h2>
            <p className="mt-2 text-sm leading-6 text-ink-mute dark:text-carbon-400">Usa tus credenciales asignadas para acceder al sistema.</p>
          </div>

          <form action={action} className="space-y-5">
            <div>
              <label className="label" htmlFor="username">Usuario</label>
              <input id="username" name="username" className="input h-12" autoComplete="username" required />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between"><label className="label mb-0" htmlFor="password">Contraseña</label></div>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? "text" : "password"} className="input h-12 pr-12" autoComplete="current-password" required />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center rounded-r-xl text-ink-mute transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-600 dark:text-carbon-400 dark:hover:text-white"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  aria-controls="password"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 8.5 4.1 9.5 6.5a11.7 11.7 0 0 1-3.1 4.2M6.2 6.2A12.2 12.2 0 0 0 2.5 11.5C3.5 14 7 18 12 18a9.8 9.8 0 0 0 3-.5" /></svg>
                  )}
                </button>
              </div>
            </div>
            {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>}
            <SubmitButton className="h-12 w-full">Ingresar al sistema</SubmitButton>
          </form>
          <p className="mt-8 text-center text-xs text-ink-mute dark:text-carbon-500">Acceso privado para el equipo Century 21.</p>
        </div>
      </section>
    </main>
  );
}
