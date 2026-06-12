<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { canSeeNavItem, getDefaultRouteForRole, getRoleConfig } from '~/lib/roles'
import type { UserRole } from '~/types'

const { open, isDesktop, toggleSidebar, closeSidebar } = useSidebarLayout()

const { user, role } = useSession()

const siteBadge = computed(() => {
  const code = user.value?.siteCode
  if (!code) return null
  const labels: Record<string, string> = {
    'SITE-LYO': 'Lyon',
    'SITE-PAR': 'Paris',
    'SITE-HQ': 'Siège'
  }
  return { code, label: labels[code] ?? code }
})
const { logout } = useAuth()

const roleDisplay = computed(() => {
  if (!role.value) return { label: 'Utilisateur', icon: 'i-lucide-user' }
  const cfg = getRoleConfig(role.value)
  return { label: cfg.label, icon: cfg.icon }
})

const route = useRoute()

const homeRoute = computed(() =>
  role.value ? getDefaultRouteForRole(role.value) : '/'
)

const inventaireChildren = [
  { label: 'Pièces détachées', icon: 'i-uil:screw', to: '/inventaire/spare' },
  { label: 'Produits finis', icon: 'i-lucide-package-check', to: '/inventaire/products' }
]

function getItems(state: 'collapsed' | 'expanded') {
  const onInventaire = route.path.startsWith('/inventaire')

  const items = [
    {
      label: 'Inventaire',
      icon: 'i-material-symbols:shelves',
      roles: ['operateur', 'logistique', 'admin'] as UserRole[],
      to: '/inventaire/spare',
      defaultOpen: onInventaire,
      children: inventaireChildren
    },
    {
      label: 'Ordre de Fabrication',
      icon: 'i-ph-blueprint',
      roles: ['operateur', 'logistique', 'admin'] as UserRole[],
      to: '/bom'
    },
    {
      label: 'Lot',
      icon: 'i-carbon:classic-batch',
      roles: ['operateur', 'admin'] as UserRole[],
      to: '/batch'
    },
    {
      label: 'Commandes',
      icon: 'i-boxicons-package',
      roles: ['commercial', 'admin'] as UserRole[],
      to: '/commands'
    },
    {
      label: 'Expéditions',
      icon: 'i-icon-park-solid-delivery',
      roles: ['commercial', 'logistique', 'admin'] as UserRole[],
      to: '/delivery'
    },
    {
      label: 'Tableaux de bord',
      icon: 'i-lucide-chart-bar',
      roles: ['direction', 'admin'] as UserRole[],
      to: '/dashboard'
    },
    {
      label: 'Notifications',
      icon: 'i-lucide-bell',
      roles: ['logistique', 'direction', 'admin'] as UserRole[],
      to: '/notifications'
    },
    {
      label: 'Mon activité',
      icon: 'i-lucide-square-activity',
      roles: ['operateur', 'logistique', 'commercial', 'direction', 'admin'] as UserRole[],
      to: '/activity'
    }
  ] satisfies NavigationMenuItem[]

  return items.filter((item) => {
    if (!item.roles) return true
    return canSeeNavItem(role.value, item.roles)
  })
}

const userDisplay = computed(() => ({
  name: user.value?.name ?? 'Utilisateur',
  avatar: {
    src: user.value?.avatar ?? 'https://api.dicebear.com/7.x/initials/svg?seed=User',
    alt: user.value?.name ?? 'Utilisateur'
  }
}))

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Mon Activité',
      icon: 'i-lucide-square-activity',
      to: '/activity'
    },
    {
      label: 'Déconnexion',
      icon: 'i-lucide-log-out',
      onSelect() {
        logout()
      }
    }
  ]
])
</script>

