"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type CorporateSelectOption = { value: string; label: string };

export function CorporateSelect({
  id,
  name,
  options,
  value,
  defaultValue,
  placeholder = "Selecciona una opción",
  required = false,
  onValueChange,
}: {
  id: string;
  name?: string;
  options: CorporateSelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}) {
  const generatedId = useId();
  const listboxId = `${generatedId}-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const initialValue = value ?? defaultValue ?? "";
  const [selected, setSelected] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.findIndex((item) => item.value === initialValue)));
  const [touched, setTouched] = useState(false);
  const invalid = required && touched && !selected;
  const selectedOption = options.find((item) => item.value === selected);
  const highlighted = hovered || focused;
  const highlightStyle = highlighted ? {
    borderColor: darkMode ? "#bfb48c" : "#a28d5b",
    boxShadow: darkMode ? "0 0 0 3px rgb(191 180 140 / 24%)" : "0 0 0 3px rgb(190 175 135 / 24%)",
  } : undefined;

  useEffect(() => {
    if (value !== undefined) setSelected(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [open]);

  function choose(option: CorporateSelectOption) {
    setSelected(option.value);
    setTouched(true);
    onValueChange?.(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(Math.max(0, options.findIndex((item) => item.value === selected)));
      } else {
        setActiveIndex((current) => event.key === "ArrowDown" ? Math.min(options.length - 1, current + 1) : Math.max(0, current - 1));
      }
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative w-full ${open ? "z-50" : "z-0"}`}>
      {name && <input type="hidden" name={name} value={selected} />}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
        aria-required={required}
        aria-invalid={invalid}
        onClick={() => { setTouched(true); setOpen((current) => !current); }}
        onMouseEnter={() => { setHovered(true); setDarkMode(document.documentElement.classList.contains("dark")); }}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => { setFocused(true); setDarkMode(document.documentElement.classList.contains("dark")); }}
        onBlur={() => { setTouched(true); setFocused(false); }}
        onKeyDown={handleKeyDown}
        style={highlightStyle}
        className={`input corporate-select-trigger flex min-h-11 items-center justify-between gap-3 rounded-xl text-left transition-colors ${invalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400" : ""}`}
      >
        <span className={selectedOption ? "truncate" : "truncate text-ink-mute dark:text-carbon-400"}>{selectedOption?.label ?? placeholder}</span>
        <svg className={`h-4 w-4 shrink-0 text-gold-700 transition-transform dark:text-gold-300 ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div
        id={listboxId}
        role="listbox"
        aria-labelledby={id}
        className="absolute left-0 top-[calc(100%+0.4rem)] z-50 max-h-64 w-full overflow-y-auto rounded-xl border border-gold-300 bg-white p-1.5 shadow-xl shadow-carbon-950/15 ring-1 ring-gold-500/10 dark:border-carbon-600 dark:bg-carbon-900 dark:shadow-black/40 dark:ring-gold-400/10"
      >
        {options.map((option, index) => {
          const isSelected = option.value === selected;
          const isActive = index === activeIndex;
          return <div
            key={option.value}
            id={`${listboxId}-${index}`}
            role="option"
            aria-selected={isSelected}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
            className={`flex min-h-10 cursor-pointer items-center rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-gold-100 text-carbon-900 dark:bg-gold-500/20 dark:text-gold-100" : "text-ink-soft hover:bg-gold-50 dark:text-carbon-200 dark:hover:bg-carbon-800"} ${isSelected ? "font-semibold" : ""}`}
          >
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {isSelected && <svg className="ml-2 h-4 w-4 shrink-0 text-gold-700 dark:text-gold-300" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>;
        })}
      </div>}
      {invalid && <p className="mt-1 text-xs text-red-700 dark:text-red-300">Selecciona una opción para continuar.</p>}
    </div>
  );
}
