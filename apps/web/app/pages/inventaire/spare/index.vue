<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { createStockLevelSchema, firstZodError } from '~/lib/validation/schemas'
import type { MaterialLot, PurchaseOrder, PurchaseOrderStatus, StockLevel, StockMovement, StockUnit, SupplierDelay } from '~/types'

definePageMeta({ layout: 'sidebar' })

const UButton = resolveComponent('UButton')
const UBadge  = resolveComponent('UBadge')

const {
  levels, reservations, alerts, status, error, isMutating,
  refresh, reportSupplierDelay,
  ruptureForecast,
  supplierDelays,
  fetchMovementsFor,
  consolidatedLevels, refreshConsolidated,
  fetchLotsFor, createLot,
  transferStock,
  purchaseOrders, refreshPurchaseOrders, createPurchaseOrder, receivePurchaseOrder,
  createLevel, updateLevel, deleteLevel
} = useStock()
const { canManageStock, canViewConsolidatedStock, pageSubtitle } = useRoleCapabilities()

const activeReservations = computed(() =>
  reservations.value.filter(r => r.status === 'ACTIVE')
)

const reservationsByOf = computed(() => {
  const map = new Map<string, typeof activeReservations.value>()
  for (const res of activeReservations.value) {
    const list = map.get(res.ofId) ?? []
    list.push(res)
    map.set(res.ofId, list)
  }
  return [...map.entries()]
    .map(([ofId, items]) => ({ ofId, items }))
    .sort((a, b) => a.ofId.localeCompare(b.ofId))
})

const openReservationOfIds = ref<Set<string>>(new Set())

function toggleReservationOf(ofId: string) {
  const next = new Set(openReservationOfIds.value)
  if (next.has(ofId)) next.delete(ofId)
  else next.add(ofId)
  openReservationOfIds.value = next
}

function isReservationOfOpen(ofId: string) {
  return openReservationOfIds.value.has(ofId)
}

const viewMode = ref<'site' | 'consolidated'>('site')

async function toggleConsolidated() {
  viewMode.value = viewMode.value === 'site' ? 'consolidated' : 'site'
  if (viewMode.value === 'consolidated' && consolidatedLevels.value.length === 0) {
    await refreshConsolidated()
  }
}

onMounted(async () => {
  await refresh()
  if (canManageStock.value) {
    await refreshPurchaseOrders()
  }
})

const topRuptureRisks = computed(() =>
  ruptureForecast.value.filter(f => f.score >= 30).slice(0, 5)
)

const isDelayModalOpen = ref(false)
const delayFormError = ref<string | null>(null)
const delayForm = ref({
  materialReference: '',
  supplier: '',
  delayDays: 3,
  comment: ''
})

const materialOptions = computed(() =>
  parts.value.map(p => ({ label: `${p.reference} — ${p.name}`, value: p.reference }))
)

function openDelayModal() {
  delayForm.value = { materialReference: parts.value[0]?.reference ?? '', supplier: '', delayDays: 3, comment: '' }
  delayFormError.value = null
  isDelayModalOpen.value = true
}

async function submitSupplierDelay() {
  delayFormError.value = null
  if (!delayForm.value.materialReference || !delayForm.value.supplier.trim()) {
    delayFormError.value = 'Référence et fournisseur requis'
    return
  }
  if (delayForm.value.delayDays < 1) {
    delayFormError.value = 'Le retard doit être d\'au moins 1 jour'
    return
  }
  await reportSupplierDelay({
    materialReference: delayForm.value.materialReference,
    supplier: delayForm.value.supplier.trim(),
    delayDays: delayForm.value.delayDays,
    comment: delayForm.value.comment.trim() || undefined
  })
  isDelayModalOpen.value = false
}

function ruptureColor(score: number) {
  if (score >= 80) return 'error' as const
  if (score >= 50) return 'warning' as const
  return 'primary' as const
}

const parts = levels
type Unit = StockUnit
type Part = StockLevel

const unitLabels: Record<Unit, string> = {
  pcs: 'pcs', mm: 'mm', cm: 'cm', m: 'm', kg: 'kg', g: 'g', ml: 'ml', l: 'L'
}

const unitOptions = [
  { label: 'Pièces (pcs)', value: 'pcs' },
  { label: 'Mètres (m)',   value: 'm'   },
  { label: 'Centimètres (cm)', value: 'cm' },
  { label: 'Millimètres (mm)', value: 'mm' },
  { label: 'Kilogrammes (kg)', value: 'kg' },
  { label: 'Grammes (g)',  value: 'g'   },
  { label: 'Millilitres (ml)', value: 'ml' },
  { label: 'Litres (L)',   value: 'l'   },
]

const search     = ref('')
const filter     = ref<'all' | 'low' | 'out'>('all')
const expanded   = ref({})
const expandedId = ref<number | null>(null)

// ── Modals ────────────────────────────────────────────────────────────────────
const isCreateModalOpen  = ref(false)
const isEditModalOpen    = ref(false)
const isDeleteModalOpen  = ref(false)
const createFormError    = ref<string | null>(null)
const editTarget         = ref<Part | null>(null)
const deleteTarget       = ref<Part | null>(null)
const editQty            = ref(0)

const newPart = ref({
  name: '', reference: '', category: '', description: '',
  dimensions: '', qty: 1, unit: 'pcs' as Unit, minQty: 10,
})

function openCreate() {
  newPart.value = { name: '', reference: '', category: '', description: '', dimensions: '', qty: 1, unit: 'pcs', minQty: 10 }
  createFormError.value = null
  isCreateModalOpen.value = true
}

async function confirmCreate() {
  createFormError.value = null
  const parsed = createStockLevelSchema.safeParse(newPart.value)
  if (!parsed.success) {
    createFormError.value = firstZodError(parsed.error)
    return
  }
  await createLevel(parsed.data)
  isCreateModalOpen.value = false
}

// ── Statuts ───────────────────────────────────────────────────────────────────
function getStatus(p: Part): 'ok' | 'low' | 'out' {
  if (p.available === 0) return 'out'
  if (p.available < p.minQty) return 'low'
  return 'ok'
}

const statusConfig = {
  ok:  { label: 'En stock',     color: 'success' as const },
  low: { label: 'Stock faible', color: 'warning' as const },
  out: { label: 'Rupture',      color: 'error'   as const },
}

const filteredParts = computed(() =>
  parts.value.filter(p => {
    const q = search.value.toLowerCase()
    const matchSearch = p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const s = getStatus(p)
    const matchFilter = filter.value === 'all' || (filter.value === 'low' && s === 'low') || (filter.value === 'out' && s === 'out')
    return matchSearch && matchFilter
  })
)

const stats = computed(() => ({
  total:      parts.value.length,
  low:        parts.value.filter(p => getStatus(p) === 'low').length,
  out:        parts.value.filter(p => getStatus(p) === 'out').length,
  categories: new Set(parts.value.map(p => p.category)).size,
}))

