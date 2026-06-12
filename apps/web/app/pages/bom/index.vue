<script setup lang="ts">
import { createBomOrderSchema, createReservationSchema, firstZodError } from '~/lib/validation/schemas'
import { buildMaterialReferenceOptions } from '~/lib/material-catalog'
import { toFailureResult } from '~/lib/api/envelope'
import type { AiOfProposal } from '~/lib/validation/ai-of'
import type { BomItem, BomStatus, ManufacturingOrder, Priority } from '~/types'

definePageMeta({ layout: 'sidebar' })

type Status = BomStatus

interface ReserveLine {
  materialId: string
  name: string
  qtyNeeded: number
  qtyAvailable: number
  unit: string
  selected: boolean
  alreadyReserved: boolean
  reservedQty: number
}

const route = useRoute()
const { bomOrders, batches, status, error, isMutating, refreshBom, refreshBatches, createBomOrder, updateBomOrder, updateBomOrderStatus } = useProduction()
const {
  levels,
  reservations,
  error: stockError,
  isMutating: isStockMutating,
  refresh: refreshStock,
  fetchReservationsForOf,
  activeReservationsFor,
  hasActiveReservations,
  levelByReference,
  createReservation,
  updateReservation,
  cancelReservation
} = useStock()
const { canManageBatches, canManageBomOrders, canReserveMaterials, pageSubtitle } = useRoleCapabilities()
const {
  messages: assistantMessages,
  isLoading: isAssistantLoading,
  error: assistantError,
  lastProposal,
  sendMessage: sendAssistantMessage,
  buildFormPatch,
  reset: resetAssistant
} = useOfAssistant()

const createModalTab = ref<'form' | 'assistant'>('form')


async function reloadPageData() {
  await Promise.all([refreshBom(), refreshStock(), refreshBatches()])
}

onMounted(async () => {
  await reloadPageData()
  const ofQuery = route.query.of
  if (typeof ofQuery === 'string') {
    const order = bomOrders.value.find(o => o.ofNumber === ofQuery)
    if (order) openModal(order)
  }
})

const orders = bomOrders

const statusConfig = {
  pending:     { label: 'En attente', icon: 'i-lucide-clock',       class: 'text-gray-400 bg-gray-100'  },
  in_progress: { label: 'En cours',   icon: 'i-lucide-play-circle',  class: 'text-blue-600 bg-blue-50'   },
  done:        { label: 'Terminée',   icon: 'i-lucide-check-circle', class: 'text-green-600 bg-green-50' },
}

const priorityConfig = {
  low:      { label: 'Basse',    class: 'text-gray-500 bg-gray-100',    dot: 'bg-gray-400'   },
  normal:   { label: 'Normale',  class: 'text-blue-600 bg-blue-50',     dot: 'bg-blue-400'   },
  high:     { label: 'Haute',    class: 'text-orange-600 bg-orange-50', dot: 'bg-orange-400' },
  critical: { label: 'Critique', class: 'text-red-600 bg-red-50',       dot: 'bg-red-500'    },
}

const batchStatusConfig = {
  pending: { label: 'Planifié', class: 'text-gray-500 bg-gray-100' },
  in_progress: { label: 'En cours', class: 'text-blue-600 bg-blue-50' },
  validated: { label: 'Terminé', class: 'text-green-600 bg-green-50' },
}

const filterStatus  = ref<'all' | Status>('all')
const search        = ref('')
const selected      = ref<ManufacturingOrder | null>(null)
const isDetailOpen  = ref(false)
const isCreateOpen  = ref(false)
const isReserveOpen = ref(false)
const reserveError  = ref<string | null>(null)
const reservationActionError = ref<string | null>(null)
const reserveLines  = ref<ReserveLine[]>([])
const ofReservations = ref<import('~/types').StockReservation[]>([])
const isEditingBom = ref(false)
const editBom = ref<BomItem[]>([])
const editBomRow = ref({ reference: '', name: '', qtyNeeded: 1, qtyStock: 0, unit: 'pcs' })
const bomEditError = ref<string | null>(null)

const stockReferenceOptions = computed(() => buildMaterialReferenceOptions(levels.value))

// ── État modal création ───────────────────────────────────────────────────────
const emojis = ['✈️','🔧','⚙️','🛩️','🔩','📦','🚀','🛠️','🔗','🪛']

const newOf = ref({
  name: '', ofNumber: '', qty: 1,
  status: 'pending' as Status, priority: 'normal' as Priority,
  emoji: '✈️',
})

// BOM temporaire dans la modal création
const newBomRow = ref({ reference: '', name: '', qtyNeeded: 1, qtyStock: 0, unit: 'pcs' })
const tempBom   = ref<BomItem[]>([])

const unitOptions  = ['pcs','m','cm','mm','kg','g','ml','L']
const statusOptions = [
  { label: 'En attente', value: 'pending', icon: 'i-lucide-clock' },
  { label: 'En cours', value: 'in_progress', icon: 'i-lucide-play-circle' },
  { label: 'Terminée', value: 'done', icon: 'i-lucide-check-circle' },
]
const priorityOptions = [
  { label: 'Basse',    value: 'low'      },
  { label: 'Normale',  value: 'normal'   },
  { label: 'Haute',    value: 'high'     },
  { label: 'Critique', value: 'critical' },
]

