<script setup lang="ts">
import type { Activity, ActivityType } from '~/types'

definePageMeta({ layout: 'sidebar' })

const { activities, status, error, isAdminView, refresh } = useAudit()
const { role } = useSession()

const subtitle = computed(() =>
  isAdminView.value
    ? 'Journal d\'activité de toute l\'équipe'
    : 'Vos actions sur le système'
)

onMounted(() => refresh())

const typeConfig: Record<ActivityType, { icon: string; iconClass: string; bgClass: string }> = {
  of_started:    { icon: 'i-lucide-play-circle',    iconClass: 'text-blue-600',   bgClass: 'bg-blue-50 border-blue-100'   },
  of_completed:  { icon: 'i-lucide-check-circle',   iconClass: 'text-green-600',  bgClass: 'bg-green-50 border-green-100' },
  of_paused:     { icon: 'i-lucide-pause-circle',   iconClass: 'text-gray-500',   bgClass: 'bg-gray-50 border-gray-200'   },
  anomaly:       { icon: 'i-lucide-alert-triangle', iconClass: 'text-orange-500', bgClass: 'bg-orange-50 border-orange-100' },
  stock_low:     { icon: 'i-lucide-package-x',      iconClass: 'text-red-500',    bgClass: 'bg-red-50 border-red-100'     },
  stock_updated: { icon: 'i-lucide-package-check',  iconClass: 'text-[#0F62BC]',  bgClass: 'bg-blue-50 border-blue-100'   },
  stock_reserved: { icon: 'i-lucide-bookmark',      iconClass: 'text-indigo-600', bgClass: 'bg-indigo-50 border-indigo-100' },
  stock_released: { icon: 'i-lucide-bookmark-minus',iconClass: 'text-gray-500',  bgClass: 'bg-gray-50 border-gray-200'   },
  bom_validated: { icon: 'i-lucide-clipboard-check',iconClass: 'text-green-600',  bgClass: 'bg-green-50 border-green-100' },
  login:         { icon: 'i-lucide-log-in',         iconClass: 'text-gray-400',   bgClass: 'bg-gray-50 border-gray-200'   },
}

type FilterType = 'all' | 'production' | ActivityType
type DateSort = 'newest' | 'oldest'

const activeFilter = ref<FilterType>('all')
const search = ref('')
const dateSort = ref<DateSort>('newest')

const dateSortOptions = [
  { label: 'Plus récentes', value: 'newest' as const },
  { label: 'Plus anciennes', value: 'oldest' as const }
]

const productionTypes: ActivityType[] = ['of_started', 'of_completed', 'of_paused', 'anomaly', 'bom_validated']

const filterButtons = computed(() => {
  const base = [
    { key: 'all' as const, label: 'Tout', icon: 'i-lucide-layout-grid' },
    ...(role.value === 'operateur'
      ? [{ key: 'production' as const, label: 'Lots & OF', icon: 'i-lucide-factory' }]
      : []),
    { key: 'of_started' as const, label: 'Batchs', icon: 'i-lucide-play-circle' },
    { key: 'anomaly' as const, label: 'Anomalies', icon: 'i-lucide-alert-triangle' },
    { key: 'stock_low' as const, label: 'Alertes', icon: 'i-lucide-package-x' },
    { key: 'stock_updated' as const, label: 'Stock', icon: 'i-lucide-package-check' }
  ]
  return base
})

const filtered = computed(() =>
  activities.value.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.value.toLowerCase()) ||
      a.description.toLowerCase().includes(search.value.toLowerCase()) ||
      a.user.toLowerCase().includes(search.value.toLowerCase())
    const matchFilter = activeFilter.value === 'all'
      || (activeFilter.value === 'production' && productionTypes.includes(a.type))
      || a.type === activeFilter.value
    return matchSearch && matchFilter
  })
)

const sorted = computed(() => {
  const dir = dateSort.value === 'newest' ? -1 : 1
  return [...filtered.value].sort((a, b) => dir * (a.date.getTime() - b.date.getTime()))
})

