<script setup lang="ts">
import type { AiOfProposal } from '~/lib/validation/ai-of'
import type { OfAssistantMessage } from '~/composables/useOfAssistant'
import type { StockLevel } from '~/types'

const props = defineProps<{
  messages: OfAssistantMessage[]
  isLoading: boolean
  error: string | null
  lastProposal: AiOfProposal | null
  materials: StockLevel[]
}>()

const emit = defineEmits<{
  send: [text: string]
  apply: [proposal: AiOfProposal]
}>()

const chatInput = ref('')
const messagesEnd = ref<HTMLElement | null>(null)

watch(
  () => [props.messages.length, props.isLoading] as const,
  async () => {
    await nextTick()
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }
)

function submit() {
  if (!chatInput.value.trim() || props.isLoading) return
  emit('send', chatInput.value)
  chatInput.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <div class="flex flex-col h-full min-h-[280px] lg:min-h-[420px] rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
      <UIcon name="i-lucide-sparkles" class="text-[#0F62BC] text-lg" />
      <div>
        <p class="text-sm font-semibold text-gray-800">
          Assistant IA
        </p>
        <p class="text-[11px] text-gray-400">
          Décrivez l'OF à créer
        </p>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error"
      class="m-3 mb-0 shrink-0"
    />

    <div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
      <div
        v-if="messages.length === 0 && !isLoading"
        class="text-xs text-gray-400 italic px-2 py-4 text-center"
      >
        Ex. : « 4 bras articulés A320, priorité haute, avec roulements et vis »
        <span v-if="materials.length === 0" class="block mt-2 text-amber-600 not-italic">
          Chargez d'abord le stock pour des propositions BOM précises.
        </span>
      </div>

      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        :class="[
          'max-w-[92%] rounded-xl px-3 py-2 text-sm',
          msg.role === 'user'
            ? 'ml-auto bg-[#0F62BC] text-white'
            : 'mr-auto bg-white border border-gray-100 text-gray-700'
        ]"
      >
        {{ msg.content }}
      </div>

      <div v-if="isLoading" class="mr-auto flex items-center gap-2 text-xs text-gray-400 px-2">
        <USkeleton class="h-4 w-4 rounded-full" />
        <span>L'assistant réfléchit…</span>
      </div>

      <div ref="messagesEnd" />
    </div>

    <div v-if="lastProposal" class="px-3 pb-2 shrink-0">
      <UButton
        icon="i-lucide-wand-sparkles"
        size="sm"
        block
        class="bg-[#0F62BC] hover:bg-[#0d56a8] text-white"
        @click="emit('apply', lastProposal)"
      >
        Appliquer la proposition
      </UButton>
    </div>

    <div class="p-3 pt-2 border-t border-gray-200 bg-white shrink-0">
      <div class="flex gap-2">
        <UTextarea
          v-model="chatInput"
          placeholder="Décrivez l'ordre de fabrication…"
          :rows="2"
          autoresize
          :maxrows="4"
          class="flex-1 text-sm"
          :disabled="isLoading"
          @keydown="onKeydown"
        />
        <UButton
          icon="i-lucide-send"
          class="self-end bg-[#0F62BC] hover:bg-[#0d56a8] text-white shrink-0"
          :loading="isLoading"
          :disabled="!chatInput.trim()"
          @click="submit"
        />
      </div>
    </div>
  </div>
</template>