const filterButtons = [
  { key: 'all', label: 'Tous',         icon: 'i-lucide-list'           },
  { key: 'low', label: 'Stock faible', icon: 'i-lucide-alert-triangle' },
  { key: 'out', label: 'Rupture',      icon: 'i-lucide-circle-x'       },
] as const

const qtyColor = (p: Part) => {
  const s = getStatus(p)
  if (s === 'out') return 'text-red-500'
  if (s === 'low') return 'text-orange-500'
  return 'text-[#0F62BC]'
}

// ── Colonnes desktop ──────────────────────────────────────────────────────────
const columns: TableColumn<Part>[] = [
  {
    id: 'expand',
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral', variant: 'ghost', size: 'sm',
        icon: 'i-lucide-chevron-down',
        class: 'transition-transform duration-200 ' + (row.getIsExpanded() ? 'rotate-180' : ''),
        onClick: () => row.toggleExpanded(),
      }),
  },
  {
    accessorKey: 'name',
    header: 'Désignation',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-3' }, [
        h('div', { class: 'w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0' }, row.original.emoji),
        h('div', {}, [
          h('p', { class: 'text-sm font-medium text-gray-800' }, row.original.name),
          h('p', { class: 'text-xs text-gray-400 font-mono' }, row.original.reference),
        ]),
      ]),
  },
  {
    accessorKey: 'category',
    header: 'Catégorie',
    cell: ({ row }) => h('span', { class: 'text-sm text-gray-600' }, row.original.category),
  },
  {
    accessorKey: 'dimensions',
    header: 'Dimensions',
    cell: ({ row }) => h('span', { class: 'text-sm font-mono text-gray-600' }, row.original.dimensions),
  },
  {
    accessorKey: 'qty',
    header: 'Quantité',
    cell: ({ row }) => {
      const s = getStatus(row.original)
      const color = s === 'out' ? 'text-red-500' : s === 'low' ? 'text-orange-500' : 'text-[#0F62BC]'
      const p = row.original
      const label = p.reserved > 0
        ? `${p.available} dispo (${p.reserved} rés.)`
        : `${p.available}`
      return h('span', { class: `text-sm font-semibold ${color}` }, `${label} ${unitLabels[p.unit]}`)
    },
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => {
      const s = getStatus(row.original)
      return h(UBadge, { color: statusConfig[s].color, variant: 'subtle' }, () => statusConfig[s].label)
    },
  },
]

function toggleMobile(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function openEdit(p: Part) {
  editTarget.value = { ...p }
  editQty.value = p.qty
  isEditModalOpen.value = true
}

async function confirmEdit() {
  if (!editTarget.value) return
  await updateLevel(editTarget.value.id, editQty.value)
  await refresh()
  isEditModalOpen.value = false
}

function askDelete(p: Part) {
  deleteTarget.value = p
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  if (expandedId.value === id) expandedId.value = null
  await deleteLevel(id)
  isDeleteModalOpen.value = false
  deleteTarget.value = null
}

const isHistoryModalOpen = ref(false)
const historyTarget = ref<Part | null>(null)
const historyItems = ref<StockMovement[]>([])
const historyLoading = ref(false)
const historyError = ref<string | null>(null)

const movementLabels: Record<StockMovement['type'], { label: string, color: 'success' | 'warning' | 'error' | 'neutral', icon: string }> = {
  IN:     { label: 'Entrée',    color: 'success', icon: 'i-lucide-arrow-down-circle' },
  OUT:    { label: 'Sortie',    color: 'error',   icon: 'i-lucide-arrow-up-circle'   },
  ADJUST: { label: 'Ajustement', color: 'neutral', icon: 'i-lucide-equal'             }
}

async function openHistory(p: Part) {
  historyTarget.value = p
  historyItems.value = []
  historyError.value = null
  historyLoading.value = true
  isHistoryModalOpen.value = true
  try {
    historyItems.value = await fetchMovementsFor(p.reference, 50)
  } catch (e) {
    historyError.value = (e as Error)?.message || 'Erreur lors du chargement de l\'historique'
  } finally {
    historyLoading.value = false
  }
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}

const recentSupplierDelays = computed<SupplierDelay[]>(() =>
  [...supplierDelays.value]
    .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
    .slice(0, 5)
)

const isLotsModalOpen = ref(false)
const lotsTarget = ref<Part | null>(null)
const lotsItems = ref<MaterialLot[]>([])
const lotsLoading = ref(false)
const lotsError = ref<string | null>(null)

const isCreateLotModalOpen = ref(false)
const createLotError = ref<string | null>(null)
const newLot = ref({
  lotNumber: '',
  quantity: 1,
  supplier: '',
  supplierLot: '',
  certificateRef: '',
  expiryAt: '',
  location: '',
  notes: ''
})

const lotStatusConfig: Record<MaterialLot['status'], { label: string, color: 'success' | 'warning' | 'error' | 'neutral' }> = {
  ACTIVE:     { label: 'Actif',       color: 'success' },
  QUARANTINE: { label: 'Quarantaine', color: 'warning' },
  EXHAUSTED:  { label: 'Épuisé',      color: 'neutral' },
  EXPIRED:    { label: 'Périmé',      color: 'error'   }
}

async function refreshLotsList() {
  if (!lotsTarget.value) return
  lotsLoading.value = true
  lotsError.value = null
  try {
    lotsItems.value = await fetchLotsFor(lotsTarget.value.reference)
  } catch (e) {
    lotsError.value = (e as Error)?.message || 'Erreur lors du chargement des lots'
  } finally {
    lotsLoading.value = false
  }
}

async function openLots(p: Part) {
  lotsTarget.value = p
  lotsItems.value = []
  isLotsModalOpen.value = true
  await refreshLotsList()
}

function openCreateLot() {
  newLot.value = {
    lotNumber: '',
    quantity: 1,
    supplier: '',
    supplierLot: '',
    certificateRef: '',
    expiryAt: '',
    location: '',
    notes: ''
  }
  createLotError.value = null
  isCreateLotModalOpen.value = true
}

async function confirmCreateLot() {
  if (!lotsTarget.value) return
  createLotError.value = null
  if (!newLot.value.lotNumber.trim() || newLot.value.quantity < 1) {
    createLotError.value = 'Numéro de lot et quantité requis'
    return
  }
  try {
    await createLot({
      materialReference: lotsTarget.value.reference,
      lotNumber: newLot.value.lotNumber.trim(),
      quantity: newLot.value.quantity,
      supplier: newLot.value.supplier.trim() || undefined,
      supplierLot: newLot.value.supplierLot.trim() || undefined,
      certificateRef: newLot.value.certificateRef.trim() || undefined,
      expiryAt: newLot.value.expiryAt ? new Date(newLot.value.expiryAt) : undefined,
      location: newLot.value.location.trim() || undefined,
      notes: newLot.value.notes.trim() || undefined
    })
    isCreateLotModalOpen.value = false
    await refreshLotsList()
  } catch (e) {
    createLotError.value = (e as Error)?.message || 'Erreur lors de la création du lot'
  }
}

function formatDate(d?: Date) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(d)
}