// Grouper par date (ordre des groupes = ordre du tri)
interface DayGroup { label: string; items: Activity[] }

const grouped = computed<DayGroup[]>(() => {
  const map = new Map<string, Activity[]>()
  const groupOrder: string[] = []

  for (const a of sorted.value) {
    const key = a.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!map.has(key)) {
      map.set(key, [])
      groupOrder.push(key)
    }
    map.get(key)!.push(a)
  }

  return groupOrder.map(label => ({ label, items: map.get(label)! }))
})

function formatTime(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl">
      <div :class="PAGE_HEADER">
        <div>
          <h1 :class="PAGE_TITLE">Historique</h1>
          <p :class="PAGE_SUBTITLE">{{ subtitle }}</p>
        </div>
      </div>

      <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />
      <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="refresh">Réessayer</UButton>

      <div v-if="status === 'pending'" class="space-y-4 mb-6">
        <USkeleton v-for="i in 5" :key="i" class="h-20 w-full" />
      </div>

      <div v-else class="space-y-3 mb-4 sm:mb-6">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Rechercher dans l'historique…"
          class="w-full"
        />
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <USelectMenu
            v-model="dateSort"
            :items="dateSortOptions"
            value-key="value"
            icon="i-lucide-arrow-down-up"
            class="w-full sm:w-44 shrink-0"
            aria-label="Trier par date"
          />
          <div class="flex gap-1 flex-wrap">
            <UButton
              v-for="btn in filterButtons" :key="btn.key"
              :icon="btn.icon"
              :variant="activeFilter === btn.key ? 'solid' : 'outline'"
              :class="['justify-center', activeFilter === btn.key ? 'bg-[#0F62BC] text-white border-[#0F62BC]' : 'text-gray-500 border-gray-200 hover:border-[#0F62BC] hover:text-[#0F62BC]']"
              size="sm"
              @click="activeFilter = btn.key"
            >
              {{ btn.label }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Timeline groupée par date -->
      <div v-if="status !== 'pending' && grouped.length > 0" class="space-y-6">
        <div v-for="group in grouped" :key="group.label">

          <!-- Séparateur date avec USeparator -->
          <div class="flex items-center gap-3 mb-4">
            <USeparator class="flex-1" />
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap px-1">
              {{ capitalize(group.label) }}
            </span>
            <USeparator class="flex-1" />
          </div>

          <!-- Activités du jour -->
          <div class="space-y-2">
            <div
              v-for="activity in group.items"
              :key="activity.id"
              class="flex items-start gap-3"
            >
              <!-- Icône -->
              <div
                :class="['w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5', typeConfig[activity.type].bgClass]"
              >
                <UIcon :name="typeConfig[activity.type].icon" :class="['text-base', typeConfig[activity.type].iconClass]" />
              </div>

              <!-- Contenu -->
              <div class="flex-1 min-w-0">
                <UCard :ui="{ body: 'px-4 py-3' }" class="border-gray-100">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="text-sm font-semibold text-gray-800">{{ activity.title }}</p>
                        <!-- Tag meta (numéro OF ou référence pièce) -->
                        <span
                          v-if="activity.meta"
                          class="text-[11px] font-mono text-[#0F62BC] bg-[#0F62BC]/8 px-1.5 py-0.5 rounded"
                        >
                          {{ activity.meta }}
                        </span>
                      </div>
                      <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">{{ activity.description }}</p>
                      <div class="flex items-center gap-2 mt-2">
                        <UIcon name="i-lucide-user" class="text-gray-300 text-xs" />
                        <span class="text-xs text-gray-400">{{ activity.user }}</span>
                      </div>
                    </div>
                    <!-- Heure -->
                    <span class="text-xs text-gray-300 flex-shrink-0 mt-0.5">{{ formatTime(activity.date) }}</span>
                  </div>
                </UCard>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="status !== 'pending'" class="text-center py-20">
        <UIcon name="i-lucide-clock" class="text-gray-200 text-5xl mb-3" />
        <p class="text-sm text-gray-400">Aucune activité trouvée.</p>
      </div>

  </div>
</template>