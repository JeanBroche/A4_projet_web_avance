<script setup lang="ts">
definePageMeta({ layout: 'default' })

type ActivityType =
  | 'of_started'
  | 'of_completed'
  | 'of_paused'
  | 'anomaly'
  | 'stock_low'
  | 'stock_updated'
  | 'bom_validated'
  | 'login'

interface Activity {
  id: number
  type: ActivityType
  title: string
  description: string
  user: string
  date: Date
  meta?: string
}

const typeConfig: Record<ActivityType, { icon: string; iconClass: string; bgClass: string }> = {
  of_started:    { icon: 'i-lucide-play-circle',    iconClass: 'text-blue-600',   bgClass: 'bg-blue-50 border-blue-100'   },
  of_completed:  { icon: 'i-lucide-check-circle',   iconClass: 'text-green-600',  bgClass: 'bg-green-50 border-green-100' },
  of_paused:     { icon: 'i-lucide-pause-circle',   iconClass: 'text-gray-500',   bgClass: 'bg-gray-50 border-gray-200'   },
  anomaly:       { icon: 'i-lucide-alert-triangle', iconClass: 'text-orange-500', bgClass: 'bg-orange-50 border-orange-100' },
  stock_low:     { icon: 'i-lucide-package-x',      iconClass: 'text-red-500',    bgClass: 'bg-red-50 border-red-100'     },
  stock_updated: { icon: 'i-lucide-package-check',  iconClass: 'text-[#0F62BC]',  bgClass: 'bg-blue-50 border-blue-100'   },
  bom_validated: { icon: 'i-lucide-clipboard-check',iconClass: 'text-green-600',  bgClass: 'bg-green-50 border-green-100' },
  login:         { icon: 'i-lucide-log-in',         iconClass: 'text-gray-400',   bgClass: 'bg-gray-50 border-gray-200'   },
}

const activities = ref<Activity[]>([
  // Aujourd'hui
  { id: 1,  type: 'anomaly',       title: 'Anomalie signalée',               description: 'Une anomalie a été signalée sur la BOM de l\'OF-2024-0142.',      user: 'Marie Dupont',   date: new Date('2024-12-10T14:32:00'), meta: 'OF-2024-0142'  },
  { id: 2,  type: 'of_started',    title: 'Batch démarré',                   description: 'Début de fabrication pour le bras articulé A320, 4 unités.',      user: 'Jean Martin',    date: new Date('2024-12-10T10:15:00'), meta: 'OF-2024-0142'  },
  { id: 3,  type: 'stock_updated', title: 'Stock mis à jour',                description: 'Réception de 200 vis M6×20 — stock mis à jour (450 pcs).',        user: 'Lucie Bernard',  date: new Date('2024-12-10T09:05:00'), meta: 'VIS-M6-020'    },
  { id: 4,  type: 'login',         title: 'Connexion',                       description: 'Connexion au système depuis le poste atelier 3.',                  user: 'Jean Martin',    date: new Date('2024-12-10T08:47:00'), meta: undefined       },
  // Hier
  { id: 5,  type: 'of_completed',  title: 'Ordre de fabrication terminé',    description: 'OF verrouillage train ATR clôturé avec succès — 6 unités.',       user: 'Marie Dupont',   date: new Date('2024-12-09T17:20:00'), meta: 'OF-2024-0139'  },
  { id: 6,  type: 'bom_validated', title: 'BOM validée',                     description: 'Nomenclature du support moteur B737 vérifiée et validée.',         user: 'Paul Renaud',    date: new Date('2024-12-09T15:00:00'), meta: 'OF-2024-0143'  },
  { id: 7,  type: 'stock_low',     title: 'Alerte stock faible',             description: 'Stock du joint torique NBR 20×2 tombé à 0 — rupture détectée.',   user: 'Système',        date: new Date('2024-12-09T12:44:00'), meta: 'JNT-NBR-202'   },
  { id: 8,  type: 'of_paused',     title: 'Batch mis en pause',              description: 'Fabrication du vérin hydraulique F/A-18 suspendue.',               user: 'Jean Martin',    date: new Date('2024-12-09T11:10:00'), meta: 'OF-2024-0140'  },
  { id: 9,  type: 'stock_updated', title: 'Stock mis à jour',                description: 'Sortie de 5 roulements 6205-ZZ pour l\'OF-2024-0139.',            user: 'Lucie Bernard',  date: new Date('2024-12-09T09:30:00'), meta: 'RLM-6205-ZZ'   },
  // 08 décembre
  { id: 10, type: 'of_started',    title: 'Batch démarré',                   description: 'Lancement de la fabrication du vérin hydraulique F/A-18.',        user: 'Jean Martin',    date: new Date('2024-12-08T13:55:00'), meta: 'OF-2024-0140'  },
  { id: 11, type: 'anomaly',       title: 'Anomalie signalée',               description: 'Défaut de dimensionnement détecté sur l\'axe acier Ø12.',          user: 'Paul Renaud',    date: new Date('2024-12-08T11:20:00'), meta: 'AXE-012-500'   },
  { id: 12, type: 'bom_validated', title: 'BOM validée',                     description: 'Nomenclature du bras articulé A320 soumise et validée.',           user: 'Marie Dupont',   date: new Date('2024-12-08T09:00:00'), meta: 'OF-2024-0142'  },
  // 06 décembre
  { id: 13, type: 'of_completed',  title: 'Ordre de fabrication terminé',    description: 'Soute cargo A400M finalisée — 2 unités livrées.',                 user: 'Lucie Bernard',  date: new Date('2024-12-06T16:45:00'), meta: 'OF-2024-0141'  },
  { id: 14, type: 'stock_low',     title: 'Alerte stock faible',             description: 'Axe acier Ø12 sous le seuil minimal (6 pcs / seuil : 10 pcs).',   user: 'Système',        date: new Date('2024-12-06T14:10:00'), meta: 'AXE-012-500'   },
  { id: 15, type: 'login',         title: 'Connexion',                       description: 'Connexion depuis le bureau technique.',                            user: 'Paul Renaud',    date: new Date('2024-12-06T08:30:00'), meta: undefined       },
])

