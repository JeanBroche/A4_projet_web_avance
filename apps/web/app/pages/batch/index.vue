<script setup lang="ts">
import { createBatchSchema, firstZodError } from '~/lib/validation/schemas'
import type { Batch, BatchStatus, BomItem, Priority } from '~/types'

definePageMeta({ layout: 'sidebar' })

const { batches, status, error, isMutating, refreshBatches, createBatch, updateBatchStatus, reportAnomaly, clearAnomaly } = useProduction()
const { canManageBatches, pageSubtitle } = useRoleCapabilities()

onMounted(() => refreshBatches())

const statusConfig = {
  pending:     { label: 'Planifié',  icon: 'i-lucide-clock',         class: 'text-gray-400 bg-gray-100' },
  in_progress: { label: 'En cours',  icon: 'i-lucide-settings-2',    class: 'text-blue-600 bg-blue-50' },
  validated:   { label: 'Terminé',   icon: 'i-lucide-check-circle-2', class: 'text-green-600 bg-green-50' },
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
const search = ref('')
const selected = ref<Batch | null>(null)

// Gestionnaires d'ouverture des Modales
const isModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const createFormError = ref<string | null>(null)

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
  createFormError.value = null
  isCreateModalOpen.value = true
}

async function submitCreateBatch() {
  createFormError.value = null
  const parsed = createBatchSchema.safeParse(createForm.value)
  if (!parsed.success) {
    createFormError.value = firstZodError(parsed.error)
    return
  }
  await createBatch(parsed.data)
  isCreateModalOpen.value = false
}

async function toggleAnomaly() {
  if (!selected.value) return
  if (selected.value.hasAnomaly) {
    await clearAnomaly(selected.value.id)
  } else {
    await reportAnomaly(selected.value.id, 'Anomalie signalée par l\'opérateur')
  }
  selected.value = batches.value.find(b => b.id === selected.value!.id) ?? null
}

async function updateStatus(newStatus: BatchStatus) {
  if (!selected.value) return
  await updateBatchStatus(selected.value.id, newStatus)
  selected.value = batches.value.find(b => b.id === selected.value!.id) ?? null
}

function bomStatus(item: BomItem): 'ok' | 'low' | 'out' {
  if (item.qtyStock === 0) return 'out'
  if (item.qtyStock < item.qtyNeeded) return 'low'
  return 'ok'
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
                <p class="text-sm text-[#0F62BC] font-medium">{{ selected.productName }}</p>
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

          <div class="bg-gray-50 rounded-2xl p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-1">Statut actuel</p>
              <div :class="['flex items-center gap-2 text-sm font-bold', statusConfig[selected.status].class, 'bg-transparent p-0']">
                <UIcon :name="statusConfig[selected.status].icon" />
                {{ statusConfig[selected.status].label }}
              </div>
            </div>

            <UDropdownMenu v-if="canManageBatches" :items="[statusOptions.map(s => ({ label: s.label, icon: s.icon, onSelect: () => updateStatus(s.value as BatchStatus) }))]">
              <UButton label="Changer le statut" color="neutral" variant="outline" size="xs" trailing-icon="i-lucide-chevron-down" class="w-full sm:w-auto justify-center" />
            </UDropdownMenu>
          </div>

          <div class="mb-6">
            <h3 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <UIcon name="i-lucide-microscope" class="text-[#0F62BC]" />
              Composants du lot (BOM)
            </h3>
            <div class="space-y-2">
              <div
                v-for="item in selected.bom"
                :key="item.reference"
                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-gray-100"
                :class="bomStatus(item) !== 'ok' ? 'bg-orange-50/30' : 'bg-white'"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div :class="['w-2 h-2 rounded-full shrink-0', bomStatus(item) === 'ok' ? 'bg-green-500' : 'bg-orange-500']" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{{ item.name }}</p>
                    <p class="text-xs font-mono text-gray-400 break-all">{{ item.reference }}</p>
                  </div>
                </div>
                <p class="text-sm font-semibold shrink-0">{{ item.qtyNeeded }} {{ item.unit }}</p>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400">Créé le {{ selected.createdAt }}</p>
            <UButton variant="ghost" color="neutral" @click="isModalOpen = false">Fermer</UButton>
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
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Désignation de la pièce</label>
              <UInput v-model="createForm.productName" placeholder="Ex: Support de train d'atterrissage" icon="i-lucide-layers" />
            </div>

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
          </div>

          <p v-if="createFormError" class="text-red-500 text-sm mb-3">{{ createFormError }}</p>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              icon="i-lucide-check"
              :disabled="!createForm.productName.trim()"
              :loading="isMutating"
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