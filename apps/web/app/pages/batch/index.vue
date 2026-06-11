<script setup lang="ts">
definePageMeta({ layout: 'default' })

// Types réutilisés ou adaptés
type BatchStatus = 'pending' | 'in_progress' | 'validated'
type Priority = 'low' | 'normal' | 'high' | 'critical'

interface BomItem {
  reference: string
  name: string
  qtyNeeded: number
  qtyStock: number
  unit: string
}

interface Batch {
  id: number
  lotNumber: string
  productName: string
  emoji: string
  qty: number
  status: BatchStatus
  priority: Priority
  hasAnomaly: boolean
  createdAt: string
  bom: BomItem[]
}

// Données de test pour les Lots
const batches = ref<Batch[]>([
  {
    id: 1,
    lotNumber: 'LOT-24-001',
    productName: 'Axe Titane A320',
    emoji: '🔩',
    qty: 50,
    status: 'in_progress',
    priority: 'high',
    hasAnomaly: false,
    createdAt: '2024-05-20',
    bom: [
      { reference: 'RAW-TI-001', name: 'Barre Titane Grade 5', qtyNeeded: 5, qtyStock: 12, unit: 'm' },
      { reference: 'OIL-CUT-S', name: 'Huile de coupe synthétique', qtyNeeded: 2, qtyStock: 25, unit: 'L' },
    ]
  },
  {
    id: 2,
    lotNumber: 'LOT-24-002',
    productName: 'Joint Silicone B737',
    emoji: '💠',
    qty: 200,
    status: 'pending',
    priority: 'normal',
    hasAnomaly: true,
    createdAt: '2024-05-21',
    bom: [
      { reference: 'SIL-MED-02', name: 'Silicone Médical Noir', qtyNeeded: 40, qtyStock: 10, unit: 'kg' },
    ]
  }
])

const statusConfig = {
  pending:     { label: 'En attente', icon: 'i-lucide-clock',         class: 'text-gray-400 bg-gray-100' },
  in_progress: { label: 'En cours',   icon: 'i-lucide-settings-2',    class: 'text-blue-600 bg-blue-50' },
  validated:   { label: 'Validé',    icon: 'i-lucide-check-circle-2', class: 'text-green-600 bg-green-50' },
}

const statusOptions = [
  { label: 'En attente', value: 'pending', icon: 'i-lucide-clock' },
  { label: 'En cours', value: 'in_progress', icon: 'i-lucide-settings-2' },
  { label: 'Validé', value: 'validated', icon: 'i-lucide-check-circle-2' },
]

const priorityOptions = [
  { label: 'Basse', value: 'low' },
  { label: 'Normale', value: 'normal' },
  { label: 'Haute', value: 'high' },
  { label: 'Critique', value: 'critical' }
]

const filterStatus = ref<'all' | BatchStatus>('all')
const search = ref('')
const selected = ref<Batch | null>(null)

// Gestionnaires d'ouverture des Modales
const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)

// Données du formulaire réactif pour la création
const createForm = ref({
  productName: '',
  qty: 1,
  priority: 'normal' as Priority,
  emoji: '📦'
})

const filtered = computed(() =>
  batches.value.filter(b => {
    const matchSearch = b.productName.toLowerCase().includes(search.value.toLowerCase()) || b.lotNumber.toLowerCase().includes(search.value.toLowerCase())
    const matchStatus = filterStatus.value === 'all' || b.status === filterStatus.value
    return matchSearch && matchStatus
  })
)

function openModal(batch: Batch) {
  selected.value = JSON.parse(JSON.stringify(batch)) // Clone pour édition locale
  isModalOpen.value = true
}

function openCreateModal() {
  // Réinitialisation du formulaire à l'ouverture
  createForm.value = {
    productName: '',
    qty: 1,
    priority: 'normal',
    emoji: '📦'
  }
  isCreateModalOpen.value = true
}

function submitCreateBatch() {
  if (!createForm.value.productName.trim()) return

  const currentYear = new Date().getFullYear().toString().slice(-2)
  const nextId = batches.value.length > 0 ? Math.max(...batches.value.map(b => b.id)) + 1 : 1
  const generatedLotNumber = `LOT-${currentYear}-${String(nextId).padStart(3, '0')}`

  const newBatch: Batch = {
    id: nextId,
    lotNumber: generatedLotNumber,
    productName: createForm.value.productName,
    emoji: createForm.value.emoji,
    qty: createForm.value.qty,
    status: 'pending',
    priority: createForm.value.priority,
    hasAnomaly: false,
    createdAt: new Date().toISOString().split('T')[0]!,
    bom: [] // Initialisé vide, à lier dynamiquement à l'usage
  }

  batches.value.unshift(newBatch)
  isCreateModalOpen.value = false
}

function toggleAnomaly() {
  if (selected.value) {
    selected.value.hasAnomaly = !selected.value.hasAnomaly
  }
}

function updateStatus(newStatus: BatchStatus) {
  if (selected.value) {
    selected.value.status = newStatus
  }
}

function bomStatus(item: BomItem): 'ok' | 'low' | 'out' {
  if (item.qtyStock === 0) return 'out'
  if (item.qtyStock < item.qtyNeeded) return 'low'
  return 'ok'
}
</script>