// Filtres
type FilterType = 'all' | ActivityType
const activeFilter = ref<FilterType>('all')
const search = ref('')

const filterButtons = [
  { key: 'all',          label: 'Tout',      icon: 'i-lucide-layout-grid'    },
  { key: 'of_started',   label: 'Batchs',    icon: 'i-lucide-play-circle'    },
  { key: 'anomaly',      label: 'Anomalies', icon: 'i-lucide-alert-triangle' },
  { key: 'stock_low',    label: 'Alertes',   icon: 'i-lucide-package-x'      },
  { key: 'stock_updated',label: 'Stock',     icon: 'i-lucide-package-check'  },
] as const

const filtered = computed(() =>
  activities.value.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.value.toLowerCase()) ||
      a.description.toLowerCase().includes(search.value.toLowerCase()) ||
      a.user.toLowerCase().includes(search.value.toLowerCase())
    const matchFilter = activeFilter.value === 'all' || a.type === activeFilter.value
    return matchSearch && matchFilter
  })
)

// Grouper par date
interface DayGroup { label: string; items: Activity[] }

const grouped = computed<DayGroup[]>(() => {
  const map = new Map<string, Activity[]>()
  for (const a of filtered.value) {
    const key = a.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
})

function formatTime(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
    <div class="max-w-3xl mx-auto">

      <!-- Header -->
      <div class="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#0F62BC]">Historique</h1>
          <p class="text-xs sm:text-sm text-gray-400 mt-0.5">Journal d'activité de l'équipe</p>
        </div>
        <UButton icon="i-lucide-download" size="sm" variant="outline" color="neutral" class="flex-shrink-0 border-gray-200 text-gray-500 hover:border-[#0F62BC] hover:text-[#0F62BC]">
          <span class="hidden sm:inline">Exporter</span>
        </UButton>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Rechercher dans l'historique…" class="w-full sm:flex-1" />
        <div class="flex gap-1 flex-wrap sm:flex-nowrap">
          <UButton
            v-for="btn in filterButtons" :key="btn.key"
            :icon="btn.icon"
            :variant="activeFilter === btn.key ? 'solid' : 'outline'"
            :class="['flex-1 sm:flex-none justify-center', activeFilter === btn.key ? 'bg-[#0F62BC] text-white border-[#0F62BC]' : 'text-gray-500 border-gray-200 hover:border-[#0F62BC] hover:text-[#0F62BC]']"
            size="sm"
            @click="activeFilter = btn.key"
          >
            <span class="text-xs sm:hidden">{{ btn.label }}</span>
            <span class="hidden sm:inline">{{ btn.label }}</span>
          </UButton>
        </div>
      </div>

      <!-- Timeline groupée par date -->
      <div v-if="grouped.length > 0" class="space-y-6">
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
      <div v-else class="text-center py-20">
        <UIcon name="i-lucide-clock" class="text-gray-200 text-5xl mb-3" />
        <p class="text-sm text-gray-400">Aucune activité trouvée.</p>
      </div>

    </div>
  </div>
</template>