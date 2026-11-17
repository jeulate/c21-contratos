export const DEFAULT_PROPERTY_TYPES = ["Casa", "Departamento"] as const;
export const DEFAULT_IDENTITY_CITIES = [
  "Santa Cruz de la Sierra",
  "La Paz",
  "Cochabamba",
  "Sucre",
  "Tarija",
  "Oruro",
  "Potosí",
  "Trinidad",
  "Cobija",
  "El Alto",
] as const;

export type ContractFormOptions = {
  propertyTypes: string[];
  identityCities: string[];
};
