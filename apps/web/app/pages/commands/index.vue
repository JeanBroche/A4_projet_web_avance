<script setup lang="ts">
definePageMeta({ layout: 'default' })

// Types pour les Commandes
type OrderStatus = 'prepared' | 'shipped' | 'delivered'

interface PreparedOrder {
  id: number
  orderNumber: string
  client: string
  destination: string
  createdAt: string
  itemsCount: number
  weight: string // Ex: "450 kg"
  carrier: string // Transporteur
  status: OrderStatus
  hasAnomaly: boolean
  emoji: string
}

// Données de test orientées logistique aéronautique
const orders = ref<PreparedOrder[]>([
  {
    id: 1,
    orderNumber: 'CMD-2026-089',
    client: 'Airbus Toulouse',
    destination: 'Zone Cargo Hall 4, France',
    createdAt: '2026-06-08',
    itemsCount: 14,
    weight: '1 250 kg',
    carrier: 'DHL Aviation',
    status: 'prepared',
    hasAnomaly: false,
    emoji: '📦'
  },
  {
    id: 2,
    orderNumber: 'CMD-2026-090',
    client: 'Boeing Seattle',
    destination: 'Port de Seattle, États-Unis',
    createdAt: '2026-06-09',
    itemsCount: 3,
    weight: '420 kg',
    carrier: 'FedEx Priority',
    status: 'shipped',
    hasAnomaly: true, // Anomalie détectée au scan
    emoji: '✈️'
  },
  {
    id: 3,
    orderNumber: 'CMD-2026-091',
    client: 'Dassault Aviation',
    destination: 'Base Mérignac, France',
    createdAt: '2026-06-10',
    itemsCount: 22,
    weight: '85 kg',
    carrier: 'Geodis',
    status: 'delivered',
    hasAnomaly: false,
    emoji: '🚀'
  }
])

// Configurations sémantiques Nuxt UI v3
const statusConfig = {
  prepared: { label: 'Préparée', icon: 'i-lucide-package', class: 'text-blue-600 bg-blue-50' },
  shipped:  { label: 'Expédiée', icon: 'i-lucide-truck', class: 'text-orange-600 bg-orange-50' },
  delivered: { label: 'Livrée', icon: 'i-lucide-check-circle', class: 'text-green-600 bg-green-50' }
}

const statusOptions = [
  { label: 'Préparée', value: 'prepared', icon: 'i-lucide-package' },
  { label: 'Expédiée', value: 'shipped', icon: 'i-lucide-truck' },
  { label: 'Livrée', value: 'delivered', icon: 'i-lucide-check-circle' }
]

const carrierOptions = ['DHL Aviation', 'FedEx Priority', 'Geodis', 'UPS Cargo']

const search = ref('')
const selected = ref<PreparedOrder | null>(null)

// États des Modales
const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)

// Formulaire réactif pour une nouvelle commande
const createForm = ref({
  client: '',
  destination: '',
  itemsCount: 1,
  weightValue: 10,
  carrier: 'DHL Aviation',
  emoji: '📦'
})

// Filtrage
const filteredOrders = computed(() => 
  orders.value.filter(o => 
    o.orderNumber.toLowerCase().includes(search.value.toLowerCase()) ||
    o.client.toLowerCase().includes(search.value.toLowerCase())
  )
)

// Actions
function openModal(order: PreparedOrder) {
  selected.value = orders.value.find(item => item.id === order.id) || null
  isModalOpen.value = true
}

function openCreateModal() {
  // Réinitialisation du formulaire à l'ouverture
  createForm.value = {
    client: '',
    destination: '',
    itemsCount: 1,
    weightValue: 10,
    carrier: 'DHL Aviation',
    emoji: '📦'
  }
  isCreateModalOpen.value = true
}