function daysUntilExpiry(lot: MaterialLot): number | null {
  if (!lot.expiryAt) return null
  const diffMs = lot.expiryAt.getTime() - Date.now()
  return Math.floor(diffMs / 86400000)
}

const isTransferModalOpen = ref(false)
const transferError = ref<string | null>(null)
const transferDraft = ref({
  materialReference: '',
  sourceSiteCode: '',
  destSiteCode: '',
  quantity: 1,
  reason: ''
})

function openTransferModal(row: { reference: string, sites: Array<{ siteCode: string, available: number }> }) {
  const sortedSites = [...row.sites].sort((a, b) => b.available - a.available)
  transferDraft.value = {
    materialReference: row.reference,
    sourceSiteCode: sortedSites[0]?.siteCode ?? '',
    destSiteCode: sortedSites.find(s => s.siteCode !== sortedSites[0]?.siteCode)?.siteCode ?? '',
    quantity: 1,
    reason: ''
  }
  transferError.value = null
  isTransferModalOpen.value = true
}

const isPoListModalOpen = ref(false)
const isPoCreateModalOpen = ref(false)
const isPoReceiveModalOpen = ref(false)
const poError = ref<string | null>(null)
const poDraft = ref({
  materialReference: '',
  supplier: '',
  quantity: 1,
  unitPrice: '',
  expectedDate: '',
  notes: ''
})
const poReceiveTarget = ref<PurchaseOrder | null>(null)
const poReceiveQty = ref(1)

const poStatusConfig: Record<PurchaseOrderStatus, { label: string, color: 'success' | 'warning' | 'error' | 'neutral' | 'primary' }> = {
  DRAFT:     { label: 'Brouillon',  color: 'neutral' },
  ORDERED:   { label: 'Commandée',  color: 'primary' },
  PARTIAL:   { label: 'Partielle',  color: 'warning' },
  RECEIVED:  { label: 'Reçue',      color: 'success' },
  CANCELLED: { label: 'Annulée',    color: 'error'   }
}

const openPurchaseOrders = computed(() =>
  purchaseOrders.value.filter(o => o.status === 'ORDERED' || o.status === 'PARTIAL')
)

function openPoList() {
  isPoListModalOpen.value = true
  refreshPurchaseOrders()
}

function openPoCreate(reference?: string) {
  const part = reference ? parts.value.find(p => p.reference === reference) : null
  poDraft.value = {
    materialReference: reference ?? parts.value[0]?.reference ?? '',
    supplier: part ? '' : '',
    quantity: part ? Math.max(part.minQty, 10) : 10,
    unitPrice: '',
    expectedDate: '',
    notes: ''
  }
  poError.value = null
  isPoCreateModalOpen.value = true
}

async function confirmCreatePo() {
  poError.value = null
  if (!poDraft.value.materialReference || !poDraft.value.supplier.trim() || poDraft.value.quantity < 1) {
    poError.value = 'Référence, fournisseur et quantité requis'
    return
  }
  try {
    await createPurchaseOrder({
      materialReference: poDraft.value.materialReference,
      supplier: poDraft.value.supplier.trim(),
      quantity: poDraft.value.quantity,
      unitPrice: poDraft.value.unitPrice ? Number(poDraft.value.unitPrice) : undefined,
      expectedDate: poDraft.value.expectedDate ? new Date(poDraft.value.expectedDate) : undefined,
      notes: poDraft.value.notes.trim() || undefined
    })
    isPoCreateModalOpen.value = false
  } catch (e) {
    poError.value = (e as Error)?.message || 'Erreur lors de la création de la commande'
  }
}

function openPoReceive(order: PurchaseOrder) {
  poReceiveTarget.value = order
  poReceiveQty.value = order.quantity - order.receivedQty
  poError.value = null
  isPoReceiveModalOpen.value = true
}

async function confirmReceivePo() {
  if (!poReceiveTarget.value) return
  poError.value = null
  try {
    await receivePurchaseOrder(poReceiveTarget.value.id, poReceiveQty.value)
    isPoReceiveModalOpen.value = false
    poReceiveTarget.value = null
  } catch (e) {
    poError.value = (e as Error)?.message || 'Erreur lors de la réception'
  }
}

