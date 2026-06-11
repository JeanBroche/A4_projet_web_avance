import type { Activity, User } from '~/types'

/** Admin : tout l'historique ; autres rôles : uniquement leurs actions. */
export function filterActivitiesForUser(activities: Activity[], user: User | null): Activity[] {
  if (!user) return []
  if (user.role === 'admin') return activities
  return activities.filter(a => a.userId === user.id)
}
