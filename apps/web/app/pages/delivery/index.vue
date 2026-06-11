<script setup lang="ts">
definePageMeta({ layout: 'default' })

// Types pour les Expéditions
type DeliveryStatus = 'loading' | 'in_transit' | 'delivered' | 'delayed'

interface Shipment {
  id: number
  shipmentNumber: string
  client: string
  address: string
  carrier: string
  status: DeliveryStatus
  departureDate: string 
  estimatedDelivery: string
  delayDays: number 
  emoji: string
}

// Données fictives complétées
const shipments = ref<Shipment[]>([
  {
    id: 1,
    shipmentNumber: 'EXP-2026-401',
    client: 'Airbus Hamburg',
    address: 'Kreetslag 10, 21129 Hamburg, Allemagne',
    carrier: 'FedEx Freight',
    status: 'delayed',
    departureDate: '2026-06-04',
    estimatedDelivery: '2026-06-08',
    delayDays: 2, 
    emoji: '🚚'
  },
  {
    id: 2,
    shipmentNumber: 'EXP-2026-402',
    client: 'Safran Moteurs',
    address: 'Rond-point René Ravaud, 77550 Moissy-Cramayel, France',
    carrier: 'DHL Aviation',
    status: 'in_transit',
    departureDate: '2026-06-08',
    estimatedDelivery: '2026-06-11',
    delayDays: 0,
    emoji: '✈️'
  },
  {
    id: 3,
    shipmentNumber: 'EXP-2026-403',
    client: 'Eurocopter España',
    address: 'Parque Aeronáutico, 02006 Albacete, Espagne',
    carrier: 'Geodis Road',
    status: 'loading',
    departureDate: '2026-06-11',
    estimatedDelivery: '2026-06-12',
    delayDays: 0,
    emoji: '📦'
  }
])

const statusConfig = {
  loading:    { label: 'En chargement', icon: 'i-lucide-boxes',           class: 'text-gray-600 bg-gray-100' },
  in_transit: { label: 'En transit',    icon: 'i-lucide-plane-takeoff',   class: 'text-blue-600 bg-blue-50' },
  delivered:  { label: 'Livré',         icon: 'i-lucide-check-circle-2', class: 'text-green-600 bg-green-50' },
  delayed:    { label: 'En retard',     icon: 'i-lucide-alert-clockwise', class: 'text-red-600 bg-red-50' }
}

const statusOptions = [
  { label: 'En chargement', value: 'loading', icon: 'i-lucide-boxes' },
  { label: 'En transit', value: 'in_transit', icon: 'i-lucide-plane-takeoff' },
  { label: 'Livré', value: 'delivered', icon: 'i-lucide-check-circle-2' },
  { label: 'En retard', value: 'delayed', icon: 'i-lucide-alert-clockwise' }
]

const carrierOptions = ['FedEx Freight', 'DHL Aviation', 'Geodis Road', 'UPS Supply Chain']

const search = ref('')
const selected = ref<Shipment | null>(null)

// États des Modales
const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)

// Formulaire de création d'expédition
const createForm = ref({
  client: '',
  address: '',
  carrier: 'FedEx Freight',
  estimatedDelivery: '',
  emoji: '🚚'
})

const filteredShipments = computed(() =>
  shipments.value.filter(s =>
    s.shipmentNumber.toLowerCase().includes(search.value.toLowerCase()) ||
    s.client.toLowerCase().includes(search.value.toLowerCase())
  )
)

function openModal(shipment: Shipment) {
  selected.value = shipments.value.find(item => item.id === shipment.id) || null
  isModalOpen.value = true
}

function openCreateModal() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 3)
  
  createForm.value = {
    client: '',
    address: '',
    carrier: 'FedEx Freight',
    estimatedDelivery: tomorrow.toISOString().split('T')[0]!,
    emoji: '🚚'
  }
  isCreateModalOpen.value = true
}

