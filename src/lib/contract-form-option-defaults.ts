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

export type CountryCallingCode = { code: string; dial: string; name: string };

export const DEFAULT_COUNTRY_CALLING_CODES: CountryCallingCode[] = [
  { code: "BO", dial: "+591", name: "Bolivia" },
  { code: "AR", dial: "+54", name: "Argentina" },
  { code: "BR", dial: "+55", name: "Brasil" },
  { code: "CL", dial: "+56", name: "Chile" },
  { code: "CO", dial: "+57", name: "Colombia" },
  { code: "ES", dial: "+34", name: "España" },
  { code: "PE", dial: "+51", name: "Perú" },
  { code: "US", dial: "+1", name: "Estados Unidos" },
];

export type ContractFormOptions = {
  propertyTypes: string[];
  identityCities: string[];
  countryCallingCodes: CountryCallingCode[];
};
