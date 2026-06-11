const DESKTOP_QUERY = '(min-width: 1024px)'

export function useSidebarLayout() {
  const open = useState('layout:sidebar-open', () => true)
  const isDesktop = ref(true)
  let wasDesktop = true

  function syncViewport() {
    if (!import.meta.client) return
    const desktop = window.matchMedia(DESKTOP_QUERY).matches
    isDesktop.value = desktop
    if (desktop !== wasDesktop) {
      open.value = desktop
      wasDesktop = desktop
    }
  }

  onMounted(() => {
    wasDesktop = window.matchMedia(DESKTOP_QUERY).matches
    isDesktop.value = wasDesktop
    open.value = wasDesktop
    window.addEventListener('resize', syncViewport)
  })

  onUnmounted(() => {
    if (import.meta.client) {
      window.removeEventListener('resize', syncViewport)
    }
  })

  const route = useRoute()
  watch(() => route.path, () => {
    if (!isDesktop.value) {
      open.value = false
    }
  })

  function toggleSidebar() {
    open.value = !open.value
  }

  function closeSidebar() {
    open.value = false
  }

  return { open, isDesktop, toggleSidebar, closeSidebar }
}
