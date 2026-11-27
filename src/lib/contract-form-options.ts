import { redis } from "./redis";
import { DEFAULT_COUNTRY_CALLING_CODES, DEFAULT_IDENTITY_CITIES, DEFAULT_PROPERTY_TYPES, DEFAULT_VALIDITY_UNITS, type ContractFormOptions } from "./contract-form-option-defaults";
import { isContractValidityUnit } from "./contract-validity";

const propertyTypesKey = "contract-form-options:property-types";
const identityCitiesKey = "contract-form-options:identity-cities";
const countryCallingCodesKey = "contract-form-options:country-calling-codes";
const validityUnitsKey = "contract-form-options:validity-units";

async function readList(key: string, fallback: readonly string[]) {
  const stored = await redis.get<unknown>(key);
  if (!Array.isArray(stored)) return [...fallback];
  const valid = stored.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return valid.length ? valid : [...fallback];
}

export async function getContractFormOptions(): Promise<ContractFormOptions> {
  const [propertyTypes, identityCities, countryCallingCodes, validityUnits] = await Promise.all([
    readList(propertyTypesKey, DEFAULT_PROPERTY_TYPES),
    readList(identityCitiesKey, DEFAULT_IDENTITY_CITIES),
    redis.get<unknown>(countryCallingCodesKey),
    redis.get<unknown>(validityUnitsKey),
  ]);
  const validCountryCallingCodes = Array.isArray(countryCallingCodes)
    ? countryCallingCodes.filter((item): item is ContractFormOptions["countryCallingCodes"][number] =>
      Boolean(item) && typeof item === "object" &&
      typeof item.code === "string" && /^[A-Z]{2,3}$/.test(item.code) &&
      typeof item.dial === "string" && /^\+[1-9][0-9]{0,3}$/.test(item.dial) &&
      typeof item.name === "string" && item.name.trim().length > 0)
    : [];
  const validValidityUnits = Array.isArray(validityUnits) ? [...new Set(validityUnits.filter(isContractValidityUnit))] : [];
  return {
    propertyTypes,
    identityCities,
    countryCallingCodes: validCountryCallingCodes.length ? validCountryCallingCodes : DEFAULT_COUNTRY_CALLING_CODES,
    validityUnits: validValidityUnits.length ? validValidityUnits : [...DEFAULT_VALIDITY_UNITS],
  };
}

export async function setContractFormOptions(options: ContractFormOptions) {
  if (!options.propertyTypes.length || !options.identityCities.length || !options.countryCallingCodes.length || !options.validityUnits.length) {
    throw new Error("Debe quedar al menos una opción en cada lista.");
  }
  if (options.validityUnits.some((unit) => !isContractValidityUnit(unit))) throw new Error("Selecciona unidades de vigencia válidas.");
  await Promise.all([
    redis.set(propertyTypesKey, options.propertyTypes),
    redis.set(identityCitiesKey, options.identityCities),
    redis.set(countryCallingCodesKey, options.countryCallingCodes),
    redis.set(validityUnitsKey, [...new Set(options.validityUnits)]),
  ]);
}