function openCreate() {
  newOf.value = { name: '', ofNumber: '', qty: 1, status: 'pending', priority: 'normal', emoji: '✈️' }
  newBomRow.value = { reference: '', name: '', qtyNeeded: 1, qtyStock: 0, unit: 'pcs' }
  tempBom.value = []
  createModalTab.value = 'form'
  resetAssistant()
  isCreateOpen.value = true
}

function onAssistantSend(text: string) {
  sendAssistantMessage(text, levels.value)
}

function onApplyProposal(proposal: AiOfProposal) {
  const patch = buildFormPatch(proposal, ref => levelByReference(ref))
  newOf.value = patch.of
  tempBom.value = patch.bom
  createModalTab.value = 'form'
}

function addBomRow() {
  if (!newBomRow.value.reference || !newBomRow.value.name) return
  tempBom.value.push({ ...newBomRow.value })
  newBomRow.value = { reference: '', name: '', qtyNeeded: 1, qtyStock: 0, unit: 'pcs' }
}

function removeBomRow(idx: number) {
  tempBom.value.splice(idx, 1)
}

async function confirmCreate() {
  const payload = {
    name: newOf.value.name,
    ofNumber: newOf.value.ofNumber,
    qty: newOf.value.qty,
    status: newOf.value.status,
    priority: newOf.value.priority,
    emoji: newOf.value.emoji
  }
  const parsed = createBomOrderSchema.safeParse(payload)
  if (!parsed.success) return
  await createBomOrder({
    name: newOf.value.name,
    ofNumber: newOf.value.ofNumber,
    qty: newOf.value.qty,
    status: newOf.value.status,
    priority: newOf.value.priority,
    emoji: newOf.value.emoji,
    bom: [...tempBom.value]
  })
  isCreateOpen.value = false
}

// ── Filtres / stats ───────────────────────────────────────────────────────────
const statusFilters = [
  { key: 'all',         label: 'Tous',       icon: 'i-lucide-layout-grid'  },
  { key: 'pending',     label: 'En attente', icon: 'i-lucide-clock'        },
  { key: 'in_progress', label: 'En cours',   icon: 'i-lucide-play-circle'  },
  { key: 'done',        label: 'Terminée',   icon: 'i-lucide-check-circle' },
] as const

const filtered = computed(() =>
  orders.value.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.value.toLowerCase()) || o.ofNumber.toLowerCase().includes(search.value.toLowerCase())
    const matchStatus = filterStatus.value === 'all' || o.status === filterStatus.value
    return matchSearch && matchStatus
  })
)

const stats = computed(() => ({
  total:       orders.value.length,
  pending:     orders.value.filter(o => o.status === 'pending').length,
  in_progress: orders.value.filter(o => o.status === 'in_progress').length,
  done:        orders.value.filter(o => o.status === 'done').length,
}))

function stockAvailable(reference: string) {
  return levelByReference(reference)?.available ?? 0
}

function stockReserved(reference: string) {
  return levelByReference(reference)?.reserved ?? 0
}

function reservationQtyFor(ofNumber: string, reference: string): number {
  return ofReservations.value.find(
    r => r.ofId === ofNumber && r.materialId === reference && r.status === 'ACTIVE'
  )?.quantity
    ?? reservations.value.find(
      r => r.ofId === ofNumber && r.materialId === reference && r.status === 'ACTIVE'
    )?.quantity
    ?? 0
}

function enrichedBom(bom: BomItem[], ofNumber?: string) {
  return bom.map(item => ({
    ...item,
    name: levelByReference(item.reference)?.name ?? item.name,
    qtyStock: stockAvailable(item.reference),
    qtyReserved: ofNumber ? reservationQtyFor(ofNumber, item.reference) : stockReserved(item.reference)
  }))
}

interface MaterialReadiness {
  total: number
  ok: number
  low: number
  out: number
  label: string
  tone: 'success' | 'warning' | 'error'
}

function getMaterialReadiness(order: ManufacturingOrder): MaterialReadiness {
  const lines = enrichedBom(order.bom, order.ofNumber)
  let ok = 0
  let low = 0
  let out = 0
  for (const item of lines) {
    const state = bomStatus(item)
    if (state === 'ok') ok++
    else if (state === 'low') low++
    else out++
  }
  const total = lines.length
  const tone = out > 0 ? 'error' : low > 0 ? 'warning' : 'success'
  const label = total === 0
    ? 'BOM vide'
    : out > 0
      ? `${out} rupture${out > 1 ? 's' : ''}`
      : low > 0
        ? `${low} insuffisant${low > 1 ? 's' : ''}`
        : `${ok}/${total} matières OK`
  return { total, ok, low, out, label, tone }
}

function batchesForOrder(order: ManufacturingOrder) {
  return batches.value.filter(batch => batch.bomCode === order.ofNumber)
}

function lotLink(order: ManufacturingOrder) {
  return { path: '/batch', query: { bom: order.ofNumber } }
}

async function loadOfReservations(ofNumber: string) {
  ofReservations.value = await fetchReservationsForOf(ofNumber)
}

function openModal(order: ManufacturingOrder) {
  selected.value = order
  isEditingBom.value = false
  bomEditError.value = null
  reservationActionError.value = null
  isDetailOpen.value = true
  loadOfReservations(order.ofNumber)
}

function bomQtyNeeded(materialId: string): number | null {
  return selected.value?.bom.find(b => b.reference === materialId)?.qtyNeeded ?? null
}

function isReservationComplete(res: import('~/types').StockReservation): boolean {
  const need = bomQtyNeeded(res.materialId)
  return need !== null && res.quantity === need
}

