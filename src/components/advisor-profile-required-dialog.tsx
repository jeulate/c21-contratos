import Link from "next/link";

export function AdvisorProfileRequiredDialog() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-carbon-950/75 p-4 backdrop-blur-sm" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="advisor-profile-required-title" className="panel w-full max-w-lg p-6 shadow-2xl sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-100 text-gold-800 dark:bg-gold-500/15 dark:text-gold-200">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6"><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h5a4.5 4.5 0 0 1 4.5 4.5V20M19 5v5m-2.5-2.5h5" /></svg>
        </div>
        <h2 id="advisor-profile-required-title" className="mt-5 text-xl font-semibold text-ink dark:text-white">Completa tu perfil antes de continuar</h2>
        <p className="mt-2 text-sm leading-6 text-ink-mute dark:text-carbon-300">Para crear contratos, primero registra tus datos legales y de contacto y carga una foto de perfil en Mi perfil. Después podrás volver aquí y comenzar el contrato.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/perfil" className="btn">Completar mi perfil</Link>
          <Link href="/contratos" className="btn-ghost">Volver a contratos</Link>
        </div>
      </section>
    </div>
  );
}
