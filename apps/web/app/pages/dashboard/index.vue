<script setup lang="ts">
import { DASHBOARD_SITE_OPTIONS, type DashboardSiteScope } from '~/lib/sites'
import type { CriticalIncident, CriticalIncidentCategory } from '~/types'

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
const atRiskMaterials = computed(() => dashboard.value?.atRiskMaterials ?? [])
const kpis = computed(() => dashboard.value ?? {
  globalMargin: '0',
  totalValue: '0 €',
  estimatedDelayCost: '0 €',
  yieldRate: 0,
  averageProgress: 0,
  activeBatches: 0,
  lateBatches: 0,
  stockRuptures: 0,
  atRiskMaterials: [],
  averageConsumptionPerDay: 0,
  urgentOrders: 0,
  delayRiskOrders: 0,
  marginOrders: [],
  criticalIncidents: []
})

function getMarginColor(percent: number) {
  if (percent < 15) return 'error'
  if (percent < 30) return 'warning'
  return 'success'
}

function openIncident(inc: CriticalIncident) {
  if (!inc.targetRoute) return
  navigateTo({ path: inc.targetRoute, query: inc.targetQuery })
}

function incidentIcon(category: CriticalIncidentCategory) {
  switch (category) {
    case 'stock': return 'i-lucide-package-x'
    case 'production': return 'i-lucide-factory'
    case 'audit': return 'i-lucide-file-search'
    default: return 'i-lucide-alert-triangle'
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
    <div class="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 :class="PAGE_TITLE">Tableau de bord Direction</h1>
        <p :class="PAGE_SUBTITLE">
          {{ pageSubtitle || 'Pilotage consolidé — production, stocks, performance et traçabilité' }}
        </p>
        <p v-if="kpis.siteLabel" class="text-xs text-[#0F62BC] font-medium mt-1 flex items-center gap-1">
          <UIcon name="i-lucide-building-2" class="size-3.5" />
          {{ kpis.siteLabel }}
        </p>
      </div>
      <div class="w-full sm:w-auto min-w-[12rem]">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
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
      <USkeleton v-for="i in 8" :key="i" class="h-24 w-full" />
    </div>

    <template v-else>
      <!-- Production + Stocks -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section>
          <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
            <UIcon name="i-lucide-factory" class="text-[#0F62BC]" />
            Production
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <UCard class="border-none shadow-sm">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taux de rendement</span>
              <p class="text-2xl font-bold text-[#0F62BC] mt-1">{{ kpis.yieldRate }}%</p>
              <p class="text-xs text-gray-500 mt-1">Lots terminés / total</p>
            </UCard>
            <UCard class="border-none shadow-sm">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avancement moyen</span>
              <p class="text-2xl font-bold text-gray-800 mt-1">{{ kpis.averageProgress }}%</p>
              <UProgress :model-value="kpis.averageProgress" :max="100" color="primary" size="sm" class="mt-2" />
              <p class="text-xs text-gray-500 mt-1">{{ kpis.activeBatches }} lot(s) actif(s)</p>
            </UCard>
            <UCard class="border-none shadow-sm" :ui="{ body: 'relative overflow-hidden' }">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lots en retard</span>
              <p class="text-2xl font-bold text-red-600 mt-1">{{ kpis.lateBatches }}</p>
              <p class="text-xs text-red-400 mt-1">Dépassement planning</p>
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
            </UCard>
          </div>
        </section>

        <section>
          <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
            <UIcon name="i-lucide-warehouse" class="text-[#0F62BC]" />
            Stocks & logistique
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <UCard class="border-none shadow-sm" :ui="{ body: 'relative overflow-hidden' }">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ruptures stock</span>
              <p class="text-2xl font-bold text-[#F57C00] mt-1">{{ kpis.stockRuptures }}</p>
              <p class="text-xs text-orange-400 mt-1">Matières indisponibles</p>
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-[#F57C00]" />
            </UCard>
            <UCard class="border-none shadow-sm">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Consommation moy.</span>
              <p class="text-2xl font-bold text-gray-800 mt-1">{{ kpis.averageConsumptionPerDay }}</p>
              <p class="text-xs text-gray-500 mt-1">Unités / jour (fenêtre 30 j)</p>
            </UCard>
          </div>
          <UCard v-if="atRiskMaterials.length > 0" class="border-none shadow-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Matières à risque</p>
            <ul class="space-y-1.5">
              <li
                v-for="mat in atRiskMaterials.slice(0, 5)"
                :key="mat.code"
                class="flex items-center justify-between text-sm"
              >
                <NuxtLink
                  to="/inventaire/spare"
                  class="font-mono text-[#0F62BC] hover:underline truncate"
                >
                  {{ mat.code }}
                </NuxtLink>
                <UBadge size="xs" :color="mat.score >= 85 ? 'error' : 'warning'" variant="subtle">
                  Score {{ mat.score }}
                </UBadge>
              </li>
            </ul>
          </UCard>
        </section>
      </div>

      <!-- Commercial + Finance -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section>
          <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
            <UIcon name="i-lucide-handshake" class="text-[#0F62BC]" />
            Commercial
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UCard class="border-none shadow-sm">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commandes urgentes</span>
              <p class="text-2xl font-bold text-[#F57C00] mt-1">{{ kpis.urgentOrders }}</p>
              <p class="text-xs text-gray-500 mt-1">Priorité haute en cours</p>
            </UCard>
            <UCard class="border-none shadow-sm">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Risque de retard</span>
              <p class="text-2xl font-bold text-red-600 mt-1">{{ kpis.delayRiskOrders }}</p>
              <p class="text-xs text-gray-500 mt-1">Score risque ≥ seuil</p>
            </UCard>
          </div>
        </section>

        <section>
          <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
            <UIcon name="i-lucide-trending-up" class="text-[#0F62BC]" />
            Finance & performance
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <UCard class="border-none shadow-sm">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Marge moyenne</span>
              <p class="text-2xl font-bold text-[#0F62BC] mt-1">{{ kpis.globalMargin }}%</p>
              <p class="text-xs text-gray-500 mt-1">Objectif : 30 %</p>
            </UCard>
            <UCard class="border-none shadow-sm">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chiffre d'affaires</span>
              <p class="text-2xl font-bold text-gray-800 mt-1">{{ kpis.totalValue }}</p>
              <p class="text-xs text-gray-500 mt-1">Carnet (fenêtre 30 j)</p>
            </UCard>
            <UCard class="border-none shadow-sm">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pénalités retard</span>
              <p class="text-2xl font-bold text-red-600 mt-1">{{ kpis.estimatedDelayCost }}</p>
              <p class="text-xs text-gray-500 mt-1">Estimation indicative</p>
            </UCard>
          </div>
        </section>
      </div>

      <!-- Incidents critiques -->
      <div v-if="criticalIncidents.length > 0" class="mb-6">
        <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
          <UIcon name="i-lucide-shield-alert" class="text-red-500" />
          Incidents critiques & traçabilité
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
                :name="incidentIcon(inc.category)"
                :class="inc.severity === 'error' ? 'text-red-500' : 'text-orange-500'"
                class="size-4 mt-0.5 shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-gray-800">{{ inc.label }}</p>
                  <UBadge size="xs" variant="subtle" color="neutral">{{ inc.category }}</UBadge>
                </div>
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

      <!-- Marges par produit / OF -->
      <section class="space-y-4">
        <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <UIcon name="i-lucide-layers" class="text-[#0F62BC]" />
          Marges par produit / OF
        </h2>

        <UCard v-if="marginOrders.length === 0" class="border-none shadow-sm">
          <p class="text-sm text-gray-500 text-center py-4">
            Aucune commande dans la fenêtre d'analyse (30 jours).
          </p>
        </UCard>

        <UCard
          v-for="order in marginOrders"
          :key="order.id"
          class="border-none shadow-sm hover:shadow-md transition-all"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs text-gray-500">{{ order.ofNumber }}</span>
                <UBadge size="xs" variant="subtle" color="neutral">{{ order.client }}</UBadge>
              </div>
              <h3 class="text-sm font-bold text-gray-800 mt-1 truncate">{{ order.product }}</h3>
            </div>

            <div class="w-full sm:w-48">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-gray-500">Marge</span>
                <span :class="[
                  order.marginPercent < 15 ? 'text-red-500 font-bold' :
                  order.marginPercent < 30 ? 'text-orange-500 font-bold' : 'text-green-600 font-bold'
                ]">{{ order.marginPercent }}%</span>
              </div>
              <UProgress
                :model-value="order.marginPercent"
                :max="100"
                :color="getMarginColor(order.marginPercent)"
                size="sm"
              />
            </div>

            <div class="text-left sm:text-right flex-shrink-0">
              <p class="text-sm font-bold text-gray-800">{{ order.sellingPrice.toLocaleString('fr-FR') }} €</p>
              <p class="text-[11px] text-gray-500">Coût de revient : {{ order.costPrice.toLocaleString('fr-FR') }} €</p>
            </div>
          </div>
        </UCard>
      </section>
    </template>
  </div>
</template>
