/** Contexte utilisateur courant pour les entrées d'audit mock (Nuxt). */
export function getMockActorName(): string {
  try {
    const { session } = useSessionState()
    return session.value.user?.name ?? 'Système'
  } catch {
    return 'Système'
  }
}

export function getMockActorId(): string | undefined {
  try {
    const { session } = useSessionState()
    return session.value.user?.id
  } catch {
    return undefined
  }
}
