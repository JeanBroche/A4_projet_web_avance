import { z } from 'zod'

export const aiOfMaterialSchema = z.object({
  reference: z.string(),
  name: z.string(),
  unit: z.string(),
  available: z.number()
})

export const aiOfBomLineSchema = z.object({
  reference: z.string().trim().min(1),
  name: z.string().trim().min(1),
  qtyNeeded: z.coerce.number().positive(),
  unit: z.string().min(1)
})

export const aiOfProposalSchema = z.object({
  name: z.string().trim().min(1),
  ofNumber: z.string().trim().min(1),
  qty: z.coerce.number().int().min(1),
  status: z.enum(['pending', 'in_progress', 'done']),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  emoji: z.string().min(1),
  bom: z.array(aiOfBomLineSchema),
  summary: z.string().trim().min(1)
})

export type AiOfMaterial = z.infer<typeof aiOfMaterialSchema>
export type AiOfProposal = z.infer<typeof aiOfProposalSchema>

export function filterBomByKnownMaterials(
  proposal: AiOfProposal,
  materials: AiOfMaterial[]
): AiOfProposal {
  const knownRefs = new Set(materials.map(m => m.reference))
  return {
    ...proposal,
    bom: proposal.bom.filter(line => knownRefs.has(line.reference))
  }
}

export function parseAiOfResponse(raw: string): AiOfProposal {
  const trimmed = raw.trim()
  const jsonStart = trimmed.indexOf('{')
  const jsonEnd = trimmed.lastIndexOf('}')
  const jsonText = jsonStart >= 0 && jsonEnd > jsonStart
    ? trimmed.slice(jsonStart, jsonEnd + 1)
    : trimmed
  return aiOfProposalSchema.parse(JSON.parse(jsonText))
}

export function buildOfAssistantSystemPrompt(materials: AiOfMaterial[]): string {
  const materialList = materials.length > 0
    ? materials.map(m => `- ${m.reference} : ${m.name} (${m.available} ${m.unit} dispo)`).join('\n')
    : '(aucun matériau en stock — proposer une BOM vide)'

  const year = new Date().getFullYear()

  return `Tu es l'assistant ERP AERONEXIS, spécialisé en nomenclatures aéronautiques et ordres de fabrication (OF).

Ta tâche : à partir de la demande utilisateur, produire UNIQUEMENT un objet JSON valide (pas de markdown, pas de texte autour) avec cette structure exacte :
{
  "name": "désignation du produit",
  "ofNumber": "OF-${year}-NNNN",
  "qty": nombre entier >= 1,
  "status": "pending" | "in_progress" | "done",
  "priority": "low" | "normal" | "high" | "critical",
  "emoji": un emoji parmi ✈️ 🔧 ⚙️ 🛩️ 🔩 📦 🚀 🛠️ 🔗 🪛,
  "bom": [
    { "reference": "REF-STOCK", "name": "désignation", "qtyNeeded": nombre, "unit": "pcs|m|kg|..." }
  ],
  "summary": "phrase courte en français expliquant la proposition"
}

Règles strictes :
- Les références BOM doivent EXCLUSIVEMENT provenir de la liste matériaux ci-dessous.
- ofNumber au format OF-${year}-NNNN (4 chiffres).
- status par défaut "pending" sauf indication contraire.
- priority déduite du contexte (urgent/critique → "critical" ou "high").
- Si la demande est ambiguë, propose une BOM minimale plausible et explique dans summary.
- qtyNeeded doit être cohérent avec la quantité d'OF (ex. 4 OF × 2 pièces = 8).

Exemples de nomenclatures :
- Bras articulé A320 : axes acier, roulements, vis, joints, graisse.
- Support moteur B737 : profilés alu, boulons, écrous frein.

Matériaux disponibles en stock :
${materialList}`
}