function reservationNeedsAlign(res: import('~/types').StockReservation): boolean {
  const need = bomQtyNeeded(res.materialId)
  if (need === null) return false
  return res.quantity !== need && stockAvailable(res.materialId) + res.quantity >= need
}

async function alignReservationToNeed(res: import('~/types').StockReservation) {
  if (!selected.value) return
  reservationActionError.value = null
  const need = bomQtyNeeded(res.materialId)
  if (need === null || need === res.quantity) return
  try {
    await updateReservation(res.id, need)
    await refreshStock()
    await loadOfReservations(selected.value.ofNumber)
  } catch (e) {
    reservationActionError.value = stockError.value ?? toFailureResult(e).message
  }
}

function bomItemFromStock(item: BomItem): BomItem {
  const level = levelByReference(item.reference)
  return {
    reference: item.reference,
    name: level?.name ?? item.name,
    qtyNeeded: item.qtyNeeded,
    qtyStock: stockAvailable(item.reference),
    unit: level?.unit ?? item.unit
  }
}

function startEditBom() {
  if (!selected.value) return
  bomEditError.value = null
  editBom.value = selected.value.bom.map(bomItemFromStock)
  editBomRow.value = { reference: '', name: '', qtyNeeded: 1, qtyStock: 0, unit: 'pcs' }
  isEditingBom.value = true
}

function cancelEditBom() {
  isEditingBom.value = false
  bomEditError.value = null
}

function onPickStockReference(ref: string) {
  const opt = stockReferenceOptions.value.find(o => o.value === ref)
  if (!opt) return
  editBomRow.value.reference = opt.value
  editBomRow.value.name = opt.name
  editBomRow.value.qtyStock = opt.available
  editBomRow.value.unit = opt.unit
}

function onPickNewBomReference(ref: string) {
  const opt = stockReferenceOptions.value.find(o => o.value === ref)
  if (!opt) return
  newBomRow.value.reference = opt.value
  newBomRow.value.name = opt.name
  newBomRow.value.qtyStock = opt.available
  newBomRow.value.unit = opt.unit
}

function addEditBomRow() {
  if (!editBomRow.value.reference || !editBomRow.value.name) return
  if (editBom.value.some(l => l.reference === editBomRow.value.reference)) {
    bomEditError.value = `La référence ${editBomRow.value.reference} est déjà dans la BOM`
    return
  }
  bomEditError.value = null
  editBom.value.push({ ...editBomRow.value })
  editBomRow.value = { reference: '', name: '', qtyNeeded: 1, qtyStock: 0, unit: 'pcs' }
}

function removeEditBomRow(idx: number) {
  editBom.value.splice(idx, 1)
}

async function saveEditBom() {
  if (!selected.value) return
  bomEditError.value = null
  if (editBom.value.length === 0) {
    bomEditError.value = 'Ajoutez au moins une ligne à la nomenclature'
    return
  }
  for (const line of editBom.value) {
    if (!line.reference.trim() || !line.name.trim() || line.qtyNeeded <= 0) {
      bomEditError.value = 'Chaque ligne doit avoir une référence, un nom et une quantité > 0'
      return
    }
  }
  await updateBomOrder({
    id: selected.value.id,
    bom: editBom.value.map(line => ({
      reference: line.reference,
      name: line.name,
      qtyNeeded: line.qtyNeeded,
      qtyStock: stockAvailable(line.reference),
      unit: line.unit
    }))
  })
  selected.value = orders.value.find(o => o.id === selected.value!.id) ?? null
  isEditingBom.value = false
}

function bomStatus(item: BomItem): 'ok' | 'low' | 'out' {
  const available = stockAvailable(item.reference)
  if (available === 0) return 'out'
  if (available < item.qtyNeeded) return 'low'
  return 'ok'
}

function activeReservationForMaterial(materialId: string) {
  return ofReservations.value.find(r => r.materialId === materialId && r.status === 'ACTIVE')
}

const canReserveMoreForSelected = computed(() => {
  if (!selected.value) return false
  return selected.value.bom.some((item) => {
    const available = stockAvailable(item.reference)
    const existing = activeReservationForMaterial(item.reference)
    if (existing && existing.quantity === item.qtyNeeded) return false
    return available >= item.qtyNeeded && !existing
  })
})

async function openReserveModal() {
  if (!selected.value) return
  reserveError.value = null
  await loadOfReservations(selected.value.ofNumber)

  reserveLines.value = selected.value.bom.map((item) => {
    const available = stockAvailable(item.reference)
    const existing = activeReservationForMaterial(item.reference)
    const fullyReserved = existing !== undefined && existing.quantity === item.qtyNeeded
    const canReserve = available >= item.qtyNeeded && !existing

    return {
      materialId: item.reference,
      name: item.name,
      qtyNeeded: item.qtyNeeded,
      qtyAvailable: available,
      unit: item.unit,
      selected: canReserve,
      alreadyReserved: fullyReserved,
      reservedQty: existing?.quantity ?? 0
    }
  })
  isReserveOpen.value = true
}

