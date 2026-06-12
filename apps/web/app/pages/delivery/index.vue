<script setup lang="ts">
import { createShipmentSchema, firstZodError, updateShipmentSchema } from '~/lib/validation/schemas'
import type { DeliveryStatus, Shipment } from '~/types'

definePageMeta({ layout: 'sidebar' })

const route = useRoute()
const { shipments, status, error, isMutating, refresh, create, update: updateShipment, remove } = useShipments()
const { canPlanShipments, pageSubtitle } = useRoleCapabilities()

const createFormError = ref<string | null>(null)
const editFormError = ref<string | null>(null)

const editForm = ref({
  client: '',
  orderNumber: '',
  address: '',
  carrier: 'FedEx Freight',
  departureDate: '',
  estimatedDelivery: '',
  emoji: '🚚',
  status: 'planned' as DeliveryStatus
})

onMounted(async () => {
  await refresh()
  const id = route.query.id
  if (id) {
    const shipment = shipments.value.find(s => s.id === Number(id))
    if (shipment) openModal(shipment)
  }
  if (route.query.create === '1') {
    openCreateModal()
    createForm.value = {
      client: String(route.query.client ?? ''),
      address: String(route.query.address ?? ''),
      carrier: String(route.query.carrier ?? 'FedEx Freight'),
      estimatedDelivery: String(route.query.delivery ?? createForm.value.estimatedDelivery),
      emoji: '🚚',
      orderNumber: String(route.query.orderNumber ?? '')
    }
  }
})

const statusConfig = {
  planned:    { label: 'Planifié',      icon: 'i-lucide-clipboard-list',  class: 'text-slate-600 bg-slate-100' },
  loading:    { label: 'En chargement', icon: 'i-lucide-boxes',           class: 'text-gray-600 bg-gray-100' },
  in_transit: { label: 'En transit',    icon: 'i-lucide-plane-takeoff',   class: 'text-blue-600 bg-blue-50' },
  delivered:  { label: 'Livré',         icon: 'i-lucide-check-circle-2', class: 'text-green-600 bg-green-50' },
  delayed:    { label: 'En retard',     icon: 'i-lucide-alert-clockwise', class: 'text-red-600 bg-red-50' }
}

const statusOptions = [
  { label: 'Planifié', value: 'planned', icon: 'i-lucide-clipboard-list' },
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
  emoji: '🚚',
  orderNumber: ''
})

const filteredShipments = computed(() =>
  shipments.value.filter(s =>
    s.shipmentNumber.toLowerCase().includes(search.value.toLowerCase()) ||
    s.client.toLowerCase().includes(search.value.toLowerCase())
  )
)

function syncEditForm(shipment: Shipment) {
  editForm.value = {
    client: shipment.client === '—' ? '' : shipment.client,
    orderNumber: shipment.orderNumber ?? '',
    address: shipment.address === '—' ? '' : shipment.address,
    carrier: shipment.carrier,
    departureDate: shipment.departureDate,
    estimatedDelivery: shipment.estimatedDelivery,
    emoji: shipment.emoji,
    status: shipment.status
  }
}

function openModal(shipment: Shipment) {
  selected.value = shipments.value.find(item => item.id === shipment.id) || null
  if (selected.value) syncEditForm(selected.value)
  editFormError.value = null
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
    emoji: '🚚',
    orderNumber: ''
  }
  isCreateModalOpen.value = true
}

async function submitCreateShipment() {
  createFormError.value = null
  const parsed = createShipmentSchema.safeParse(createForm.value)
  if (!parsed.success) {
    createFormError.value = firstZodError(parsed.error)
    return
  }
  await create({
    ...parsed.data,
    orderNumber: parsed.data.orderNumber || undefined
  })
  isCreateModalOpen.value = false
}

async function submitEditShipment() {
  if (!selected.value) return
  editFormError.value = null
  const parsed = updateShipmentSchema.safeParse(editForm.value)
  if (!parsed.success) {
    editFormError.value = firstZodError(parsed.error)
    return
  }
  try {
    await updateShipment(selected.value.id, parsed.data, selected.value.backendId)
    selected.value = shipments.value.find(s => s.id === selected.value?.id) ?? null
    if (selected.value) syncEditForm(selected.value)
  } catch {
    editFormError.value = error.value ?? 'Impossible d\'enregistrer les modifications.'
  }
}

