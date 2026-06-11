import { toFailureResult } from '~/lib/api/envelope'
import { filterActivitiesForUser } from '~/lib/audit'
import type { Activity, AsyncStatus } from '~/types'

export function useAudit() {
  const adapters = useAdapters()
  const { user, role } = useSession()

  const activities = ref<Activity[]>([])
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const isAdminView = computed(() => role.value === 'admin')

  async function refresh() {
    status.value = 'pending'
    error.value = null
    try {
      const all = await adapters.audit.listActivities()
      activities.value = filterActivitiesForUser(all, user.value)
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  return { activities, status, error, isAdminView, refresh }
}