function submitCreateShipment() {
  if (!createForm.value.client.trim() || !createForm.value.address.trim()) return

  const currentYear = new Date().getFullYear()
  const nextId = shipments.value.length > 0 ? Math.max(...shipments.value.map(s => s.id)) + 1 : 1
  const generatedShipmentNumber = `EXP-${currentYear}-${String(nextId).padStart(3, '0')}`

  const newShipment: Shipment = {
    id: nextId,
    shipmentNumber: generatedShipmentNumber,
    client: createForm.value.client,
    address: createForm.value.address,
    carrier: createForm.value.carrier,
    status: 'loading',
    departureDate: new Date().toISOString().split('T')[0]!,
    estimatedDelivery: createForm.value.estimatedDelivery,
    delayDays: 0,
    emoji: createForm.value.emoji
  }

  shipments.value.unshift(newShipment)
  isCreateModalOpen.value = false
}

function updateStatus(shipment: Shipment, newStatus: DeliveryStatus) {
  shipment.status = newStatus
  if (newStatus !== 'delayed') {
    shipment.delayDays = 0
  }
}
</script>

<template>
  <div class="relative min-h-screen px-4 py-5 sm:px-6 sm:py-8 bg-gray-50/50">
    <div class="max-w-6xl mx-auto">

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[#0F62BC]">Suivi des Expéditions</h1>
          <p class="text-sm text-gray-400 mt-0.5">Suivi des flux de transport sortants et gestion des dérives de planning</p>
        </div>
        
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <UInput v-model="search" icon="i-lucide-search" placeholder="N° expédition, client..." class="flex-1 sm:w-64" />
          <UButton
            icon="i-lucide-truck"
            size="sm"
            class="bg-[#F57C00] hover:bg-[#e06d00] text-white shrink-0"
            @click="openCreateModal"
          >
            Nouvelle Expédition
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="shipment in filteredShipments"
          :key="shipment.id"
          class="hover:shadow-md transition-all duration-150 border-none shadow-sm cursor-pointer relative overflow-hidden"
          :ui="{ body: 'p-5' }"
          @click="openModal(shipment)"
        >
          <div v-if="shipment.status === 'delayed' || shipment.delayDays > 0" class="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />

          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-lg bg-[#0F62BC]/5 flex items-center justify-center text-lg">
                {{ shipment.emoji }}
              </div>
              <div>
                <h3 class="font-bold text-gray-800 text-sm sm:text-base">{{ shipment.shipmentNumber }}</h3>
                <p class="text-xs text-gray-400 font-medium truncate max-w-[160px]">{{ shipment.client }}</p>
              </div>
            </div>

            <UBadge :class="statusConfig[shipment.status].class" variant="subtle" size="xs">
              <UIcon :name="statusConfig[shipment.status].icon" class="mr-1" />
              {{ statusConfig[shipment.status].label }}
            </UBadge>
          </div>

          <div class="space-y-1 text-xs text-gray-500 my-3">
            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-log-out" class="text-gray-400 text-[11px]" />
              <span>Départ : <span class="text-gray-700 font-medium">{{ shipment.departureDate }}</span></span>
            </div>
            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-calendar" class="text-gray-400 text-[11px]" />
              <span>Livraison estimée : <span class="text-gray-700 font-medium">{{ shipment.estimatedDelivery }}</span></span>
            </div>
          </div>

          <div class="pt-2.5 border-t border-gray-100 flex justify-end">
            <div v-if="shipment.delayDays > 0 || shipment.status === 'delayed'" class="flex items-center gap-1 text-[11px] text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full">
              <UIcon name="i-lucide-clock-alert" class="animate-pulse" />
              <span>+{{ shipment.delayDays || 1 }}j de retard</span>
            </div>
            <div class="text-[11px] text-green-600 font-medium flex items-center gap-1">
              <UIcon name="i-lucide-shield-check" />
              <span>À l'heure</span>
            </div>
          </div>
        </UCard>
      </div>

    </div>

    <UModal v-model:open="isModalOpen" :ui="{ content: 'max-w-lg' }">
      <template #content>
        <div v-if="selected" class="p-6">
          
          <div class="flex justify-between items-start mb-5">
            <div class="flex gap-3">
              <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                {{ selected.emoji }}
              </div>
              <div>
                <h2 class="text-lg font-bold text-gray-800">{{ selected.shipmentNumber }}</h2>
                <p class="text-sm font-semibold text-[#0F62BC]">{{ selected.client }}</p>
              </div>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="isModalOpen = false" />
          </div>

          <UAlert
            v-if="selected.status === 'delayed'"
            icon="i-lucide-alert-circle"
            color="error"
            variant="soft"
            title="Alerte sur la chaîne d'expédition"
            :description="`Le transporteur signale un incident. La livraison accuse actuellement un retard estimé à ${selected.delayDays || 2} jours.`"
            class="mb-5"
          />

          <div class="bg-gray-50 rounded-xl p-4 space-y-4 mb-5 text-sm">
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Planning de transport</h4>
              <div class="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-gray-100">
                <div>
                  <span class="text-xs text-gray-400 block mb-0.5">Date de départ effective</span>
                  <span class="font-semibold text-gray-800 flex items-center gap-1.5">
                    <UIcon name="i-lucide-log-out" class="text-blue-500 text-xs" />
                    {{ selected.departureDate }}
                  </span>
                </div>
                <div>
                  <span class="text-xs text-gray-400 block mb-0.5">Livraison prévue</span>
                  <span class="font-semibold text-gray-800 flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar" class="text-gray-400 text-xs" />
                    {{ selected.estimatedDelivery }}
                  </span>
                </div>
              </div>
            </div>

            <div class="space-y-2 pt-1">
              <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400">Détails d'acheminement</h4>
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-truck" class="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span class="text-xs text-gray-400 block">Transporteur officiel</span>
                  <span class="font-medium text-gray-800">{{ selected.carrier }}</span>
                </div>
              </div>

              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-map-pinned" class="text-[#0F62BC] mt-0.5 flex-shrink-0" />
                <div>
                  <span class="text-xs text-gray-400 block">Adresse de livraison</span>
                  <span class="font-medium text-gray-800 text-xs sm:text-sm">{{ selected.address }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="border border-gray-100 rounded-xl p-4 mb-6">
            <p class="text-xs font-bold uppercase text-gray-400 mb-3">Mettre à jour le statut manuellement</p>
            <div class="grid grid-cols-2 gap-2">
              <UButton
                v-for="option in statusOptions"
                :key="option.value"
                :icon="option.icon"
                size="sm"
                :variant="selected.status === option.value ? 'solid' : 'outline'"
                :color="option.value === 'delayed' && selected.status === 'delayed' ? 'error' : selected.status === option.value ? 'primary' : 'neutral'"
                class="justify-start text-xs"
                @click="updateStatus(selected!, option.value as DeliveryStatus)"
              >
                {{ option.label }}
              </UButton>
            </div>
          </div>

          <div class="flex justify-end pt-3 border-t border-gray-100">
            <UButton class="bg-[#0F62BC] text-white hover:bg-[#156FD4]" @click="isModalOpen = false">
              Fermer et Sauvegarder
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
              <h2 class="text-lg font-bold text-gray-800">Planifier un transport</h2>
              <p class="text-xs text-gray-400 mt-0.5">L'identifiant séquentiel (EXP-2026-XXX) est calculé automatiquement.</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Société / Client final</label>
              <UInput v-model="createForm.client" placeholder="Ex: Boeing Operations" icon="i-lucide-building-2" />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Adresse de déchargement</label>
              <UInput v-model="createForm.address" placeholder="Ex: Port Autonome, Le Havre, France" icon="i-lucide-map-pin" />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date estimée de livraison</label>
              <UInput v-model="createForm.estimatedDelivery" type="date" icon="i-lucide-calendar" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transporteur</label>
                <USelectMenu v-model="createForm.carrier" :options="carrierOptions" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Vecteur</label>
                <USelectMenu v-model="createForm.emoji" :options="['🚚', '✈️', '📦', '🚢', '🚂']" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <UButton variant="ghost" color="neutral" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton 
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white" 
              icon="i-lucide-check"
              :disabled="!createForm.client.trim() || !createForm.address.trim()"
              @click="submitCreateShipment"
            >
              Créer l'expédition
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>