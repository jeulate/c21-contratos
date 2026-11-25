"use client";

import { useEffect, useMemo, useState } from "react";
import type { CountryCallingCode } from "@/lib/contract-form-option-defaults";
import { CorporateSelect } from "./corporate-select";

const FALLBACK_COUNTRIES: CountryCallingCode[] = [{ code: "BO", dial: "+591", name: "Bolivia" }];

function CountryFlag({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !/^[A-Z]{2}$/i.test(code)) {
    return <span aria-hidden="true" className="inline-grid h-4 min-w-6 place-items-center rounded bg-stone-100 px-1 text-[9px] font-bold text-ink-soft dark:bg-carbon-700 dark:text-carbon-100">{code.toUpperCase()}</span>;
  }
  // Tiny, lazy-loaded flag asset; Next's optimizer would add a server-side fetch per configured country.
  // eslint-disable-next-line @next/next/no-img-element
  return <img
    src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
    alt=""
    width={20}
    height={15}
    loading="lazy"
    decoding="async"
    referrerPolicy="no-referrer"
    onError={() => setFailed(true)}
    className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover shadow-sm"
  />;
}

function splitPhone(value: string, countries: CountryCallingCode[]) {
  const normalized = value.trim();
  const match = [...countries]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((country) => normalized.startsWith(country.dial));
  if (!match) return { code: countries[0]?.code ?? "BO", number: normalized };
  return { code: match.code, number: normalized.slice(match.dial.length).trim() };
}

export function ContractPhoneInput({
  id,
  name,
  defaultValue = "",
  required = false,
  placeholder = "71234567",
  validationClassName = "",
  ariaInvalid,
  ariaDescribedBy,
  countries,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  validationClassName?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  countries: CountryCallingCode[];
}) {
  const usableCountries = countries.length ? countries : FALLBACK_COUNTRIES;
  const initial = splitPhone(defaultValue, usableCountries);
  const [countryCode, setCountryCode] = useState(initial.code);
  const [number, setNumber] = useState(initial.number);
  const country = usableCountries.find((item) => item.code === countryCode) ?? usableCountries[0];
  const countryOptions = useMemo(() => usableCountries.map((item) => ({
    value: item.code,
    label: item.dial,
    searchText: `${item.name} ${item.code} ${item.dial}`,
    icon: <CountryFlag code={item.code} />,
  })), [usableCountries]);

  useEffect(() => {
    const next = splitPhone(defaultValue, usableCountries);
    setCountryCode(next.code);
    setNumber(next.number);
  }, [defaultValue, usableCountries]);

  const submittedValue = number.trim() ? `${country.dial} ${number.trim()}` : "";

  return (
    <div className="flex min-w-0 items-start">
      <input type="hidden" name={name} value={submittedValue} />
      <div className="w-36 shrink-0 sm:w-40">
        <CorporateSelect
          id={`${id}-country`}
          options={countryOptions}
          value={countryCode}
          onValueChange={setCountryCode}
          searchable
          searchPlaceholder="Buscar país o prefijo..."
          ariaLabel={`Código telefónico de ${country.name} ${country.dial}`}
          containerClassName="w-full"
          triggerClassName="rounded-r-none border-r-0 px-2.5 text-xs sm:text-sm"
        />
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        placeholder={placeholder}
        pattern="[0-9][0-9\\s().\\-]{5,19}"
        title="Ingresa de 6 a 20 dígitos; puedes usar espacios, paréntesis o guiones."
        maxLength={20}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={`input min-w-0 flex-1 rounded-l-none ${validationClassName}`}
      />
    </div>
  );
}
