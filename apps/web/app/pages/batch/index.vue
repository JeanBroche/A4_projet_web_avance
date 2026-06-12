<script setup lang="ts">
import { createBatchSchema, firstZodError } from '~/lib/validation/schemas'
import { formatBytes, useLotDocuments } from '~/composables/useLotDocuments'
import type { Batch, BatchStatus, ManufacturingOrder, Priority } from '~/types'

definePageMeta({ layout: 'sidebar' })

const {
  batches, bomOrders, status, error, isMutating,
  refreshBatches, refreshBom, createBatch,
  reportAnomaly, clearAnomaly, deleteBatch
} = useProduction()
const { timeline, status: traceStatus, error: traceError, trace, reset: resetTrace } = useLotTrace()
const {
  documents: lotDocuments,
  status: documentsStatus,
  error: documentsError,
  isUploading: isUploadingDocument,
  load: loadLotDocuments,
  reset: resetLotDocuments,
  upload: uploadLotDocument,
  openDownload: openLotDocument,
  maxBytes: documentMaxBytes
} = useLotDocuments()
const { canManageBatches, pageSubtitle } = useRoleCapabilities()
const route = useRoute()

onMounted(async () => {
  await Promise.all([refreshBatches(), refreshBom()])
  const bomQuery = route.query.bom
  if (typeof bomQuery === 'string') {
    filterBomCode.value = bomQuery
  }
  const batchId = route.query.id
  if (batchId) {
    const lot = batches.value.find(b => b.id === Number(batchId))
    if (lot) openModal(lot)
  }
})

const ofOptions = computed(() =>
  bomOrders.value
    .filter(o => o.status !== 'done')
    .filter(o => !batches.value.some(b => b.bomCodes.includes(o.ofNumber)))
    .map(o => ({ label: `${o.ofNumber} — ${o.name}`, value: o.ofNumber }))
)

const additionalOfOptions = computed(() =>
  bomOrders.value
    .filter(o => o.status !== 'done')
    .filter(o => o.ofNumber !== createForm.value.ofNumber)
    .filter(o => !batches.value.some(b => b.bomCodes.includes(o.ofNumber)))
    .map(o => ({ label: `${o.ofNumber} — ${o.name}`, value: o.ofNumber }))
)

const statusConfig = {
  pending:     { label: 'Planifié',  icon: 'i-lucide-clock',         class: 'text-gray-400 bg-gray-100' },
  in_progress: { label: 'En cours',  icon: 'i-lucide-settings-2',    class: 'text-blue-600 bg-blue-50' },
  validated:   { label: 'Terminé',   icon: 'i-lucide-check-circle-2', class: 'text-green-600 bg-green-50' },
}

const ofStatusConfig = {
  pending:     { label: 'En attente', icon: 'i-lucide-clock',        class: 'text-gray-400 bg-gray-100' },
  in_progress: { label: 'En cours',   icon: 'i-lucide-play-circle',  class: 'text-blue-600 bg-blue-50' },
  done:        { label: 'Terminée',   icon: 'i-lucide-check-circle', class: 'text-green-600 bg-green-50' },
}

const priorityConfig = {
  low:      { label: 'Basse',    class: 'text-gray-500 bg-gray-100' },
  normal:   { label: 'Normale',  class: 'text-blue-600 bg-blue-50' },
  high:     { label: 'Haute',    class: 'text-orange-600 bg-orange-50' },
  critical: { label: 'Critique', class: 'text-red-600 bg-red-50' },
}

const statusOptions = [
  { label: 'Planifié', value: 'pending', icon: 'i-lucide-clock' },
  { label: 'En cours', value: 'in_progress', icon: 'i-lucide-settings-2' },
  { label: 'Terminé', value: 'validated', icon: 'i-lucide-check-circle-2' },
]

const priorityOptions = [
  { label: 'Basse', value: 'low' },
  { label: 'Normale', value: 'normal' },
  { label: 'Haute', value: 'high' },
  { label: 'Critique', value: 'critical' }
]

const filterStatus = ref<'all' | BatchStatus>('all')
const filterBomCode = ref<string | null>(null)
const search = ref('')
const selected = ref<Batch | null>(null)

// Gestionnaires d'ouverture des Modales
const isModalOpen = ref(false)
const isTraceModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const createFormError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const detailFileInputRef = ref<HTMLInputElement | null>(null)
const createFileInputRef = ref<HTMLInputElement | null>(null)

