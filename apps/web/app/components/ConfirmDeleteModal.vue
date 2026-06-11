<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  title?: string
  message?: string
  loading?: boolean
}>()

defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal v-model:open="open" :ui="modalUi('sm')">
    <template #content>
      <div :class="MODAL_BODY" role="dialog" aria-labelledby="confirm-delete-title">
        <h2 id="confirm-delete-title" class="text-lg font-semibold text-gray-800 mb-2">
          {{ title ?? 'Confirmer la suppression' }}
        </h2>
        <p class="text-sm text-gray-500 mb-6">{{ message ?? 'Cette action est irréversible.' }}</p>
        <div :class="MODAL_FOOTER">
          <UButton variant="ghost" color="neutral" @click="open = false">Annuler</UButton>
          <UButton color="error" :loading="loading" @click="$emit('confirm')">Supprimer</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
