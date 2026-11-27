"use client";

import { useCallback, useState } from "react";
import { useFormState } from "react-dom";
import { saveContract, FormState } from "@/app/actions";
import { amountInWords } from "@/lib/amount-in-words";
import { validityInWords, type ContractValidityUnit } from "@/lib/contract-validity";
import { CONTRACT_TYPES, CURRENCY_NAMES, CURRENCY_SYMBOLS, isTemplateBasedContract, STATES, type Currency } from "@/lib/contract-types";
import type { CurrencyDefinition } from "@/lib/contract-currencies";
import type { AdditionalContractOwner, Contract } from "@/lib/contracts";
import type { AdvisorProfile } from "@/lib/users";
import { MIN_CONTRACT_EVIDENCE_IMAGES } from "@/lib/contract-evidence-constants";
import { DEFAULT_COUNTRY_CALLING_CODES, DEFAULT_IDENTITY_CITIES, DEFAULT_PROPERTY_TYPES, DEFAULT_VALIDITY_UNITS, type ContractFormOptions } from "@/lib/contract-form-option-defaults";
import { SubmitButton } from "./submit-button";
import { ContractEvidenceUploader } from "./contract-evidence-uploader";
import { CorporateSelect } from "./corporate-select";
import { ContractPhoneInput } from "./contract-phone-input";

const textOnlyPattern = String.raw`[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]*`;
const phonePattern = String.raw`\+?[0-9][0-9\s().-]{5,19}`;
const identityNumberPattern = String.raw`[0-9]{4,12}(?:-(?=[A-Za-z0-9]{2,3}$)(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{2,3})?`;
type FieldValidation = { status: "error" | "success"; message?: string };

function validationMessage(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, label: string) {
  if (field.validity.valueMissing) return `Completa ${label.toLowerCase()}.`;
  if (field instanceof HTMLInputElement && field.type === "email") return "Ingresa un correo electrónico válido, por ejemplo nombre@correo.com.";
  if (field instanceof HTMLInputElement && field.type === "tel") return "Ingresa un WhatsApp válido con al menos 6 dígitos.";
  if (field.validity.patternMismatch) return field.title || `Revisa el formato de ${label.toLowerCase()}.`;
  if (field instanceof HTMLInputElement && field.validity.rangeUnderflow) return `El valor debe ser igual o mayor a ${field.min}.`;
  if (field instanceof HTMLInputElement && field.validity.rangeOverflow) return `El valor debe ser igual o menor a ${field.max}.`;
  if (field.validity.stepMismatch) return "Ingresa un número con el formato permitido.";
  return field.validationMessage || `Revisa el valor de ${label.toLowerCase()}.`;
}

