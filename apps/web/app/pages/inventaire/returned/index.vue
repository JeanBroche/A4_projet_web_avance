<script setup lang="ts">
definePageMeta({ layout: 'sidebar' })

const { levels, status, error, isMutating, refresh, registerReturn } = useStock()
const { canManageStock, pageSubtitle } = useRoleCapabilities()

const formError = ref<string | null>(null)
const form = ref({
  materialReference: '',
  quantity: 1,
  reason: ''
})

onMounted(() => refresh())

const materialOptions = computed(() =>
  levels.value.map(p => ({ label: `${p.reference} — ${p.name}`, value: p.reference }))
)

async function submitReturn() {
  formError.value = null
  if (!form.value.materialReference || form.value.quantity < 1) {
    formError.value = 'Référence et quantité valides requises'
    return
  }
  try {
    await registerReturn(
      form.value.materialReference,
      form.value.quantity,
      form.value.reason.trim() || undefined
    )
    form.value = { materialReference: '', quantity: 1, reason: '' }
  } catch {
    // error surfaced by useStock
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl">
    <div :class="PAGE_HEADER">
      <div>
        <h1 :class="PAGE_TITLE">Articles retournés</h1>
        <p :class="PAGE_SUBTITLE">
          {{ pageSubtitle || 'Réintégration au stock via mouvement IN (gateway stock.movement.create)' }}
        </p>
      </div>
    </div>

    <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />

    <UCard class="border-none shadow-sm">
      <div v-if="status === 'pending'" class="space-y-3">
        <USkeleton v-for="i in 3" :key="i" class="h-10 w-full" />
      </div>
      <form v-else class="space-y-4" @submit.prevent="submitReturn">
        <UFormField label="Référence matière">
          <USelectMenu
            v-model="form.materialReference"
            :items="materialOptions"
            value-key="value"
            placeholder="Sélectionner une pièce"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Quantité retournée">
          <UInput v-model.number="form.quantity" type="number" min="1" />
        </UFormField>
        <UFormField label="Motif (optionnel)">
          <UInput v-model="form.reason" placeholder="Contrôle qualité, retour client…" />
        </UFormField>
        <p v-if="formError" class="text-sm text-red-600" role="alert">{{ formError }}</p>
        <UButton
          type="submit"
          color="primary"
          :loading="isMutating"
          :disabled="!canManageStock"
        >
          Enregistrer le retour
        </UButton>
      </form>
    </UCard>
  </div>
</template>
