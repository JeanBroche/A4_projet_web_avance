<script setup lang="ts">
import { DASHBOARD_SITE_OPTIONS, type DashboardSiteScope } from '~/lib/sites'

definePageMeta({ layout: 'sidebar' })

const { dashboard, status, error, selectedSiteScope, refresh, setSiteScope } = useReporting()
const { pageSubtitle } = useRoleCapabilities()

const siteOptions = [...DASHBOARD_SITE_OPTIONS]

onMounted(() => refresh())

async function onSiteScopeChange(scope: DashboardSiteScope) {
  await setSiteScope(scope)
}

const marginOrders = computed(() => dashboard.value?.marginOrders ?? [])
const criticalIncidents = computed(() => dashboard.value?.criticalIncidents ?? [])
const kpis = computed(() => dashboard.value ?? {
  globalMargin: '0',
  delayedOrders: 0,
  bomAnomalies: 0,
  totalValue: '0 €',
  yieldRate: 0,
  marginOrders: [],
  criticalIncidents: []
})

// Détermination de la couleur de la jauge de marge
function getMarginColor(percent: number) {
  if (percent < 15) return 'error'   // Marge critique (Rouge)
  if (percent < 30) return 'warning' // Marge moyenne (Orange)
  return 'success'                   // Marge excellente (Vert/Bleu Nuxt UI)
}

