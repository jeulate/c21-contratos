"use client";

import { useCallback, useState } from "react";
import { useFormState } from "react-dom";
import { saveContract, FormState } from "@/app/actions";
import { amountInWords } from "@/lib/amount-in-words";
import { CONTRACT_TYPES, CURRENCY_NAMES, CURRENCY_SYMBOLS, isTemplateBasedContract, STATES, type Currency } from "@/lib/contract-types";
import type { AdditionalContractOwner, Contract } from "@/lib/contracts";
import type { AdvisorProfile } from "@/lib/users";
import { MIN_CONTRACT_EVIDENCE_IMAGES } from "@/lib/contract-evidence-constants";
import { DEFAULT_IDENTITY_CITIES, DEFAULT_PROPERTY_TYPES, type ContractFormOptions } from "@/lib/contract-form-option-defaults";
import { SubmitButton } from "./submit-button";
import { ContractEvidenceUploader } from "./contract-evidence-uploader";
import { CorporateSelect } from "./corporate-select";

const textOnlyPattern = String.raw`[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]*`;
const phonePattern = String.raw`\+?[0-9][0-9\s().-]{5,19}`;
const identityNumberPattern = String.raw`[0-9]{4,12}(?:-(?=[A-Za-z0-9]{2,3}$)(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{2,3})?`;

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

