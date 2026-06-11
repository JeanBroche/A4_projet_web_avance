<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { createStockLevelSchema, firstZodError } from '~/lib/validation/schemas'
import type { StockLevel, StockUnit } from '~/types'

definePageMeta({ layout: 'sidebar' })

const UButton = resolveComponent('UButton')
const UBadge  = resolveComponent('UBadge')

const {
  levels, reservations, alerts, status, error, isMutating,
  refresh, reportSupplierDelay,
  ruptureForecast,
  createLevel, updateLevel, deleteLevel
} = useStock()
const { canManageStock, pageSubtitle } = useRoleCapabilities()

const activeReservations = computed(() =>
  reservations.value.filter(r => r.status === 'ACTIVE')
)

onMounted(() => refresh())

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
</script>

<template>
  <div class="mx-auto w-full max-w-5xl">

      <!-- Header -->
      <div class="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#0F62BC]">Stock pièces & matières</h1>
          <p class="text-xs sm:text-sm text-gray-400 mt-0.5">{{ pageSubtitle || 'Composants, visserie, matières premières' }}</p>
        </div>
        <div v-if="canManageStock" class="flex flex-col sm:flex-row gap-2 shrink-0">
          <UButton icon="i-lucide-truck" size="sm" variant="outline" @click="openDelayModal">
            Retard fournisseur
          </UButton>
          <UButton icon="i-lucide-plus" size="sm" class="bg-[#F57C00] hover:bg-[#e06d00] text-white font-medium" @click="openCreate">
            <span class="hidden sm:inline">Ajouter une pièce</span>
            <span class="sm:hidden">Ajouter</span>
          </UButton>
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
            </div>
            <p class="text-[11px] text-gray-400 mt-0.5">
              {{ item.available }} {{ item.unit }} dispo
              <span v-if="item.estimatedDaysUntilRupture !== null"> — ~{{ item.estimatedDaysUntilRupture }} j restants</span>
            </p>
          </div>
        </div>
      </UCard>

      <div v-if="status !== 'pending' && activeReservations.length > 0" class="mb-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <UIcon name="i-lucide-bookmark" class="text-indigo-500" />
          Réservations actives ({{ activeReservations.length }})
        </h2>
        <div class="space-y-2">
          <UCard
            v-for="res in activeReservations"
            :key="res.id"
            class="border-none shadow-sm"
            :ui="{ body: 'py-2.5 px-3' }"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
              <div>
                <span class="font-medium text-gray-800">{{ res.materialName }}</span>
                <span class="text-xs font-mono text-gray-400 ml-2">{{ res.materialId }}</span>
              </div>
              <div class="text-xs text-gray-500">
                {{ res.quantity }} {{ res.unit }} — OF <span class="font-mono text-indigo-600">{{ res.ofId }}</span>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Toolbar -->
      <div v-if="status !== 'pending'" class="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center">
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
      <div v-if="status !== 'pending'" class="flex sm:hidden flex-col gap-2">
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
              <div class="flex gap-2">
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
      <div v-if="status !== 'pending'" class="hidden sm:block bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl overflow-x-auto">
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