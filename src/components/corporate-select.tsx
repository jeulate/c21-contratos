"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type CorporateSelectOption = { value: string; label: string; searchText?: string; icon?: ReactNode };

export function CorporateSelect({
  id,
  name,
  options,
  value,
  defaultValue,
  placeholder = "Selecciona una opción",
  required = false,
  onValueChange,
  searchable = false,
  searchPlaceholder = "Buscar opción...",
  containerClassName = "",
  triggerClassName = "",
  ariaLabel,
}: {
  id: string;
  name?: string;
  options: CorporateSelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  containerClassName?: string;
  triggerClassName?: string;
  ariaLabel?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const invalid = required && touched && !selected;
  const valid = required && touched && Boolean(selected);
  const selectedOption = options.find((item) => item.value === selected);
  const highlighted = hovered || focused;
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredOptions = normalizedSearch
    ? options.filter((item) => `${item.label} ${item.value} ${item.searchText ?? ""}`.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
    : options;
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
    setSearchTerm("");
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
    <div ref={rootRef} className={`relative w-full ${containerClassName} ${open ? "z-50" : "z-0"}`}>
      {name && <input type="hidden" name={name} value={selected} />}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
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
        className={`input corporate-select-trigger flex min-h-11 items-center justify-between gap-3 rounded-xl text-left transition-colors ${triggerClassName} ${invalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400" : valid ? "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/25 dark:border-emerald-400 dark:focus:border-emerald-300" : ""}`}
      >
        <span className={`flex min-w-0 items-center gap-2 ${selectedOption ? "truncate" : "truncate text-ink-mute dark:text-carbon-400"}`}>
          {selectedOption?.icon}
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        </span>
        <svg className={`h-4 w-4 shrink-0 text-gold-700 transition-transform dark:text-gold-300 ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="absolute left-0 top-[calc(100%+0.4rem)] z-50 w-full overflow-hidden rounded-xl border border-gold-300 bg-white p-1.5 shadow-xl shadow-carbon-950/15 ring-1 ring-gold-500/10 dark:border-carbon-600 dark:bg-carbon-900 dark:shadow-black/40 dark:ring-gold-400/10">
        {searchable && <div className="border-b border-stone-200 p-1.5 dark:border-carbon-700">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => { setSearchTerm(event.target.value); setActiveIndex(0); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
              if (event.key === "ArrowDown" && filteredOptions[0]) { event.preventDefault(); choose(filteredOptions[0]); }
            }}
            onMouseDown={(event) => event.stopPropagation()}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="input h-9 w-full rounded-lg px-3 text-sm"
          />
        </div>}
        <div id={listboxId} role="listbox" aria-labelledby={id} className="max-h-64 overflow-y-auto p-0.5">
        {filteredOptions.length ? filteredOptions.map((option, index) => {
          const isSelected = option.value === selected;
          const isActive = index === activeIndex;
          return <div
            key={option.value}
            id={`${listboxId}-${index}`}
            role="option"
            aria-selected={isSelected}
            aria-label={option.searchText ?? option.label}
            title={option.searchText}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
            className={`flex min-h-10 cursor-pointer items-center rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-gold-100 text-carbon-900 dark:bg-gold-500/20 dark:text-gold-100" : "text-ink-soft hover:bg-gold-50 dark:text-carbon-200 dark:hover:bg-carbon-800"} ${isSelected ? "font-semibold" : ""}`}
          >
            {option.icon}
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {isSelected && <svg className="ml-2 h-4 w-4 shrink-0 text-gold-700 dark:text-gold-300" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>;
        }) : <p className="px-3 py-3 text-sm text-ink-mute dark:text-carbon-400">No se encontraron opciones.</p>}
        </div>
      </div>}
      {invalid && <p className="mt-1 text-xs text-red-700 dark:text-red-300">Selecciona una opción para continuar.</p>}
      {valid && <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">Opción seleccionada.</p>}
    </div>
  );
}
