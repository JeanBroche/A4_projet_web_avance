import fs from "node:fs";
import path from "node:path";

const fns = [
  "requireAuth",
  "requireAnyRole",
  "requireCommercial",
  "requireRole",
  "requireAdmin",
  "requireProduction",
  "requireDirection",
  "requireLogistique",
  "requireStockRead",
  "requireOrderRead",
  "requireCommercialStats",
  "requireProductionRead"
];

const re = new RegExp(`(?<!await )(${fns.join("|")})\\(`, "g");

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!["node_modules", "generated"].includes(ent.name)) {
        walk(filePath);
      }
      continue;
    }
    if (!filePath.endsWith(".ts") || filePath.includes("rbacUtils.ts")) {
      continue;
    }
    const original = fs.readFileSync(filePath, "utf8");
    let next = original.replace(re, "await $1(");
    next = next.replace(/await await require/g, "await require");
    if (next !== original) {
      fs.writeFileSync(filePath, next);
      console.log("updated", filePath);
    }
  }
}

walk(path.resolve("services"));