function openIncident(inc: import('~/types').CriticalIncident) {
  if (!inc.targetRoute) return
  navigateTo({ path: inc.targetRoute, query: inc.targetQuery })
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
      <div class="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 :class="PAGE_TITLE">Performance & Alertes</h1>
          <p :class="PAGE_SUBTITLE">{{ pageSubtitle || 'KPI production, stocks, marges et incidents critiques' }}</p>
          <p v-if="kpis.siteLabel" class="text-xs text-[#0F62BC] font-medium mt-1 flex items-center gap-1">
            <UIcon name="i-lucide-building-2" class="size-3.5" />
            {{ kpis.siteLabel }}
          </p>
        </div>
        <div class="w-full sm:w-auto min-w-[12rem]">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Périmètre KPI
          </label>
          <USelectMenu
            :model-value="selectedSiteScope"
            :items="siteOptions"
            value-key="value"
            icon="i-lucide-building-2"
            class="w-full"
            aria-label="Sélectionner le site pour les indicateurs"
            @update:model-value="onSiteScopeChange"
          />
        </div>
      </div>

      <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />
      <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="refresh">Réessayer</UButton>

      <div v-if="status === 'pending'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <USkeleton v-for="i in 4" :key="i" class="h-24 w-full" />
      </div>

      <!-- Tuiles KPI (Dashboard Grid) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        <!-- Jauge Marge Globale -->
        <UCard class="border-none shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Marge Moyenne</span>
            <UIcon name="i-lucide-trending-up" class="text-[#0F62BC] text-lg" />
          </div>
          <p class="text-2xl font-bold text-[#0F62BC]">{{ kpis.globalMargin }}%</p>
          <p class="text-xs text-gray-400 mt-1">Objectif cible : 30%</p>
        </UCard>

        <!-- Valeur du carnet -->
        <UCard class="border-none shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chiffre d'Affaires</span>
            <UIcon name="i-lucide-dollar-sign" class="text-gray-400 text-lg" />
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ kpis.totalValue }}</p>
          <p class="text-xs text-green-500 mt-1 flex items-center gap-1">
            <UIcon name="i-lucide-arrow-up-right" /> En cours de production
          </p>
        </UCard>

        <!-- Commandes en retard (Alerte) -->
        <UCard class="border-none shadow-sm" :ui="{ body: 'relative overflow-hidden' }">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Retards Livraison</span>
            <UIcon name="i-lucide-clock" class="text-red-500 text-lg" />
          </div>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-bold text-red-600">{{ kpis.delayedOrders }}</p>
            <span class="text-xs font-medium text-red-400">OFs impactés</span>
          </div>
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
        </UCard>

        <!-- Anomalies BOM (Alerte) -->
        <UCard class="border-none shadow-sm" :ui="{ body: 'relative overflow-hidden' }">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Anomalies BOM</span>
            <UIcon name="i-lucide-alert-triangle" class="text-[#F57C00] text-lg" />
          </div>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-bold text-[#F57C00]">{{ kpis.bomAnomalies }}</p>
            <span class="text-xs font-medium text-orange-400">Ruptures de stock</span>
          </div>
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-[#F57C00]" />
        </UCard>

      </div>

      <!-- Taux de rendement -->
      <div v-if="status !== 'pending'" class="mb-6">
        <UCard class="border-none shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Taux de rendement production</p>
              <p class="text-2xl font-bold text-[#0F62BC]">{{ kpis.yieldRate }}%</p>
              <p class="text-xs text-gray-400 mt-1">Lots terminés / lots totaux</p>
            </div>
            <UProgress :model-value="kpis.yieldRate" :max="100" color="primary" class="w-full sm:w-64" />
          </div>
        </UCard>
      </div>

      <!-- Incidents critiques -->
      <div v-if="status !== 'pending' && criticalIncidents.length > 0" class="mb-6">
        <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
          <UIcon name="i-lucide-shield-alert" class="text-red-500" />
          Incidents critiques & rapport consolidé
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UCard
            v-for="inc in criticalIncidents"
            :key="inc.id"
            class="border-none shadow-sm transition-shadow"
            :class="inc.targetRoute ? 'cursor-pointer hover:shadow-md' : ''"
            :ui="{ body: 'py-3 px-4' }"
            @click="openIncident(inc)"
          >
            <div class="flex items-start gap-3">
              <UIcon
                :name="inc.severity === 'error' ? 'i-lucide-alert-octagon' : 'i-lucide-alert-triangle'"
                :class="inc.severity === 'error' ? 'text-red-500' : 'text-orange-500'"
                class="size-4 mt-0.5 shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800">{{ inc.label }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ inc.detail }}</p>
                <p v-if="inc.targetRoute" class="text-xs text-[#0F62BC] mt-1 flex items-center gap-1">
                  <UIcon name="i-lucide-arrow-right" class="size-3" />
                  Voir le détail
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Analyse des marges par OF -->
      <div v-if="status !== 'pending'" class="space-y-4">
          <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <UIcon name="i-lucide-layers" class="text-[#0F62BC]" />
            Détail des marges par Ordre de Fabrication
          </h2>

          <UCard v-for="order in marginOrders" :key="order.id" class="border-none shadow-sm hover:shadow-md transition-all">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <!-- Infos produit & Client -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs text-gray-400">{{ order.ofNumber }}</span>
                  <UBadge size="xs" variant="subtle" color="neutral">{{ order.client }}</UBadge>
                </div>
                <h3 class="text-sm font-bold text-gray-800 mt-1 truncate">{{ order.product }}</h3>
              </div>

              <!-- Graphique / Barre de progression de la marge intégrée -->
              <div class="w-full sm:w-48">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-400">Marge</span>
                  <span :class="[
                    order.marginPercent < 15 ? 'text-red-500 font-bold' : 
                    order.marginPercent < 30 ? 'text-orange-500 font-bold' : 'text-green-600 font-bold'
                  ]">{{ order.marginPercent }}%</span>
                </div>
                <!-- Composant Nuxt UI UProgress pour simuler un mini-graph linéaire -->
                <UProgress :model-value="order.marginPercent" :max="100" :color="getMarginColor(order.marginPercent)" size="sm" />
              </div>

              <!-- Prix de vente final -->
              <div class="text-left sm:text-right flex-shrink-0">
                <p class="text-sm font-bold text-gray-800">{{ order.sellingPrice.toLocaleString('fr-FR') }} €</p>
                <p class="text-[11px] text-gray-400">Coût de revient : {{ order.costPrice.toLocaleString('fr-FR') }} €</p>
              </div>
            </div>
          </UCard>
      </div>

  </div>
</template>