<template>
  <div class="flex min-h-dvh min-w-0 flex-1">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <button
        v-if="!isDesktop && open"
        type="button"
        class="fixed inset-0 z-40 bg-black/50 lg:hidden"
        aria-label="Fermer le menu de navigation"
        @click="closeSidebar"
      />
    </Transition>

    <USidebar
      v-model:open="open"
      collapsible="icon"
      class="z-50"
      style="--sidebar-width: 14rem; --sidebar-width-icon: 3.5rem;"
      :ui="{
        container: 'h-full',
        inner: 'bg-elevated/25 divide-transparent',
        header: 'border-b border-default/50 px-2 py-2 min-h-0',
        body: 'px-1.5 py-2 overflow-y-auto',
        footer: 'border-t border-default/50 px-1.5 py-2'
      }"
    >
      <template #header="{ state }">
        <div
          class="flex min-w-0 flex-1 flex-col gap-2"
          :class="state === 'collapsed' ? 'items-center' : 'items-stretch'"
        >
          <UButton
            :icon="state === 'collapsed' ? 'i-lucide-panel-right-open' : 'i-lucide-panel-left-close'"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            class="shrink-0"
            :class="state === 'collapsed' ? 'mx-auto' : 'self-end'"
            :aria-label="state === 'collapsed' ? 'Développer le menu' : 'Réduire le menu'"
            @click="toggleSidebar"
          />

          <NuxtLink
            :to="homeRoute"
            class="flex items-center justify-center rounded-md transition-opacity hover:opacity-80"
            :class="state === 'collapsed' ? 'p-1' : 'px-1 py-0.5'"
            :title="'AERONEXIS — ' + roleDisplay.label"
            @click="!isDesktop && closeSidebar()"
          >
            <AppLogo
              :class="state === 'collapsed'
                ? 'size-8 object-contain'
                : 'h-8 w-auto max-w-full'"
            />
          </NuxtLink>

          <div v-if="state === 'expanded'" class="flex flex-col gap-1.5 min-w-0">
            <div
              class="flex items-center gap-1.5 rounded-md bg-elevated/60 px-2 py-1.5 text-xs font-medium text-muted min-w-0"
              :title="roleDisplay.label"
            >
              <UIcon :name="roleDisplay.icon" class="size-3.5 shrink-0" />
              <span class="truncate leading-tight">{{ roleDisplay.label }}</span>
            </div>
            <div
              v-if="siteBadge"
              class="flex items-center gap-1.5 rounded-md bg-[#0F62BC]/10 px-2 py-1 text-[11px] font-semibold text-[#0F62BC]"
              :title="`Site ${siteBadge.code}`"
            >
              <UIcon name="i-lucide-map-pin" class="size-3 shrink-0" />
              <span class="truncate">{{ siteBadge.label }}</span>
            </div>
          </div>
        </div>
      </template>

      <template #default="{ state }">
        <UNavigationMenu
          :key="state"
          :collapsed="state === 'collapsed'"
          :items="getItems(state)"
          orientation="vertical"
          tooltip
          :ui="{
            link: 'px-2 py-2 text-sm overflow-hidden',
            linkLeadingIcon: 'size-5 shrink-0',
            childLink: 'px-2 py-1.5 text-sm'
          }"
        />
      </template>

      <template #footer="{ state }">
        <UDropdownMenu
          :items="userItems"
          :content="{ align: 'start', collisionPadding: 12 }"
          :ui="{ content: 'min-w-48' }"
        >
          <UButton
            v-bind="userDisplay"
            :label="state === 'expanded' ? userDisplay.name : undefined"
            :trailing-icon="state === 'expanded' ? 'i-lucide-chevrons-up-down' : undefined"
            color="neutral"
            variant="ghost"
            :square="state === 'collapsed'"
            class="w-full data-[state=open]:bg-elevated overflow-hidden"
            :ui="{ trailingIcon: 'text-dimmed ms-auto size-4' }"
          />
        </UDropdownMenu>
      </template>
    </USidebar>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        v-if="!isDesktop && !open"
        class="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-default bg-background/95 px-3 backdrop-blur-sm lg:hidden"
      >
        <UButton
          icon="i-lucide-panel-left"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Ouvrir le menu"
          @click="toggleSidebar"
        />
        <NuxtLink
          :to="homeRoute"
          class="min-w-0 truncate text-sm font-semibold text-[#0F62BC]"
        >
          AERONEXIS
        </NuxtLink>
      </header>

      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 px-3 py-4 sm:px-5 sm:py-6">
        <slot />
      </main>
    </div>
  </div>
</template>