type PendingFile = { file: File, name: string, size: number }

const pendingCreateFiles = ref<PendingFile[]>([])

const createForm = ref({
  ofNumber: '',
  additionalOfNumbers: [] as string[],
  productName: '',
  qty: 1,
  priority: 'normal' as Priority,
  emoji: '📦'
})

const filtered = computed(() =>
  batches.value.filter(b => {
    const matchSearch = b.productName.toLowerCase().includes(search.value.toLowerCase())
      || b.lotNumber.toLowerCase().includes(search.value.toLowerCase())
      || b.bomCodes.some(code => code.toLowerCase().includes(search.value.toLowerCase()))
    const matchStatus = filterStatus.value === 'all' || b.status === filterStatus.value
    const matchBom = !filterBomCode.value || b.bomCodes.includes(filterBomCode.value)
    return matchSearch && matchStatus && matchBom
  })
)

function clearBomFilter() {
  filterBomCode.value = null
}

function linkedOrdersForBatch(batch: Batch): ManufacturingOrder[] {
  const codes = batch.bomCodes.length ? batch.bomCodes : [batch.bomCode].filter(Boolean)
  return codes.map((code) => {
    const order = bomOrders.value.find(o => o.ofNumber === code)
    if (order) return order
    return {
      id: 0,
      ofNumber: code,
      name: code,
      emoji: '📋',
      qty: 0,
      status: 'pending' as const,
      priority: 'normal' as const,
      bom: []
    }
  })
}

function lotSummary(batch: Batch): string {
  const orders = linkedOrdersForBatch(batch)
  if (orders.length === 1) return orders[0]!.name
  if (orders.length > 1) return `${orders.length} ordres de fabrication`
  return batch.productName
}

const selectedLinkedOrders = computed(() =>
  selected.value ? linkedOrdersForBatch(selected.value) : []
)

function decorateBatchForDisplay(batch: Batch): Batch {
  const cloned = JSON.parse(JSON.stringify(batch)) as Batch
  const orders = linkedOrdersForBatch(cloned)
  if (orders.length === 1) {
    cloned.productName = orders[0]!.name
    cloned.emoji = orders[0]!.emoji
  } else if (orders.length > 1) {
    cloned.productName = `${orders.length} ordres de fabrication`
    cloned.emoji = '📦'
  }
  return cloned
}

function syncSelectedFromStore() {
  if (!selected.value) return
  const fresh = batches.value.find(b => b.id === selected.value!.id)
  if (fresh) selected.value = decorateBatchForDisplay(fresh)
}

function openModal(batch: Batch) {
  selected.value = decorateBatchForDisplay(batch)
  isModalOpen.value = true
  loadLotDocuments(batch.lotNumber)
}

watch(isModalOpen, (open) => {
  if (!open) {
    resetLotDocuments()
    selected.value = null
  }
})

function onSelectOf(ofNumber: string) {
  const of = bomOrders.value.find(o => o.ofNumber === ofNumber)
  if (!of) return
  createForm.value.ofNumber = ofNumber
  createForm.value.productName = of.name
  createForm.value.emoji = of.emoji
  createForm.value.qty = of.qty
  createForm.value.additionalOfNumbers = createForm.value.additionalOfNumbers.filter(
    code => code !== ofNumber
  )
}

function openCreateModal() {
  createForm.value = {
    ofNumber: '',
    additionalOfNumbers: [],
    productName: '',
    qty: 1,
    priority: 'normal',
    emoji: '📦'
  }
  pendingCreateFiles.value = []
  createFormError.value = null
  isCreateModalOpen.value = true
}

function queueCreateFiles(files: FileList | null) {
  if (!files?.length) return
  for (const file of files) {
    if (file.size > documentMaxBytes) {
      createFormError.value = `${file.name} dépasse ${formatBytes(documentMaxBytes)}`
      continue
    }
    pendingCreateFiles.value.push({ file, name: file.name, size: file.size })
  }
}

function removePendingCreateFile(index: number) {
  pendingCreateFiles.value.splice(index, 1)
}

async function onDetailFileSelected(event: Event) {
  if (!selected.value) return
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  for (const file of files) {
    try {
      await uploadLotDocument(selected.value.lotNumber, file)
    } catch {
      // error surfaced via documentsError
    }
  }
  input.value = ''
}

