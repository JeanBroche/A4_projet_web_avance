<script setup lang="ts">
definePageMeta({ layout: 'sidebar' })

const { notifications, unreadCount, status, markAsRead, markAllAsRead, refresh } = useNotifications()
const { pageSubtitle } = useRoleCapabilities()

const filterSource = ref<'all' | 'stock' | 'shipment' | 'order' | 'production'>('all')

onMounted(() => refresh())

const filtered = computed(() => {
  if (filterSource.value === 'all') return notifications.value
  return notifications.value.filter(n => n.source === filterSource.value)
})

const sourceFilters = [
  { key: 'all', label: 'Toutes' },
  { key: 'stock', label: 'Stock' },
  { key: 'shipment', label: 'Expéditions' },
  { key: 'order', label: 'Commandes' },
  { key: 'production', label: 'Production' }
] as const

const severityIcon: Record<string, string> = {
  error: 'i-lucide-alert-octagon',
  warning: 'i-lucide-alert-triangle',
  info: 'i-lucide-info'
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">
    <PageHeader
      title="Centre de notifications"
      :subtitle="pageSubtitle || 'Alertes stocks, retards et incidents métier'"
    >
      <template #actions>
        <UButton
          v-if="unreadCount > 0"
          size="sm"
          variant="outline"
          color="neutral"
          @click="markAllAsRead"
        >
          Tout marquer comme lu ({{ unreadCount }})
        </UButton>
      </template>
    </PageHeader>

    <AsyncListState
      :status="status"
      :empty="status === 'success' && filtered.length === 0"
      empty-message="Aucune notification pour le moment."
      @retry="refresh"
    >
      <div class="flex flex-wrap gap-2 mb-4">
        <UButton
          v-for="f in sourceFilters"
          :key="f.key"
          size="xs"
          :variant="filterSource === f.key ? 'solid' : 'outline'"
          :color="filterSource === f.key ? 'primary' : 'neutral'"
          @click="filterSource = f.key"
        >
          {{ f.label }}
        </UButton>
      </div>

      <div class="space-y-2">
        <UCard
          v-for="n in filtered"
          :key="n.id"
          class="border-none shadow-sm"
          :class="n.read ? 'opacity-70' : ''"
        >
          <div class="flex gap-3 items-start">
            <UIcon
              :name="severityIcon[n.severity] ?? 'i-lucide-bell'"
              class="size-4 mt-0.5 shrink-0"
              :class="{
                'text-red-500': n.severity === 'error',
                'text-orange-500': n.severity === 'warning',
                'text-blue-500': n.severity === 'info'
              }"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-gray-800">{{ n.title }}</p>
                <UBadge size="xs" variant="subtle" color="neutral">{{ n.source }}</UBadge>
                <UBadge v-if="!n.read" size="xs" color="primary" variant="solid">Nouveau</UBadge>
              </div>
              <p class="text-sm text-gray-600 mt-0.5">{{ n.message }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ n.createdAt.toLocaleString('fr-FR') }}</p>
            </div>
            <UButton
              v-if="!n.read"
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-check"
              aria-label="Marquer comme lu"
              @click="markAsRead(n.id)"
            />
          </div>
        </UCard>
      </div>
    </AsyncListState>
  </div>
</template>
