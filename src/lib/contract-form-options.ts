import { redis } from "./redis";
import { DEFAULT_COUNTRY_CALLING_CODES, DEFAULT_IDENTITY_CITIES, DEFAULT_PROPERTY_TYPES, type ContractFormOptions } from "./contract-form-option-defaults";

const propertyTypesKey = "contract-form-options:property-types";
const identityCitiesKey = "contract-form-options:identity-cities";
const countryCallingCodesKey = "contract-form-options:country-calling-codes";

async function readList(key: string, fallback: readonly string[]) {
  const stored = await redis.get<unknown>(key);
  if (!Array.isArray(stored)) return [...fallback];
  const valid = stored.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return valid.length ? valid : [...fallback];
}

export async function getContractFormOptions(): Promise<ContractFormOptions> {
  const [propertyTypes, identityCities, countryCallingCodes] = await Promise.all([
    readList(propertyTypesKey, DEFAULT_PROPERTY_TYPES),
    readList(identityCitiesKey, DEFAULT_IDENTITY_CITIES),
    redis.get<unknown>(countryCallingCodesKey),
  ]);
  const validCountryCallingCodes = Array.isArray(countryCallingCodes)
    ? countryCallingCodes.filter((item): item is ContractFormOptions["countryCallingCodes"][number] =>
      Boolean(item) && typeof item === "object" &&
      typeof item.code === "string" && /^[A-Z]{2,3}$/.test(item.code) &&
      typeof item.dial === "string" && /^\+[1-9][0-9]{0,3}$/.test(item.dial) &&
      typeof item.name === "string" && item.name.trim().length > 0)
    : [];
  return { propertyTypes, identityCities, countryCallingCodes: validCountryCallingCodes.length ? validCountryCallingCodes : DEFAULT_COUNTRY_CALLING_CODES };
}

export async function setContractFormOptions(options: ContractFormOptions) {
  if (!options.propertyTypes.length || !options.identityCities.length || !options.countryCallingCodes.length) {
    throw new Error("Debe quedar al menos una opción en cada lista.");
  }
  await Promise.all([
    redis.set(propertyTypesKey, options.propertyTypes),
    redis.set(identityCitiesKey, options.identityCities),
    redis.set(countryCallingCodesKey, options.countryCallingCodes),
  ]);
}
