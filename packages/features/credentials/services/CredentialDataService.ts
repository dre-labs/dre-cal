import process from "node:process";
import { decryptSecret, encryptSecret } from "@calcom/lib/crypto/keyring";
import type { Prisma } from "@calcom/prisma/client";

const ENCRYPTED_CREDENTIAL_KEY_PLACEHOLDER = {
  encrypted: true,
};

type CredentialSecretEnvelope = Parameters<typeof decryptSecret>[0]["envelope"];

export type CredentialCreateData = {
  type: string;
  key: object;
  userId: number;
  appId: string;
  delegationCredentialId?: string | null;
  encryptedKey?: string | null;
};

export type CredentialKeyUpdateData = {
  key: object;
  encryptedKey: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEncryptedCredentialKeyPlaceholder(key: unknown): boolean {
  return isObject(key) && key.encrypted === true;
}

function parseCredentialKey(key: unknown): Prisma.JsonObject {
  if (isObject(key)) return key as Prisma.JsonObject;

  throw new Error("Credential key is not an object");
}

function isCredentialKeyringConfigured(): boolean {
  return Boolean(process.env.CALCOM_KEYRING_CREDENTIALS_CURRENT);
}

export function buildCredentialKeyUpdateData({
  type,
  key,
}: {
  type: string;
  key: object;
}): CredentialKeyUpdateData {
  const aad = {
    type,
  };

  try {
    const encryptedKey = encryptSecret({ ring: "CREDENTIALS", plaintext: JSON.stringify(key), aad });
    return {
      key: ENCRYPTED_CREDENTIAL_KEY_PLACEHOLDER,
      encryptedKey: JSON.stringify(encryptedKey),
    };
  } catch (error) {
    if (isCredentialKeyringConfigured()) {
      throw error;
    }

    // Encryption keyring is optional in local/test environments.
    return {
      key,
      encryptedKey: null,
    };
  }
}

export function getCredentialKey({
  type,
  key,
  encryptedKey,
}: {
  type: string;
  key: unknown;
  encryptedKey?: string | null;
}): Prisma.JsonObject {
  if (!encryptedKey) {
    if (isEncryptedCredentialKeyPlaceholder(key)) {
      throw new Error("Credential key is encrypted but encryptedKey is missing");
    }

    return parseCredentialKey(key);
  }

  try {
    const envelope = JSON.parse(encryptedKey) as CredentialSecretEnvelope;
    const decryptedKey = JSON.parse(
      decryptSecret({
        envelope,
        aad: {
          type,
        },
      })
    );

    return parseCredentialKey(decryptedKey);
  } catch (error) {
    if (isEncryptedCredentialKeyPlaceholder(key)) {
      throw error;
    }

    return parseCredentialKey(key);
  }
}

/**
 * Builds the data object for creating a credential, including the encrypted key.
 * This service handles the encryption logic so the repository stays focused on data access.
 *
 * @param data The credential data without encryptedKey
 * @returns The credential data with encryptedKey populated if encryption key is available
 */
export function buildCredentialCreateData(data: {
  type: string;
  key: object;
  userId: number;
  appId: string;
  delegationCredentialId?: string | null;
}): CredentialCreateData {
  const credentialKey = buildCredentialKeyUpdateData({
    type: data.type,
    key: data.key,
  });

  return {
    ...data,
    key: credentialKey.key,
    encryptedKey: credentialKey.encryptedKey,
  };
}