async function submitCreateBatch() {
  createFormError.value = null
  const parsed = createBatchSchema.safeParse(createForm.value)
  if (!parsed.success) {
    createFormError.value = firstZodError(parsed.error)
    return
  }
  const additional = parsed.data.additionalOfNumbers.filter(
    code => code && code !== parsed.data.ofNumber
  )
  const batch = await createBatch({ ...parsed.data, additionalOfNumbers: additional })
  for (const pending of pendingCreateFiles.value) {
    await uploadLotDocument(batch.lotNumber, pending.file)
  }
  isCreateModalOpen.value = false
  pendingCreateFiles.value = []
}

function openDeleteModal() {
  deleteError.value = null
  isDeleteModalOpen.value = true
}

async function confirmDeleteBatch() {
  if (!selected.value) return
  deleteError.value = null
  try {
    await deleteBatch(selected.value.id)
    isDeleteModalOpen.value = false
    isModalOpen.value = false
    selected.value = null
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Suppression impossible'
  }
}

async function toggleAnomaly() {
  if (!selected.value) return
  if (selected.value.hasAnomaly) {
    await clearAnomaly(selected.value.id)
  } else {
    await reportAnomaly(selected.value.id, 'Anomalie signalée par l\'opérateur')
  }
  syncSelectedFromStore()
}

const traceSourceIcon: Record<string, string> = {
  production: 'i-lucide-factory',
  stock: 'i-lucide-package',
  shipment: 'i-lucide-truck',
  audit: 'i-lucide-scroll-text'
}

async function openTraceModal() {
  if (!selected.value) return
  isTraceModalOpen.value = true
  await trace(selected.value.lotNumber)
  if (timeline.value) {
    timeline.value.ofNumber = timeline.value.ofNumber === '—'
      ? selected.value.ofNumber
      : timeline.value.ofNumber
    timeline.value.productName = timeline.value.productName === '—'
      ? selected.value.productName
      : timeline.value.productName
  }
}

function closeTraceModal() {
  isTraceModalOpen.value = false
  resetTrace()
}

