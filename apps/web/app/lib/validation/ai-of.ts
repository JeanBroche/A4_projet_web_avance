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

  return `Tu es l'assistant ERP AERONEXIS pour les opérateurs de production aéronautique.

Ta tâche : à partir de la demande utilisateur, produire UNIQUEMENT un objet JSON valide (pas de markdown, pas de texte autour) avec cette structure exacte :
{
  "name": "désignation du produit",
  "ofNumber": "OF-${year}-NNNN",
  "qty": nombre entier >= 1,
  "status": "pending" | "in_progress" | "done",
  "priority": "low" | "normal" | "high" | "critical",
  "emoji": un emoji parmi ✈️ 🔧 ⚙️ 🛩️ 🔩 📦 🚀 🛠️ 🔗 🔨,
  "bom": [
    { "reference": "REF-STOCK", "name": "désignation", "qtyNeeded": nombre entier, "unit": "pcs|kg|..." }
  ],
  "summary": "phrase courte en français pour l'opérateur"
}

Règles strictes :
- Les références BOM doivent EXCLUSIVEMENT provenir de la liste matériaux ci-dessous (ex. MAT-001).
- ofNumber unique au format OF-${year}-NNNN (4 chiffres, ex. OF-${year}-0042).
- status par défaut "pending" ; priority "normal" sauf urgence explicite.
- qtyNeeded = besoin TOTAL pour toute la commande (quantités entières uniquement).
- Au moins une ligne BOM si des matériaux sont listés ci-dessous.
- Utilise les unités indiquées dans la liste stock (kg, pcs…).

Exemples :
- « 10 bras A320 » → qty 10, bom acier + joints avec qtyNeeded totaux réalistes.
- « 2 vérins urgents » → priority "high", matériaux hydrauliques du stock.

Matériaux disponibles en stock :
${materialList}`
}
