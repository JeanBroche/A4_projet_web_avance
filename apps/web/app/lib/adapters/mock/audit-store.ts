import { createInitialActivities } from '~/fixtures/audit/activity'
import { getMockActorId } from '~/lib/adapters/mock/mock-actor'
import type { AppendActivityInput } from '~/lib/adapters/types'
import type { Activity } from '~/types'

const activitiesStore: Activity[] = createInitialActivities()
let nextActivityId = 16

export function appendMockActivity(input: AppendActivityInput): Activity {
  const isSystem = input.user === 'Système'
  const activity: Activity = {
    id: nextActivityId++,
    ...input,
    userId: input.userId ?? (isSystem ? undefined : getMockActorId()),
    date: new Date()
  }
  activitiesStore.unshift(activity)
  return activity
}

export function getMockActivities(): Activity[] {
  return activitiesStore
}
