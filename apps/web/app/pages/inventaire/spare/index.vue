<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'default' })

const UButton = resolveComponent('UButton')
const UBadge  = resolveComponent('UBadge')

type Unit = 'pcs' | 'mm' | 'cm' | 'm' | 'kg' | 'g' | 'ml' | 'l'

interface Part {
  id: number
  emoji: string
  name: string
  reference: string
  category: string
  description: string
  dimensions: string
  qty: number
  unit: Unit
  minQty: number
}

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

const parts = ref<Part[]>([
  { id: 1,  emoji: '🔩', name: 'Vis M6 x 20',           reference: 'VIS-M6-020',  category: 'Visserie',      description: 'Vis à tête hexagonale en acier inoxydable 316L, traitement anti-corrosion.',           dimensions: 'M6 × 20 mm',          qty: 450, unit: 'pcs', minQty: 100 },
  { id: 2,  emoji: '🔩', name: 'Boulon M8 x 40',         reference: 'BLN-M8-040',  category: 'Visserie',      description: 'Boulon haute résistance classe 8.8, tête hexagonale, filetage complet.',               dimensions: 'M8 × 40 mm',          qty: 80,  unit: 'pcs', minQty: 100 },
  { id: 3,  emoji: '⚙️', name: 'Roulement 6205-ZZ',      reference: 'RLM-6205-ZZ', category: 'Roulements',    description: 'Roulement à billes double blindage, acier chromé, graisse haute température.',           dimensions: 'Ø25 × Ø52 × 15 mm',  qty: 24,  unit: 'pcs', minQty: 10  },
  { id: 4,  emoji: '🪛', name: 'Axe acier Ø12',          reference: 'AXE-012-500', category: 'Axes & Arbres', description: 'Axe en acier rectifié h6, tolérance serrée, acier C45 traité.',                       dimensions: 'Ø12 × 500 mm',        qty: 6,   unit: 'pcs', minQty: 10  },
  { id: 5,  emoji: '🔧', name: 'Écrou frein M6',         reference: 'ECR-M6-FR',   category: 'Visserie',      description: 'Écrou nylstop inox A2, auto-freinant, résistant aux vibrations.',                    dimensions: 'M6',                  qty: 320, unit: 'pcs', minQty: 200 },
  { id: 6,  emoji: '🧲', name: 'Joint torique NBR 20×2', reference: 'JNT-NBR-202', category: 'Joints',        description: 'Joint torique en caoutchouc NBR, résistant aux huiles et carburants, -30°C/+120°C.', dimensions: 'Ø20 × 2 mm',         qty: 0,   unit: 'pcs', minQty: 50  },
  { id: 7,  emoji: '📐', name: 'Profilé alu 40×40',      reference: 'PRF-AL-4040', category: 'Profilés',      description: 'Profilé aluminium anodisé 6060-T5, rainure 8 mm, usage structural.',                 dimensions: '40 × 40 mm — 3 m',    qty: 12,  unit: 'm',   minQty: 20  },
  { id: 8,  emoji: '🔗', name: 'Câble acier Ø4',         reference: 'CAB-AC-004',  category: 'Câbles',        description: 'Câble toronné 7×7 en acier galvanisé, rupture 1200 kg.',                            dimensions: 'Ø4 mm',               qty: 85,  unit: 'm',   minQty: 50  },
  { id: 9,  emoji: '🧪', name: 'Graisse Molykote BR2',   reference: 'GRS-MK-BR2',  category: 'Lubrifiants',   description: 'Graisse au bisulfure de molybdène, hautes pressions, -40°C/+180°C.',                  dimensions: '—',                   qty: 3,   unit: 'kg',  minQty: 5   },
  { id: 10, emoji: '🪝', name: 'Chape Ø8 inox',          reference: 'CHP-INX-008', category: 'Fixations',     description: 'Chape droite inox A4, corps forgé, axe démontable, WLL 500 kg.',                    dimensions: 'Ø8 mm',               qty: 18,  unit: 'pcs', minQty: 10  },
])

const search     = ref('')
const filter     = ref<'all' | 'low' | 'out'>('all')
const expanded   = ref({})
const expandedId = ref<number | null>(null)

// ── Modals ────────────────────────────────────────────────────────────────────
const isCreateModalOpen  = ref(false)
const isEditModalOpen    = ref(false)
const isDeleteModalOpen  = ref(false)
const editTarget         = ref<Part | null>(null)
const deleteTarget       = ref<Part | null>(null)
const editQty            = ref(0)

const newPart = ref({
  name: '', reference: '', category: '', description: '',
  dimensions: '', qty: 1, unit: 'pcs' as Unit, minQty: 10,
})

function openCreate() {
  newPart.value = { name: '', reference: '', category: '', description: '', dimensions: '', qty: 1, unit: 'pcs', minQty: 10 }
  isCreateModalOpen.value = true
}

function confirmCreate() {
  if (!newPart.value.name || !newPart.value.reference) return
  const emojiMap: Record<string, string> = {
    Visserie: '🔩', Roulements: '⚙️', 'Axes & Arbres': '🪛', Joints: '🧲',
    Profilés: '📐', Câbles: '🔗', Lubrifiants: '🧪', Fixations: '🪝',
  }
  parts.value.unshift({
    id:          Date.now(),
    emoji:       emojiMap[newPart.value.category] ?? '📦',
    name:        newPart.value.name,
    reference:   newPart.value.reference,
    category:    newPart.value.category,
    description: newPart.value.description,
    dimensions:  newPart.value.dimensions || '—',
    qty:         newPart.value.qty,
    unit:        newPart.value.unit,
    minQty:      newPart.value.minQty,
  })
  isCreateModalOpen.value = false
}

