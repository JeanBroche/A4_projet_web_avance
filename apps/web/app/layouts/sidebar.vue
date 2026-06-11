<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const open = ref(true)

// const route = useRoute()

const isAdmin = ref(true)

const role = computed(() => selectedTeam.value?.label ?? 'production')

const colorMode = useColorMode()

const teams = ref([
  {
    label: 'Opérateur Production',
    icon: 'i-hugeicons-drill'
  },
  {
    label: 'Responsable Logistique',
    icon: 'i-boxicons-package'
  },
  {
    label: 'Responsable Commercial',
    icon: 'i-icon-park-solid-delivery'
  },
  {
    label: 'Direction',
    icon: 'i-lucide-briefcase'
  }
])
const selectedTeam = ref(teams.value[0])

const teamsItems = computed<DropdownMenuItem[][]>(() => {
  return [
    teams.value.map((team, index) => ({
      ...team,
      kbds: ['meta', String(index + 1)],
      onSelect() {
        selectedTeam.value = team
      }
    })),
    // [
    //   {
    //     label: 'Create team',
    //     icon: 'i-lucide-circle-plus'
    //   }
    // ]
  ]
})

function getItems(state: 'collapsed' | 'expanded') {
  const items = [

    {
      label: 'Inventaire',
      icon: 'i-material-symbols:shelves',
      roles: ['Opérateur Production', 'Responsable Logistique'],
      defaultOpen: false,
      children:
        state === 'expanded'
          ? [
              {
                label: 'Pièces détachées',
                icon: 'i-uil:screw',
                to: '/inventaire/spare_part'
              },
              {
                label: 'Articles retournés',
                icon: 'i-icon-park-outline:back-one',
                to: '/inventaire/returned'
              },    
            ]
          : []  
    //   to: '/product'
    },

    {
      label: 'Ordre de Fabrication',
      icon: 'i-ph-blueprint',
      roles: ['Opérateur Production', 'Responsable Logistique'],
      badge: '+99',
      to: '/bom'
    },

    {
      label: 'Lot',
      icon: 'i-carbon:classic-batch',
      roles: ['Opérateur Production', 'Responsable Logistique'],
      to: '/batch'
    //   badge: '+99'
    },

    {
      label: 'Products',
      icon: 'i-lucide-square-dot',
      roles: ['Opérateur Production', 'Responsable Logistique'],
      to: '/product'
    },

    {
      label: 'Commandes',
      icon: 'i-boxicons-package',
      roles: ['Responsable Commercial'],
      to: '/commands'
    //   to: '/product'
    },

    {
      label: 'Expéditions',
      icon: 'i-icon-park-solid-delivery',
      roles: ['Responsable Commercial'],
    //   to: '/product'
    to: '/delivery'
    },

    {
      label: 'Mon Activité',
      icon: 'i-lucide-square-activity',
      roles: ['Opérateur Production', 'Responsable Logistique', 'Responsable Commercial', 'Direction'],
      to: '/activity'
    },
    
    {
      label: 'Tableaux de bord',
      icon: 'i-lucide-chart-bar',
      roles: ['Direction'],
      to: '/dashboard'
    }
  ] satisfies NavigationMenuItem[]

  return items.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(role.value)
  })
}

const user = ref({
  name: 'Benjamin Canac',
  avatar: {
    src: 'https://github.com/benjamincanac.png',
    alt: 'Benjamin Canac'
  }
})

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user'
    },
    {
      label: 'Billing',
      icon: 'i-lucide-credit-card',
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings'
    }
  ],
  [
    {
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: 'Light',
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: colorMode.value === 'light',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = 'light'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          }
        },
        {
          label: 'Dark',
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: colorMode.value === 'dark',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = 'dark'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          }
        }
      ]
    }
  ],
  [
    {
      label: 'GitHub',
      icon: 'i-simple-icons-github',
      to: 'https://github.com/nuxt/ui',
      target: '_blank'
    },
    {
      label: 'Log out',
      icon: 'i-lucide-log-out'
    }
  ]
])

// const items = computed<NavigationMenuItem[]>(() => [
//   {
//     label: 'Home',
//     to: '/',
//     active: route.path === '/'
//   },
//   {
//     label: 'Produits',
//     to: '/product',
//     active: route.path.startsWith('/product')
//   },
//   {
//     label: 'Components',
//     to: '/docs/components',
//     active: route.path.startsWith('/docs/components')
//   },
//   {
//     label: 'Figma',
//     to: 'https://go.nuxt.com/figma-ui',
//     target: '_blank'
//   },
//   {
//     label: 'Releases',
//     to: 'https://github.com/nuxt/ui/releases',
//     target: '_blank'
//   }
// ])

defineShortcuts(extractShortcuts(teamsItems.value))
</script>

<template>
  <div class="flex flex-1">
    <USidebar
      v-model:open="open"
      collapsible="icon"
      rail
      style="--width: 12rem;"
      :ui="{
        container: 'h-full',
        inner: 'bg-elevated/25 divide-transparent',
        body: 'py-0'
      }"
    >
      <template #header>

        <UButton
            icon="i-material-symbols:arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="Toggle sidebar"
            @click="open = !open"
        />
        
        <UDropdownMenu
            v-if="isAdmin"
          :items="teamsItems"
          :content="{ align: 'start', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
        >
          <UButton
            v-bind="selectedTeam"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            square
            class="w-full data-[state=open]:bg-elevated overflow-hidden"
            :ui="{
              trailingIcon: 'text-dimmed ms-auto'
            }"
          />
        </UDropdownMenu>

        <UButton
          v-else
          v-bind="selectedTeam"
          color="neutral"
          variant="ghost"
          square
          class="w-full cursor-default"
          />
      </template>

      <template #default="{ state }">
        <UNavigationMenu
          :key="state"
          :items="getItems(state)"
          orientation="vertical"
          :ui="{ link: 'p-1.5 overflow-hidden' }"
        />
      </template>

      <template #footer>
        <UDropdownMenu
          :items="  userItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
        >
          <UButton
            v-bind="user"
            :label="user?.name"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            square
            class="w-full data-[state=open]:bg-elevated overflow-hidden"
            :ui="{
              trailingIcon: 'text-dimmed ms-auto'
            }"
          />
        </UDropdownMenu>
      </template>
    </USidebar>

    <div class="flex-1 flex flex-col">

  <!-- HEADER -->
        <div class="h-(--ui-header-height) shrink-0 flex items-center justify-between px-4 border-b border-default bg-background">

            <!-- LEFT -->
            <div class="flex items-center gap-3">
            <UButton
                icon="i-lucide-panel-left"
                color="neutral"
                variant="ghost"
                aria-label="Toggle sidebar"
                @click="open = !open"
            />

            <Logo class="h-6 w-auto" />
            </div>

            <!-- CENTER -->
            <div class="absolute left-1/2 -translate-x-1/2 flex items-center">
                <NuxtLink to="/" class="text-lg font-semibold">
                <img
                    src="https://media.discordapp.net/attachments/1511650218767024249/1513876792849465414/image.png?ex=6a295321&is=6a2801a1&hm=7f3ab4613fa4994beb2a2ac09bd9c364b0f38511eee71446b6e1ffa46bc181ce&=&format=webp&quality=lossless"
                    alt="Logo"
                    class="h-12 w-auto object-contain"
                    
                />
                </NuxtLink>
            </div>

    </div>

      <div class="flex-1 p-4">
        <slot />
    </div>
    </div>
  </div>
</template>
