import type { AiOfProposal } from '~/lib/validation/ai-of'
import type { BomItem, BomStatus, Priority, StockLevel } from '~/types'

export interface OfAssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

function toMaterialContext(levels: StockLevel[]) {
  return levels.map(l => ({
    reference: l.reference,
    name: l.name,
    unit: l.unit,
    available: l.available
  }))
}

export function useOfAssistant() {
  const messages = ref<OfAssistantMessage[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastProposal = ref<AiOfProposal | null>(null)

  async function sendMessage(text: string, materials: StockLevel[]) {
    const trimmed = text.trim()
    if (!trimmed || isLoading.value) return

    messages.value.push({ role: 'user', content: trimmed })
    isLoading.value = true
    error.value = null
    lastProposal.value = null

    try {
      const data = await $fetch<{ proposal: AiOfProposal }>('/api/ai/of', {
        method: 'POST',
        body: {
          prompt: trimmed,
          materials: toMaterialContext(materials)
        }
      })

      lastProposal.value = data.proposal
      messages.value.push({
        role: 'assistant',
        content: data.proposal.summary
      })
    } catch (e) {
      const message = e && typeof e === 'object' && 'data' in e
        && e.data && typeof e.data === 'object' && 'message' in e.data
        && typeof e.data.message === 'string'
        ? e.data.message
        : 'Erreur de connexion avec Mistral.'
      error.value = message
      messages.value.push({ role: 'assistant', content: message })
    } finally {
      isLoading.value = false
    }
  }

  function buildFormPatch(
    proposal: AiOfProposal,
    levelByReference: (ref: string) => StockLevel | undefined
  ): {
    of: {
      name: string
      ofNumber: string
      qty: number
      status: BomStatus
      priority: Priority
      emoji: string
    }
    bom: BomItem[]
  } {
    return {
      of: {
        name: proposal.name,
        ofNumber: proposal.ofNumber,
        qty: proposal.qty,
        status: proposal.status,
        priority: proposal.priority,
        emoji: proposal.emoji
      },
      bom: proposal.bom.map((line) => {
        const level = levelByReference(line.reference)
        return {
          reference: line.reference,
          name: line.name,
          qtyNeeded: line.qtyNeeded,
          qtyStock: level?.available ?? 0,
          unit: line.unit
        }
      })
    }
  }

  function reset() {
    messages.value = []
    isLoading.value = false
    error.value = null
    lastProposal.value = null
  }

  return {
    messages,
    isLoading,
    error,
    lastProposal,
    sendMessage,
    buildFormPatch,
    reset
  }
}
