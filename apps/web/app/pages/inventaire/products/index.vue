<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { createProductSchema, firstZodError, updateProductSchema } from '~/lib/validation/schemas'
import type { Product } from '~/types'

definePageMeta({ layout: 'sidebar' })

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const {
  products, status, error, isMutating,
  refreshProducts, createProduct, updateProduct, deleteProduct
} = useProduction()
const { canManageStock, pageSubtitle } = useRoleCapabilities()

onMounted(() => refreshProducts())

const search = ref('')
const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const isDeleteOpen = ref(false)
const formError = ref<string | null>(null)
const editTarget = ref<Product | null>(null)
const deleteTarget = ref<Product | null>(null)

const newProduct = ref({
  productCode: '',
  description: '',
  quantity: 0,
  siteCode: 'SITE-LYO'
})

const editForm = ref({
  productCode: '',
  description: '',
  quantity: 0,
  siteCode: ''
})

const filtered = computed(() =>
  products.value.filter(p =>
    p.productCode.toLowerCase().includes(search.value.toLowerCase())
    || p.description.toLowerCase().includes(search.value.toLowerCase())
  )
)

const columns: TableColumn<Product>[] = [
  {
    accessorKey: 'productCode',
    header: 'Code',
    cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.productCode)
  },
  {
    accessorKey: 'description',
    header: 'Description'
  },
  {
    accessorKey: 'quantity',
    header: 'Stock',
    cell: ({ row }) => h('span', { class: 'font-semibold text-[#0F62BC]' }, String(row.original.quantity))
  },
  {
    accessorKey: 'reservedQuantity',
    header: 'Réservé',
    cell: ({ row }) => h(UBadge, { color: row.original.reservedQuantity > 0 ? 'warning' : 'neutral', variant: 'subtle' }, () => String(row.original.reservedQuantity))
  },
  {
    accessorKey: 'siteCode',
    header: 'Site',
    cell: ({ row }) => h('span', { class: 'text-xs text-gray-500' }, row.original.siteCode)
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      if (!canManageStock.value) return null
      return h('div', { class: 'flex gap-1 justify-end' }, [
        h(UButton, { icon: 'i-lucide-pencil', size: 'xs', variant: 'ghost', color: 'neutral', onClick: () => openEdit(row.original) }),
        h(UButton, { icon: 'i-lucide-trash-2', size: 'xs', variant: 'ghost', color: 'error', onClick: () => openDelete(row.original) })
      ])
    }
  }
]

function openCreate() {
  formError.value = null
  newProduct.value = { productCode: '', description: '', quantity: 0, siteCode: 'SITE-LYO' }
  isCreateOpen.value = true
}

function openEdit(product: Product) {
  formError.value = null
  editTarget.value = product
  editForm.value = {
    productCode: product.productCode,
    description: product.description,
    quantity: product.quantity,
    siteCode: product.siteCode
  }
  isEditOpen.value = true
}

function openDelete(product: Product) {
  deleteTarget.value = product
  isDeleteOpen.value = true
}

async function submitCreate() {
  formError.value = null
  const parsed = createProductSchema.safeParse(newProduct.value)
  if (!parsed.success) {
    formError.value = firstZodError(parsed.error)
    return
  }
  await createProduct(parsed.data)
  isCreateOpen.value = false
}

async function submitEdit() {
  if (!editTarget.value) return
  formError.value = null
  const parsed = updateProductSchema.safeParse(editForm.value)
  if (!parsed.success) {
    formError.value = firstZodError(parsed.error)
    return
  }
  await updateProduct(parsed.data)
  isEditOpen.value = false
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  await deleteProduct(deleteTarget.value.productCode)
  isDeleteOpen.value = false
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
    <PageHeader
      title="Produits finis"
      :subtitle="pageSubtitle || 'Stock des productions terminées'"
    />

    <UAlert v-if="error" color="error" variant="soft" :title="error" class="mb-4" />
    <UButton v-if="error" size="sm" variant="outline" class="mb-4" @click="refreshProducts">Réessayer</UButton>

    <div class="flex flex-col sm:flex-row gap-3 mb-5">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Rechercher par code ou description..." class="flex-1" />
      <UButton
        v-if="canManageStock"
        icon="i-lucide-plus"
        class="bg-[#0F62BC] text-white"
        :loading="isMutating"
        @click="openCreate"
      >
        Nouveau produit
      </UButton>
    </div>

    <AsyncListState :status="status" empty-message="Aucun produit fini enregistré.">
      <UTable :data="filtered" :columns="columns" class="hidden md:block" />
      <div class="md:hidden space-y-3">
        <UCard v-for="product in filtered" :key="product.id" :ui="{ body: 'p-4' }">
          <p class="font-mono text-sm text-[#0F62BC]">{{ product.productCode }}</p>
          <p class="font-medium text-gray-800 mt-1">{{ product.description }}</p>
          <div class="flex gap-4 mt-2 text-sm text-gray-600">
            <span>Stock : <strong>{{ product.quantity }}</strong></span>
            <span>Réservé : {{ product.reservedQuantity }}</span>
            <span class="text-xs text-gray-400">{{ product.siteCode }}</span>
          </div>
        </UCard>
      </div>
    </AsyncListState>

    <UModal v-model:open="isCreateOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-bold mb-4">Nouveau produit fini</h2>
          <UAlert v-if="formError" color="error" variant="soft" :title="formError" class="mb-3" />
          <div class="space-y-3">
            <UFormField label="Code produit">
              <UInput v-model="newProduct.productCode" placeholder="PROD-001" />
            </UFormField>
            <UFormField label="Description">
              <UInput v-model="newProduct.description" />
            </UFormField>
            <UFormField label="Quantité">
              <UInput v-model.number="newProduct.quantity" type="number" min="0" />
            </UFormField>
            <UFormField label="Site">
              <UInput v-model="newProduct.siteCode" placeholder="SITE-LYO" />
            </UFormField>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" @click="isCreateOpen = false">Annuler</UButton>
            <UButton class="bg-[#0F62BC] text-white" :loading="isMutating" @click="submitCreate">Créer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isEditOpen">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-bold mb-4">Modifier {{ editTarget?.productCode }}</h2>
          <UAlert v-if="formError" color="error" variant="soft" :title="formError" class="mb-3" />
          <div class="space-y-3">
            <UFormField label="Description">
              <UInput v-model="editForm.description" />
            </UFormField>
            <UFormField label="Quantité">
              <UInput v-model.number="editForm.quantity" type="number" min="0" />
            </UFormField>
            <UFormField label="Site">
              <UInput v-model="editForm.siteCode" />
            </UFormField>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton variant="ghost" @click="isEditOpen = false">Annuler</UButton>
            <UButton class="bg-[#0F62BC] text-white" :loading="isMutating" @click="submitEdit">Enregistrer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <ConfirmDeleteModal
      v-model:open="isDeleteOpen"
      :title="`Supprimer ${deleteTarget?.productCode} ?`"
      description="Cette action supprime le stock produit fini côté production."
      :loading="isMutating"
      @confirm="confirmDelete"
    />
  </div>
</template>
