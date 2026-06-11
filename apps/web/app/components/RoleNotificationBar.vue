<script setup lang="ts">
const { canViewNotifications } = useRoleCapabilities()
const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications()

const open = ref(false)

onMounted(() => {
  if (canViewNotifications.value) refresh()
})

const severityIcon: Record<string, string> = {
  error: 'i-lucide-alert-octagon',
  warning: 'i-lucide-alert-triangle',
  info: 'i-lucide-info'
}

</script>

<template>
  <div v-if="canViewNotifications && notifications.length > 0" class="mb-4">
    <UCard :ui="{ body: 'p-0' }" class="border-default/60">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        :aria-expanded="open"
        aria-controls="notification-panel"
        @click="open = !open"
      >
        <div class="flex items-center gap-2 min-w-0">
          <UIcon name="i-lucide-bell" class="size-4 text-[#0F62BC] shrink-0" />
          <span class="text-sm font-semibold text-gray-800 truncate">
            Alertes & retards
          </span>
          <UBadge v-if="unreadCount > 0" color="error" variant="solid" size="sm">
            {{ unreadCount }}
          </UBadge>
        </div>
        <UIcon :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-4 text-gray-400 shrink-0" />
      </button>

      <div v-if="open" id="notification-panel" class="border-t border-default/50 px-4 py-3 space-y-2">
        <div class="flex justify-between items-center gap-2">
          <NuxtLink to="/notifications" class="text-xs text-[#0F62BC] hover:underline">Voir tout</NuxtLink>
          <UButton v-if="unreadCount > 0" size="xs" variant="ghost" color="neutral" @click="markAllAsRead">
            Tout marquer comme lu
          </UButton>
        </div>
        <div
          v-for="n in notifications.slice(0, 6)"
          :key="n.id"
          class="flex gap-3 rounded-lg p-2.5 transition-colors"
          :class="n.read ? 'bg-gray-50/80 opacity-70' : 'bg-white border border-default/40'"
        >
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
            <p class="text-sm font-medium text-gray-800">{{ n.title }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ n.message }}</p>
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
      </div>
    </UCard>
  </div>
</template>
