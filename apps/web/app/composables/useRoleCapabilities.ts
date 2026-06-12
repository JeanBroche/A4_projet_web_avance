import {
  canManageBatches,
  canManageBomOrders,
  canManageOrders,
  canUpdateOrderLogistics,
  canManageStock,
  canPlanShipments,
  canReserveMaterials,
  canViewBomAndStock,
  canViewConsolidatedStock,
  canViewDashboard,
  canViewNotifications,
  rolePageSubtitle
} from '~/lib/role-capabilities'

export function useRoleCapabilities() {
  const { role } = useSession()

  return {
    role,
    canManageBatches: computed(() => canManageBatches(role.value)),
    canManageBomOrders: computed(() => canManageBomOrders(role.value)),
    canReserveMaterials: computed(() => canReserveMaterials(role.value)),
    canViewBomAndStock: computed(() => canViewBomAndStock(role.value)),
    canManageStock: computed(() => canManageStock(role.value)),
    canViewConsolidatedStock: computed(() => canViewConsolidatedStock(role.value)),
    canPlanShipments: computed(() => canPlanShipments(role.value)),
    canManageOrders: computed(() => canManageOrders(role.value)),
    canUpdateOrderLogistics: computed(() => canUpdateOrderLogistics(role.value)),
    canViewDashboard: computed(() => canViewDashboard(role.value)),
    canViewNotifications: computed(() => canViewNotifications(role.value)),
    pageSubtitle: computed(() => rolePageSubtitle(role.value))
  }
}