<template>
  <div class="relative min-h-screen px-4 py-5 sm:px-6 sm:py-8 bg-gray-50/50">
    <div class="max-w-6xl mx-auto">
      
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-[#0F62BC]">Suivi des Lots</h1>
          <p class="text-sm text-gray-400 mt-0.5">Contrôle qualité et traçabilité des lots produits</p>
        </div>
        <UButton 
          icon="i-lucide-package-plus" 
          size="sm" 
          class="bg-[#F57C00] hover:bg-[#e06d00] text-white"
          @click="openCreateModal"
        >
          Nouveau Lot
        </UButton>
      </div>

      <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Lot ou produit..." class="sm:flex-1" />
        <USelectMenu 
          v-model="filterStatus" 
          :options="[{ label: 'Tous les statuts', value: 'all' }, ...statusOptions]" 
          value-attribute="value"
          class="w-full sm:w-48"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <p class="text-sm text-gray-500 mb-4">{{ lot.productName }}</p>
            
            <div class="flex items-center justify-between pt-3 border-t border-gray-50">
              <span class="text-xs font-medium text-gray-400">Qté: {{ lot.qty }}</span>
              <UBadge :class="statusConfig[lot.status].class" variant="subtle" size="xs">
                <UIcon :name="statusConfig[lot.status].icon" class="mr-1" />
                {{ statusConfig[lot.status].label }}
              </UBadge>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="isModalOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div v-if="selected" class="p-6">
          <div class="flex justify-between items-start mb-6">
            <div class="flex gap-4">
              <div class="w-14 h-14 rounded-xl bg-[#0F62BC]/5 flex items-center justify-center text-3xl">
                {{ selected.emoji }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-800">{{ selected.lotNumber }}</h2>
                <p class="text-sm text-[#0F62BC] font-medium">{{ selected.productName }}</p>
              </div>
            </div>
            
            <div class="flex gap-2">
              <UTooltip :text="selected.hasAnomaly ? 'Signaler comme conforme' : 'Signaler une anomalie'">
                <UButton
                  :icon="selected.hasAnomaly ? 'i-lucide-alert-octagon' : 'i-lucide-shield-check'"
                  :color="selected.hasAnomaly ? 'warning' : 'neutral'"
                  variant="ghost"
                  @click="toggleAnomaly"
                />
              </UTooltip>
              <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="isModalOpen = false" />
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

          <div class="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-1">Statut actuel</p>
              <div :class="['flex items-center gap-2 text-sm font-bold', statusConfig[selected.status].class, 'bg-transparent p-0']">
                <UIcon :name="statusConfig[selected.status].icon" />
                {{ statusConfig[selected.status].label }}
              </div>
            </div>
            
            <UDropdown :items="[statusOptions.map(s => ({ ...s, click: () => updateStatus(s.value as BatchStatus) }))]">
              <UButton label="Changer le statut" color="neutral" variant="outline" size="xs" trailing-icon="i-lucide-chevron-down" />
            </UDropdown>
          </div>

          <div class="mb-6">
            <h3 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <UIcon name="i-lucide-microscope" class="text-[#0F62BC]" />
              Composants du lot (BOM)
            </h3>
            <div class="space-y-2">
              <div v-for="item in selected.bom" :key="item.reference" 
                class="flex items-center justify-between p-3 rounded-xl border border-gray-100"
                :class="bomStatus(item) !== 'ok' ? 'bg-orange-50/30' : 'bg-white'"
              >
                <div class="flex items-center gap-3">
                  <div :class="['w-2 h-2 rounded-full', bomStatus(item) === 'ok' ? 'bg-green-500' : 'bg-orange-500']" />
                  <div>
                    <p class="text-sm font-medium">{{ item.name }}</p>
                    <p class="text-xs font-mono text-gray-400">{{ item.reference }}</p>
                  </div>
                </div>
                <p class="text-sm font-semibold">{{ item.qtyNeeded }} {{ item.unit }}</p>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400">Créé le {{ selected.createdAt }}</p>
            <div class="flex gap-2">
              <UButton variant="ghost" color="neutral" @click="isModalOpen = false">Fermer</UButton>
              <UButton class="bg-[#0F62BC] text-white">Sauvegarder les modifications</UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isCreateModalOpen" :ui="{ content: 'max-w-md' }">
      <template #content>
        <div class="p-6">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h2 class="text-lg font-bold text-gray-800">Ordonnancer un lot</h2>
              <p class="text-xs text-gray-400 mt-0.5">L'identifiant unique (LOT-XX-XXX) est calculé dynamiquement.</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Désignation de la pièce</label>
              <UInput v-model="createForm.productName" placeholder="Ex: Support de train d'atterrissage" icon="i-lucide-layers" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantité (Unités)</label>
                <UInput v-model="createForm.qty" type="number" :min="1" icon="i-lucide-hash" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Repère Visuel</label>
                <USelectMenu v-model="createForm.emoji" :options="['📦', '🔩', '💠', '⚙️', '🔌', '✈️']" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Niveau de Priorité</label>
              <USelectMenu 
                v-model="createForm.priority" 
                :options="priorityOptions"
                value-attribute="value"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <UButton variant="ghost" color="neutral" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton 
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white" 
              icon="i-lucide-check"
              :disabled="!createForm.productName.trim()"
              @click="submitCreateBatch"
            >
              Créer le Lot
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>