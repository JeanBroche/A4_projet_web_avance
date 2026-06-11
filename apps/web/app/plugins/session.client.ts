export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  if (config.public.apiAdapter !== 'moleculer') return

  const { session } = useSessionState()
  if (!session.value.accessToken && !session.value.refreshToken) return

  const { restoreSession } = useAuth()
  await restoreSession()
})
