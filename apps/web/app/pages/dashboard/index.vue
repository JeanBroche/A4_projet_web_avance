<script setup lang="ts">
definePageMeta({ layout: 'default' })

// Types pour le tableau de bord
interface MarginData {
  id: number
  ofNumber: string
  client: string
  product: string
  costPrice: number  // Coût de revient
  sellingPrice: number // Prix de vente
  marginPercent: number
}

// Données fictives orientées Aero/Marges
const marginOrders = ref<MarginData[]>([
  { id: 1, ofNumber: 'OF-2026-0142', client: 'Airbus', product: 'Bras articulé A320', costPrice: 4200, sellingPrice: 6500, marginPercent: 35.3 },
  { id: 2, ofNumber: 'OF-2026-0143', client: 'Boeing', product: 'Support moteur B737', costPrice: 8900, sellingPrice: 12000, marginPercent: 25.8 },
  { id: 3, ofNumber: 'OF-2026-0139', client: 'ATR', product: 'Verrouillage train ATR', costPrice: 1500, sellingPrice: 3100, marginPercent: 51.6 },
  { id: 4, ofNumber: 'OF-2026-0145', client: 'Lockheed', product: 'Panneau cockpit C130', costPrice: 14200, sellingPrice: 16000, marginPercent: 11.2 }, // Marge faible
])

// Statistiques des tuiles d'alerte
const kpis = computed(() => {
  const totalRevenue = marginOrders.value.reduce((acc, o) => acc + o.sellingPrice, 0)
  const totalCost = marginOrders.value.reduce((acc, o) => acc + o.costPrice, 0)
  const avgMargin = ((totalRevenue - totalCost) / totalRevenue) * 100

  return {
    globalMargin: avgMargin.toFixed(1),
    delayedOrders: 3, // Exemple de commandes en retard
    bomAnomalies: 2,  // Nombre d'anomalies BOM bloquantes
    totalValue: totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  }
})

// Détermination de la couleur de la jauge de marge
function getMarginColor(percent: number) {
  if (percent < 15) return 'error'   // Marge critique (Rouge)
  if (percent < 30) return 'warning' // Marge moyenne (Orange)
  return 'success'                   // Marge excellente (Vert/Bleu Nuxt UI)
}
</script>

<template>
  <div class="relative min-h-screen px-4 py-5 sm:px-6 sm:py-8 bg-gray-50/50">
    <div class="max-w-6xl mx-auto">

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-[#0F62BC]">Performance & Alertes</h1>
        <p class="text-sm text-gray-400 mt-0.5">Analyse des marges financières, retards de livraison et criticité des nomenclatures</p>
      </div>

      <!-- Tuiles KPI (Dashboard Grid) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
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

      <!-- Section Graphique Réel & Analyse des Marges -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Liste analytique des marges par OF -->
        <div class="lg:col-span-2 space-y-4">
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
                <UProgress :value="order.marginPercent" :max="100" :color="getMarginColor(order.marginPercent)" size="sm" />
              </div>

              <!-- Prix de vente final -->
              <div class="text-left sm:text-right flex-shrink-0">
                <p class="text-sm font-bold text-gray-800">{{ order.sellingPrice.toLocaleString('fr-FR') }} €</p>
                <p class="text-[11px] text-gray-400">Coût de revient : {{ order.costPrice.toLocaleString('fr-FR') }} €</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Deuxième Graphique "En Vrai" : Répartition de la charge de travail et goulets d'étranglement -->
        <div class="space-y-4">
          <h2 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <UIcon name="i-lucide-pie-chart" class="text-[#0F62BC]" />
            Santé de la Supply Chain
          </h2>

          <UCard class="border-none shadow-sm h-full">
            <p class="text-xs font-semibold text-gray-500 mb-4">Répartition des risques composants</p>
            
            <!-- Graphique à barres verticales simulé nativement pour une légèreté maximale -->
            <div class="flex items-end justify-between h-40 pt-4 px-2 border-b border-gray-100">
              
              <!-- Barre 1 : Matière Première -->
              <div class="flex flex-col items-center gap-2 w-12 group">
                <div class="bg-[#0F62BC] w-full rounded-t-md transition-all duration-300 group-hover:opacity-80" style="height: 75%" title="75% conforme" />
                <span class="text-[10px] font-medium text-gray-400 truncate w-full text-center">Acier/Alu</span>
              </div>

              <!-- Barre 2 : Fixations (Alerte moyenne) -->
              <div class="flex flex-col items-center gap-2 w-12 group">
                <div class="bg-[#F57C00] w-full rounded-t-md transition-all duration-300 group-hover:opacity-80" style="height: 40%" title="40% en stock bas" />
                <span class="text-[10px] font-medium text-gray-400 truncate w-full text-center">Visserie</span>
              </div>

              <!-- Barre 3 : Joints / Composants critiques (Alerte forte) -->
              <div class="flex flex-col items-center gap-2 w-12 group">
                <div class="bg-red-500 w-full rounded-t-md transition-all duration-300 group-hover:opacity-80" style="height: 15%" title="15% rupture imminente" />
                <span class="text-[10px] font-medium text-gray-400 truncate w-full text-center">Étanchéité</span>
              </div>

              <!-- Barre 4 : Électronique -->
              <div class="flex flex-col items-center gap-2 w-12 group">
                <div class="bg-green-500 w-full rounded-t-md transition-all duration-300 group-hover:opacity-80" style="height: 90%" title="90% OK" />
                <span class="text-[10px] font-medium text-gray-400 truncate w-full text-center">Avionique</span>
              </div>

            </div>

            <!-- Légende du graphique -->
            <div class="grid grid-cols-2 gap-2 mt-4 text-[11px] text-gray-500">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#0F62BC]" /> Stock Sécurisé
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-green-500" /> Flux Tendu OK
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#F57C00]" /> Appro. Limite
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-red-500" /> Rupture (BOM)
              </div>
            </div>

            <!-- Bouton d'action contextuel -->
            <div class="mt-5 pt-4 border-t border-gray-100">
              <UButton icon="i-lucide-file-text" size="xs" color="neutral" variant="subtle" block class="text-xs">
                Exporter le rapport financier (PDF)
              </UButton>
            </div>
          </UCard>
        </div>

      </div>

    </div>
  </div>
</template>