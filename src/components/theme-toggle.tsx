"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("c21-theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Activar tema claro" : "Activar tema oscuro"}
      title={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-ink-soft transition hover:border-gold-500 hover:text-ink dark:border-carbon-700 dark:bg-carbon-900 dark:text-carbon-300 dark:hover:text-white ${className}`}
    >
      {dark ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.2 15.4A8.3 8.3 0 0 1 8.6 3.8 8.4 8.4 0 1 0 20.2 15.4Z" />
        </svg>
      )}
    </button>
  );
}
