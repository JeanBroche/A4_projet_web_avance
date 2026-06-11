export type MaterialLowPayload = {
  alertId: string;
  materialId: string;
  materialCode: string;
  siteCode: string;
  severity: string;
  available: number;
  minimum: number;
  message: string;
};

let emitMaterialLow: ((payload: MaterialLowPayload) => void) | null = null;

export function registerMaterialLowEmitter(fn: (payload: MaterialLowPayload) => void) {
  emitMaterialLow = fn;
}

export function emitMaterialLowIfNeeded(payload: MaterialLowPayload) {
  emitMaterialLow?.(payload);
}

export function resetMaterialLowEmitter() {
  emitMaterialLow = null;
}
