import { redis } from "./redis";
import { DEFAULT_IDENTITY_CITIES, DEFAULT_PROPERTY_TYPES, type ContractFormOptions } from "./contract-form-option-defaults";

const propertyTypesKey = "contract-form-options:property-types";
const identityCitiesKey = "contract-form-options:identity-cities";

async function readList(key: string, fallback: readonly string[]) {
  const stored = await redis.get<unknown>(key);
  if (!Array.isArray(stored)) return [...fallback];
  const valid = stored.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return valid.length ? valid : [...fallback];
}

export async function getContractFormOptions(): Promise<ContractFormOptions> {
  const [propertyTypes, identityCities] = await Promise.all([
    readList(propertyTypesKey, DEFAULT_PROPERTY_TYPES),
    readList(identityCitiesKey, DEFAULT_IDENTITY_CITIES),
  ]);
  return { propertyTypes, identityCities };
}

export async function setContractFormOptions(options: ContractFormOptions) {
  if (!options.propertyTypes.length || !options.identityCities.length) {
    throw new Error("Debe quedar al menos una opción en cada lista.");
  }
  await Promise.all([
    redis.set(propertyTypesKey, options.propertyTypes),
    redis.set(identityCitiesKey, options.identityCities),
  ]);
}
