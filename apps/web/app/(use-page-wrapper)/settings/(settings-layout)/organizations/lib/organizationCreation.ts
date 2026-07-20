import slugify from "@calcom/lib/slugify";

export interface OrganizationCreationInput {
  name: string;
  requestedSlug: string;
}

export type OrganizationCreationValidation =
  | { ok: true; name: string; slug: string }
  | { ok: false; message: string };

export const deriveOrganizationSlug = ({ name, requestedSlug }: OrganizationCreationInput): string =>
  slugify(requestedSlug || name);

export const validateOrganizationCreationInput = (
  input: OrganizationCreationInput
): OrganizationCreationValidation => {
  const name = input.name.trim();
  const slug = deriveOrganizationSlug({ name, requestedSlug: input.requestedSlug });

  if (!name) {
    return { ok: false, message: "Organization name is required." };
  }

  if (!slug) {
    return { ok: false, message: "Enter a name that contains letters or numbers." };
  }

  return { ok: true, name, slug };
};

// OrganizationSettings.orgAutoAcceptEmail is non-nullable, so creation must supply a domain.
// We store the creator's email domain for reference only: auto-join stays off because
// isOrganizationVerified is false, so no one is pulled into the org by their email domain.
export const getOrgAutoAcceptEmailDomain = (email: string): string => {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain || "";
};