function formatTraceDate(d: Date) {
  return d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
      
      <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />
      <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="refreshBatches">Réessayer</UButton>

      <div v-if="status === 'pending'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <USkeleton v-for="i in 2" :key="i" class="h-40 w-full" />
      </div>

      <div :class="PAGE_HEADER">
        <div>
          <h1 :class="PAGE_TITLE">Suivi des Lots</h1>
          <p :class="PAGE_SUBTITLE">{{ pageSubtitle || 'Contrôle qualité et traçabilité des lots produits' }}</p>
        </div>
        <UButton
          v-if="canManageBatches"
          icon="i-lucide-package-plus"
          size="sm"
          class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto shrink-0"
          @click="openCreateModal"
        >
          <span class="sm:hidden">Nouveau</span>
          <span class="hidden sm:inline">Nouveau Lot</span>
        </UButton>
      </div>

      <div
        v-if="filterBomCode"
        class="mb-4 flex flex-col gap-2 rounded-xl border border-[#0F62BC]/20 bg-[#0F62BC]/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-[#0F62BC]">
          Affichage des lots pour l'OF <span class="font-mono font-semibold">{{ filterBomCode }}</span>
        </p>
        <UButton size="xs" variant="outline" @click="clearBomFilter">Voir tous les lots</UButton>
      </div>

      <div :class="TOOLBAR">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Lot ou produit..." class="sm:flex-1" />
        <USelectMenu
          v-model="filterStatus"
          :items="[{ label: 'Tous les statuts', value: 'all' }, ...statusOptions]"
          value-key="value"
          class="w-full sm:w-48"
        />
      </div>

      <div v-if="status !== 'pending' && filtered.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="lot in filtered"
          :key="lot.id"
          class="cursor-pointer hover:shadow-lg transition-all border-none shadow-sm"
          :ui="{ body: 'p-0' }"
          @click="openModal(lot)"
        >
          <div class="p-4">
            <div class="flex justify-between items-start mb-3">
              <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">
                {{ lot.emoji }}
              </div>
              <div v-if="lot.hasAnomaly" class="text-orange-500 animate-pulse">
                <UIcon name="i-lucide-alert-octagon" class="text-xl" />
              </div>
            </div>
            
            <h3 class="font-bold text-gray-800">{{ lot.lotNumber }}</h3>
            <p class="text-sm text-gray-500">{{ lotSummary(lot) }}</p>
            <p class="text-xs font-mono text-[#0F62BC] mb-4">
              {{ lot.bomCodes.length ? lot.bomCodes.join(', ') : lot.ofNumber }}
            </p>
            
            <div class="flex items-center justify-between pt-3 border-t border-gray-50">
              <span class="text-xs font-medium text-gray-400">
                {{ lot.bomCodes.length || 1 }} OF
              </span>
              <UBadge :class="statusConfig[lot.status].class" variant="subtle" size="xs">
                <UIcon :name="statusConfig[lot.status].icon" class="mr-1" />
                {{ statusConfig[lot.status].label }}
              </UBadge>
            </div>
          </div>
        </UCard>
      </div>
      <div v-if="status !== 'pending' && filtered.length === 0" class="text-center py-16 text-gray-400 text-sm">
        Aucun lot trouvé.
      </div>

    <UModal v-model:open="isModalOpen" :ui="modalUi('2xl')">
      <template #content>
        <div v-if="selected" :class="MODAL_BODY" role="dialog" aria-labelledby="batch-detail-title">
          <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-5 sm:mb-6">
            <div class="flex gap-3 sm:gap-4 min-w-0">
              <div class="w-14 h-14 rounded-xl bg-[#0F62BC]/5 flex items-center justify-center text-3xl">
                {{ selected.emoji }}
              </div>
              <div>
                <h2 id="batch-detail-title" class="text-lg sm:text-xl font-bold text-gray-800 break-all">{{ selected.lotNumber }}</h2>
                <p class="text-sm text-[#0F62BC] font-medium">{{ lotSummary(selected) }}</p>
              </div>
            </div>
            
            <div class="flex gap-2 self-end sm:self-auto shrink-0">
              <UTooltip v-if="canManageBatches" :text="selected.hasAnomaly ? 'Signaler comme conforme' : 'Signaler une anomalie'">
                <UButton
                  :icon="selected.hasAnomaly ? 'i-lucide-alert-octagon' : 'i-lucide-shield-check'"
                  :color="selected.hasAnomaly ? 'warning' : 'neutral'"
                  variant="ghost"
                  :aria-label="selected.hasAnomaly ? 'Lever l\'anomalie du lot' : 'Signaler une anomalie sur le lot'"
                  @click="toggleAnomaly"
                />
              </UTooltip>
              <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Fermer la fiche lot" @click="isModalOpen = false" />
            </div>
          </div>

          <UAlert
            v-if="selected.hasAnomaly"
            icon="i-lucide-alert-triangle"
            color="warning"
            variant="soft"
            title="Anomalie signalée sur ce lot"
            description="Le processus de contrôle a détecté une non-conformité sur les composants ou la fabrication."
            class="mb-6"
          />

          <div class="bg-gray-50 rounded-2xl p-4 mb-6">
            <div>
              <p class="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-1">Statut actuel</p>
              <div :class="['flex items-center gap-2 text-sm font-bold', statusConfig[selected.status].class, 'bg-transparent p-0']">
                <UIcon :name="statusConfig[selected.status].icon" />
                {{ statusConfig[selected.status].label }}
              </div>
              <p class="text-[11px] text-gray-400 mt-1">Calculé depuis les OF rattachés</p>
              <p v-if="selected.progress > 0" class="text-xs text-gray-500 mt-1">
                Avancement production : {{ selected.progress }}%
              </p>
            </div>
          </div>

          <div class="mb-6">
            <h3 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <UIcon name="i-ph-blueprint" class="text-[#0F62BC]" />
              Ordres de fabrication rattachés
            </h3>
            <div class="space-y-2">
              <div
                v-for="order in selectedLinkedOrders"
                :key="order.ofNumber"
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-gray-100 bg-white"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg shrink-0">
                    {{ order.emoji }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{{ order.name }}</p>
                    <p class="text-xs font-mono text-[#0F62BC] break-all">{{ order.ofNumber }}</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2 shrink-0">
                  <UBadge :class="ofStatusConfig[order.status].class" variant="subtle" size="xs">
                    <UIcon :name="ofStatusConfig[order.status].icon" class="mr-1" />
                    {{ ofStatusConfig[order.status].label }}
                  </UBadge>
                  <UBadge :class="priorityConfig[order.priority].class" variant="subtle" size="xs">
                    {{ priorityConfig[order.priority].label }}
                  </UBadge>
                  <UButton
                    :to="`/bom?of=${encodeURIComponent(order.ofNumber)}`"
                    size="xs"
                    variant="ghost"
                    color="primary"
                    icon="i-lucide-external-link"
                  >
                    Voir l'OF
                  </UButton>
                </div>
              </div>
              <p v-if="!selectedLinkedOrders.length" class="text-sm text-gray-400 text-center py-4">
                Aucun ordre de fabrication rattaché à ce lot.
              </p>
            </div>
          </div>

          <div class="mb-6">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
              <h3 class="text-sm font-bold text-gray-700 flex items-center gap-2">
                <UIcon name="i-lucide-paperclip" class="text-[#0F62BC]" />
                Documents
              </h3>
              <UButton
                v-if="canManageBatches"
                size="xs"
                variant="outline"
                icon="i-lucide-upload"
                :loading="isUploadingDocument"
                @click="detailFileInputRef?.click()"
              >
                Ajouter
              </UButton>
              <input
                ref="detailFileInputRef"
                type="file"
                class="hidden"
                accept=".pdf,.doc,.docx,image/*"
                multiple
                @change="onDetailFileSelected"
              >
            </div>
            <UAlert v-if="documentsError" color="error" variant="soft" :title="documentsError" class="mb-3" />
            <div v-if="documentsStatus === 'pending'" class="space-y-2">
              <USkeleton v-for="i in 2" :key="i" class="h-12 w-full" />
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="doc in lotDocuments"
                :key="doc.id"
                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-gray-100 bg-white"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{{ doc.filename }}</p>
                  <p class="text-xs text-gray-400">
                    {{ formatBytes(doc.sizeBytes) }} — {{ doc.uploadedBy }} — {{ doc.uploadedAt.slice(0, 10) }}
                  </p>
                </div>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="primary"
                  icon="i-lucide-download"
                  @click="openLotDocument(doc.id)"
                >
                  Télécharger
                </UButton>
              </div>
              <p v-if="!lotDocuments.length && documentsStatus === 'success'" class="text-sm text-gray-400 text-center py-4">
                Aucun document attaché à ce lot.
              </p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400">Créé le {{ selected.createdAt }}</p>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="canManageBatches"
                icon="i-lucide-trash-2"
                color="error"
                variant="soft"
                size="sm"
                @click="openDeleteModal"
              >
                Supprimer
              </UButton>
              <UButton
                icon="i-lucide-git-branch"
                color="primary"
                variant="soft"
                size="sm"
                @click="openTraceModal"
              >
                Traçabilité complète
              </UButton>
              <UButton variant="ghost" color="neutral" @click="isModalOpen = false">Fermer</UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isTraceModalOpen" :ui="modalUi('2xl')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="batch-trace-title">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h2 id="batch-trace-title" class="text-lg font-bold text-gray-800">Historique du lot</h2>
              <p v-if="timeline" class="text-sm text-gray-500 mt-0.5">
                {{ timeline.lotNumber }} — OF {{ timeline.ofNumber }}
                <span v-if="timeline.events.length" class="text-gray-400">
                  · {{ timeline.events.length }} événement{{ timeline.events.length > 1 ? 's' : '' }}
                </span>
              </p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Fermer l'historique" @click="closeTraceModal" />
          </div>

          <UAlert v-if="traceError" color="error" variant="soft" :title="traceError" class="mb-4" />

          <div v-if="traceStatus === 'pending'" class="space-y-3">
            <USkeleton v-for="i in 4" :key="i" class="h-14 w-full" />
          </div>

          <ol v-else-if="timeline?.events.length" class="relative border-s border-gray-200 ms-3 space-y-4">
            <li v-for="ev in timeline.events" :key="ev.id" class="ms-4">
              <span class="absolute -start-1.5 mt-1.5 flex size-3 rounded-full bg-[#0F62BC]" />
              <div class="flex items-start gap-2">
                <UIcon :name="traceSourceIcon[ev.source] ?? 'i-lucide-circle'" class="size-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p class="text-sm font-semibold text-gray-800">{{ ev.title }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">{{ ev.description }}</p>
                  <p class="text-[11px] text-gray-400 mt-1">
                    {{ formatTraceDate(ev.at) }}
                    <span v-if="ev.actor"> — {{ ev.actor }}</span>
                  </p>
                </div>
              </div>
            </li>
          </ol>

          <p v-else-if="traceStatus === 'success'" class="text-sm text-gray-400 text-center py-8">
            Aucun événement de traçabilité.
          </p>

          <div class="flex justify-end pt-4 mt-4 border-t border-gray-100">
            <UButton variant="ghost" color="neutral" @click="closeTraceModal">Fermer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isCreateModalOpen" :ui="modalUi('md')">
      <template #content>
        <div :class="MODAL_BODY" role="dialog" aria-labelledby="batch-create-title">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h2 id="batch-create-title" class="text-lg font-bold text-gray-800">Ordonnancer un lot</h2>
              <p class="text-xs text-gray-400 mt-0.5">L'identifiant unique (LOT-XX-XXX) est calculé dynamiquement.</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Fermer le formulaire de création" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-4 mb-6">
            <UFormField label="OF principal *" name="ofNumber">
              <USelectMenu
                v-model="createForm.ofNumber"
                :items="ofOptions"
                value-key="value"
                placeholder="Sélectionner un OF"
                class="w-full"
                @update:model-value="onSelectOf"
              />
            </UFormField>
            <UFormField label="OF supplémentaires" name="additionalOfNumbers">
              <USelectMenu
                v-model="createForm.additionalOfNumbers"
                :items="additionalOfOptions"
                value-key="value"
                multiple
                placeholder="Rattacher d'autres OF (optionnel)"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Désignation de la pièce *" name="productName">
              <UInput v-model="createForm.productName" placeholder="Ex: Support de train d'atterrissage" icon="i-lucide-layers" />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantité (Unités)</label>
                <UInput v-model="createForm.qty" type="number" :min="1" icon="i-lucide-hash" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Repère Visuel</label>
                <USelectMenu v-model="createForm.emoji" :items="['📦', '🔩', '💠', '⚙️', '🔌', '✈️']" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Niveau de Priorité</label>
              <USelectMenu
                v-model="createForm.priority"
                :items="priorityOptions"
                value-key="value"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider">Documents (PDF, factures…)</label>
                <UButton size="xs" variant="outline" icon="i-lucide-upload" @click="createFileInputRef?.click()">
                  Parcourir
                </UButton>
                <input
                  ref="createFileInputRef"
                  type="file"
                  class="hidden"
                  accept=".pdf,.doc,.docx,image/*"
                  multiple
                  @change="queueCreateFiles(($event.target as HTMLInputElement).files)"
                >
              </div>
              <p class="text-[11px] text-gray-400 mb-2">Les fichiers seront envoyés après la création du lot (max {{ formatBytes(documentMaxBytes) }}).</p>
              <ul v-if="pendingCreateFiles.length" class="space-y-1">
                <li
                  v-for="(item, index) in pendingCreateFiles"
                  :key="`${item.name}-${index}`"
                  class="flex items-center justify-between text-sm px-2 py-1 rounded bg-gray-50"
                >
                  <span class="truncate">{{ item.name }} ({{ formatBytes(item.size) }})</span>
                  <UButton icon="i-lucide-x" size="xs" variant="ghost" color="neutral" @click="removePendingCreateFile(index)" />
                </li>
              </ul>
            </div>
          </div>

          <p v-if="createFormError" class="text-red-500 text-sm mb-3">{{ createFormError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              icon="i-lucide-check"
              :disabled="!createForm.ofNumber || !createForm.productName.trim()"
              :loading="isMutating"
              @click="submitCreateBatch"
            >
              Créer le Lot
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isDeleteModalOpen" :ui="modalUi('sm')">
      <template #content>
        <div :class="MODAL_BODY" role="alertdialog" aria-labelledby="batch-delete-title">
          <h2 id="batch-delete-title" class="text-lg font-bold text-gray-800 mb-2">Supprimer ce lot ?</h2>
          <p v-if="selected" class="text-sm text-gray-500 mb-4">
            Le lot <span class="font-mono font-semibold">{{ selected.lotNumber }}</span> sera supprimé.
            Les ordres de fabrication restent en base ; seul le rattachement au lot disparaît.
          </p>
          <UAlert v-if="deleteError" color="error" variant="soft" :title="deleteError" class="mb-4" />
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="isDeleteModalOpen = false">Annuler</UButton>
            <UButton color="error" :loading="isMutating" @click="confirmDeleteBatch">Supprimer</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>