/** Rafraîchit le centre de notifications après une mutation métier (mock). */
export async function syncNotificationsAfterMutation() {
  try {
    const { refresh } = useNotifications()
    await refresh()
  } catch {
    // ignore hors contexte composable
  }
}