// ── Statuts ───────────────────────────────────────────────────────────────────
function getStatus(p: Part): 'ok' | 'low' | 'out' {
  if (p.qty === 0)       return 'out'
  if (p.qty < p.minQty) return 'low'
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
      return h('span', { class: `text-sm font-semibold ${color}` }, `${row.original.qty} ${unitLabels[row.original.unit]}`)
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

function confirmEdit() {
  if (!editTarget.value) return
  const idx = parts.value.findIndex(p => p.id === editTarget.value!.id)
  if (idx !== -1) parts.value[idx]!.qty = editQty.value
  isEditModalOpen.value = false
}

function askDelete(p: Part) {
  deleteTarget.value = p
  isDeleteModalOpen.value = true
}

function confirmDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  if (expandedId.value === id) expandedId.value = null
  parts.value = parts.value.filter(p => p.id !== id)
  isDeleteModalOpen.value = false
  deleteTarget.value = null
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
    <div class="max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#0F62BC]">Stock pièces & matières</h1>
          <p class="text-xs sm:text-sm text-gray-400 mt-0.5">Composants, visserie, matières premières</p>
        </div>
        <UButton icon="i-lucide-plus" size="sm" class="bg-[#F57C00] hover:bg-[#e06d00] text-white font-medium flex-shrink-0" @click="openCreate">
          <span class="hidden sm:inline">Ajouter une pièce</span>
          <span class="sm:hidden">Ajouter</span>
        </UButton>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
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

      <!-- Toolbar -->
      <div class="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center">
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
      <div class="flex sm:hidden flex-col gap-2">
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
                <UButton icon="i-lucide-pencil" variant="outline" color="neutral" size="xs" class="flex-1 justify-center" @click="openEdit(p)">Modifier</UButton>
                <UButton icon="i-lucide-trash-2" variant="outline" color="error" size="xs" class="flex-1 justify-center" @click="askDelete(p)">Supprimer</UButton>
              </div>
            </div>
          </Transition>
        </div>
        <div v-if="filteredParts.length === 0" class="text-center py-12 text-gray-400 text-sm">Aucune pièce trouvée.</div>
      </div>

      <!-- DESKTOP -->
      <div class="hidden sm:block bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl overflow-hidden">
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
                  <UButton icon="i-lucide-pencil" variant="outline" color="neutral" size="sm" @click="openEdit(row.original)">Modifier</UButton>
                  <UButton icon="i-lucide-trash-2" variant="outline" color="error" size="sm" @click="askDelete(row.original)">Supprimer</UButton>
                </div>
              </div>
            </div>
          </template>
        </UTable>
        <div v-if="filteredParts.length === 0" class="text-center py-12 text-gray-400 text-sm">Aucune pièce trouvée.</div>
      </div>

    </div>

    <!-- ═══ Modal : Ajouter une pièce ═══ -->
    <UModal v-model:open="isCreateModalOpen" :ui="{ content: 'max-w-lg' }">
      <template #content>
        <div class="p-5 sm:p-6">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/8 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-package-plus" class="text-[#0F62BC] text-lg" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-800">Ajouter une pièce</h3>
              <p class="text-xs text-gray-400 mt-0.5">Enregistrer une nouvelle référence au stock</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
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
              <USelect v-model="newPart.unit" :options="unitOptions" class="w-full" />
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

          <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
            <UButton variant="ghost" color="neutral" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-plus"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white"
              :disabled="!newPart.name || !newPart.reference"
              @click="confirmCreate"
            >
              Ajouter la pièce
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Modifier quantité ═══ -->
    <UModal v-model:open="isEditModalOpen">
      <template #content>
        <div class="p-5 sm:p-6">
          <h3 class="text-lg font-semibold text-[#0F62BC] mb-1">Modifier la quantité</h3>
          <p v-if="editTarget" class="text-sm text-gray-400 mb-4">
            {{ editTarget.name }} — <span class="font-mono">{{ editTarget.reference }}</span>
          </p>
          <UFormField label="Quantité" name="qty">
            <UInput v-model.number="editQty" type="number" min="0" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 mt-5">
            <UButton variant="ghost" color="neutral" @click="isEditModalOpen = false">Annuler</UButton>
            <UButton class="bg-[#F57C00] hover:bg-[#e06d00] text-white" @click="confirmEdit">Confirmer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Supprimer ═══ -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <div class="p-5 sm:p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-trash-2" class="text-red-500 text-lg" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-800">Supprimer la pièce</h3>
              <p v-if="deleteTarget" class="text-sm text-gray-400 font-mono mt-0.5">{{ deleteTarget.reference }}</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-5">Cette action est irréversible. La pièce <span class="font-medium text-gray-800">{{ deleteTarget?.name }}</span> sera définitivement supprimée du stock.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="isDeleteModalOpen = false">Annuler</UButton>
            <UButton icon="i-lucide-trash-2" color="error" @click="confirmDelete">Supprimer</UButton>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>