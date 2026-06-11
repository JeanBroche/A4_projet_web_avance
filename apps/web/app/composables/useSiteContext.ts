/** Site métier de l'utilisateur connecté (requis par plusieurs actions MS). */
export function useSiteContext() {
  const { user } = useSession()

  const siteCode = computed(() => user.value?.siteCode ?? 'SITE-LYO')

  return { siteCode }
}
