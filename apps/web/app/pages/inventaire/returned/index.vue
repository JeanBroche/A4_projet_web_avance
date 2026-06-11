<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ReturnItem, ReturnReason, ReturnState } from '~/types'

definePageMeta({ layout: 'sidebar' })

const UButton = resolveComponent('UButton')
const UBadge  = resolveComponent('UBadge')

const { returned, status, error, isMutating, refreshReturned, createReturned, updateReturned, deleteReturned } = useStock()

onMounted(() => refreshReturned())

const items = returned

const stateConfig: Record<ReturnState, { label: string; color: 'success' | 'warning' | 'error' }> = {
  neuf:        { label: 'Neuf',        color: 'success' },
  usagé:       { label: 'Usagé',       color: 'warning' },
  défectueux:  { label: 'Défectueux',  color: 'error'   },
}

const reasonConfig: Record<ReturnReason, { label: string; icon: string }> = {
  défaut_fabrication: { label: 'Défaut fabrication', icon: 'i-lucide-wrench'        },
  erreur_commande:    { label: 'Erreur commande',    icon: 'i-lucide-package-x'     },
  non_conforme:       { label: 'Non conforme',       icon: 'i-lucide-alert-triangle' },
  excédent:           { label: 'Excédent',           icon: 'i-lucide-boxes'          },
}

const search     = ref('')
const filter     = ref<'all' | ReturnState>('all')
const expanded   = ref({})
const expandedId = ref<number | null>(null)

// Modal création
const isCreateModalOpen = ref(false)
const newItem = ref({
  name: '',
  reference: '',
  qty: 1,
  state: 'neuf' as ReturnState,
  reason: 'défaut_fabrication' as ReturnReason,
  of: '',
})

// Modal édition
const isEditModalOpen = ref(false)
const editTarget = ref<ReturnItem | null>(null)
const editQty    = ref(0)
const editState  = ref<ReturnState>('neuf')

// Modal suppression
const isDeleteModalOpen = ref(false)
const deleteTarget = ref<ReturnItem | null>(null)

const filterButtons = [
  { key: 'all',       label: 'Tous',       icon: 'i-lucide-list'          },
  { key: 'neuf',      label: 'Neuf',       icon: 'i-lucide-check-circle'  },
  { key: 'usagé',     label: 'Usagé',      icon: 'i-lucide-clock'         },
  { key: 'défectueux',label: 'Défectueux', icon: 'i-lucide-alert-triangle' },
] as const

const stateOptions = [
  { label: 'Neuf',       value: 'neuf'       },
  { label: 'Usagé',      value: 'usagé'      },
  { label: 'Défectueux', value: 'défectueux' },
]

const reasonOptions = [
  { label: 'Défaut fabrication', value: 'défaut_fabrication' },
  { label: 'Erreur commande',    value: 'erreur_commande'    },
  { label: 'Non conforme',       value: 'non_conforme'       },
  { label: 'Excédent',           value: 'excédent'           },
]

const filteredItems = computed(() =>
  items.value.filter(item => {
    const matchSearch =
      item.name.toLowerCase().includes(search.value.toLowerCase()) ||
      item.reference.toLowerCase().includes(search.value.toLowerCase()) ||
      (item.of ?? '').toLowerCase().includes(search.value.toLowerCase())
    const matchFilter = filter.value === 'all' || item.state === filter.value
    return matchSearch && matchFilter
  })
)

const stats = computed(() => ({
  total:       items.value.length,
  neuf:        items.value.filter(i => i.state === 'neuf').length,
  usagé:       items.value.filter(i => i.state === 'usagé').length,
  défectueux:  items.value.filter(i => i.state === 'défectueux').length,
}))