async function handleDeleteShipment() {
  if (!selected.value) return
  if (!confirm(`Supprimer l'expédition ${selected.value.shipmentNumber} ?`)) return
  try {
    await remove(selected.value.id, selected.value.backendId)
    isModalOpen.value = false
    selected.value = null
  } catch {
    editFormError.value = error.value ?? 'Impossible de supprimer l\'expédition.'
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">

      <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />
      <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="refresh">Réessayer</UButton>

      <div v-if="status === 'pending'" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <USkeleton v-for="i in 3" :key="i" class="h-40 w-full" />
      </div>

      <div :class="PAGE_HEADER">
        <div>
          <h1 :class="PAGE_TITLE">Suivi des Expéditions</h1>
          <p :class="PAGE_SUBTITLE">{{ pageSubtitle || 'Planification des expéditions internes et clients' }}</p>
        </div>
      </div>

      <div :class="TOOLBAR">
        <label for="delivery-search" class="sr-only">Rechercher une expédition</label>
        <UInput id="delivery-search" v-model="search" icon="i-lucide-search" placeholder="N° expédition, client..." class="w-full sm:flex-1" />
        <UButton
          v-if="canPlanShipments"
          icon="i-lucide-truck"
          size="sm"
          class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto shrink-0"
          @click="openCreateModal"
        >
          <span class="sm:hidden">Nouvelle</span>
          <span class="hidden sm:inline">Nouvelle Expédition</span>
        </UButton>
      </div>

      <div v-if="status !== 'pending' && filteredShipments.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <p v-if="shipment.orderNumber" class="text-[10px] font-mono text-indigo-500">{{ shipment.orderNumber }}</p>
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
            <div v-else class="text-[11px] text-green-600 font-medium flex items-center gap-1">
              <UIcon name="i-lucide-shield-check" />
              <span>À l'heure</span>
            </div>
          </div>
        </UCard>
      </div>
      <div v-if="status !== 'pending' && filteredShipments.length === 0" class="text-center py-16 text-gray-400 text-sm">
        Aucune expédition trouvée.
      </div>

    <UModal v-model:open="isModalOpen" :ui="modalUi('lg')">
      <template #content>
        <div v-if="selected" :class="MODAL_BODY" role="dialog" aria-modal="true" aria-labelledby="shipment-detail-title">

          <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-5">
            <div class="flex gap-3 flex-1 min-w-0">
              <div v-if="!canPlanShipments" class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
                {{ selected.emoji }}
              </div>
              <USelectMenu
                v-else
                v-model="editForm.emoji"
                :items="['🚚', '✈️', '📦', '🚢', '🚂']"
                class="w-16 shrink-0"
                aria-label="Vecteur de transport"
              />
              <div class="flex-1 min-w-0 space-y-2">
                <h2 id="shipment-detail-title" class="text-lg font-bold text-gray-800">{{ selected.shipmentNumber }}</h2>
                <template v-if="canPlanShipments">
                  <UInput v-model="editForm.client" placeholder="Client" icon="i-lucide-building-2" size="sm" />
                  <UInput v-model="editForm.orderNumber" placeholder="N° commande" icon="i-lucide-file-text" size="sm" class="font-mono" />
                </template>
                <template v-else>
                  <p class="text-sm font-semibold text-[#0F62BC]">{{ selected.client }}</p>
                  <p v-if="selected.orderNumber" class="text-xs font-mono text-indigo-500">Commande {{ selected.orderNumber }}</p>
                </template>
              </div>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Fermer la fiche expédition" @click="isModalOpen = false" />
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
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-gray-100">
                <div>
                  <label class="text-xs text-gray-400 block mb-1">Date de départ effective</label>
                  <UInput
                    v-if="canPlanShipments"
                    v-model="editForm.departureDate"
                    type="date"
                    icon="i-lucide-log-out"
                    size="sm"
                  />
                  <span v-else class="font-semibold text-gray-800 flex items-center gap-1.5">
                    <UIcon name="i-lucide-log-out" class="text-blue-500 text-xs" />
                    {{ selected.departureDate }}
                  </span>
                </div>
                <div>
                  <label class="text-xs text-gray-400 block mb-1">Livraison prévue</label>
                  <UInput
                    v-if="canPlanShipments"
                    v-model="editForm.estimatedDelivery"
                    type="date"
                    icon="i-lucide-calendar"
                    size="sm"
                  />
                  <span v-else class="font-semibold text-gray-800 flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar" class="text-gray-400 text-xs" />
                    {{ selected.estimatedDelivery }}
                  </span>
                </div>
              </div>
            </div>

            <div class="space-y-3 pt-1">
              <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400">Détails d'acheminement</h4>
              <div>
                <label class="text-xs text-gray-400 block mb-1">Transporteur officiel</label>
                <USelectMenu
                  v-if="canPlanShipments"
                  v-model="editForm.carrier"
                  :items="carrierOptions"
                  size="sm"
                />
                <span v-else class="font-medium text-gray-800">{{ selected.carrier }}</span>
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">Adresse de livraison</label>
                <UInput
                  v-if="canPlanShipments"
                  v-model="editForm.address"
                  icon="i-lucide-map-pinned"
                  size="sm"
                />
                <span v-else class="font-medium text-gray-800 text-xs sm:text-sm">{{ selected.address }}</span>
              </div>
            </div>
          </div>

          <div class="border border-gray-100 rounded-xl p-4 mb-6">
            <p class="text-xs font-bold uppercase text-gray-400 mb-3">Statut de l'expédition</p>
            <div v-if="canPlanShipments" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <UButton
                v-for="option in statusOptions"
                :key="option.value"
                :icon="option.icon"
                size="sm"
                :variant="editForm.status === option.value ? 'solid' : 'outline'"
                :color="option.value === 'delayed' && editForm.status === 'delayed' ? 'error' : editForm.status === option.value ? 'primary' : 'neutral'"
                class="justify-start text-xs w-full"
                @click="editForm.status = option.value as DeliveryStatus"
              >
                {{ option.label }}
              </UButton>
            </div>
            <UBadge v-else :class="statusConfig[selected.status].class" variant="subtle">
              <UIcon :name="statusConfig[selected.status].icon" class="mr-1" />
              {{ statusConfig[selected.status].label }}
            </UBadge>
          </div>

          <UAlert
            v-if="editFormError"
            color="error"
            variant="soft"
            :title="editFormError"
            class="mb-4"
          />

          <div class="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-gray-100">
            <UButton
              v-if="canPlanShipments"
              icon="i-lucide-trash-2"
              color="error"
              variant="outline"
              size="sm"
              :loading="isMutating"
              @click="handleDeleteShipment"
            >
              Supprimer
            </UButton>

            <div class="flex flex-wrap gap-2 ms-auto">
              <UButton variant="ghost" color="neutral" @click="isModalOpen = false">
                Fermer
              </UButton>
              <UButton
                v-if="canPlanShipments"
                class="bg-[#0F62BC] text-white hover:bg-[#156FD4]"
                icon="i-lucide-save"
                size="sm"
                :loading="isMutating"
                @click="submitEditShipment"
              >
                Enregistrer
              </UButton>
            </div>
          </div>

        </div>
      </template>
    </UModal>

    <UModal v-model:open="isCreateModalOpen" :ui="modalUi('md')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-modal="true" aria-labelledby="shipment-create-title">
          <div class="flex justify-between items-start mb-5">
            <div>
              <h2 id="shipment-create-title" class="text-lg font-bold text-gray-800">Planifier un transport</h2>
              <p class="text-xs text-gray-400 mt-0.5">L'identifiant séquentiel (EXP-2026-XXX) est calculé automatiquement.</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Fermer le formulaire de planification" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">N° commande liée (optionnel)</label>
              <UInput v-model="createForm.orderNumber" placeholder="Ex: CMD-2026-101" class="font-mono" icon="i-lucide-file-text" />
            </div>

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

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transporteur</label>
                <USelectMenu v-model="createForm.carrier" :items="carrierOptions" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Vecteur</label>
                <USelectMenu v-model="createForm.emoji" :items="['🚚', '✈️', '📦', '🚢', '🚂']" aria-label="Vecteur de transport" />
              </div>
            </div>
          </div>

          <p v-if="createFormError" class="text-red-500 text-sm mb-3" role="alert">{{ createFormError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              icon="i-lucide-check"
              :disabled="!createForm.client.trim() || !createForm.address.trim()"
              :loading="isMutating"
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