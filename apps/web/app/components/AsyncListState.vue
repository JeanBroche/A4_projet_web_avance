<script setup lang="ts">
import type { AsyncStatus } from '~/types'

defineProps<{
  status: AsyncStatus
  error?: string | null
  skeletonCount?: number
  empty?: boolean
  emptyMessage?: string
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" role="alert" />
  <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="$emit('retry')">Réessayer</UButton>

  <div v-if="status === 'pending'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6" role="status" aria-live="polite" aria-label="Chargement en cours">
    <USkeleton v-for="i in skeletonCount ?? 4" :key="i" class="h-24 w-full" />
  </div>

  <div v-else-if="empty" class="text-center py-16 text-gray-400 text-sm">
    {{ emptyMessage ?? 'Aucun élément à afficher.' }}
  </div>

  <slot v-else />
</template>
