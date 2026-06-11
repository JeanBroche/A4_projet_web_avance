export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  if (config.public.apiAdapter !== 'moleculer') return

  const { restoreSession } = useAuth()
  await restoreSession()
})