export function ContractForm({ contract, advisorProfile, currencyByType, formOptions, canManageState = true, evidenceSessionId }: { contract?: Contract; advisorProfile?: AdvisorProfile; currencyByType?: Record<string, Currency>; formOptions?: ContractFormOptions; canManageState?: boolean; evidenceSessionId?: string }) {
  const [tipo, setTipo] = useState(contract?.tipo ?? CONTRACT_TYPES[0].id);
  const [monto, setMonto] = useState(contract ? String(contract.monto) : "");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [additionalOwners, setAdditionalOwners] = useState<AdditionalContractOwner[]>(contract?.additionalOwners ?? []);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [validationAlert, setValidationAlert] = useState("");
  const onEvidenceChange = useCallback((ids: string[], uploading: boolean) => {
    setEvidenceIds(ids);
    setEvidenceUploading(uploading);
  }, []);
  const [state, action] = useFormState<FormState, FormData>(saveContract.bind(null, contract?.id ?? null), {});
  const contractType = CONTRACT_TYPES.find((item) => item.id === tipo);
  const extras = contractType?.extras ?? [];
  const templateBased = isTemplateBasedContract(tipo);
  const selectedCurrency = (contract?.moneda ?? currencyByType?.[tipo] ?? "BOB") as Currency;
  const selectedProfile = contract?.asesorProfileSnapshot ?? advisorProfile;
  const propertyTypes = formOptions?.propertyTypes ?? [...DEFAULT_PROPERTY_TYPES];
  const identityCities = formOptions?.identityCities ?? [...DEFAULT_IDENTITY_CITIES];
  const today = new Date().toISOString().slice(0, 10);
  const sections = [...new Set(extras.map((field) => field.section ?? "Datos adicionales"))];
  const amountLabel = tipo === "exclusiva-alquiler" ? "Canon de arrendamiento mensual" : tipo === "exclusiva-anticretico" ? "Monto referencial de anticrético" : tipo === "exclusiva-rural" ? "Precio total referencial" : "Precio referencial de venta";
  const amountWords = amountInWords(monto, selectedCurrency);

  return (
    <form
      action={action}
      onBlurCapture={(event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
        if (field.validity.valid) {
          setValidationAlert("");
          return;
        }
        const label = field.labels?.[0]?.textContent?.replace("(opcional)", "").trim() || field.name || field.id;
        setValidationAlert(`${label}: ${field.validationMessage}`);
      }}
      onChangeCapture={(event) => {
        const field = event.target;
        if ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) && field.validity.valid) {
          setValidationAlert("");
        }
      }}
      className="panel grid w-full gap-5 p-5 sm:p-6 lg:grid-cols-2"
    >
      <input type="hidden" name="additionalOwnersJson" value={JSON.stringify(templateBased ? additionalOwners : [])} />
      {validationAlert && <p role="alert" aria-live="polite" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200 lg:col-span-2">{validationAlert}</p>}
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
            <input id="fecha" name="fecha" type="date" defaultValue={contract?.fecha ?? today} className="input" required />
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
            <input id="cliente" name="cliente" defaultValue={contract?.cliente} className="input" required pattern={templateBased ? textOnlyPattern : undefined} title={templateBased ? "Ingresa un nombre usando letras, espacios, apóstrofes, puntos o guiones." : undefined} />
          </div>
          <div>
            <label className="label" htmlFor="clienteDoc">{templateBased ? "Cédula de identidad" : "CI / NIT del cliente"}</label>
            <input id="clienteDoc" name="clienteDoc" defaultValue={contract?.clienteDoc} className="input" required={templateBased} pattern={templateBased ? identityNumberPattern : undefined} maxLength={16} aria-describedby={templateBased ? "clienteDocHelp" : undefined} title={templateBased ? "Ingresa de 4 a 12 dígitos; el complemento es opcional y lleva guion, 2 o 3 caracteres alfanuméricos con letras y números (ejemplo: 785462-1D)." : undefined} />
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
          <input id="propiedad" name="propiedad" defaultValue={contract?.propiedad} className="input" required />
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
                <span className="text-sm font-semibold">{selectedCurrency} · {CURRENCY_SYMBOLS[selectedCurrency as Currency]}</span>
                <span className="text-[10px] text-ink-mute dark:text-carbon-400">{CURRENCY_NAMES[selectedCurrency as Currency]}</span>
              </div>
              <input id="monto" name="monto" type="number" step="0.01" min="0" value={monto} onChange={(event) => setMonto(event.target.value)} className="input" required />
            </div>
          </div>
          {!templateBased && <div>
            <label className="label" htmlFor="comision">Comisión (%)</label>
            <input id="comision" name="comision" type="number" step="0.01" min="0" max="100" defaultValue={contract?.comision ?? 3} className="input" />
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
                <input id="cliente" name="cliente" defaultValue={contract?.cliente} className="input" required pattern={textOnlyPattern} maxLength={160} title="Ingresa un nombre usando letras, espacios, apóstrofes, puntos o guiones." />
              </div>
              <div>
                <label className="label" htmlFor="clienteDoc">Cédula de identidad</label>
                <input id="clienteDoc" name="clienteDoc" defaultValue={contract?.clienteDoc} className="input" required pattern={identityNumberPattern} maxLength={16} aria-describedby="clienteDocHelp" title="Ingresa de 4 a 12 dígitos; el complemento es opcional y lleva guion, 2 o 3 caracteres alfanuméricos con letras y números (ejemplo: 785462-1D)." />
                <p id="clienteDocHelp" className="mt-1 text-xs text-ink-mute dark:text-carbon-400">4–12 dígitos; complemento opcional de 2–3 caracteres con letras y números, separado por guion. Ejemplo: 785462-1D.</p>
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
              const choices = configuredOptions
                ? [...new Set([...configuredOptions, ...(defaultValue ? [defaultValue] : [])])]
                : [];
              const input = configuredOptions ? <CorporateSelect
                id={fieldId}
                name={fieldId}
                defaultValue={defaultValue ?? ""}
                options={choices.map((option) => ({ value: option, label: option }))}
                required={field.required}
              /> : <input
                id={fieldId}
                name={fieldId}
                type={inputType}
                inputMode={field.type === "number" ? "decimal" : undefined}
                min={field.type === "number" ? 0 : undefined}
                step={field.type === "number" ? field.step ?? "any" : undefined}
                pattern={validationPattern}
                title={field.validation === "name" ? "Ingresa solo texto, espacios, apóstrofes, puntos o guiones." : field.validation === "phone" ? "Usa un teléfono válido con dígitos y, opcionalmente, +, espacios, paréntesis o guiones." : field.validation === "identity" ? "Ingresa de 4 a 12 dígitos; el complemento opcional lleva guion y 2 o 3 caracteres alfanuméricos con letras y números (ejemplo: 785462-1D)." : undefined}
                maxLength={field.validation === "identity" ? 16 : undefined}
                aria-describedby={field.validation === "identity" ? `${fieldId}Help` : undefined}
                defaultValue={defaultValue}
                className="input min-w-0 flex-1"
                required={field.required}
              />;
              return (
                <div key={`${tipo}-${field.key}`} className={field.type === "textarea" || isAmountInWords ? "sm:col-span-2" : ""}>
                  <label className="label" htmlFor={fieldId}>{fieldLabel}{field.required ? "" : " (opcional)"}</label>
                  {field.type === "textarea" ? <textarea id={fieldId} name={fieldId} rows={3} defaultValue={defaultValue} className="input" required={field.required} /> : isAmountInWords ? <input id={fieldId} name={fieldId} value={amountWords} readOnly className="input bg-stone-50 uppercase dark:bg-carbon-950" aria-describedby="amountInWordsHelp" required={field.required} /> : unit ? <div className="flex min-w-0 items-stretch">{input}<span aria-hidden="true" className="inline-flex shrink-0 items-center rounded-r-xl border border-l-0 border-stone-300 bg-stone-50 px-3 text-sm font-semibold text-ink-soft dark:border-carbon-700 dark:bg-carbon-950 dark:text-carbon-200">{unit}</span></div> : input}
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
                      <input id={`additional-owner-${index}-name`} value={owner.fullName} onChange={(event) => updateOwner("fullName", event.target.value)} className="input" required pattern={textOnlyPattern} maxLength={160} title="Ingresa un nombre usando letras, espacios, apóstrofes, puntos o guiones." />
                    </div>
                    <div>
                      <label className="label" htmlFor={`additional-owner-${index}-identity`}>Cédula de identidad</label>
                      <input id={`additional-owner-${index}-identity`} value={owner.identityNumber} onChange={(event) => updateOwner("identityNumber", event.target.value)} className="input" required pattern={identityNumberPattern} maxLength={16} title="Ingresa de 4 a 12 dígitos; el complemento opcional lleva guion y 2 o 3 caracteres con letras y números (ejemplo: 785462-1D)." />
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
                      <input id={`additional-owner-${index}-address`} value={owner.address} onChange={(event) => updateOwner("address", event.target.value)} className="input" required maxLength={300} />
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
        <textarea id="notas" name="notas" rows={3} defaultValue={contract?.notas} className="input" />
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
