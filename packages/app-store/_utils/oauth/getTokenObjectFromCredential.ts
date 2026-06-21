import { getCredentialKey } from "@calcom/features/credentials/services/CredentialDataService";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialPayload } from "@calcom/types/Credential";
import { OAuth2TokenResponseInDbSchema } from "./universalSchema";

export function getTokenObjectFromCredential(
  credential: Pick<CredentialPayload, "key" | "id" | "type" | "encryptedKey">
) {
  const key = getCredentialKey({
    type: credential.type,
    key: credential.key,
    encryptedKey: credential.encryptedKey,
  });
  const parsedTokenResponse = OAuth2TokenResponseInDbSchema.safeParse(key);
  if (!parsedTokenResponse.success) {
    logger.error(
      "GoogleCalendarService-getTokenObjectFromCredential",
      safeStringify(parsedTokenResponse.error.issues)
    );
    throw new Error(
      `Could not parse credential.key ${credential.id} with error: ${parsedTokenResponse?.error}`
    );
  }

  const tokenResponse = parsedTokenResponse.data;
  if (!tokenResponse) {
    throw new Error(`credential.key is not set for credential ${credential.id}`);
  }

  return tokenResponse;
}