async function confirmReserve() {
  if (!selected.value) return
  reserveError.value = null

  const lines = reserveLines.value
    .filter(l => l.selected && !l.alreadyReserved)
    .map(l => ({ materialId: l.materialId, qty: l.qtyNeeded }))

  const payload = { ofId: selected.value.ofNumber, lines }
  const parsed = createReservationSchema.safeParse(payload)
  if (!parsed.success) {
    reserveError.value = firstZodError(parsed.error)
    return
  }

  for (const line of reserveLines.value.filter(l => l.selected)) {
    if (line.alreadyReserved) {
      reserveError.value = `${line.materialId} : déjà réservé pour cet OF`
      return
    }
    if (activeReservationsFor(selected.value.ofNumber).some(r => r.materialId === line.materialId)) {
      reserveError.value = `${line.materialId} : déjà réservé pour cet OF`
      return
    }
    if (line.qtyAvailable < line.qtyNeeded) {
      reserveError.value = `${line.materialId} : stock insuffisant (besoin ${line.qtyNeeded}, dispo ${line.qtyAvailable})`
      return
    }
  }

  try {
    await createReservation(parsed.data)
    await refreshStock()
    await loadOfReservations(selected.value.ofNumber)
    isReserveOpen.value = false
  } catch (e) {
    reserveError.value = stockError.value ?? toFailureResult(e).message
  }
}

async function onCancelReservation(id: number) {
  if (!selected.value) return
  reservationActionError.value = null
  try {
    await cancelReservation(id)
    await refreshStock()
    await loadOfReservations(selected.value.ofNumber)
  } catch (e) {
    reservationActionError.value = stockError.value ?? toFailureResult(e).message
  }
}

async function updateStatus(newStatus: Status) {
  if (!selected.value) return
  await updateBomOrderStatus(selected.value.id, newStatus)
  selected.value = orders.value.find(o => o.id === selected.value!.id) ?? null
}

</script>

