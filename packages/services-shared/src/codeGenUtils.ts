import crypto from "crypto";

export function generateCode(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function generateUniqueCode(prefix: string, testCodeCallback: (code: string) => boolean): string {
  let code: string;
  do {
    code = generateCode(prefix);
  } while (testCodeCallback(code));

  return code;
}