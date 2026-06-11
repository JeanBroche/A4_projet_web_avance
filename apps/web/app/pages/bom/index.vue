<script setup lang="ts">
definePageMeta({ layout: 'default' })

type Status = 'pending' | 'in_progress' | 'done'
type Priority = 'low' | 'normal' | 'high' | 'critical'

interface BomItem {
  reference: string
  name: string
  qtyNeeded: number
  qtyStock: number
  unit: string
}

interface ManufacturingOrder {
  id: number
  name: string
  emoji: string
  ofNumber: string
  qty: number
  status: Status
  priority: Priority
  hasBomAnomaly: boolean
  bom: BomItem[]
}

const orders = ref<ManufacturingOrder[]>([
  { id: 1, name: 'Bras articulé A320',      emoji: '✈️', ofNumber: 'OF-2024-0142', qty: 4, status: 'in_progress', priority: 'critical', hasBomAnomaly: true,  bom: [
    { reference: 'AXE-012-500', name: 'Axe acier Ø12',          qtyNeeded: 8,   qtyStock: 6,   unit: 'pcs' },
    { reference: 'RLM-6205-ZZ', name: 'Roulement 6205-ZZ',      qtyNeeded: 16,  qtyStock: 24,  unit: 'pcs' },
    { reference: 'VIS-M6-020',  name: 'Vis M6 x 20',            qtyNeeded: 40,  qtyStock: 450, unit: 'pcs' },
    { reference: 'JNT-NBR-202', name: 'Joint torique NBR 20×2', qtyNeeded: 12,  qtyStock: 0,   unit: 'pcs' },
    { reference: 'GRS-MK-BR2',  name: 'Graisse Molykote BR2',   qtyNeeded: 0.5, qtyStock: 3,   unit: 'kg'  },
  ]},
  { id: 2, name: 'Support moteur B737',     emoji: '🔧', ofNumber: 'OF-2024-0143', qty: 2, status: 'pending',     priority: 'high',     hasBomAnomaly: false, bom: [
    { reference: 'PRF-AL-4040', name: 'Profilé alu 40×40', qtyNeeded: 6,  qtyStock: 12,  unit: 'm'   },
    { reference: 'BLN-M8-040',  name: 'Boulon M8 x 40',    qtyNeeded: 24, qtyStock: 80,  unit: 'pcs' },
    { reference: 'ECR-M6-FR',   name: 'Écrou frein M6',    qtyNeeded: 24, qtyStock: 320, unit: 'pcs' },
    { reference: 'CAB-AC-004',  name: 'Câble acier Ø4',    qtyNeeded: 10, qtyStock: 85,  unit: 'm'   },
  ]},
  { id: 3, name: 'Verrouillage train ATR',  emoji: '⚙️', ofNumber: 'OF-2024-0139', qty: 6, status: 'done',        priority: 'normal',   hasBomAnomaly: false, bom: [
    { reference: 'CHP-INX-008', name: 'Chape Ø8 inox',     qtyNeeded: 12, qtyStock: 18,  unit: 'pcs' },
    { reference: 'VIS-M6-020',  name: 'Vis M6 x 20',       qtyNeeded: 30, qtyStock: 450, unit: 'pcs' },
    { reference: 'RLM-6205-ZZ', name: 'Roulement 6205-ZZ', qtyNeeded: 6,  qtyStock: 24,  unit: 'pcs' },
  ]},
  { id: 4, name: 'Panneau cockpit C130',    emoji: '🛩️', ofNumber: 'OF-2024-0145', qty: 1, status: 'pending',     priority: 'low',      hasBomAnomaly: true,  bom: [
    { reference: 'PRF-AL-4040', name: 'Profilé alu 40×40', qtyNeeded: 4,  qtyStock: 12,  unit: 'm'   },
    { reference: 'VIS-M6-020',  name: 'Vis M6 x 20',       qtyNeeded: 60, qtyStock: 450, unit: 'pcs' },
    { reference: 'CAB-AC-004',  name: 'Câble acier Ø4',    qtyNeeded: 25, qtyStock: 85,  unit: 'm'   },
    { reference: 'AXE-012-500', name: 'Axe acier Ø12',     qtyNeeded: 10, qtyStock: 6,   unit: 'pcs' },
  ]},
  { id: 5, name: 'Vérin hydraulique F/A-18',emoji: '🔩', ofNumber: 'OF-2024-0140', qty: 3, status: 'in_progress', priority: 'high',     hasBomAnomaly: false, bom: [
    { reference: 'JNT-NBR-202', name: 'Joint torique NBR 20×2', qtyNeeded: 18, qtyStock: 0, unit: 'pcs' },
    { reference: 'AXE-012-500', name: 'Axe acier Ø12',          qtyNeeded: 3,  qtyStock: 6, unit: 'pcs' },
    { reference: 'GRS-MK-BR2',  name: 'Graisse Molykote BR2',   qtyNeeded: 1,  qtyStock: 3, unit: 'kg'  },
  ]},
  { id: 6, name: 'Soute cargo A400M',       emoji: '📦', ofNumber: 'OF-2024-0141', qty: 2, status: 'done',        priority: 'normal',   hasBomAnomaly: false, bom: [
    { reference: 'PRF-AL-4040', name: 'Profilé alu 40×40', qtyNeeded: 20, qtyStock: 12, unit: 'm'   },
    { reference: 'BLN-M8-040',  name: 'Boulon M8 x 40',    qtyNeeded: 60, qtyStock: 80, unit: 'pcs' },
    { reference: 'CHP-INX-008', name: 'Chape Ø8 inox',     qtyNeeded: 8,  qtyStock: 18, unit: 'pcs' },
  ]},
])

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

