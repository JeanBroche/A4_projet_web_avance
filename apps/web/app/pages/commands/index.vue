<script setup lang="ts">
import { createOrderSchema, firstZodError } from '~/lib/validation/schemas'
import type { Order, OrderPriority, OrderStatus } from '~/types'

definePageMeta({ layout: 'sidebar' })

type PreparedOrder = Order

const {
  orders, status, error, isMutating, refresh, create,
  updateStatus: updateOrderStatus, validate, reject, changePriority,
  reportAnomaly, clearAnomaly,
  clientStats, orderHistory, loadClientStats, loadOrderHistory
} = useOrders()

const { canManageOrders, canPlanShipments, pageSubtitle } = useRoleCapabilities()

onMounted(() => refresh())

const commercialStats = computed(() => {
  const list = orders.value
  const clients = new Set(list.map(o => o.client))
  return {
    total: list.length,
    pendingValidation: list.filter(o => o.validationStatus === 'pending').length,
    urgent: list.filter(o => o.priority === 'urgent').length,
    clients: clients.size,
    delivered: list.filter(o => o.status === 'delivered').length
  }
})

const statusBreakdown = computed(() => {
  const list = orders.value
  const total = Math.max(list.length, 1)
  return [
    { label: 'Préparées', value: Math.round((list.filter(o => o.status === 'prepared').length / total) * 100), color: 'primary' as const },
    { label: 'Expédiées', value: Math.round((list.filter(o => o.status === 'shipped').length / total) * 100), color: 'warning' as const },
    { label: 'Livrées', value: Math.round((list.filter(o => o.status === 'delivered').length / total) * 100), color: 'success' as const }
  ]
})

function formatDeliveryDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

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

const validationConfig = {
  pending: { label: 'En attente', class: 'text-amber-600 bg-amber-50' },
  validated: { label: 'Validée', class: 'text-green-600 bg-green-50' },
  rejected: { label: 'Rejetée', class: 'text-red-600 bg-red-50' }
}

const priorityOptions = [
  { label: 'Normale', value: 'normal' as OrderPriority },
  { label: 'Spéciale (urgente)', value: 'urgent' as OrderPriority }
]

const carrierOptions = ['DHL Aviation', 'FedEx Priority', 'Geodis', 'UPS Cargo']

const search = ref('')
const selected = ref<PreparedOrder | null>(null)

// États des Modales
const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const createFormError = ref<string | null>(null)

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
async function openModal(order: PreparedOrder) {
  selected.value = orders.value.find(item => item.id === order.id) || null
  isModalOpen.value = true
  if (selected.value) {
    await Promise.all([
      loadClientStats(selected.value.client),
      loadOrderHistory(selected.value.id)
    ])
  }
}

