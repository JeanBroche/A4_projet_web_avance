/**
 * Convention OF / lot — identifiants canoniques cross-services.
 * - `ofId` = `batch_code` (BATCH-*) quand un lot production existe, sinon `OF-{orderNumber}`
 * - `lotId` = même valeur que `ofId` (clé unique de traçabilité)
 * - `command_id` sur BatchProduct = numéro de commande client (orderNumber)
 */
export function resolveOfId(batchCode?: string | null, orderNumber?: string | null): string {
  if (batchCode) {
    return batchCode;
  }
  if (orderNumber) {
    return `OF-${orderNumber}`;
  }
  throw new Error("Cannot resolve OF id: batchCode or orderNumber required");
}

/** lotId canonique pour audit.lot.trace (= ofId). */
export function resolveLotId(batchCode?: string | null, orderNumber?: string | null): string {
  return resolveOfId(batchCode, orderNumber);
}

export function isBatchOfId(ofId: string): boolean {
  return ofId.startsWith("BATCH-");
}

export function orderNumberFromOfId(ofId: string | null | undefined): string | null {
  if (!ofId) return null;
  if (ofId.startsWith("OF-")) {
    return ofId.slice(3);
  }
  return null;
}

export type LotTraceIdentity = {
  lotId: string;
  ofId: string;
  orderNumber?: string;
};

/** Normalise une clé de recherche (BATCH-*, OF-*, ou legacy LOT-*). */
export function parseLotTraceKey(key: string): LotTraceIdentity {
  const normalized = key?.trim() ?? "";
  if (!normalized) {
    return { lotId: "", ofId: "" };
  }
  if (normalized.startsWith("BATCH-") || normalized.startsWith("OF-")) {
    const orderNumber = orderNumberFromOfId(normalized) ?? undefined;
    return { lotId: normalized, ofId: normalized, orderNumber };
  }
  return { lotId: normalized, ofId: normalized };
}

export function resolveLotIdentity(params: {
  batchCode?: string | null;
  orderNumber?: string | null;
}): LotTraceIdentity {
  const ofId = resolveOfId(params.batchCode, params.orderNumber);
  return {
    lotId: ofId,
    ofId,
    orderNumber: params.orderNumber ?? orderNumberFromOfId(ofId) ?? undefined
  };
}

/** Référence document stock pour matching traçabilité (`ofId` ou `ofId::ref`). */
export function formatStockDocumentRef(ofId: string, ref?: string) {
  return ref ? `${ofId}::${ref}` : ofId;
}

/** Extrait l'ofId depuis une référence document stock (`ofId` ou `ofId::ref`). */
export function ofIdFromStockDocumentRef(documentRef?: string | null): string | undefined {
  if (!documentRef) {
    return undefined;
  }
  const base = documentRef.split("::")[0]!;
  if (base.startsWith("BATCH-") || base.startsWith("OF-")) {
    return base;
  }
  return undefined;
}

export function matchesStockDocumentRef(
  documentRef: string | null | undefined,
  lotId: string,
  ofId: string,
  extraRefs: string[] = []
) {
  if (!documentRef) {
    return false;
  }
  if (documentRef === lotId || documentRef === ofId) {
    return true;
  }
  if (documentRef.startsWith(`${lotId}::`) || documentRef.startsWith(`${ofId}::`)) {
    return true;
  }
  return extraRefs.some((ref) => documentRef === ref || documentRef.endsWith(`::${ref}`));
}