const filterStatus  = ref<'all' | Status>('all')
const search        = ref('')
const selected      = ref<ManufacturingOrder | null>(null)
const isDetailOpen  = ref(false)
const isCreateOpen  = ref(false)

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
  { label: 'En attente', value: 'pending'     },
  { label: 'En cours',   value: 'in_progress' },
  { label: 'Terminée',   value: 'done'        },
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
  isCreateOpen.value = true
}

function addBomRow() {
  if (!newBomRow.value.reference || !newBomRow.value.name) return
  tempBom.value.push({ ...newBomRow.value })
  newBomRow.value = { reference: '', name: '', qtyNeeded: 1, qtyStock: 0, unit: 'pcs' }
}

function removeBomRow(idx: number) {
  tempBom.value.splice(idx, 1)
}

function confirmCreate() {
  if (!newOf.value.name || !newOf.value.ofNumber) return
  const hasBomAnomaly = tempBom.value.some(i => i.qtyStock < i.qtyNeeded)
  orders.value.unshift({
    id:           Date.now(),
    name:         newOf.value.name,
    emoji:        newOf.value.emoji,
    ofNumber:     newOf.value.ofNumber,
    qty:          newOf.value.qty,
    status:       newOf.value.status,
    priority:     newOf.value.priority,
    hasBomAnomaly,
    bom:          [...tempBom.value],
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

function openModal(order: ManufacturingOrder) {
  selected.value = order
  isDetailOpen.value = true
}

function bomStatus(item: BomItem): 'ok' | 'low' | 'out' {
  if (item.qtyStock === 0)            return 'out'
  if (item.qtyStock < item.qtyNeeded) return 'low'
  return 'ok'
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
    <div class="max-w-6xl mx-auto">

      <!-- Header -->
      <div class="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#0F62BC]">Ordres de fabrication</h1>
          <p class="text-xs sm:text-sm text-gray-400 mt-0.5">Suivi des OF en cours et planifiés</p>
        </div>
        <UButton icon="i-lucide-plus" size="sm" class="bg-[#F57C00] hover:bg-[#e06d00] text-white font-medium flex-shrink-0" @click="openCreate">
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

      <!-- Cards -->
      <div v-if="filtered.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <UCard
          v-for="order in filtered" :key="order.id"
          class="cursor-pointer hover:border-[#0F62BC]/40 hover:shadow-md hover:shadow-[#0F62BC]/5 transition-all duration-150"
          :ui="{ body: 'p-0' }"
          @click="openModal(order)"
        >
          <div class="relative h-32 sm:h-36 bg-gradient-to-br from-[#0F62BC]/8 to-[#156FD4]/5 rounded-t-xl flex items-center justify-center overflow-hidden">
            <span class="text-6xl sm:text-7xl select-none">{{ order.emoji }}</span>
            <div v-if="order.hasBomAnomaly" class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow-md" title="Anomalie BOM">
              <UIcon name="i-lucide-alert-triangle" class="text-white text-sm" />
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
            <div class="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
              <UIcon name="i-lucide-list" class="text-gray-300 text-sm" />
              <span class="text-xs text-gray-400">{{ order.bom.length }} pièce{{ order.bom.length > 1 ? 's' : '' }} dans la BOM</span>
              <span v-if="order.hasBomAnomaly" class="ml-auto text-xs text-orange-500 font-medium flex items-center gap-1">
                <UIcon name="i-lucide-alert-triangle" class="text-sm" /> Anomalie
              </span>
            </div>
          </div>
        </UCard>
      </div>
      <div v-else class="text-center py-16 text-gray-400 text-sm">Aucun ordre de fabrication trouvé.</div>

    </div>

    <!-- ═══ Modal détail OF ═══ -->
    <UModal v-model:open="isDetailOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div v-if="selected" class="p-5 sm:p-6">
          <div class="flex items-start gap-4 mb-5">
            <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0F62BC]/10 to-[#156FD4]/5 flex items-center justify-center text-3xl flex-shrink-0">{{ selected.emoji }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-bold text-gray-800">{{ selected.name }}</h2>
                <span v-if="selected.hasBomAnomaly" class="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  <UIcon name="i-lucide-alert-triangle" class="text-sm" /> Anomalie BOM
                </span>
              </div>
              <p class="text-sm font-mono text-gray-400 mt-0.5">{{ selected.ofNumber }}</p>
            </div>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="isDetailOpen = false" />
          </div>
          <div class="grid grid-cols-3 gap-3 mb-5">
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
          <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <UIcon name="i-lucide-list" class="text-[#0F62BC]" />
            Nomenclature (BOM)
            <span class="text-xs font-normal text-gray-400">— {{ selected.bom.length }} pièce{{ selected.bom.length > 1 ? 's' : '' }}</span>
          </h3>
          <div class="space-y-2">
            <div v-for="item in selected.bom" :key="item.reference"
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
                  Stock : <span class="font-semibold">{{ item.qtyStock }} {{ item.unit }}</span>
                </p>
              </div>
              <UBadge :color="bomStatus(item)==='ok' ? 'success' : bomStatus(item)==='low' ? 'warning' : 'error'" variant="subtle" class="text-[11px] hidden sm:inline-flex">
                {{ bomStatus(item)==='ok' ? 'OK' : bomStatus(item)==='low' ? 'Insuffisant' : 'Rupture' }}
              </UBadge>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
            <UButton variant="ghost" color="neutral" @click="isDetailOpen = false">Fermer</UButton>
            <UButton icon="i-lucide-pencil" class="bg-[#F57C00] hover:bg-[#e06d00] text-white">Modifier l'OF</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal création OF ═══ -->
    <UModal v-model:open="isCreateOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div class="p-5 sm:p-6">

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

          <!-- Infos OF -->
          <div class="grid grid-cols-2 gap-3 mb-5">

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
              <USelect v-model="newOf.status" :options="statusOptions" class="w-full" />
            </UFormField>

            <UFormField label="Priorité" name="priority">
              <USelect v-model="newOf.priority" :options="priorityOptions" class="w-full" />
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
            <div class="grid grid-cols-2 gap-2 p-3 bg-gray-50/80 rounded-xl border border-dashed border-gray-200">
              <UInput v-model="newBomRow.reference" placeholder="Référence" class="font-mono text-xs" />
              <UInput v-model="newBomRow.name" placeholder="Désignation" class="text-xs" />
              <UInput v-model.number="newBomRow.qtyNeeded" type="number" min="0" placeholder="Qté besoin" class="text-xs" />
              <UInput v-model.number="newBomRow.qtyStock" type="number" min="0" placeholder="Qté stock" class="text-xs" />
              <USelect v-model="newBomRow.unit" :options="unitOptions.map(u => ({ label: u, value: u }))" class="text-xs" />
              <UButton
                icon="i-lucide-plus"
                variant="outline"
                color="neutral"
                size="sm"
                class="justify-center border-gray-200 hover:border-[#0F62BC] hover:text-[#0F62BC]"
                :disabled="!newBomRow.reference || !newBomRow.name"
                @click="addBomRow"
              >
                Ajouter
              </UButton>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
            <UButton variant="ghost" color="neutral" @click="isCreateOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-plus"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white"
              :disabled="!newOf.name || !newOf.ofNumber"
              @click="confirmCreate"
            >
              Créer l'OF
            </UButton>
          </div>

        </div>
      </template>
    </UModal>

  </div>
</template>