<template>
  <div class="mx-auto w-full max-w-6xl">

      <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />
      <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="reloadPageData">Réessayer</UButton>

      <!-- Header -->
      <div class="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#0F62BC]">Ordres de fabrication</h1>
          <p class="text-xs sm:text-sm text-gray-400 mt-0.5">{{ pageSubtitle || 'Suivi des OF en cours et planifiés' }}</p>
        </div>
        <UButton v-if="canManageBomOrders" icon="i-lucide-plus" size="sm" class="bg-[#F57C00] hover:bg-[#e06d00] text-white font-medium flex-shrink-0" @click="openCreate">
          <span class="hidden sm:inline">Nouvel OF</span>
          <span class="sm:hidden">Nouveau</span>
        </UButton>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Total OF</p>
          <p class="text-xl sm:text-2xl font-semibold text-[#0F62BC]">{{ stats.total }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">En attente</p>
          <p class="text-xl sm:text-2xl font-semibold text-gray-500">{{ stats.pending }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">En cours</p>
          <p class="text-xl sm:text-2xl font-semibold text-blue-600">{{ stats.in_progress }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Terminés</p>
          <p class="text-xl sm:text-2xl font-semibold text-green-600">{{ stats.done }}</p>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-col gap-2 mb-5 sm:flex-row sm:items-center">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Nom ou numéro d'OF…" class="w-full sm:flex-1" />
        <div class="flex gap-1 w-full sm:w-auto">
          <UButton
            v-for="btn in statusFilters" :key="btn.key"
            :icon="btn.icon"
            :variant="filterStatus === btn.key ? 'solid' : 'outline'"
            :class="['flex-1 sm:flex-none justify-center', filterStatus === btn.key ? 'bg-[#0F62BC] text-white border-[#0F62BC]' : 'text-gray-500 border-gray-200 hover:border-[#0F62BC] hover:text-[#0F62BC]']"
            size="sm"
            @click="filterStatus = btn.key"
          >
            <span class="sm:hidden text-xs">{{ btn.label.split(' ')[0] }}</span>
            <span class="hidden sm:inline">{{ btn.label }}</span>
          </UButton>
        </div>
      </div>

      <div v-if="status === 'pending'" class="space-y-3 mb-5">
        <USkeleton v-for="i in 6" :key="i" class="h-32 w-full" />
      </div>

      <!-- Cards -->
      <div v-else-if="filtered.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <UCard
          v-for="order in filtered" :key="order.id"
          class="cursor-pointer hover:border-[#0F62BC]/40 hover:shadow-md hover:shadow-[#0F62BC]/5 transition-all duration-150"
          :ui="{ body: 'p-0' }"
          @click="openModal(order)"
        >
          <div class="relative h-32 sm:h-36 bg-gradient-to-br from-[#0F62BC]/8 to-[#156FD4]/5 rounded-t-xl flex items-center justify-center overflow-hidden">
            <span class="text-6xl sm:text-7xl select-none">{{ order.emoji }}</span>
            <div class="absolute top-2.5 right-2.5 flex gap-1.5">
              <div v-if="hasActiveReservations(order.ofNumber)" class="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shadow-md" title="Matières réservées">
                <UIcon name="i-lucide-bookmark" class="text-white text-sm" />
              </div>
            </div>
            <div class="absolute top-2.5 left-2.5">
              <span :class="['text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1', priorityConfig[order.priority].class]">
                <span :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', priorityConfig[order.priority].dot]" />
                {{ priorityConfig[order.priority].label }}
              </span>
            </div>
          </div>
          <div class="px-4 py-3">
            <div class="mb-2">
              <p class="text-sm font-semibold text-gray-800 leading-tight">{{ order.name }}</p>
              <p class="text-xs font-mono text-gray-400 mt-0.5">{{ order.ofNumber }}</p>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-package" class="text-gray-400 text-sm" />
                <span class="text-sm font-medium text-gray-700">{{ order.qty }} unité{{ order.qty > 1 ? 's' : '' }}</span>
              </div>
              <div :class="['flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', statusConfig[order.status].class]">
                <UIcon :name="statusConfig[order.status].icon" class="text-sm" />
                {{ statusConfig[order.status].label }}
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-100 space-y-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <UIcon name="i-lucide-list" class="text-gray-300 text-sm" />
                <span class="text-xs text-gray-400">{{ order.bom.length }} pièce{{ order.bom.length > 1 ? 's' : '' }} dans la BOM</span>
                <UBadge
                  v-if="order.bom.length > 0"
                  :color="getMaterialReadiness(order).tone"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                >
                  {{ getMaterialReadiness(order).label }}
                </UBadge>
                <span v-if="hasActiveReservations(order.ofNumber)" class="text-xs text-indigo-600 font-medium flex items-center gap-1">
                  <UIcon name="i-lucide-bookmark" class="text-sm" /> Réservé
                </span>
              </div>
              <div v-if="order.bom.length > 0" class="space-y-1">
                <div
                  v-for="item in enrichedBom(order.bom, order.ofNumber).slice(0, 3)"
                  :key="item.reference"
                  class="flex items-center gap-2 text-[11px] text-gray-500"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="{
                      'bg-green-400': bomStatus(item) === 'ok',
                      'bg-orange-400': bomStatus(item) === 'low',
                      'bg-red-500': bomStatus(item) === 'out'
                    }"
                  />
                  <span class="truncate flex-1">{{ item.name }}</span>
                  <span class="shrink-0 font-mono">{{ item.qtyStock }}/{{ item.qtyNeeded }}</span>
                </div>
                <p v-if="order.bom.length > 3" class="text-[10px] text-gray-400 pl-3.5">
                  +{{ order.bom.length - 3 }} autre{{ order.bom.length - 3 > 1 ? 's' : '' }} matière{{ order.bom.length - 3 > 1 ? 's' : '' }}
                </p>
              </div>
              <div v-if="batchesForOrder(order).length > 0" class="flex items-center gap-1.5 text-[11px] text-gray-500">
                <UIcon name="i-carbon:classic-batch" class="text-sm" />
                {{ batchesForOrder(order).length }} lot{{ batchesForOrder(order).length > 1 ? 's' : '' }} associé{{ batchesForOrder(order).length > 1 ? 's' : '' }}
              </div>
            </div>
          </div>
        </UCard>
      </div>
      <div v-else class="text-center py-16 text-gray-400 text-sm">Aucun ordre de fabrication trouvé.</div>

    <!-- ═══ Modal détail OF ═══ -->
    <UModal v-model:open="isDetailOpen" :ui="modalUi('2xl')">
      <template #content>
        <div v-if="selected" :class="MODAL_BODY">
          <div class="flex items-start gap-4 mb-5">
            <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0F62BC]/10 to-[#156FD4]/5 flex items-center justify-center text-3xl flex-shrink-0">{{ selected.emoji }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-bold text-gray-800">{{ selected.name }}</h2>
                <span v-if="ofReservations.length > 0" class="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  <UIcon name="i-lucide-bookmark" class="text-sm" /> Matières réservées
                </span>
              </div>
              <p class="text-sm font-mono text-gray-400 mt-0.5">{{ selected.ofNumber }}</p>
            </div>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="isDetailOpen = false" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <p class="text-[11px] text-gray-400 mb-1">Quantité</p>
              <p class="text-lg font-semibold text-[#0F62BC]">{{ selected.qty }}</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <p class="text-[11px] text-gray-400 mb-1">Priorité</p>
              <span :class="['text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1', priorityConfig[selected.priority].class]">
                <span :class="['w-1.5 h-1.5 rounded-full', priorityConfig[selected.priority].dot]" />
                {{ priorityConfig[selected.priority].label }}
              </span>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-center">
              <p class="text-[11px] text-gray-400 mb-1">Statut</p>
              <div :class="['text-xs font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-full', statusConfig[selected.status].class]">
                <UIcon :name="statusConfig[selected.status].icon" class="text-sm" />
                {{ statusConfig[selected.status].label }}
              </div>
            </div>
          </div>

          <div class="mb-5">
            <div class="flex items-center justify-between gap-2 mb-2">
              <h3 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UIcon name="i-carbon:classic-batch" class="text-[#0F62BC]" />
                Lots de production
                <span class="text-xs font-normal text-gray-400">— {{ batchesForOrder(selected).length }} lot{{ batchesForOrder(selected).length > 1 ? 's' : '' }}</span>
              </h3>
              <NuxtLink v-if="canManageBatches" :to="lotLink(selected)">
                <UButton size="xs" variant="outline" icon="i-lucide-external-link">
                  Suivre les lots
                </UButton>
              </NuxtLink>
            </div>
            <div v-if="batchesForOrder(selected).length === 0" class="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-5 text-center">
              <p class="text-sm text-gray-400">Aucun lot ordonnancé pour cet OF.</p>
              <p v-if="canManageBatches" class="text-xs text-gray-400 mt-1">Créez un lot depuis la page Lot pour démarrer la production.</p>
            </div>
            <div v-else class="space-y-2">
              <NuxtLink
                v-for="batch in batchesForOrder(selected)"
                :key="batch.id"
                :to="{ path: '/batch', query: { id: batch.id } }"
                class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-[#0F62BC]/30 transition-colors"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ batch.lotNumber }}</p>
                  <p class="text-xs text-gray-400">{{ batch.ofNumber }} — {{ batch.progress }}% avancement</p>
                </div>
                <span :class="['text-[11px] font-medium px-2 py-0.5 rounded-full', batchStatusConfig[batch.status].class]">
                  {{ batchStatusConfig[batch.status].label }}
                </span>
                <UBadge v-if="batch.hasAnomaly" color="error" variant="subtle" size="xs">Anomalie</UBadge>
              </NuxtLink>
            </div>
          </div>

          <div class="flex items-center justify-between gap-2 mb-3">
            <h3 class="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <UIcon name="i-lucide-list" class="text-[#0F62BC]" />
              Nomenclature (BOM)
              <span class="text-xs font-normal text-gray-400">— {{ (isEditingBom ? editBom : selected.bom).length }} pièce{{ (isEditingBom ? editBom : selected.bom).length > 1 ? 's' : '' }}</span>
            </h3>
            <UButton
              v-if="canManageBomOrders && !isEditingBom"
              icon="i-lucide-pencil"
              label="Modifier la BOM"
              size="xs"
              variant="outline"
              color="neutral"
              @click="startEditBom"
            />
          </div>

          <UAlert v-if="bomEditError" color="error" variant="soft" :title="bomEditError" class="mb-3" />

          <!-- Mode édition BOM -->
          <div v-if="isEditingBom" class="space-y-3">
            <div v-if="editBom.length > 0" class="space-y-1.5">
              <div
                v-for="(row, idx) in editBom"
                :key="row.reference"
                class="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-800 truncate">{{ row.name }}</p>
                  <p class="text-[11px] font-mono text-gray-400">{{ row.reference }}</p>
                  <p class="text-[11px] text-gray-500 mt-0.5">
                    Dispo stock : <span class="font-semibold">{{ stockAvailable(row.reference) }} {{ row.unit }}</span>
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-[10px] text-gray-400 mb-0.5">Besoin</p>
                  <UInput v-model.number="row.qtyNeeded" type="number" min="1" class="w-20" />
                </div>
                <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="removeEditBomRow(idx)" />
              </div>
            </div>
            <p v-else class="text-sm text-gray-400 text-center py-4">Aucune ligne — ajoutez des pièces depuis le stock.</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50/80 rounded-xl border border-dashed border-gray-200">
              <USelectMenu
                :model-value="editBomRow.reference || undefined"
                :items="stockReferenceOptions"
                value-key="value"
                placeholder="Référence stock…"
                class="text-xs sm:col-span-2"
                @update:model-value="onPickStockReference($event as string)"
              />
              <UInput v-model="editBomRow.name" placeholder="Désignation" class="text-xs" />
              <UInput v-model.number="editBomRow.qtyNeeded" type="number" min="1" placeholder="Qté besoin" class="text-xs" />
              <USelect v-model="editBomRow.unit" :items="unitOptions.map(u => ({ label: u, value: u }))" value-key="value" class="text-xs" />
              <UButton
                icon="i-lucide-plus"
                variant="outline"
                color="neutral"
                size="sm"
                class="justify-center sm:col-span-2"
                :disabled="!editBomRow.reference || !editBomRow.name"
                @click="addEditBomRow"
              >
                Ajouter à la BOM
              </UButton>
            </div>

            <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <UButton variant="ghost" color="neutral" @click="cancelEditBom">Annuler</UButton>
              <UButton
                icon="i-lucide-save"
                class="bg-[#0F62BC] hover:bg-[#0d56a8] text-white"
                :loading="isMutating"
                @click="saveEditBom"
              >
                Enregistrer la BOM
              </UButton>
            </div>
          </div>

          <!-- Mode lecture BOM -->
          <div v-else class="space-y-2">
            <div
              v-if="selected.bom.length === 0"
              class="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50/50"
            >
              <UIcon name="i-lucide-list" class="text-gray-300 text-3xl mb-2" />
              <p class="text-sm text-gray-400">Aucune pièce dans la nomenclature</p>
              <UButton
                v-if="canManageBomOrders"
                icon="i-lucide-plus"
                label="Ajouter des pièces"
                size="sm"
                variant="outline"
                class="mt-3"
                @click="startEditBom"
              />
            </div>
            <div
              v-for="item in enrichedBom(selected.bom, selected.ofNumber)"
              v-else
              :key="item.reference"
              class="flex items-center gap-3 p-3 rounded-xl border"
              :class="{ 'border-gray-100 bg-white': bomStatus(item)==='ok', 'border-orange-100 bg-orange-50/50': bomStatus(item)==='low', 'border-red-100 bg-red-50/50': bomStatus(item)==='out' }"
            >
              <div class="w-2 h-2 rounded-full flex-shrink-0" :class="{ 'bg-green-400': bomStatus(item)==='ok', 'bg-orange-400': bomStatus(item)==='low', 'bg-red-500': bomStatus(item)==='out' }" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ item.name }}</p>
                <p class="text-xs font-mono text-gray-400">{{ item.reference }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-xs text-gray-400">Besoin : <span class="font-semibold text-gray-700">{{ item.qtyNeeded }} {{ item.unit }}</span></p>
                <p class="text-xs" :class="{ 'text-green-600': bomStatus(item)==='ok', 'text-orange-500': bomStatus(item)==='low', 'text-red-500': bomStatus(item)==='out' }">
                  Dispo : <span class="font-semibold">{{ item.qtyStock }} {{ item.unit }}</span>
                </p>
                <p v-if="reservationQtyFor(selected.ofNumber, item.reference) > 0" class="text-xs text-indigo-500">
                  Réservé pour cet OF : <span class="font-semibold">{{ reservationQtyFor(selected.ofNumber, item.reference) }} {{ item.unit }}</span>
                </p>
              </div>
              <UBadge :color="bomStatus(item)==='ok' ? 'success' : bomStatus(item)==='low' ? 'warning' : 'error'" variant="subtle" class="text-[11px] hidden sm:inline-flex">
                {{ bomStatus(item)==='ok' ? 'OK' : bomStatus(item)==='low' ? 'Insuffisant' : 'Rupture' }}
              </UBadge>
            </div>
          </div>

          <div v-if="ofReservations.length > 0" class="mt-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <UIcon name="i-lucide-bookmark" class="text-indigo-500" />
              Réservations actives
            </h3>
            <UAlert v-if="reservationActionError" color="error" variant="soft" :title="reservationActionError" class="mb-3" />
            <div class="space-y-2">
              <div
                v-for="res in ofReservations"
                :key="res.id"
                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-indigo-100 bg-indigo-50/40"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-800">{{ res.materialName }}</p>
                  <p class="text-xs font-mono text-gray-400">{{ res.materialId }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">
                    Réservé {{ res.quantity }} / besoin {{ bomQtyNeeded(res.materialId) ?? '—' }} {{ res.unit }}
                  </p>
                </div>
                <div v-if="canReserveMaterials" class="flex flex-wrap items-center gap-2">
                  <UBadge
                    v-if="!isReservationComplete(res)"
                    color="warning"
                    variant="subtle"
                    size="xs"
                  >
                    Quantité incorrecte
                  </UBadge>
                  <UButton
                    v-if="reservationNeedsAlign(res)"
                    size="xs"
                    icon="i-lucide-refresh-cw"
                    class="bg-indigo-600 hover:bg-indigo-700 text-white"
                    :loading="isStockMutating"
                    @click="alignReservationToNeed(res)"
                  >
                    Aligner sur le besoin
                  </UButton>
                  <UButton size="xs" variant="outline" color="error" :loading="isStockMutating" @click="onCancelReservation(res.id)">
                    Annuler la réservation
                  </UButton>
                </div>
                <p v-else class="text-xs text-gray-500">{{ res.quantity }} {{ res.unit }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center mt-5 pt-4 border-t border-gray-100">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isDetailOpen = false">Fermer</UButton>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <NuxtLink v-if="canManageBatches && batchesForOrder(selected).length > 0" :to="lotLink(selected)">
                <UButton
                  icon="i-carbon:classic-batch"
                  label="Avancement & anomalies"
                  size="sm"
                  variant="outline"
                  class="w-full sm:w-auto justify-center"
                />
              </NuxtLink>
              <UTooltip
                v-if="canReserveMaterials"
                :text="canReserveMoreForSelected ? 'Réserver les matières non encore réservées' : 'Toutes les pièces éligibles sont déjà réservées pour cet OF'"
              >
                <UButton
                  icon="i-lucide-bookmark"
                  label="Réserver les matières"
                  size="sm"
                  class="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white"
                  :disabled="!canReserveMoreForSelected"
                  @click="openReserveModal"
                />
              </UTooltip>
            <UDropdownMenu v-if="canManageBomOrders" :items="[statusOptions.map(s => ({ label: s.label, icon: s.icon, onSelect: () => updateStatus(s.value as Status) }))]">
              <UButton label="Changer le statut" color="neutral" variant="outline" size="sm" trailing-icon="i-lucide-chevron-down" class="w-full sm:w-auto justify-center" />
            </UDropdownMenu>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal réservation matières ═══ -->
    <UModal v-model:open="isReserveOpen" :ui="modalUi('lg')">
      <template #content>
        <div v-if="selected" :class="MODAL_BODY">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-bookmark" class="text-indigo-600 text-lg" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-800">Réserver les matières</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ selected.ofNumber }} — réservation au besoin exact de la BOM</p>
            </div>
          </div>

          <UAlert v-if="reserveError" color="error" variant="soft" :title="reserveError" class="mb-4" />

          <div class="space-y-2 max-h-80 overflow-y-auto">
            <div
              v-for="line in reserveLines"
              :key="line.materialId"
              class="flex flex-col gap-2 sm:flex-row sm:items-center p-3 rounded-xl border"
              :class="line.alreadyReserved ? 'border-indigo-100 bg-indigo-50/50 opacity-80' : line.qtyAvailable < line.qtyNeeded ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 bg-white'"
            >
              <UCheckbox
                v-model="line.selected"
                :disabled="line.alreadyReserved || line.qtyAvailable < line.qtyNeeded"
                class="shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-medium text-gray-800">{{ line.name }}</p>
                  <UBadge v-if="line.alreadyReserved" color="primary" variant="subtle" size="xs">
                    Déjà réservé ({{ line.reservedQty }} {{ line.unit }})
                  </UBadge>
                  <UBadge v-else-if="line.qtyAvailable < line.qtyNeeded" color="error" variant="subtle" size="xs">
                    Stock insuffisant
                  </UBadge>
                </div>
                <p class="text-xs font-mono text-gray-400">{{ line.materialId }}</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  Besoin {{ line.qtyNeeded }} {{ line.unit }} — dispo {{ line.qtyAvailable }} {{ line.unit }}
                </p>
              </div>
              <p class="text-sm font-medium text-indigo-700 tabular-nums shrink-0">
                {{ line.qtyNeeded }} {{ line.unit }}
              </p>
            </div>
          </div>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isReserveOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-bookmark"
              class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              :loading="isStockMutating"
              :disabled="!reserveLines.some(l => l.selected && !l.alreadyReserved)"
              @click="confirmReserve"
            >
              Confirmer la réservation
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal création OF ═══ -->
    <UModal v-model:open="isCreateOpen" :ui="modalUi(canManageBomOrders ? '5xl' : '2xl')">
      <template #content>
        <div :class="MODAL_BODY">

          <!-- Header -->
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/8 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-plus-circle" class="text-[#0F62BC] text-lg" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-800">Nouvel ordre de fabrication</h3>
              <p class="text-xs text-gray-400 mt-0.5">Renseigner les infos et la nomenclature (BOM)</p>
            </div>
          </div>

          <UTabs
            v-if="canManageBomOrders"
            v-model="createModalTab"
            :items="[
              { label: 'Formulaire', value: 'form', icon: 'i-lucide-clipboard-list' },
              { label: 'Assistant IA', value: 'assistant', icon: 'i-lucide-sparkles' }
            ]"
            class="mb-4 lg:hidden"
          />

          <div :class="canManageBomOrders ? 'lg:grid lg:grid-cols-2 lg:gap-6' : ''">
            <div :class="canManageBomOrders && createModalTab !== 'form' ? 'hidden lg:block' : ''">

          <!-- Infos OF -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">

            <!-- Choix emoji -->
            <div class="col-span-2">
              <p class="text-xs text-gray-500 font-medium mb-2">Icône</p>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="e in emojis" :key="e"
                  :class="['w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all', newOf.emoji === e ? 'bg-[#0F62BC]/10 ring-2 ring-[#0F62BC]/40' : 'bg-gray-50 hover:bg-gray-100']"
                  @click="newOf.emoji = e"
                >{{ e }}</button>
              </div>
            </div>

            <UFormField label="Désignation *" name="name" class="col-span-2">
              <UInput v-model="newOf.name" placeholder="Ex : Bras articulé A320" class="w-full" />
            </UFormField>

            <UFormField label="Numéro OF *" name="ofNumber">
              <UInput v-model="newOf.ofNumber" placeholder="Ex : OF-2024-0146" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Quantité" name="qty">
              <UInput v-model.number="newOf.qty" type="number" min="1" class="w-full" />
            </UFormField>

            <UFormField label="Statut" name="status">
              <USelect v-model="newOf.status" :items="statusOptions" value-key="value" class="w-full" />
            </UFormField>

            <UFormField label="Priorité" name="priority">
              <USelect v-model="newOf.priority" :items="priorityOptions" value-key="value" class="w-full" />
            </UFormField>
          </div>

          <USeparator class="mb-4" />

          <!-- BOM -->
          <div>
            <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <UIcon name="i-lucide-list" class="text-[#0F62BC]" />
              Nomenclature (BOM)
            </p>

            <!-- Lignes ajoutées -->
            <div v-if="tempBom.length > 0" class="space-y-1.5 mb-3">
              <div v-for="(row, idx) in tempBom" :key="idx" class="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-800 truncate">{{ row.name }}</p>
                  <p class="text-[11px] font-mono text-gray-400">{{ row.reference }}</p>
                </div>
                <span class="text-xs text-gray-500 flex-shrink-0">{{ row.qtyNeeded }} {{ row.unit }}</span>
                <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="removeBomRow(idx)" />
              </div>
            </div>

            <!-- Formulaire ajout ligne -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50/80 rounded-xl border border-dashed border-gray-200">
              <USelectMenu
                :model-value="newBomRow.reference || undefined"
                :items="stockReferenceOptions"
                value-key="value"
                placeholder="Référence stock…"
                class="text-xs sm:col-span-2"
                @update:model-value="onPickNewBomReference($event as string)"
              />
              <UInput v-model="newBomRow.name" placeholder="Désignation" class="text-xs" />
              <UInput v-model.number="newBomRow.qtyNeeded" type="number" min="1" placeholder="Qté besoin" class="text-xs" />
              <USelect v-model="newBomRow.unit" :items="unitOptions.map(u => ({ label: u, value: u }))" value-key="value" class="text-xs" />
              <UButton
                icon="i-lucide-plus"
                variant="outline"
                color="neutral"
                size="sm"
                class="justify-center sm:col-span-2 border-gray-200 hover:border-[#0F62BC] hover:text-[#0F62BC]"
                :disabled="!newBomRow.reference || !newBomRow.name"
                @click="addBomRow"
              >
                Ajouter à la BOM
              </UButton>
            </div>
          </div>

          <!-- Footer -->
          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isCreateOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-plus"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              :disabled="!newOf.name || !newOf.ofNumber"
              :loading="isMutating"
              @click="confirmCreate"
            >
              Créer l'OF
            </UButton>
          </div>

            </div>

            <OfAssistantPanel
              v-if="canManageBomOrders"
              :class="createModalTab !== 'assistant' ? 'hidden lg:flex' : 'flex'"
              :messages="assistantMessages"
              :is-loading="isAssistantLoading"
              :error="assistantError"
              :last-proposal="lastProposal"
              :materials="levels"
              @send="onAssistantSend"
              @apply="onApplyProposal"
            />
          </div>

        </div>
      </template>
    </UModal>

  </div>
</template>