function SectionIcon({ type }: { type: "contract" | "owner" | "property" | "amount" | "advisor" | "group" | "details" }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700 dark:bg-carbon-800 dark:text-gold-300" aria-hidden="true">
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {type === "contract" && <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5M10 13h5M10 17h5" /></>}
      {type === "owner" && <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0M18 5a3 3 0 0 1 0 6M20 14a5 5 0 0 1 2 4" /></>}
      {type === "property" && <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" /></>}
      {type === "amount" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M8 15h3" /></>}
      {type === "advisor" && <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0M18 4h3v4" /></>}
      {type === "group" && <><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5" /></>}
      {type === "details" && <><path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h4" /></>}
    </svg>
  </span>;
}

export function ContractForm({ contract, advisorProfile, currencyByType, currencyCatalog = [], formOptions, canManageState = true, evidenceSessionId }: { contract?: Contract; advisorProfile?: AdvisorProfile; currencyByType?: Record<string, Currency>; currencyCatalog?: CurrencyDefinition[]; formOptions?: ContractFormOptions; canManageState?: boolean; evidenceSessionId?: string }) {
  const [tipo, setTipo] = useState(contract?.tipo ?? CONTRACT_TYPES[0].id);
  const [monto, setMonto] = useState(contract ? String(contract.monto) : "");
  const [vigenciaCantidad, setVigenciaCantidad] = useState(contract?.vigenciaCantidad ? String(contract.vigenciaCantidad) : "");
  const [vigenciaUnidad, setVigenciaUnidad] = useState<ContractValidityUnit>(contract?.vigenciaUnidad ?? formOptions?.validityUnits[0] ?? DEFAULT_VALIDITY_UNITS[0]);
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [additionalOwners, setAdditionalOwners] = useState<AdditionalContractOwner[]>(contract?.additionalOwners ?? []);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [fieldValidation, setFieldValidation] = useState<Record<string, FieldValidation>>({});
  const onEvidenceChange = useCallback((ids: string[], uploading: boolean) => {
    setEvidenceIds(ids);
    setEvidenceUploading(uploading);
  }, []);
  const [state, action] = useFormState<FormState, FormData>(saveContract.bind(null, contract?.id ?? null), {});
  const contractType = CONTRACT_TYPES.find((item) => item.id === tipo);
  const extras = contractType?.extras ?? [];
  const templateBased = isTemplateBasedContract(tipo);
  const selectedCurrency = (contract?.moneda ?? currencyByType?.[tipo] ?? "BOB") as Currency;
  const selectedCurrencyDefinition = currencyCatalog.find((item) => item.code === selectedCurrency);
  const currencyName = contract?.monedaNombre ?? selectedCurrencyDefinition?.name ?? CURRENCY_NAMES[selectedCurrency] ?? selectedCurrency;
  const currencySingular = contract?.monedaSingular ?? selectedCurrencyDefinition?.singularName;
  const currencySymbol = contract?.monedaSimbolo ?? selectedCurrencyDefinition?.symbol ?? CURRENCY_SYMBOLS[selectedCurrency] ?? selectedCurrency;
  const selectedProfile = contract?.asesorProfileSnapshot ?? advisorProfile;
  const propertyTypes = formOptions?.propertyTypes ?? [...DEFAULT_PROPERTY_TYPES];
  const identityCities = formOptions?.identityCities ?? [...DEFAULT_IDENTITY_CITIES];
  const validityUnits = formOptions?.validityUnits ?? [...DEFAULT_VALIDITY_UNITS];
  const countryCallingCodes = formOptions?.countryCallingCodes ?? DEFAULT_COUNTRY_CALLING_CODES;
  const today = new Date().toISOString().slice(0, 10);
  const sections = [...new Set(extras.map((field) => field.section ?? "Datos adicionales"))];
  const amountLabel = tipo === "exclusiva-alquiler" ? "Canon de arrendamiento mensual" : tipo === "exclusiva-anticretico" ? "Monto referencial de anticrético" : tipo === "exclusiva-rural" ? "Precio total referencial" : "Precio referencial de venta";
  const amountWords = amountInWords(monto, selectedCurrency, currencySingular, currencyName);
  const validityWords = validityInWords(Number(vigenciaCantidad), vigenciaUnidad);
  const firstValidationError = Object.values(fieldValidation).find((item) => item.status === "error");

  const validationClass = (id: string) => {
    const status = fieldValidation[id]?.status;
    if (status === "error") return "border-red-500 focus:border-red-600 focus:ring-red-500/25 dark:border-red-400 dark:focus:border-red-300 dark:focus:ring-red-400/25";
    if (status === "success") return "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/25 dark:border-emerald-400 dark:focus:border-emerald-300 dark:focus:ring-emerald-400/25";
    return "";
  };

  const updateFieldValidation = (field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
    if (!field.id || field.disabled || (field instanceof HTMLInputElement && (field.type === "hidden" || field.readOnly))) return;
    const label = field.labels?.[0]?.textContent?.replace("(opcional)", "").trim() || field.name || field.id;
    const optionalEmpty = !field.required && !field.value.trim();
    setFieldValidation((current) => {
      const next = { ...current };
      if (optionalEmpty) delete next[field.id];
      else if (field.validity.valid) next[field.id] = { status: "success" };
      else next[field.id] = { status: "error", message: validationMessage(field, label) };
      return next;
    });
  };

  const fieldFeedback = (id: string, successText?: string) => {
    const validation = fieldValidation[id];
    if (validation?.status === "error") return <p id={`${id}Feedback`} className="mt-1 text-xs text-red-700 dark:text-red-300">{validation.message}</p>;
    if (validation?.status === "success" && successText) return <p id={`${id}Feedback`} className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{successText}</p>;
    return null;
  };

  return (
    <form
      action={action}
      onBlurCapture={(event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
        updateFieldValidation(field);
      }}
      onChangeCapture={(event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
        if (field.id && fieldValidation[field.id]) updateFieldValidation(field);
      }}
      className="panel grid w-full gap-5 p-5 sm:p-6 lg:grid-cols-2"
    >
      <input type="hidden" name="additionalOwnersJson" value={JSON.stringify(templateBased ? additionalOwners : [])} />
      {firstValidationError?.message && <p role="alert" aria-live="polite" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200 lg:col-span-2">Revisa los campos resaltados antes de continuar. {firstValidationError.message}</p>}
      <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-carbon-800 dark:bg-carbon-950/40">
        <div className="mb-4 flex items-center gap-3">
          <SectionIcon type="contract" />
          <div><h2 className="text-sm font-semibold text-ink dark:text-white">Identificación del contrato</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Selecciona el modelo y registra la fecha del documento.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tipo">Tipo de contrato</label>
            <CorporateSelect id="tipo" name="tipo" value={tipo} options={CONTRACT_TYPES.map((item) => ({ value: item.id, label: item.label }))} onValueChange={setTipo} required />
          </div>
          <div>
            <label className="label" htmlFor="fecha">Fecha del contrato</label>
            <input id="fecha" name="fecha" type="date" defaultValue={contract?.fecha ?? today} className={`input ${validationClass("fecha")}`} aria-invalid={fieldValidation.fecha?.status === "error"} aria-describedby={fieldValidation.fecha ? "fechaFeedback" : undefined} required />
            {fieldFeedback("fecha")}
          </div>
          {canManageState ? <div>
            <label className="label" htmlFor="estado">Estado</label>
            <CorporateSelect id="estado" name="estado" defaultValue={contract?.estado ?? "borrador"} options={STATES.map((item) => ({ value: item.id, label: item.label }))} required />
          </div> : <input type="hidden" name="estado" value={contract?.estado ?? "revision"} />}
        </div>
      </section>

      {!templateBased && <section className="rounded-xl border border-stone-200 p-4 dark:border-carbon-800">
        <div className="mb-4 flex items-center gap-3"><SectionIcon type="owner" /><div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Cliente o propietario principal</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Ingresa los datos de identificación que aparecerán en el contrato.</p>
        </div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cliente">{templateBased ? "Nombre completo del propietario/a" : "Cliente"}</label>
            <input id="cliente" name="cliente" defaultValue={contract?.cliente} className={`input ${validationClass("cliente")}`} placeholder="Ej.: María Alejandra Cabrera Ávila" aria-invalid={fieldValidation.cliente?.status === "error"} aria-describedby={fieldValidation.cliente ? "clienteFeedback" : undefined} required pattern={templateBased ? textOnlyPattern : undefined} title={templateBased ? "Ingresa un nombre usando letras, espacios, apóstrofes, puntos o guiones." : undefined} />
            {fieldFeedback("cliente")}
          </div>
          <div>
            <label className="label" htmlFor="clienteDoc">{templateBased ? "Cédula de identidad" : "CI / NIT del cliente"}</label>
            <input id="clienteDoc" name="clienteDoc" defaultValue={contract?.clienteDoc} className={`input ${validationClass("clienteDoc")}`} placeholder="Ej.: 785462-1D" required={templateBased} pattern={templateBased ? identityNumberPattern : undefined} maxLength={16} aria-invalid={fieldValidation.clienteDoc?.status === "error"} aria-describedby={[templateBased ? "clienteDocHelp" : "", fieldValidation.clienteDoc ? "clienteDocFeedback" : ""].filter(Boolean).join(" ") || undefined} title={templateBased ? "Ingresa de 4 a 12 dígitos; el complemento es opcional y lleva guion, 2 o 3 caracteres alfanuméricos con letras y números (ejemplo: 785462-1D)." : undefined} />
            {fieldFeedback("clienteDoc")}
            {templateBased && <p id="clienteDocHelp" className="mt-1 text-xs text-ink-mute dark:text-carbon-400">4–12 dígitos; complemento opcional de 2–3 caracteres con letras y números, separado por guion. Ejemplo: 785462-1D.</p>}
          </div>
        </div>
      </section>}

      <section className="rounded-xl border border-stone-200 p-4 dark:border-carbon-800">
        <div className="mb-4 flex items-center gap-3"><SectionIcon type="property" /><div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Inmueble</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Registra una dirección o referencia que permita identificar la propiedad.</p>
        </div></div>
        <div>
          <label className="label" htmlFor="propiedad">{tipo === "exclusiva-rural" ? "Referencia / ubicación de la propiedad" : "Dirección o referencia del inmueble"}</label>
          <input id="propiedad" name="propiedad" defaultValue={contract?.propiedad} className={`input ${validationClass("propiedad")}`} placeholder="Ej.: Av. Beni, 4.º anillo, edificio Los Álamos" aria-invalid={fieldValidation.propiedad?.status === "error"} aria-describedby={fieldValidation.propiedad ? "propiedadFeedback" : undefined} required />
          {fieldFeedback("propiedad")}
        </div>
      </section>

      <section className="rounded-xl border border-gold-200 bg-gold-50/40 p-4 dark:border-carbon-700 dark:bg-carbon-950/40">
        <div className="mb-4 flex items-center gap-3"><SectionIcon type="amount" /><div>
          <h2 className="text-sm font-semibold text-ink dark:text-white">Monto y condiciones</h2>
          <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">La divisa la define el administrador. El monto en palabras se completa desde el importe numérico.</p>
        </div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="monto">{templateBased ? amountLabel : "Monto"}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="moneda" value={selectedCurrency} />
              <div className="input flex shrink-0 flex-col justify-center bg-white sm:w-44 dark:bg-carbon-900" aria-label={`Divisa ${selectedCurrency}`}>
                <span className="text-sm font-semibold">{selectedCurrency} · {currencySymbol}</span>
                <span className="text-[10px] text-ink-mute dark:text-carbon-400">{currencyName}</span>
              </div>
              <input id="monto" name="monto" type="number" step="0.01" min="0" value={monto} onChange={(event) => setMonto(event.target.value)} className={`input ${validationClass("monto")}`} placeholder="Ej.: 300000" aria-invalid={fieldValidation.monto?.status === "error"} aria-describedby={fieldValidation.monto ? "montoFeedback" : undefined} required />
              {fieldFeedback("monto")}
            </div>
          <div>
            <label className="label" htmlFor="vigenciaCantidad">Vigencia del contrato</label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(130px,0.8fr)] gap-2">
              <input id="vigenciaCantidad" name="vigenciaCantidad" type="number" min="1" max="36500" step="1" inputMode="numeric" value={vigenciaCantidad} onChange={(event) => setVigenciaCantidad(event.target.value)} className={`input ${validationClass("vigenciaCantidad")}`} placeholder="Ej.: 4" aria-invalid={fieldValidation.vigenciaCantidad?.status === "error"} aria-describedby={fieldValidation.vigenciaCantidad ? "vigenciaCantidadFeedback" : "vigenciaCantidadHelp"} required />
              <CorporateSelect id="vigenciaUnidad" name="vigenciaUnidad" value={vigenciaUnidad} onValueChange={(value) => setVigenciaUnidad(value as ContractValidityUnit)} options={[...new Set([...validityUnits, ...(contract?.vigenciaUnidad ? [contract.vigenciaUnidad] : [])])].map((unit) => ({ value: unit, label: unit === "dias" ? "Días" : unit === "meses" ? "Meses" : "Años" }))} required />
            </div>
            {fieldFeedback("vigenciaCantidad")}
            <p id="vigenciaCantidadHelp" className="mt-1 text-xs text-ink-mute dark:text-carbon-400">La fecha de vencimiento se calcula desde la fecha del contrato.</p>
          </div>
          <div>
            <label className="label" htmlFor="vigenciaEnPalabras">Vigencia en palabras</label>
            <input id="vigenciaEnPalabras" value={validityWords} readOnly className="input bg-stone-50 uppercase dark:bg-carbon-950" placeholder="Se completa desde la vigencia numérica" aria-describedby="vigenciaWordsHelp" />
            <p id="vigenciaWordsHelp" className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Se actualiza automáticamente al cambiar la vigencia.</p>
          </div>
          </div>
          {!templateBased && <div>
            <label className="label" htmlFor="comision">Comisión (%)</label>
            <input id="comision" name="comision" type="number" step="0.01" min="0" max="100" defaultValue={contract?.comision ?? 3} className={`input ${validationClass("comision")}`} placeholder="Ej.: 3" aria-invalid={fieldValidation.comision?.status === "error"} aria-describedby={fieldValidation.comision ? "comisionFeedback" : undefined} />
            {fieldFeedback("comision")}
          </div>}
          {templateBased && <input type="hidden" name="comision" value="0" />}
        </div>
      </section>

      {templateBased && selectedProfile && <section className="rounded-xl border border-gold-200 bg-gold-50/60 p-4 dark:border-carbon-700 dark:bg-carbon-950/50">
        <div className="mb-2 flex items-center gap-3"><SectionIcon type="advisor" /><h2 className="text-sm font-semibold text-ink dark:text-white">Datos del asesor</h2></div>
        <p className="mt-1 text-sm text-ink-soft dark:text-carbon-300">Se incorporan desde tu perfil: {selectedProfile.fullName} · C.I. {selectedProfile.identityNumber} · {selectedProfile.mobile} · {selectedProfile.email}</p>
      </section>}

      {sections.map((section) => {
        const ownerSection = templateBased && (section === "Propietario principal" || section === "Propietario");
        const ownerGroupSection = section === "Segundo propietario (opcional)";
        const sectionTitle = ownerSection ? "Propietario principal" : section;
        const sectionIcon = ownerSection ? "owner" : ownerGroupSection ? "group" : "details";
        return (
        <fieldset key={`${tipo}-${section}`} className="rounded-xl border border-stone-200 bg-white/40 p-4 dark:border-carbon-800 dark:bg-carbon-950/30">
          <legend className="px-1 text-sm font-semibold text-ink dark:text-white">{sectionTitle}</legend>
          <div className="mb-3 flex items-center gap-3"><SectionIcon type={sectionIcon} /><div>
            <h2 className="text-sm font-semibold text-ink dark:text-white">{sectionTitle}</h2>
            {ownerSection && <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Identificación, domicilio y medios de contacto del propietario.</p>}
          </div></div>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            {ownerSection && <>
              <div>
                <label className="label" htmlFor="cliente">Nombre completo del propietario/a</label>
                <input id="cliente" name="cliente" defaultValue={contract?.cliente} className={`input ${validationClass("cliente")}`} placeholder="Ej.: María Alejandra Cabrera Ávila" aria-invalid={fieldValidation.cliente?.status === "error"} aria-describedby={fieldValidation.cliente ? "clienteFeedback" : undefined} required pattern={textOnlyPattern} maxLength={160} title="Ingresa un nombre usando letras, espacios, apóstrofes, puntos o guiones." />
                {fieldFeedback("cliente")}
              </div>
              <div>
                <label className="label" htmlFor="clienteDoc">Cédula de identidad</label>
                <input id="clienteDoc" name="clienteDoc" defaultValue={contract?.clienteDoc} className={`input ${validationClass("clienteDoc")}`} placeholder="Ej.: 785462-1D" aria-invalid={fieldValidation.clienteDoc?.status === "error"} required pattern={identityNumberPattern} maxLength={16} aria-describedby={["clienteDocHelp", fieldValidation.clienteDoc ? "clienteDocFeedback" : ""].filter(Boolean).join(" ")} title="Ingresa de 4 a 12 dígitos; el complemento es opcional y lleva guion, 2 o 3 caracteres alfanuméricos con letras y números (ejemplo: 785462-1D)." />
                <p id="clienteDocHelp" className="mt-1 text-xs text-ink-mute dark:text-carbon-400">4–12 dígitos; complemento opcional de 2–3 caracteres con letras y números, separado por guion. Ejemplo: 785462-1D.</p>
                {fieldFeedback("clienteDoc")}
              </div>
            </>}
            {extras.filter((field) => (field.section ?? "Datos adicionales") === section).map((field) => {
              const fieldId = `x_${field.key}`;
              const unit = field.unit === "currency" ? selectedCurrency : field.unit;
              const fieldLabel = field.key === "amountInWords" ? `Monto en palabras (${selectedCurrency})` : unit ? `${field.label} (${unit})` : field.label;
              const isAmountInWords = field.key === "amountInWords";
              const defaultValue = contract?.tipo === tipo ? contract.extras[field.key] : "";
              const inputType = field.type === "number" || field.type === "date" || field.type === "email" || field.type === "tel" ? field.type : "text";
              const validationPattern = field.validation === "name" ? textOnlyPattern : field.validation === "phone" ? phonePattern : field.validation === "identity" ? identityNumberPattern : undefined;
              const configuredOptions = field.key === "propertyType"
                ? propertyTypes
                : ["owner1IssuedIn", "owner2IssuedIn"].includes(field.key)
                  ? identityCities
                  : null;
              const placeholders: Record<string, string> = {
                owner1Address: "Ej.: Zona Norte, calle Los Cedros #123",
                owner1Email: "nombre@correo.com",
                owner1Whatsapp: "71234567",
                owner2Name: "Ej.: Pedro Pérez",
                owner2IdentityNumber: "Ej.: 785462-1D",
                owner2Address: "Ej.: Barrio, calle y número",
                owner2Email: "nombre@correo.com",
                owner2Whatsapp: "71234567",
                propertyZone: "Ej.: Equipetrol",
                propertyUv: "Ej.: 15",
                propertyBlock: "Ej.: 3",
                propertyLot: "Ej.: 25",
                propertyRegistry: "Ej.: 7.01.1.99.0001234",
                propertyType: "Selecciona el tipo de inmueble",
                propertyAddress: "Ej.: Av. Beni, 4.º anillo, edificio Los Álamos",
                landArea: "Ej.: 320",
                builtArea: "Ej.: 180",
                bedroomCount: "Ej.: 3",
                suiteCount: "Ej.: 1",
                amountInWords: "Se completa desde el monto numérico",
                hectares: "Ej.: 25.5",
                department: "Ej.: Santa Cruz",
                province: "Ej.: Andrés Ibáñez",
                municipality: "Ej.: Santa Cruz de la Sierra",
              };
              const placeholder = placeholders[field.key] ?? (field.type === "textarea" ? `Ingresa ${field.label.toLowerCase()}` : `Ingresa ${field.label.toLowerCase()}`);
              const choices = configuredOptions
                ? [...new Set([...configuredOptions, ...(defaultValue ? [defaultValue] : [])])]
                : [];
              const input = configuredOptions ? <CorporateSelect
                id={fieldId}
                name={fieldId}
                defaultValue={defaultValue ?? ""}
                placeholder={placeholder}
                options={choices.map((option) => ({ value: option, label: option }))}
                required={field.required}
              /> : field.type === "tel" ? <ContractPhoneInput
                id={fieldId}
                name={fieldId}
                defaultValue={defaultValue ?? ""}
                required={field.required}
                placeholder={placeholder}
                validationClassName={validationClass(fieldId)}
                countries={countryCallingCodes}
                ariaInvalid={fieldValidation[fieldId]?.status === "error"}
                ariaDescribedBy={fieldValidation[fieldId] ? `${fieldId}Feedback` : undefined}
              /> : <input
                id={fieldId}
                name={fieldId}
                type={inputType}
                inputMode={field.type === "number" ? "decimal" : undefined}
                min={field.type === "number" ? 0 : undefined}
                step={field.type === "number" ? field.step ?? "any" : undefined}
                placeholder={placeholder}
                pattern={validationPattern}
                title={field.validation === "name" ? "Ingresa solo texto, espacios, apóstrofes, puntos o guiones." : field.validation === "phone" ? "Usa un teléfono válido con dígitos y, opcionalmente, +, espacios, paréntesis o guiones." : field.validation === "identity" ? "Ingresa de 4 a 12 dígitos; el complemento opcional lleva guion y 2 o 3 caracteres alfanuméricos con letras y números (ejemplo: 785462-1D)." : undefined}
                maxLength={field.validation === "identity" ? 16 : undefined}
                aria-invalid={fieldValidation[fieldId]?.status === "error"}
                aria-describedby={[field.validation === "identity" ? `${fieldId}Help` : "", fieldValidation[fieldId] ? `${fieldId}Feedback` : ""].filter(Boolean).join(" ") || undefined}
                defaultValue={defaultValue}
                className={`input min-w-0 flex-1 ${validationClass(fieldId)}`}
                required={field.required}
              />;
              return (
                <div key={`${tipo}-${field.key}`} className={field.type === "textarea" || isAmountInWords ? "sm:col-span-2" : ""}>
                  <label className="label" htmlFor={fieldId}>{fieldLabel}{field.required ? "" : " (opcional)"}</label>
                  {field.type === "textarea" ? <textarea id={fieldId} name={fieldId} rows={3} defaultValue={defaultValue} className={`input ${validationClass(fieldId)}`} placeholder={placeholder} aria-invalid={fieldValidation[fieldId]?.status === "error"} aria-describedby={fieldValidation[fieldId] ? `${fieldId}Feedback` : undefined} required={field.required} /> : isAmountInWords ? <input id={fieldId} name={fieldId} value={amountWords} readOnly className="input bg-stone-50 uppercase dark:bg-carbon-950" placeholder={placeholder} aria-describedby="amountInWordsHelp" required={field.required} /> : unit ? <div className="flex min-w-0 items-stretch">{input}<span aria-hidden="true" className="inline-flex shrink-0 items-center rounded-r-xl border border-l-0 border-stone-300 bg-stone-50 px-3 text-sm font-semibold text-ink-soft dark:border-carbon-700 dark:bg-carbon-950 dark:text-carbon-200">{unit}</span></div> : input}
                  {(field.type === "email" || field.type === "tel") && fieldFeedback(fieldId, field.type === "email" ? "Correo electrónico válido." : "Número de WhatsApp válido.")}
                  {fieldValidation[fieldId]?.status === "error" && field.type !== "email" && field.type !== "tel" && fieldFeedback(fieldId)}
                  {field.validation === "identity" && <p id={`${fieldId}Help`} className="mt-1 text-xs text-ink-mute dark:text-carbon-400">4–12 dígitos; complemento opcional de 2–3 caracteres con letras y números, separado por guion. Ejemplo: 785462-1D.</p>}
                  {isAmountInWords && <p id="amountInWordsHelp" className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Se actualiza automáticamente al cambiar el monto.</p>}
                </div>
              );
            })}
            {templateBased && section === "Segundo propietario (opcional)" && <div className="space-y-4 sm:col-span-2">
              {additionalOwners.map((owner, index) => {
                const position = index + 3;
                const updateOwner = (key: keyof AdditionalContractOwner, value: string) => {
                  setAdditionalOwners((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
                };
                return <fieldset key={`additional-owner-${index}`} className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-carbon-700 dark:bg-carbon-950/30">
                  <legend className="px-1 text-sm font-semibold text-ink dark:text-white">Propietario {position}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor={`additional-owner-${index}-name`}>Nombre completo</label>
                      <input id={`additional-owner-${index}-name`} value={owner.fullName} onChange={(event) => updateOwner("fullName", event.target.value)} className={`input ${validationClass(`additional-owner-${index}-name`)}`} placeholder="Ej.: Pedro Pérez" aria-invalid={fieldValidation[`additional-owner-${index}-name`]?.status === "error"} aria-describedby={fieldValidation[`additional-owner-${index}-name`] ? `additional-owner-${index}-nameFeedback` : undefined} required pattern={textOnlyPattern} maxLength={160} title="Ingresa un nombre usando letras, espacios, apóstrofes, puntos o guiones." />
                      {fieldFeedback(`additional-owner-${index}-name`)}
                    </div>
                    <div>
                      <label className="label" htmlFor={`additional-owner-${index}-identity`}>Cédula de identidad</label>
                      <input id={`additional-owner-${index}-identity`} value={owner.identityNumber} onChange={(event) => updateOwner("identityNumber", event.target.value)} className={`input ${validationClass(`additional-owner-${index}-identity`)}`} placeholder="Ej.: 785462-1D" aria-invalid={fieldValidation[`additional-owner-${index}-identity`]?.status === "error"} aria-describedby={fieldValidation[`additional-owner-${index}-identity`] ? `additional-owner-${index}-identityFeedback` : undefined} required pattern={identityNumberPattern} maxLength={16} title="Ingresa de 4 a 12 dígitos; el complemento opcional lleva guion y 2 o 3 caracteres con letras y números (ejemplo: 785462-1D)." />
                      {fieldFeedback(`additional-owner-${index}-identity`)}
                    </div>
                    <div>
                      <label className="label" htmlFor={`additional-owner-${index}-issued-in`}>Lugar de expedición</label>
                      <CorporateSelect
                        id={`additional-owner-${index}-issued-in`}
                        value={owner.identityIssuedIn}
                        onValueChange={(city) => updateOwner("identityIssuedIn", city)}
                        placeholder="Selecciona una ciudad"
                        options={[...new Set([...identityCities, ...(owner.identityIssuedIn ? [owner.identityIssuedIn] : [])])].map((city) => ({ value: city, label: city }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`additional-owner-${index}-address`}>Domicilio</label>
                      <input id={`additional-owner-${index}-address`} value={owner.address} onChange={(event) => updateOwner("address", event.target.value)} className={`input ${validationClass(`additional-owner-${index}-address`)}`} placeholder="Ej.: Barrio, calle y número" aria-invalid={fieldValidation[`additional-owner-${index}-address`]?.status === "error"} aria-describedby={fieldValidation[`additional-owner-${index}-address`] ? `additional-owner-${index}-addressFeedback` : undefined} required maxLength={300} />
                      {fieldFeedback(`additional-owner-${index}-address`)}
                    </div>
                    <button type="button" className="btn-ghost justify-self-start text-red-700 dark:text-red-300" onClick={() => setAdditionalOwners((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Quitar propietario {position}</button>
                  </div>
                </fieldset>;
              })}
              <button
                type="button"
                className="btn-ghost"
                disabled={additionalOwners.length >= 18}
                onClick={() => setAdditionalOwners((current) => [...current, { fullName: "", identityNumber: "", identityIssuedIn: "", address: "" }])}
              >
                + Agregar otro propietario
              </button>
              {additionalOwners.length >= 18 && <p className="text-xs text-ink-mute dark:text-carbon-400">Se alcanzó el máximo de 20 propietarios en el contrato.</p>}
            </div>}
          </div>
        </fieldset>
        );
      })}

      <section className="rounded-xl border border-stone-200 p-4 dark:border-carbon-800 lg:col-span-2">
        <label className="label" htmlFor="notas">Notas internas (opcional)</label>
        <textarea id="notas" name="notas" rows={3} defaultValue={contract?.notas} className={`input ${validationClass("notas")}`} placeholder="Agrega información útil para la revisión legal, si corresponde." aria-invalid={fieldValidation.notas?.status === "error"} aria-describedby={fieldValidation.notas ? "notasFeedback" : undefined} />
      </section>

      {!contract && evidenceSessionId && <>
        <input type="hidden" name="evidenceSessionId" value={evidenceSessionId} />
        <ContractEvidenceUploader sessionId={evidenceSessionId} onChange={onEvidenceChange} />
      </>}

      {state.error && <p role="alert" className="text-sm text-red-700 lg:col-span-2">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700 lg:col-span-2">{state.ok}</p>}
      <div className="flex flex-col gap-2 lg:col-span-2">
        {!contract && evidenceIds.length < MIN_CONTRACT_EVIDENCE_IMAGES && <p className="text-xs text-ink-mute dark:text-carbon-400">Faltan {MIN_CONTRACT_EVIDENCE_IMAGES - evidenceIds.length} imágenes cargadas para completar el mínimo de {MIN_CONTRACT_EVIDENCE_IMAGES} y habilitar el envío a Legal.</p>}
        <SubmitButton disabled={!contract && (evidenceIds.length < MIN_CONTRACT_EVIDENCE_IMAGES || evidenceUploading)}>{contract ? "Guardar cambios" : "Crear y enviar a Legal"}</SubmitButton>
      </div>
    </form>
  );
}