// ── Colonnes desktop ──────────────────────────────────────────────────────────
const columns: TableColumn<ReturnItem>[] = [
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
    header: 'Pièce',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-3' }, [
        h('div', { class: 'w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0' }, row.original.emoji),
        h('div', {}, [
          h('p', { class: 'text-sm font-medium text-gray-800' }, row.original.name),
          h('p', { class: 'text-xs font-mono text-gray-400' }, row.original.reference),
        ]),
      ]),
  },
  {
    accessorKey: 'qty',
    header: 'Qté retournée',
    cell: ({ row }) =>
      h('span', { class: 'text-sm font-semibold text-gray-700' }, String(row.original.qty)),
  },
  {
    accessorKey: 'state',
    header: 'État',
    cell: ({ row }) =>
      h(UBadge, { color: stateConfig[row.original.state].color, variant: 'subtle' }, () => stateConfig[row.original.state].label),
  },
  {
    accessorKey: 'date',
    header: 'Date retour',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-gray-500' }, row.original.date),
  },
]

function toggleMobile(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function openEdit(item: ReturnItem) {
  editTarget.value = { ...item }
  editQty.value   = item.qty
  editState.value = item.state
  isEditModalOpen.value = true
}

async function confirmEdit() {
  if (!editTarget.value) return
  await updateReturned(editTarget.value.id, editQty.value, editState.value)
  isEditModalOpen.value = false
}

function askDelete(item: ReturnItem) {
  deleteTarget.value = item
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  if (expandedId.value === id) expandedId.value = null
  await deleteReturned(id)
  isDeleteModalOpen.value = false
  deleteTarget.value = null
}

function openCreate() {
  newItem.value = { name: '', reference: '', qty: 1, state: 'neuf', reason: 'défaut_fabrication', of: '' }
  isCreateModalOpen.value = true
}

async function confirmCreate() {
  if (!newItem.value.name || !newItem.value.reference) return
  await createReturned({
    name: newItem.value.name,
    reference: newItem.value.reference,
    qty: newItem.value.qty,
    state: newItem.value.state,
    reason: newItem.value.reason,
    of: newItem.value.of || undefined
  })
  isCreateModalOpen.value = false
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">

      <!-- Header -->
      <div class="flex items-start justify-between mb-5 gap-2">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-[#0F62BC]">Produits retournés</h1>
          <p class="text-xs sm:text-sm text-gray-400 mt-0.5">Suivi des retours en attente de traitement</p>
        </div>
        <UButton icon="i-lucide-plus" size="sm" class="bg-[#F57C00] hover:bg-[#e06d00] text-white font-medium flex-shrink-0" @click="openCreate">
          <span class="hidden sm:inline">Déclarer un retour</span>
          <span class="sm:hidden">Ajouter</span>
        </UButton>
      </div>

      <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />
      <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="refreshReturned">Réessayer</UButton>

      <div v-if="status === 'pending'" class="space-y-3 mb-5">
        <USkeleton v-for="i in 4" :key="i" class="h-16 w-full" />
      </div>

      <!-- Stats -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Total retours</p>
          <p class="text-xl sm:text-2xl font-semibold text-[#0F62BC]">{{ stats.total }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Neufs</p>
          <p class="text-xl sm:text-2xl font-semibold text-green-600">{{ stats.neuf }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Usagés</p>
          <p class="text-xl sm:text-2xl font-semibold text-[#F57C00]">{{ stats.usagé }}</p>
        </div>
        <div class="bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl p-3 sm:p-4">
          <p class="text-xs text-gray-400 mb-1">Défectueux</p>
          <p class="text-xl sm:text-2xl font-semibold text-red-500">{{ stats.défectueux }}</p>
        </div>
      </div>

      <!-- Toolbar -->
      <div v-if="status !== 'pending'" class="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Référence, nom, numéro OF…" class="w-full sm:flex-1" />
        <div class="flex gap-1 w-full sm:w-auto">
          <UButton
            v-for="btn in filterButtons" :key="btn.key"
            :icon="btn.icon"
            :variant="filter === btn.key ? 'solid' : 'outline'"
            :class="['flex-1 sm:flex-none justify-center', filter === btn.key ? 'bg-[#0F62BC] text-white border-[#0F62BC]' : 'text-gray-500 border-gray-200 hover:border-[#0F62BC] hover:text-[#0F62BC]']"
            size="sm"
            @click="filter = btn.key"
          >
            <span class="sm:hidden text-xs">{{ btn.label }}</span>
            <span class="hidden sm:inline">{{ btn.label }}</span>
          </UButton>
        </div>
      </div>

      <!-- MOBILE -->
      <div v-if="status !== 'pending'" class="flex sm:hidden flex-col gap-2">
        <div
          v-for="item in filteredItems" :key="item.id"
          class="bg-white/70 border rounded-xl overflow-hidden transition-colors duration-150"
          :class="expandedId === item.id ? 'border-[#0F62BC]/30' : 'border-gray-100'"
        >
          <button class="w-full flex items-center gap-3 px-3 py-3 text-left" @click="toggleMobile(item.id)">
            <div class="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">{{ item.emoji }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ item.name }}</p>
              <p class="text-xs font-mono text-gray-400">{{ item.reference }}</p>
            </div>
            <UBadge :color="stateConfig[item.state].color" variant="subtle" class="text-xs flex-shrink-0">
              {{ stateConfig[item.state].label }}
            </UBadge>
            <UIcon name="i-lucide-chevron-down" class="flex-shrink-0 text-gray-400 text-base transition-transform duration-200" :class="expandedId === item.id ? 'rotate-180' : ''" />
          </button>

          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-64"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 max-h-64"
            leave-to-class="opacity-0 max-h-0"
          >
            <div v-if="expandedId === item.id" class="border-t border-gray-100 px-3 py-3 bg-gray-50/50">
              <div class="grid grid-cols-2 gap-2 mb-3 text-center">
                <div>
                  <p class="text-[10px] text-gray-400 mb-0.5">Quantité</p>
                  <p class="text-sm font-semibold text-gray-700">{{ item.qty }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 mb-0.5">Date retour</p>
                  <p class="text-xs font-medium text-gray-700">{{ item.date }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 mb-0.5">Raison</p>
                  <p class="text-xs font-medium text-gray-700">{{ reasonConfig[item.reason].label }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 mb-0.5">OF lié</p>
                  <p class="text-xs font-mono text-gray-700">{{ item.of ?? '—' }}</p>
                </div>
              </div>
              <div class="flex gap-2">
                <UButton icon="i-lucide-pencil" variant="outline" color="neutral" size="xs" class="flex-1 justify-center" @click="openEdit(item)">Modifier</UButton>
                <UButton icon="i-lucide-trash-2" variant="outline" color="error" size="xs" class="flex-1 justify-center" @click="askDelete(item)">Supprimer</UButton>
              </div>
            </div>
          </Transition>
        </div>
        <div v-if="filteredItems.length === 0" class="text-center py-12 text-gray-400 text-sm">Aucun retour trouvé.</div>
      </div>

      <!-- DESKTOP -->
      <div v-if="status !== 'pending'" class="hidden sm:block bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl overflow-x-auto">
        <UTable v-model:expanded="expanded" :data="filteredItems" :columns="columns" class="w-full">
          <template #expanded="{ row }">
            <div class="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between gap-6 flex-wrap">
              <div class="flex gap-8 flex-wrap">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Raison du retour</p>
                  <div class="flex items-center gap-1.5">
                    <UIcon :name="reasonConfig[row.original.reason].icon" class="text-gray-500 text-sm" />
                    <p class="text-sm font-medium text-gray-700">{{ reasonConfig[row.original.reason].label }}</p>
                  </div>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">OF lié</p>
                  <p class="text-sm font-mono text-gray-700">{{ row.original.of ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Date retour</p>
                  <p class="text-sm text-gray-700">{{ row.original.date }}</p>
                </div>
              </div>
              <div class="flex gap-2 flex-shrink-0">
                <UButton icon="i-lucide-pencil" variant="outline" color="neutral" size="sm" @click="openEdit(row.original)">Modifier</UButton>
                <UButton icon="i-lucide-trash-2" variant="outline" color="error" size="sm" @click="askDelete(row.original)">Supprimer</UButton>
              </div>
            </div>
          </template>
        </UTable>
        <div v-if="filteredItems.length === 0" class="text-center py-12 text-gray-400 text-sm">Aucun retour trouvé.</div>
      </div>

    <!-- ═══ Modal : Déclarer un retour ═══ -->
    <UModal v-model:open="isCreateModalOpen" :ui="modalUi('lg')">
      <template #content>
        <div :class="MODAL_BODY">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-[#0F62BC]/8 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-package-x" class="text-[#0F62BC] text-lg" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-800">Déclarer un retour</h3>
              <p class="text-xs text-gray-400 mt-0.5">Enregistrer une nouvelle pièce retournée</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Désignation *" name="name" class="col-span-2">
                <UInput v-model="newItem.name" placeholder="Ex : Roulement 6205-ZZ" class="w-full" />
              </UFormField>

              <UFormField label="Référence *" name="reference">
                <UInput v-model="newItem.reference" placeholder="Ex : RLM-6205-ZZ" class="w-full font-mono" />
              </UFormField>

              <UFormField label="Quantité" name="qty">
                <UInput v-model.number="newItem.qty" type="number" min="1" class="w-full" />
              </UFormField>

              <UFormField label="État" name="state">
                <USelect v-model="newItem.state" :items="stateOptions" value-key="value" class="w-full" />
              </UFormField>

              <UFormField label="Raison du retour" name="reason">
                <USelect v-model="newItem.reason" :items="reasonOptions" value-key="value" class="w-full" />
              </UFormField>

              <UFormField label="Numéro OF (optionnel)" name="of" class="col-span-2">
                <UInput v-model="newItem.of" placeholder="Ex : OF-2024-0142" class="w-full font-mono" />
              </UFormField>
            </div>
          </div>

          <div :class="MODAL_FOOTER">
            <UButton variant="ghost" color="neutral" class="w-full sm:w-auto" @click="isCreateModalOpen = false">Annuler</UButton>
            <UButton
              icon="i-lucide-plus"
              class="bg-[#F57C00] hover:bg-[#e06d00] text-white w-full sm:w-auto"
              :disabled="!newItem.name || !newItem.reference"
              :loading="isMutating"
              @click="confirmCreate"
            >
              Déclarer le retour
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ═══ Modal : Modifier ═══ -->
    <UModal v-model:open="isEditModalOpen" :ui="modalUi('sm')">
      <template #content>
        <div :class="MODAL_BODY">
          <h3 class="text-lg font-semibold text-[#0F62BC] mb-1">Modifier le retour</h3>
          <p v-if="editTarget" class="text-sm font-mono text-gray-400 mb-4">{{ editTarget.reference }} — {{ editTarget.name }}</p>
          <div class="space-y-4">
            <UFormField label="Quantité" name="qty">
              <UInput v-model.number="editQty" type="number" min="0" class="w-full" />
            </UFormField>
            <UFormField label="État" name="state">
              <USelect v-model="editState" :items="stateOptions" value-key="value" class="w-full" />
            </UFormField>
          </div>
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
        <div :class="MODAL_BODY">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-trash-2" class="text-red-500 text-lg" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-800">Supprimer le retour</h3>
              <p v-if="deleteTarget" class="text-sm font-mono text-gray-400 mt-0.5">{{ deleteTarget.reference }}</p>
            </div>
          </div>
          <p class="text-sm text-gray-600 mb-5">Cette action est irréversible. Le retour <span class="font-medium text-gray-800">{{ deleteTarget?.name }}</span> sera définitivement supprimé.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="isDeleteModalOpen = false">Annuler</UButton>
            <UButton icon="i-lucide-trash-2" color="error" @click="confirmDelete">Supprimer</UButton>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>

<style scoped>
.list-enter-active, .list-leave-active { transition: all 0.2s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(-4px); }
</style>