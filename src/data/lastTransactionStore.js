const LAST_TRANSACTION_KEY_PREFIX = "dstoreLastTransaction:";

const buildStorageKey = (gameId) => `${LAST_TRANSACTION_KEY_PREFIX}${gameId}`;

export function getLastTransaction(gameId) {
  if (typeof window === "undefined" || !gameId) {
    return null;
  }

  const rawValue = localStorage.getItem(buildStorageKey(gameId));
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue;
  } catch (error) {
    return null;
  }
}

export function saveLastTransaction(gameId, payload) {
  if (typeof window === "undefined" || !gameId || !payload) {
    return;
  }

  const normalizedPayload = {
    customerId: payload.customerId || "",
    customerPhone: payload.customerPhone || "",
    paymentMethod: payload.paymentMethod || "",
    mlServer: payload.mlServer || "",
    server: payload.server || "",
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(buildStorageKey(gameId), JSON.stringify(normalizedPayload));
}