function submitCreateOrder() {
  if (!createForm.value.client.trim() || !createForm.value.destination.trim()) return

  const currentYear = new Date().getFullYear()
  const nextId = orders.value.length > 0 ? Math.max(...orders.value.map(o => o.id)) + 1 : 1
  const generatedOrderNumber = `CMD-${currentYear}-${String(nextId).padStart(3, '0')}`

  const newOrder: PreparedOrder = {
    id: nextId,
    orderNumber: generatedOrderNumber,
    client: createForm.value.client,
    destination: createForm.value.destination,
    createdAt: new Date().toISOString().split('T')[0]!,
    itemsCount: createForm.value.itemsCount,
    weight: `${createForm.value.weightValue.toLocaleString('fr-FR')} kg`,
    carrier: createForm.value.carrier,
    status: 'prepared',
    hasAnomaly: false,
    emoji: createForm.value.emoji
  }

  orders.value.unshift(newOrder)
  isCreateModalOpen.value = false
}

function toggleAnomaly(order: PreparedOrder) {
  order.hasAnomaly = !order.hasAnomaly
}

function updateStatus(order: PreparedOrder, newStatus: OrderStatus) {
  order.status = newStatus
}
</script>

<template>
  <div class="relative min-h-screen px-4 py-5 sm:px-6 sm:py-8 bg-gray-50/50">
    <div class="max-w-6xl mx-auto">

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[#0F62BC]">Expéditions & Commandes</h1>
          <p class="text-sm text-gray-400 mt-0.5">Suivi logistique des commandes préparées et prêtes pour l'envoi</p>
        </div>
        
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Rechercher une commande..." class="flex-1 sm:w-64" />
          <UButton 
            icon="i-lucide-plus-circle" 
            size="sm" 
            class="bg-[#F57C00] hover:bg-[#e06d00] text-white shrink-0"
            @click="openCreateModal"
          >
            Nouvelle Commande
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="order in filteredOrders"
          :key="order.id"
          class="hover:shadow-md transition-all duration-150 border-none shadow-sm relative cursor-pointer"
          :ui="{ body: 'p-5' }"
          @click="openModal(order)"
        >
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/5 flex items-center justify-center text-xl">
                {{ order.emoji }}
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-sm sm:text-base">{{ order.orderNumber }}</h3>
                <p class="text-xs text-gray-400 font-medium truncate max-w-[150px]">{{ order.client }}</p>
              </div>
            </div>

            <div v-if="order.hasAnomaly" class="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-3 right-3" />
          </div>

          <div class="space-y-2 mb-4 text-xs text-gray-600">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-layers" class="text-gray-400" />
              <span>{{ order.itemsCount }} pièces sélectionnées</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-scale" class="text-gray-400" />
              <span>Poids estimé : {{ order.weight }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-gray-100 gap-2" @click.stop>
            <UDropdown :items="[statusOptions.map(s => ({ ...s, click: () => updateStatus(order, s.value as OrderStatus) }))]">
              <UButton 
                :class="statusConfig[order.status].class" 
                variant="subtle" 
                size="xs"
                trailing-icon="i-lucide-chevron-down"
              >
                <UIcon :name="statusConfig[order.status].icon" class="mr-1" />
                {{ statusConfig[order.status].label }}
              </UButton>
            </UDropdown>

            <UTooltip :text="order.hasAnomaly ? 'Retirer l\'anomalie' : 'Déclarer une anomalie'">
              <UButton
                :icon="order.hasAnomaly ? 'i-lucide-alert-octagon' : 'i-lucide-alert-triangle'"
                :color="order.hasAnomaly ? 'error' : 'neutral'"
                :variant="order.hasAnomaly ? 'solid' : 'ghost'"
                size="xs"
                @click="toggleAnomaly(order)"
              />
            </UTooltip>
          </div>
        </UCard>
      </div>

    </div>

    <UModal v-model:open="isModalOpen" :ui="{ content: 'max-w-xl' }">
      <template #content>
        <div v-if="selected" class="p-6">
          
          <div class="flex justify-between items-start mb-6">
            <div class="flex gap-4">
              <div class="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-3xl">
                {{ selected.emoji }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-800">{{ selected.orderNumber }}</h2>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-sm font-semibold text-[#0F62BC]">{{ selected.client }}</span>
                  <span v-if="selected.hasAnomaly" class="text-xs bg-red-50 text-red-600 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UIcon name="i-lucide-alert-octagon" /> Bloqué (Anomalie)
                  </span>
                </div>
              </div>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="isModalOpen = false" />
          </div>

          <UAlert
            v-if="selected.hasAnomaly"
            icon="i-lucide-alert-triangle"
            color="error"
            variant="soft"
            title="Alerte logistique"
            description="L'expédition de cette commande est suspendue suite au signalement d'une anomalie sur le colisage."
            class="mb-6"
          />

          <div class="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6">
            <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Informations de livraison</h4>
            
            <div class="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <span class="text-xs text-gray-400 block">Date de création</span>
                <span class="font-medium text-gray-800">{{ selected.createdAt }}</span>
              </div>
              <div>
                <span class="text-xs text-gray-400 block">Transporteur assigné</span>
                <span class="font-medium text-gray-800 flex items-center gap-1">
                  <UIcon name="i-lucide-plane-takeoff" class="text-gray-400 text-xs" />
                  {{ selected.carrier }}
                </span>
              </div>
              <div class="col-span-2">
                <span class="text-xs text-gray-400 block">Destination finale</span>
                <span class="font-medium text-gray-800 flex items-center gap-1">
                  <UIcon name="i-lucide-map-pin" class="text-[#0F62BC] text-xs" />
                  {{ selected.destination }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between p-3 border border-gray-100 rounded-xl mb-6">
            <div>
              <p class="text-[11px] font-bold uppercase text-gray-400">Statut logistique</p>
              <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1', statusConfig[selected.status].class]">
                <UIcon :name="statusConfig[selected.status].icon" />
                {{ statusConfig[selected.status].label }}
              </span>
            </div>
            <UDropdown :items="[statusOptions.map(s => ({ ...s, click: () => updateStatus(selected!, s.value as OrderStatus) }))]">
              <UButton label="Modifier le flux" color="neutral" variant="outline" size="xs" trailing-icon="i-lucide-chevron-down" />
            </UDropdown>
          </div>

          <div class="flex justify-between items-center pt-4 border-t border-gray-100">
            <UButton
              :icon="selected.hasAnomaly ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
              :color="selected.hasAnomaly ? 'success' : 'error'"
              variant="subtle"
              size="sm"
              @click="toggleAnomaly(selected!)"
            >
              {{ selected.hasAnomaly ? 'Lever le blocage' : 'Signaler une anomalie' }}
            </UButton>
            
            <UButton class="bg-[#0F62BC] text-white hover:bg-[#156FD4]" @click="isModalOpen = false">
              Fermer
            </UButton>
          </div>

        </div>
      </template>
    </UModal>

    <UModal v-model:open="isCreateModalOpen" :ui="{ content: 'max-w-md' }">
      <template #content>
        <div class="p-6">
          <div class="flex justify-between items-start mb-5">
            <div>
              <h2 class="text-lg font-bold text-gray-800">Enregistrer une commande</h2>
              <p class="text-xs text-gray-400 mt-0.5">Le code CMD-XXXX sera alloué dynamiquement en séquence.</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nom du Client</label>
              <UInput v-model="createForm.client" placeholder="Ex: Safran Nacelles" icon="i-lucide-building-2" />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Adresse de Destination</label>
              <UInput v-model="createForm.destination" placeholder="Ex: Hall Cargo 2, Hambourg, Allemagne" icon="i-lucide-map-pin" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre d'articles</label>
                <UInput v-model="createForm.itemsCount" type="number" :min="1" icon="i-lucide-layers" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Poids total (kg)</label>
                <UInput v-model="createForm.weightValue" type="number" :min="1" icon="i-lucide-scale" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transporteur</label>
                <USelectMenu v-model="createForm.carrier" :options="carrierOptions" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type de fret</label>
                <USelectMenu v-model="createForm.emoji" :options="['📦', '✈️', '🚀', '🔩', '⚙️']" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <UButton variant="ghost" color="neutral" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton 
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white" 
              icon="i-lucide-check"
              :disabled="!createForm.client.trim() || !createForm.destination.trim()"
              @click="submitCreateOrder"
            >
              Valider la commande
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>