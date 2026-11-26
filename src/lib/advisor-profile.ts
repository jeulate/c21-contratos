import type { AdvisorProfile } from "./users";

export function isAdvisorProfileComplete(profile?: AdvisorProfile) {
  return Boolean(profile && [
    profile.fullName,
    profile.identityNumber,
    profile.identityIssuedIn,
    profile.address,
    profile.mobile,
    profile.whatsapp,
    profile.email,
    profile.photoId,
    profile.photoMimeType,
  ].every((value) => typeof value === "string" && value.trim().length > 0));
}