async function confirmTransfer() {
  transferError.value = null
  if (!transferDraft.value.sourceSiteCode || !transferDraft.value.destSiteCode) {
    transferError.value = 'Site source et destination requis'
    return
  }
  if (transferDraft.value.sourceSiteCode === transferDraft.value.destSiteCode) {
    transferError.value = 'Les sites source et destination doivent différer'
    return
  }
  if (transferDraft.value.quantity < 1) {
    transferError.value = 'Quantité doit être ≥ 1'
    return
  }
  try {
    await transferStock({
      materialReference: transferDraft.value.materialReference,
      sourceSiteCode: transferDraft.value.sourceSiteCode,
      destSiteCode: transferDraft.value.destSiteCode,
      quantity: transferDraft.value.quantity,
      reason: transferDraft.value.reason.trim() || undefined
    })
    isTransferModalOpen.value = false
    await refreshConsolidated()
  } catch (e) {
    transferError.value = (e as Error)?.message || 'Erreur lors du transfert'
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl">

      <!-- Header -->
      <div class="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#0F62BC]">Stock pièces & matières</h1>
          <p class="text-xs sm:text-sm text-gray-400 mt-0.5">{{ pageSubtitle || 'Composants, visserie, matières premières' }}</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 shrink-0">
          <UButton
            v-if="canViewConsolidatedStock"
            :icon="viewMode === 'consolidated' ? 'i-lucide-layout-grid' : 'i-lucide-globe'"
            size="sm"
            :variant="viewMode === 'consolidated' ? 'solid' : 'outline'"
            :class="viewMode === 'consolidated' ? 'bg-[#0F62BC] text-white border-[#0F62BC]' : ''"
            @click="toggleConsolidated"
          >
            {{ viewMode === 'consolidated' ? 'Vue par site' : 'Vue consolidée' }}
          </UButton>
          <template v-if="canManageStock">
            <UButton icon="i-lucide-truck" size="sm" variant="outline" @click="openDelayModal">
              Retard fournisseur
            </UButton>
            <UButton icon="i-lucide-plus" size="sm" class="bg-[#F57C00] hover:bg-[#e06d00] text-white font-medium" @click="openCreate">
              <span class="hidden sm:inline">Ajouter une pièce</span>
              <span class="sm:hidden">Ajouter</span>
            </UButton>
          </template>
        </div>
      </div>

      <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />
      <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="refresh">Réessayer</UButton>

      <div v-if="status === 'pending'" class="space-y-3 mb-5">
        <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
      </div>

      <!-- Stats -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Références</p>
          <p class="text-xl sm:text-2xl font-semibold text-[#0F62BC]">{{ stats.total }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Catégories</p>
          <p class="text-xl sm:text-2xl font-semibold text-[#0F62BC]">{{ stats.categories }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Stock faible</p>
          <p class="text-xl sm:text-2xl font-semibold text-[#F57C00]">{{ stats.low }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">En rupture</p>
          <p class="text-xl sm:text-2xl font-semibold text-red-500">{{ stats.out }}</p>
        </div>
      </div>

      <UCard v-if="status !== 'pending' && alerts.length > 0" class="border-none shadow-sm mb-5">
        <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <UIcon name="i-lucide-bell-ring" class="text-red-500" />
          Alertes stock (gateway)
        </h2>
        <ul class="space-y-2">
          <li
            v-for="alert in alerts.slice(0, 6)"
            :key="alert.id"
            class="text-sm flex items-start gap-2"
          >
            <UBadge :color="alert.severity === 'critical' ? 'error' : 'warning'" variant="soft" size="xs">
              {{ alert.materialCode }}
            </UBadge>
            <span class="text-gray-600">{{ alert.message }}</span>
          </li>
        </ul>
      </UCard>

      <UCard v-if="status !== 'pending' && topRuptureRisks.length > 0" class="border-none shadow-sm mb-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UIcon name="i-lucide-gauge" class="text-[#F57C00]" />
            Prévision de rupture (30 j)
          </h2>
          <UButton size="xs" variant="ghost" icon="i-lucide-refresh-cw" @click="refresh" />
        </div>
        <div class="space-y-3">
          <div v-for="item in topRuptureRisks" :key="item.reference">
            <div class="flex justify-between text-xs mb-1">
              <span class="font-medium text-gray-700 truncate">{{ item.name }}</span>
              <span class="font-mono text-gray-400 ml-2">{{ item.reference }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UProgress :model-value="item.score" :max="100" :color="ruptureColor(item.score)" size="sm" class="flex-1" />
              <span class="text-xs font-bold w-8 text-right">{{ item.score }}</span>
              <UButton
                v-if="canManageStock"
                size="xs"
                variant="outline"
                icon="i-lucide-shopping-cart"
                color="primary"
                @click="openPoCreate(item.reference)"
              >
                Commander
              </UButton>
            </div>
            <p class="text-[11px] text-gray-400 mt-0.5">
              {{ item.available }} {{ item.unit }} dispo
              <span v-if="item.estimatedDaysUntilRupture !== null"> — ~{{ item.estimatedDaysUntilRupture }} j restants</span>
            </p>
          </div>
        </div>
      </UCard>

      <UCard v-if="canManageStock && status !== 'pending' && openPurchaseOrders.length > 0" class="border-none shadow-sm mb-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UIcon name="i-lucide-shopping-cart" class="text-[#0F62BC]" />
            Commandes en cours ({{ openPurchaseOrders.length }})
          </h2>
          <UButton size="xs" variant="ghost" @click="openPoList">Voir tout</UButton>
        </div>
        <ul class="space-y-2">
          <li
            v-for="po in openPurchaseOrders.slice(0, 5)"
            :key="po.id"
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <UBadge :color="poStatusConfig[po.status].color" variant="subtle" size="xs">
                {{ poStatusConfig[po.status].label }}
              </UBadge>
              <span class="font-mono text-xs text-gray-500">{{ po.poNumber }}</span>
              <span class="text-gray-700 truncate">{{ po.materialReference }}</span>
              <span class="text-xs text-gray-400">— {{ po.supplier }}</span>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-xs tabular-nums text-gray-600">{{ po.receivedQty }} / {{ po.quantity }}</span>
              <UButton
                size="xs"
                variant="outline"
                color="success"
                icon="i-lucide-package-check"
                @click="openPoReceive(po)"
              >
                Réceptionner
              </UButton>
            </div>
          </li>
        </ul>
      </UCard>

      <UCard v-if="status !== 'pending' && recentSupplierDelays.length > 0" class="border-none shadow-sm mb-5">
        <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <UIcon name="i-lucide-truck" class="text-[#F57C00]" />
          Retards fournisseur ({{ recentSupplierDelays.length }})
        </h2>
        <ul class="space-y-2">
          <li
            v-for="d in recentSupplierDelays"
            :key="d.id"
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
          >
            <div class="flex items-center gap-2 min-w-0">
              <UBadge color="warning" variant="soft" size="xs">{{ d.materialReference }}</UBadge>
              <span class="text-gray-700 truncate">{{ d.materialName }}</span>
              <span class="text-xs text-gray-400 truncate">— {{ d.supplier }}</span>
            </div>
            <div class="text-xs text-gray-500 shrink-0">
              <span class="font-semibold text-orange-600">+{{ d.delayDays }} j</span>
              <span class="mx-1.5">·</span>
              <span>{{ formatDateTime(d.reportedAt) }}</span>
            </div>
          </li>
        </ul>
      </UCard>

      <div v-if="status !== 'pending' && activeReservations.length > 0" class="mb-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <UIcon name="i-lucide-bookmark" class="text-indigo-500" />
          Réservations actives ({{ activeReservations.length }})
        </h2>
        <div class="space-y-2">
          <div
            v-for="group in reservationsByOf"
            :key="group.ofId"
            class="bg-white/70 border rounded-xl overflow-hidden transition-colors duration-150"
            :class="isReservationOfOpen(group.ofId) ? 'border-indigo-200' : 'border-gray-100 shadow-sm'"
          >
            <button
              type="button"
              class="w-full flex items-center gap-3 px-3 py-3 text-left"
              @click="toggleReservationOf(group.ofId)"
            >
              <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <UIcon name="i-lucide-clipboard-list" class="text-indigo-500 text-base" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">
                  OF <span class="font-mono text-indigo-600">{{ group.ofId }}</span>
                </p>
                <p class="text-xs text-gray-400">
                  {{ group.items.length }} matière{{ group.items.length > 1 ? 's' : '' }} réservée{{ group.items.length > 1 ? 's' : '' }}
                </p>
              </div>
              <UBadge color="primary" variant="subtle" size="xs" class="shrink-0">
                {{ group.items.reduce((sum, r) => sum + r.quantity, 0) }} unités
              </UBadge>
              <UIcon
                name="i-lucide-chevron-down"
                class="flex-shrink-0 text-gray-400 text-base transition-transform duration-200"
                :class="isReservationOfOpen(group.ofId) ? 'rotate-180' : ''"
              />
            </button>

            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-96"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 max-h-96"
              leave-to-class="opacity-0 max-h-0"
            >
              <ul v-if="isReservationOfOpen(group.ofId)" class="border-t border-gray-100 divide-y divide-gray-50">
                <li
                  v-for="res in group.items"
                  :key="res.id"
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2.5 text-sm bg-gray-50/40"
                >
                  <div class="min-w-0">
                    <span class="font-medium text-gray-800">{{ res.materialName }}</span>
                    <span class="text-xs font-mono text-gray-400 ml-2">{{ res.materialId }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                    <span class="font-semibold tabular-nums text-gray-700">{{ res.quantity }} {{ res.unit }}</span>
                    <NuxtLink
                      :to="`/bom?of=${encodeURIComponent(group.ofId)}`"
                      class="text-indigo-600 hover:text-indigo-800 font-medium"
                      @click.stop
                    >
                      Voir OF
                    </NuxtLink>
                  </div>
                </li>
              </ul>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Vue consolidée multi-sites -->
      <div v-if="status !== 'pending' && viewMode === 'consolidated'" class="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <UIcon name="i-lucide-globe" class="text-[#0F62BC]" />
              Vision consolidée multi-sites
            </h2>
            <p class="text-xs text-gray-400 mt-0.5">Stock agrégé par référence sur tous les sites</p>
          </div>
          <UButton size="xs" variant="ghost" icon="i-lucide-refresh-cw" @click="refreshConsolidated">Actualiser</UButton>
        </div>
        <div v-if="consolidatedLevels.length === 0" class="text-center py-12 text-sm text-gray-400">
          Aucune référence consolidée disponible.
        </div>
        <ul v-else class="divide-y divide-gray-100">
          <li v-for="row in consolidatedLevels" :key="row.reference" class="p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ row.name }}</p>
                <p class="text-xs font-mono text-gray-400">{{ row.reference }}</p>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <div class="text-right">
                  <p class="text-sm font-semibold tabular-nums" :class="row.available === 0 ? 'text-red-500' : row.available < row.minimum ? 'text-orange-500' : 'text-[#0F62BC]'">
                    {{ row.available }} {{ row.unit }}
                  </p>
                  <p class="text-xs text-gray-400">
                    dispo · {{ row.current }} total · {{ row.reserved }} rés.
                  </p>
                </div>
                <UButton
                  v-if="canManageStock && row.sites.length >= 2"
                  size="xs"
                  variant="outline"
                  icon="i-lucide-arrow-right-left"
                  @click="openTransferModal(row)"
                >
                  Transférer
                </UButton>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
              <div
                v-for="site in row.sites"
                :key="site.siteCode"
                class="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-1.5"
              >
                <span class="text-xs font-mono text-gray-500">{{ site.siteCode }}</span>
                <span class="text-xs font-semibold tabular-nums" :class="site.available === 0 ? 'text-red-500' : site.available < site.minimum ? 'text-orange-500' : 'text-gray-700'">
                  {{ site.available }} / {{ site.current }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- Toolbar -->
      <div v-if="status !== 'pending' && viewMode === 'site'" class="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Référence, désignation, catégorie…" class="w-full sm:flex-1" />
        <div class="flex gap-1 w-full sm:w-auto">
          <UButton
            v-for="btn in filterButtons" :key="btn.key"
            :icon="btn.icon"
            :variant="filter === btn.key ? 'solid' : 'outline'"
            :class="['flex-1 sm:flex-none justify-center', filter === btn.key ? 'bg-[#0F62BC] text-white border-[#0F62BC]' : 'text-gray-500 border-gray-200 hover:border-[#0F62BC] hover:text-[#0F62BC]']"
            size="sm"
            @click="filter = btn.key"
          >
            <span class="sm:hidden text-xs">{{ btn.label.split(' ')[0] }}</span>
            <span class="hidden sm:inline">{{ btn.label }}</span>
          </UButton>
        </div>
      </div>

      <!-- MOBILE -->
      <div v-if="status !== 'pending' && viewMode === 'site'" class="flex sm:hidden flex-col gap-2">
        <div
          v-for="p in filteredParts" :key="p.id"
          class="bg-white/70 border rounded-xl overflow-hidden transition-colors duration-150"
          :class="expandedId === p.id ? 'border-[#0F62BC]/30' : 'border-gray-100'"
        >
          <button class="w-full flex items-center gap-3 px-3 py-3 text-left" @click="toggleMobile(p.id)">
            <div class="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">{{ p.emoji }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ p.name }}</p>
              <p class="text-xs font-mono text-gray-400">{{ p.reference }}</p>
            </div>
            <UBadge :color="statusConfig[getStatus(p)].color" variant="subtle" class="text-xs flex-shrink-0">
              {{ statusConfig[getStatus(p)].label }}
            </UBadge>
            <UIcon name="i-lucide-chevron-down" class="flex-shrink-0 text-gray-400 text-base transition-transform duration-200" :class="expandedId === p.id ? 'rotate-180' : ''" />
          </button>

          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-96"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 max-h-96"
            leave-to-class="opacity-0 max-h-0"
          >
            <div v-if="expandedId === p.id" class="border-t border-gray-100 px-3 py-3 bg-gray-50/50 space-y-3">
              <div class="w-full h-28 rounded-lg bg-gray-100 flex items-center justify-center text-4xl">{{ p.emoji }}</div>
              <div>
                <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Description</p>
                <p class="text-xs text-gray-600 leading-relaxed">{{ p.description }}</p>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p class="text-[10px] text-gray-400 mb-0.5">Catégorie</p>
                  <p class="text-xs font-medium text-gray-700">{{ p.category }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 mb-0.5">Quantité</p>
                  <p :class="['text-sm font-semibold', qtyColor(p)]">{{ p.qty }} <span class="text-xs font-normal">{{ unitLabels[p.unit] }}</span></p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 mb-0.5">Dimensions</p>
                  <p class="text-xs font-mono text-gray-700">{{ p.dimensions }}</p>
                </div>
              </div>
              <div class="flex gap-2 flex-wrap">
                <UButton icon="i-lucide-history" variant="outline" color="neutral" size="xs" class="flex-1 justify-center" @click="openHistory(p)">Historique</UButton>
                <UButton icon="i-lucide-package-2" variant="outline" color="primary" size="xs" class="flex-1 justify-center" @click="openLots(p)">Lots</UButton>
                <template v-if="canManageStock">
                  <UButton icon="i-lucide-pencil" variant="outline" color="neutral" size="xs" class="flex-1 justify-center" @click="openEdit(p)">Modifier</UButton>
                  <UButton icon="i-lucide-trash-2" variant="outline" color="error" size="xs" class="flex-1 justify-center" @click="askDelete(p)">Supprimer</UButton>
                </template>
              </div>
            </div>
          </Transition>
        </div>
        <div v-if="filteredParts.length === 0" class="text-center py-12 text-gray-400 text-sm">Aucune pièce trouvée.</div>
      </div>

      <!-- DESKTOP -->
      <div v-if="status !== 'pending' && viewMode === 'site'" class="hidden sm:block bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl overflow-x-auto">
        <UTable v-model:expanded="expanded" :data="filteredParts" :columns="columns" class="w-full">
          <template #expanded="{ row }">
            <div class="px-6 py-4 bg-gray-50/60 border-t border-gray-100">
              <div class="flex gap-6">
                <div class="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-4xl flex-shrink-0">{{ row.original.emoji }}</div>
                <div class="flex-1 min-w-0 space-y-2">
                  <div>
                    <p class="text-xs text-gray-400 mb-0.5">Description</p>
                    <p class="text-sm text-gray-600 leading-relaxed">{{ row.original.description }}</p>
                  </div>
                  <div class="flex gap-6 flex-wrap">
                    <div>
                      <p class="text-xs text-gray-400 mb-0.5">Seuil minimum</p>
                      <p class="text-sm font-medium text-gray-700">{{ row.original.minQty }} {{ unitLabels[row.original.unit] }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400 mb-0.5">Dimensions</p>
                      <p class="text-sm font-mono text-gray-700">{{ row.original.dimensions }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400 mb-0.5">Référence</p>
                      <p class="text-sm font-mono text-gray-700">{{ row.original.reference }}</p>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col gap-2 flex-shrink-0">
                  <UButton icon="i-lucide-history" variant="outline" color="neutral" size="sm" @click="openHistory(row.original)">Historique</UButton>
                  <UButton icon="i-lucide-package-2" variant="outline" color="primary" size="sm" @click="openLots(row.original)">Lots</UButton>
                  <template v-if="canManageStock">
                    <UButton icon="i-lucide-pencil" variant="outline" color="neutral" size="sm" @click="openEdit(row.original)">Modifier</UButton>
                    <UButton icon="i-lucide-trash-2" variant="outline" color="error" size="sm" @click="askDelete(row.original)">Supprimer</UButton>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </UTable>
        <div v-if="filteredParts.length === 0" class="text-center py-12 text-gray-400 text-sm">Aucune pièce trouvée.</div>
      </div>

    <!-- ═══ Modal : Ajouter une pièce ═══ -->
    <UModal v-model:open="isCreateModalOpen" :ui="modalUi('lg')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="spare-create-title">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/8 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-package-plus" class="text-[#0F62BC] text-lg" />
            </div>
            <div>
              <h3 id="spare-create-title" class="text-base font-semibold text-gray-800">Ajouter une pièce</h3>
              <p class="text-xs text-gray-400 mt-0.5">Enregistrer une nouvelle référence au stock</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="Désignation *" name="name" class="col-span-2">
              <UInput v-model="newPart.name" placeholder="Ex : Roulement 6205-ZZ" class="w-full" />
            </UFormField>

            <UFormField label="Référence *" name="reference">
              <UInput v-model="newPart.reference" placeholder="Ex : RLM-6205-ZZ" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Catégorie" name="category">
              <UInput v-model="newPart.category" placeholder="Ex : Roulements" class="w-full" />
            </UFormField>

            <UFormField label="Quantité initiale" name="qty">
              <UInput v-model.number="newPart.qty" type="number" min="0" class="w-full" />
            </UFormField>

            <UFormField label="Unité" name="unit">
              <USelect v-model="newPart.unit" :items="unitOptions" value-key="value" class="w-full" />
            </UFormField>

            <UFormField label="Seuil minimum" name="minQty">
              <UInput v-model.number="newPart.minQty" type="number" min="0" class="w-full" />
            </UFormField>

            <UFormField label="Dimensions" name="dimensions">
              <UInput v-model="newPart.dimensions" placeholder="Ex : M6 × 20 mm" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Description" name="description" class="col-span-2">
              <UTextarea v-model="newPart.description" placeholder="Matériau, tolérances, résistances…" :rows="3" class="w-full" />
            </UFormField>
          </div>

          <p v-if="createFormError" class="text-red-500 text-sm mt-3">{{ createFormError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-plus"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              :loading="isMutating"
              aria-label="Ajouter la pièce au stock"
              @click="confirmCreate"
            >
              Ajouter la pièce
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Modifier quantité ═══ -->
    <UModal v-model:open="isEditModalOpen" :ui="modalUi('sm')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="spare-edit-title">
          <h3 id="spare-edit-title" class="text-lg font-semibold text-[#0F62BC] mb-1">Modifier la quantité</h3>
          <p v-if="editTarget" class="text-sm text-gray-400 mb-4">
            {{ editTarget.name }} — <span class="font-mono">{{ editTarget.reference }}</span>
          </p>
          <UFormField label="Quantité" name="qty">
            <UInput v-model.number="editQty" type="number" min="0" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 mt-5">
            <UButton variant="ghost" color="neutral" @click="isEditModalOpen = false">Annuler</UButton>
            <UButton class="bg-[#F57C00] hover:bg-[#e06d00] text-white" :loading="isMutating" @click="confirmEdit">Confirmer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Supprimer ═══ -->
    <UModal v-model:open="isDeleteModalOpen" :ui="modalUi('sm')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="spare-delete-title">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-trash-2" class="text-red-500 text-lg" />
            </div>
            <div>
              <h3 id="spare-delete-title" class="text-base font-semibold text-gray-800">Supprimer la pièce</h3>
              <p v-if="deleteTarget" class="text-sm text-gray-400 font-mono mt-0.5">{{ deleteTarget.reference }}</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-5">Cette action est irréversible. La pièce <span class="font-medium text-gray-800">{{ deleteTarget?.name }}</span> sera définitivement supprimée du stock.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="isDeleteModalOpen = false">Annuler</UButton>
            <UButton icon="i-lucide-trash-2" color="error" aria-label="Confirmer la suppression" @click="confirmDelete">Supprimer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Liste des commandes d'achat ═══ -->
    <UModal v-model:open="isPoListModalOpen" :ui="modalUi('2xl')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="po-list-title">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/8 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-shopping-cart" class="text-[#0F62BC] text-lg" />
            </div>
            <div class="flex-1">
              <h3 id="po-list-title" class="text-base font-semibold text-gray-800">Commandes d'achat</h3>
              <p class="text-xs text-gray-400 mt-0.5">Suivi des réapprovisionnements</p>
            </div>
            <UButton
              icon="i-lucide-plus"
              size="sm"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white"
              @click="openPoCreate()"
            >
              Nouvelle commande
            </UButton>
          </div>

          <div v-if="purchaseOrders.length === 0" class="text-center py-10 text-sm text-gray-400">
            Aucune commande d'achat enregistrée.
          </div>

          <ul v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
            <li
              v-for="po in purchaseOrders"
              :key="po.id"
              class="border border-gray-100 rounded-xl p-3 bg-white/70"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs text-gray-500">{{ po.poNumber }}</span>
                    <UBadge :color="poStatusConfig[po.status].color" variant="subtle" size="xs">
                      {{ poStatusConfig[po.status].label }}
                    </UBadge>
                  </div>
                  <p class="text-sm font-medium text-gray-800 mt-1">{{ po.materialName }}</p>
                  <p class="text-xs text-gray-500">{{ po.supplier }}<span v-if="po.expectedDate"> · Prévue le {{ formatDate(po.expectedDate) }}</span></p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-semibold text-[#0F62BC] tabular-nums">
                    {{ po.receivedQty }} / {{ po.quantity }}
                  </p>
                  <p class="text-[11px] text-gray-400">reçu</p>
                </div>
              </div>
              <div v-if="po.status === 'ORDERED' || po.status === 'PARTIAL'" class="flex justify-end">
                <UButton
                  size="xs"
                  variant="outline"
                  color="success"
                  icon="i-lucide-package-check"
                  @click="openPoReceive(po)"
                >
                  Réceptionner
                </UButton>
              </div>
            </li>
          </ul>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isPoListModalOpen = false">Fermer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Création commande d'achat ═══ -->
    <UModal v-model:open="isPoCreateModalOpen" :ui="modalUi('lg')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="po-create-title">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-[#F57C00]/10 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-shopping-cart" class="text-[#F57C00] text-lg" />
            </div>
            <div>
              <h3 id="po-create-title" class="text-base font-semibold text-gray-800">Nouvelle commande d'achat</h3>
              <p class="text-xs text-gray-400 mt-0.5">Réapprovisionnement matière</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="Référence matière *" name="materialReference" class="sm:col-span-2">
              <UInput v-model="poDraft.materialReference" placeholder="MAT-004" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Fournisseur *" name="supplier">
              <UInput v-model="poDraft.supplier" placeholder="Ex : Aubert & Duval" class="w-full" />
            </UFormField>

            <UFormField label="Quantité *" name="quantity">
              <UInput v-model.number="poDraft.quantity" type="number" min="1" class="w-full" />
            </UFormField>

            <UFormField label="Prix unitaire (€)" name="unitPrice">
              <UInput v-model="poDraft.unitPrice" type="number" min="0" step="0.01" class="w-full" />
            </UFormField>

            <UFormField label="Date prévue de livraison" name="expectedDate">
              <UInput v-model="poDraft.expectedDate" type="date" class="w-full" />
            </UFormField>

            <UFormField label="Notes" name="notes" class="sm:col-span-2">
              <UTextarea v-model="poDraft.notes" :rows="2" placeholder="Conditions, références…" class="w-full" />
            </UFormField>
          </div>

          <p v-if="poError" class="text-red-500 text-sm mt-3" role="alert">{{ poError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isPoCreateModalOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-check"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              :loading="isMutating"
              @click="confirmCreatePo"
            >
              Créer la commande
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Réception PO ═══ -->
    <UModal v-model:open="isPoReceiveModalOpen" :ui="modalUi('md')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="po-receive-title">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-package-check" class="text-green-600 text-lg" />
            </div>
            <div>
              <h3 id="po-receive-title" class="text-base font-semibold text-gray-800">Réception de commande</h3>
              <p v-if="poReceiveTarget" class="text-xs text-gray-400 mt-0.5 font-mono">
                {{ poReceiveTarget.poNumber }} — {{ poReceiveTarget.materialReference }}
              </p>
            </div>
          </div>

          <p v-if="poReceiveTarget" class="text-sm text-gray-600 mb-4">
            Commande : <span class="font-semibold">{{ poReceiveTarget.quantity }}</span> — déjà reçu : <span class="font-semibold">{{ poReceiveTarget.receivedQty }}</span>
            <br>Reste à réceptionner : <span class="font-semibold text-orange-600">{{ poReceiveTarget.quantity - poReceiveTarget.receivedQty }}</span>
          </p>

          <UFormField label="Quantité reçue *" name="receivedQty">
            <UInput v-model.number="poReceiveQty" type="number" min="1" :max="poReceiveTarget ? poReceiveTarget.quantity - poReceiveTarget.receivedQty : undefined" class="w-full" />
          </UFormField>

          <p v-if="poError" class="text-red-500 text-sm mt-3" role="alert">{{ poError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isPoReceiveModalOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-package-check"
              class="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              :loading="isMutating"
              @click="confirmReceivePo"
            >
              Confirmer réception
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Transfert inter-sites ═══ -->
    <UModal v-model:open="isTransferModalOpen" :ui="modalUi('md')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="transfer-title">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/8 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-arrow-right-left" class="text-[#0F62BC] text-lg" />
            </div>
            <div>
              <h3 id="transfer-title" class="text-base font-semibold text-gray-800">Transfert inter-sites</h3>
              <p class="text-xs text-gray-400 mt-0.5 font-mono">{{ transferDraft.materialReference }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="Site source *" name="sourceSiteCode">
              <UInput v-model="transferDraft.sourceSiteCode" placeholder="SITE-LYO" class="font-mono" />
            </UFormField>
            <UFormField label="Site destination *" name="destSiteCode">
              <UInput v-model="transferDraft.destSiteCode" placeholder="SITE-PAR" class="font-mono" />
            </UFormField>
            <UFormField label="Quantité *" name="quantity">
              <UInput v-model.number="transferDraft.quantity" type="number" min="1" />
            </UFormField>
            <UFormField label="Motif" name="reason" class="sm:col-span-2">
              <UInput v-model="transferDraft.reason" placeholder="Réapprovisionnement urgent…" />
            </UFormField>
          </div>

          <p v-if="transferError" class="text-red-500 text-sm mt-3" role="alert">{{ transferError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isTransferModalOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-arrow-right-left"
              class="bg-[#0F62BC] hover:bg-[#0d56a6] text-white w-full sm:w-auto"
              :loading="isMutating"
              @click="confirmTransfer"
            >
              Transférer
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Lots matière (traçabilité aéro) ═══ -->
    <UModal v-model:open="isLotsModalOpen" :ui="modalUi('2xl')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="lots-title">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/8 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-package-2" class="text-[#0F62BC] text-lg" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 id="lots-title" class="text-base font-semibold text-gray-800">Lots de matière</h3>
              <p v-if="lotsTarget" class="text-xs text-gray-400 mt-0.5">
                {{ lotsTarget.name }} — <span class="font-mono">{{ lotsTarget.reference }}</span>
              </p>
            </div>
            <UButton
              v-if="canManageStock"
              icon="i-lucide-plus"
              size="sm"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white"
              @click="openCreateLot"
            >
              Réception lot
            </UButton>
          </div>

          <div v-if="lotsLoading" class="space-y-2 py-4">
            <USkeleton v-for="i in 3" :key="i" class="h-20 w-full" />
          </div>

          <UAlert v-else-if="lotsError" color="error" variant="soft" :title="lotsError" class="mb-3" />

          <div v-else-if="lotsItems.length === 0" class="text-center py-10 text-sm text-gray-400">
            Aucun lot enregistré pour cette référence.
          </div>

          <ul v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
            <li
              v-for="lot in lotsItems"
              :key="lot.id"
              class="border border-gray-100 rounded-xl p-3 bg-white/70"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-800 font-mono">{{ lot.lotNumber }}</span>
                    <UBadge :color="lotStatusConfig[lot.status].color" variant="subtle" size="xs">
                      {{ lotStatusConfig[lot.status].label }}
                    </UBadge>
                  </div>
                  <p v-if="lot.supplier" class="text-xs text-gray-500 mt-0.5">{{ lot.supplier }}<span v-if="lot.supplierLot"> · Lot fournisseur {{ lot.supplierLot }}</span></p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-semibold text-[#0F62BC] tabular-nums">
                    {{ lot.remainingQty }} / {{ lot.quantity }}
                  </p>
                  <p class="text-[11px] text-gray-400">restant</p>
                </div>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <p class="text-gray-400">Réception</p>
                  <p class="text-gray-700">{{ formatDate(lot.receivedAt) }}</p>
                </div>
                <div>
                  <p class="text-gray-400">DLC</p>
                  <p :class="['text-gray-700', daysUntilExpiry(lot) !== null && daysUntilExpiry(lot)! < 30 ? 'text-orange-600 font-medium' : '']">
                    {{ formatDate(lot.expiryAt) }}
                    <span v-if="daysUntilExpiry(lot) !== null && daysUntilExpiry(lot)! < 30" class="text-[10px] block">
                      <span v-if="daysUntilExpiry(lot)! < 0">expiré</span>
                      <span v-else>dans {{ daysUntilExpiry(lot) }} j</span>
                    </span>
                  </p>
                </div>
                <div>
                  <p class="text-gray-400">Emplacement</p>
                  <p class="text-gray-700 font-mono">{{ lot.location || '—' }}</p>
                </div>
                <div>
                  <p class="text-gray-400">Certificat</p>
                  <p class="text-gray-700 font-mono">{{ lot.certificateRef || '—' }}</p>
                </div>
              </div>
            </li>
          </ul>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isLotsModalOpen = false">Fermer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Réception d'un nouveau lot ═══ -->
    <UModal v-model:open="isCreateLotModalOpen" :ui="modalUi('lg')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="create-lot-title">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-[#F57C00]/10 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-arrow-down-circle" class="text-[#F57C00] text-lg" />
            </div>
            <div>
              <h3 id="create-lot-title" class="text-base font-semibold text-gray-800">Réception lot matière</h3>
              <p v-if="lotsTarget" class="text-xs text-gray-400 mt-0.5">
                {{ lotsTarget.name }} — <span class="font-mono">{{ lotsTarget.reference }}</span>
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="N° de lot interne *" name="lotNumber" class="sm:col-span-2">
              <UInput v-model="newLot.lotNumber" placeholder="Ex : LOT-2026-001" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Quantité reçue *" name="quantity">
              <UInput v-model.number="newLot.quantity" type="number" min="1" class="w-full" />
            </UFormField>

            <UFormField label="DLC / Date péremption" name="expiryAt">
              <UInput v-model="newLot.expiryAt" type="date" class="w-full" />
            </UFormField>

            <UFormField label="Fournisseur" name="supplier">
              <UInput v-model="newLot.supplier" placeholder="Ex : SKF Aerospace" class="w-full" />
            </UFormField>

            <UFormField label="Lot fournisseur" name="supplierLot">
              <UInput v-model="newLot.supplierLot" placeholder="Ex : SKF-2026-A12" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Réf. certificat matière" name="certificateRef">
              <UInput v-model="newLot.certificateRef" placeholder="Ex : EN10204-3.1" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Emplacement (rack / bin)" name="location">
              <UInput v-model="newLot.location" placeholder="Ex : A12-R03" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Notes" name="notes" class="sm:col-span-2">
              <UTextarea v-model="newLot.notes" :rows="2" placeholder="Observations particulières…" class="w-full" />
            </UFormField>
          </div>

          <p v-if="createLotError" class="text-red-500 text-sm mt-3" role="alert">{{ createLotError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isCreateLotModalOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-check"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              :loading="isMutating"
              @click="confirmCreateLot"
            >
              Réceptionner
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Historique des mouvements ═══ -->
    <UModal v-model:open="isHistoryModalOpen" :ui="modalUi('lg')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="history-title">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/8 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-history" class="text-[#0F62BC] text-lg" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 id="history-title" class="text-base font-semibold text-gray-800">Historique des mouvements</h3>
              <p v-if="historyTarget" class="text-xs text-gray-400 mt-0.5">
                {{ historyTarget.name }} — <span class="font-mono">{{ historyTarget.reference }}</span>
              </p>
            </div>
          </div>

          <div v-if="historyLoading" class="space-y-2 py-4">
            <USkeleton v-for="i in 4" :key="i" class="h-12 w-full" />
          </div>

          <UAlert v-else-if="historyError" color="error" variant="soft" :title="historyError" class="mb-3" />

          <div v-else-if="historyItems.length === 0" class="text-center py-10 text-sm text-gray-400">
            Aucun mouvement enregistré pour cette référence.
          </div>

          <ul v-else class="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            <li
              v-for="mv in historyItems"
              :key="mv.id"
              class="flex items-center gap-3 py-2.5"
            >
              <UIcon :name="movementLabels[mv.type].icon" :class="['text-lg shrink-0',
                mv.type === 'IN' ? 'text-green-600' : mv.type === 'OUT' ? 'text-red-500' : 'text-gray-500']" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <UBadge :color="movementLabels[mv.type].color" variant="subtle" size="xs">
                    {{ movementLabels[mv.type].label }}
                  </UBadge>
                  <span class="text-sm font-semibold tabular-nums" :class="mv.type === 'OUT' ? 'text-red-600' : mv.type === 'IN' ? 'text-green-700' : 'text-gray-700'">
                    {{ mv.type === 'OUT' ? '-' : mv.type === 'IN' ? '+' : '' }}{{ mv.quantity }}
                  </span>
                  <span v-if="mv.ofId" class="text-xs font-mono text-indigo-600">OF {{ mv.ofId }}</span>
                </div>
                <p v-if="mv.reason" class="text-xs text-gray-500 mt-0.5">{{ mv.reason }}</p>
              </div>
              <span class="text-xs text-gray-400 shrink-0 tabular-nums">{{ formatDateTime(mv.createdAt) }}</span>
            </li>
          </ul>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isHistoryModalOpen = false">Fermer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isDelayModalOpen" :ui="modalUi('md')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="supplier-delay-title">
          <h3 id="supplier-delay-title" class="text-lg font-semibold text-[#0F62BC] mb-4">Déclarer un retard fournisseur</h3>
          <div class="space-y-4">
            <UFormField label="Matière *" name="materialReference">
              <USelectMenu
                v-model="delayForm.materialReference"
                :items="materialOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Fournisseur *" name="supplier">
              <UInput v-model="delayForm.supplier" placeholder="Ex : SKF Aerospace" />
            </UFormField>
            <UFormField label="Retard (jours) *" name="delayDays">
              <UInput v-model.number="delayForm.delayDays" type="number" min="1" />
            </UFormField>
            <UFormField label="Commentaire" name="comment">
              <UTextarea v-model="delayForm.comment" :rows="2" placeholder="Détail du retard…" />
            </UFormField>
          </div>
          <p v-if="delayFormError" class="text-red-500 text-sm mt-3" role="alert">{{ delayFormError }}</p>
          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" @click="isDelayModalOpen = false">Annuler</UButton>
            <UButton class="bg-[#F57C00] hover:bg-[#e06d00] text-white" :loading="isMutating" @click="submitSupplierDelay">
              Enregistrer
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>