function formatHistoryDate(d: Date) {
  return d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function planShipment(order: Order) {
  navigateTo({
    path: '/delivery',
    query: {
      create: '1',
      client: order.client,
      address: order.destination,
      carrier: order.carrier,
      orderNumber: order.orderNumber,
      delivery: order.deliveryDate
    }
  })
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
  createFormError.value = null
  isCreateModalOpen.value = true
}

async function submitCreateOrder() {
  createFormError.value = null
  const parsed = createOrderSchema.safeParse(createForm.value)
  if (!parsed.success) {
    createFormError.value = firstZodError(parsed.error)
    return
  }
  await create(parsed.data)
  isCreateModalOpen.value = false
}

async function handleValidate(order: PreparedOrder) {
  await validate(order.id)
  if (selected.value?.id === order.id) {
    selected.value = orders.value.find(o => o.id === order.id) ?? null
  }
}

async function handleReject(order: PreparedOrder) {
  await reject(order.id)
  if (selected.value?.id === order.id) {
    selected.value = orders.value.find(o => o.id === order.id) ?? null
  }
}

async function handlePriorityChange(order: PreparedOrder, priority: OrderPriority) {
  await changePriority(order.id, priority)
  if (selected.value?.id === order.id) {
    selected.value = orders.value.find(o => o.id === order.id) ?? null
  }
}

async function toggleAnomaly(order: PreparedOrder) {
  if (order.hasAnomaly) {
    await clearAnomaly(order.id)
  } else {
    await reportAnomaly(order.id)
  }
  if (selected.value?.id === order.id) {
    selected.value = orders.value.find(o => o.id === order.id) ?? null
  }
}

async function updateStatus(order: PreparedOrder, newStatus: OrderStatus) {
  await updateOrderStatus(order.id, newStatus)
  if (selected.value?.id === order.id) {
    selected.value = orders.value.find(o => o.id === order.id) ?? null
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
          <h1 :class="PAGE_TITLE">Commandes clients</h1>
          <p :class="PAGE_SUBTITLE">{{ pageSubtitle || 'Suivi des commandes — les commandes spéciales correspondent aux priorités urgentes' }}</p>
        </div>
      </div>

      <div v-if="status !== 'pending'" class="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-5">
        <div class="bg-white/60 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Commandes</p>
          <p class="text-xl font-semibold text-[#0F62BC]">{{ commercialStats.total }}</p>
        </div>
        <div class="bg-white/60 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">À valider</p>
          <p class="text-xl font-semibold text-amber-600">{{ commercialStats.pendingValidation }}</p>
        </div>
        <div class="bg-white/60 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Spéciales (urgentes)</p>
          <p class="text-xl font-semibold text-red-600">{{ commercialStats.urgent }}</p>
        </div>
        <div class="bg-white/60 border border-gray-100 rounded-xl p-3">
          <p class="text-xs text-gray-400 mb-1">Clients</p>
          <p class="text-xl font-semibold text-gray-700">{{ commercialStats.clients }}</p>
        </div>
        <div class="bg-white/60 border border-gray-100 rounded-xl p-3 col-span-2 sm:col-span-1">
          <p class="text-xs text-gray-400 mb-1">Livrées</p>
          <p class="text-xl font-semibold text-green-600">{{ commercialStats.delivered }}</p>
        </div>
      </div>

      <UCard v-if="status !== 'pending' && commercialStats.total > 0" class="border-none shadow-sm mb-5">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Répartition par statut logistique</p>
        <div class="space-y-3">
          <div v-for="row in statusBreakdown" :key="row.label">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-500">{{ row.label }}</span>
              <span class="font-semibold text-gray-700">{{ row.value }}%</span>
            </div>
            <UProgress :model-value="row.value" :max="100" :color="row.color" size="sm" />
          </div>
        </div>
      </UCard>

      <div :class="TOOLBAR">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Rechercher une commande..." class="w-full sm:flex-1" />
        <UButton
          v-if="canManageOrders"
          icon="i-lucide-plus-circle"
          size="sm"
          class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto shrink-0"
          @click="openCreateModal"
        >
          <span class="sm:hidden">Nouvelle</span>
          <span class="hidden sm:inline">Nouvelle Commande</span>
        </UButton>
      </div>

      <div v-if="status !== 'pending' && filteredOrders.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-if="order.validationStatus !== 'validated'"
                    :class="['text-[10px] font-semibold px-1.5 py-0.5 rounded-full', validationConfig[order.validationStatus].class]"
                  >
                    {{ validationConfig[order.validationStatus].label }}
                  </span>
                  <span
                    v-if="order.priority === 'urgent'"
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-red-600 bg-red-50"
                  >
                    Spéciale
                  </span>
                </div>
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
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="text-gray-400" />
              <span>Livraison prévue : {{ formatDeliveryDate(order.deliveryDate) }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-gray-100 gap-2" @click.stop>
            <UDropdownMenu v-if="canManageOrders" :items="[statusOptions.map(s => ({ label: s.label, icon: s.icon, onSelect: () => updateStatus(order, s.value as OrderStatus) }))]">
              <UButton 
                :class="statusConfig[order.status].class" 
                variant="subtle" 
                size="xs"
                trailing-icon="i-lucide-chevron-down"
              >
                <UIcon :name="statusConfig[order.status].icon" class="mr-1" />
                {{ statusConfig[order.status].label }}
              </UButton>
            </UDropdownMenu>

            <UTooltip :text="order.hasAnomaly ? 'Retirer l\'anomalie' : 'Déclarer une anomalie'">
              <UButton
                :icon="order.hasAnomaly ? 'i-lucide-alert-octagon' : 'i-lucide-alert-triangle'"
                :color="order.hasAnomaly ? 'error' : 'neutral'"
                :variant="order.hasAnomaly ? 'solid' : 'ghost'"
                size="xs"
                :aria-label="order.hasAnomaly ? 'Retirer l\'anomalie' : 'Déclarer une anomalie'"
                @click="toggleAnomaly(order)"
              />
            </UTooltip>
          </div>
        </UCard>
      </div>
      <div v-if="status !== 'pending' && filteredOrders.length === 0" class="text-center py-16 text-gray-400 text-sm">
        Aucune commande trouvée.
      </div>

    <UModal v-model:open="isModalOpen" :ui="modalUi('xl')">
      <template #content>
        <div v-if="selected" :class="MODAL_BODY" role="dialog" aria-labelledby="order-detail-title">

          <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-5 sm:mb-6">
            <div class="flex gap-3 sm:gap-4 min-w-0">
              <div class="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-3xl">
                {{ selected.emoji }}
              </div>
              <div>
                <h2 id="order-detail-title" class="text-lg sm:text-xl font-bold text-gray-800 break-all">{{ selected.orderNumber }}</h2>
                <div class="flex flex-wrap items-center gap-2 mt-0.5">
                  <span class="text-sm font-semibold text-[#0F62BC]">{{ selected.client }}</span>
                  <span v-if="selected.hasAnomaly" class="text-xs bg-red-50 text-red-600 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UIcon name="i-lucide-alert-octagon" /> Bloqué (Anomalie)
                  </span>
                </div>
              </div>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Fermer la fiche commande" @click="isModalOpen = false" />
          </div>

          <div class="flex flex-wrap items-center gap-2 mb-4">
            <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', validationConfig[selected.validationStatus].class]">
              Validation : {{ validationConfig[selected.validationStatus].label }}
            </span>
            <span
              v-if="selected.priority === 'urgent'"
              class="text-xs font-semibold px-2 py-0.5 rounded-full text-red-600 bg-red-50"
            >
              Commande spéciale (urgente)
            </span>
          </div>

          <UAlert
            v-if="selected.validationStatus === 'pending'"
            icon="i-lucide-clock"
            color="warning"
            variant="soft"
            title="Validation commerciale requise"
            description="Cette commande doit être approuvée ou rejetée avant expédition."
            class="mb-4"
          />

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
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
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
              <div class="col-span-2">
                <span class="text-xs text-gray-400 block">Date de livraison prévue</span>
                <span class="font-medium text-gray-800 flex items-center gap-1">
                  <UIcon name="i-lucide-calendar" class="text-gray-400 text-xs" />
                  {{ formatDeliveryDate(selected.deliveryDate) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-100 rounded-xl mb-4">
            <div>
              <p class="text-[11px] font-bold uppercase text-gray-400">Statut logistique</p>
              <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1', statusConfig[selected.status].class]">
                <UIcon :name="statusConfig[selected.status].icon" />
                {{ statusConfig[selected.status].label }}
              </span>
            </div>
            <UDropdownMenu v-if="canManageOrders" :items="[statusOptions.map(s => ({ label: s.label, icon: s.icon, onSelect: () => updateStatus(selected!, s.value as OrderStatus) }))]">
              <UButton label="Modifier le flux" color="neutral" variant="outline" size="xs" trailing-icon="i-lucide-chevron-down" />
            </UDropdownMenu>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-100 rounded-xl mb-6">
            <div>
              <p class="text-[11px] font-bold uppercase text-gray-400">Priorité</p>
              <span class="text-xs font-semibold text-gray-700 mt-1 block">
                {{ selected.priority === 'urgent' ? 'Urgente' : 'Normale' }}
              </span>
            </div>
            <UDropdownMenu v-if="canManageOrders" :items="[priorityOptions.map(p => ({ label: p.label, onSelect: () => handlePriorityChange(selected!, p.value) }))]">
              <UButton label="Changer la priorité" color="neutral" variant="outline" size="xs" trailing-icon="i-lucide-chevron-down" />
            </UDropdownMenu>
          </div>

          <div v-if="clientStats" class="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
            <h4 class="text-xs font-bold uppercase tracking-wider text-[#0F62BC] mb-3">Statistiques client — {{ clientStats.client }}</h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p class="text-xs text-gray-400">Commandes</p>
                <p class="font-bold text-gray-800">{{ clientStats.orderCount }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Livrées</p>
                <p class="font-bold text-green-600">{{ clientStats.deliveredCount }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Spéciales</p>
                <p class="font-bold text-red-600">{{ clientStats.urgentCount }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Délai moyen</p>
                <p class="font-bold text-gray-800">{{ clientStats.averageLeadDays }} j</p>
              </div>
            </div>
          </div>

          <div v-if="orderHistory.length > 0" class="mb-6">
            <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Historique commande</h4>
            <ol class="space-y-2 border-s-2 border-gray-100 ps-4">
              <li v-for="(entry, idx) in orderHistory" :key="idx" class="text-sm">
                <p class="font-medium text-gray-800">{{ entry.label }}</p>
                <p class="text-xs text-gray-500">{{ entry.description }}</p>
                <p class="text-[11px] text-gray-400">{{ formatHistoryDate(entry.at) }}</p>
              </li>
            </ol>
          </div>

          <div class="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-gray-100">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="canPlanShipments && selected.validationStatus === 'validated'"
                icon="i-lucide-truck"
                color="primary"
                variant="soft"
                size="sm"
                @click="planShipment(selected!)"
              >
                Planifier expédition
              </UButton>
              <template v-if="canManageOrders && selected.validationStatus === 'pending'">
                <UButton
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="subtle"
                  size="sm"
                  :loading="isMutating"
                  aria-label="Valider la commande"
                  @click="handleValidate(selected!)"
                >
                  Valider
                </UButton>
                <UButton
                  icon="i-lucide-x-circle"
                  color="error"
                  variant="subtle"
                  size="sm"
                  :loading="isMutating"
                  aria-label="Rejeter la commande"
                  @click="handleReject(selected!)"
                >
                  Rejeter
                </UButton>
              </template>
              <UButton
                v-if="canManageOrders"
                :icon="selected.hasAnomaly ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
                :color="selected.hasAnomaly ? 'success' : 'error'"
                variant="subtle"
                size="sm"
                :aria-label="selected.hasAnomaly ? 'Lever le blocage anomalie' : 'Signaler une anomalie'"
                @click="toggleAnomaly(selected!)"
              >
                {{ selected.hasAnomaly ? 'Lever le blocage' : 'Signaler une anomalie' }}
              </UButton>
            </div>
            
            <UButton class="bg-[#0F62BC] text-white hover:bg-[#156FD4]" @click="isModalOpen = false">
              Fermer
            </UButton>
          </div>

        </div>
      </template>
    </UModal>

    <UModal v-model:open="isCreateModalOpen" :ui="modalUi('md')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="order-create-title">
          <div class="flex justify-between items-start mb-5">
            <div>
              <h2 id="order-create-title" class="text-lg font-bold text-gray-800">Enregistrer une commande</h2>
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

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre d'articles</label>
                <UInput v-model="createForm.itemsCount" type="number" :min="1" icon="i-lucide-layers" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Poids total (kg)</label>
                <UInput v-model="createForm.weightValue" type="number" :min="1" icon="i-lucide-scale" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transporteur</label>
                <USelectMenu v-model="createForm.carrier" :items="carrierOptions" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type de fret</label>
                <USelectMenu v-model="createForm.emoji" :items="['📦', '✈️', '🚀', '🔩', '⚙️']" />
              </div>
            </div>
          </div>

          <p v-if="createFormError" class="text-red-500 text-sm mb-3">{{ createFormError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              icon="i-lucide-check"
              :loading="isMutating"
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