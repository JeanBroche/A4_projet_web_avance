import type {
  Activity,
  ActivityType,
  Batch,
  BatchStatus,
  ClientStats,
  CreateBatchInput,
  CreateManufacturingOrderInput,
  CreateOrderInput,
  CreateReturnItemInput,
  CreateShipmentInput,
  CreateStockLevelInput,
  KpiDashboard,
  LoginCredentials,
  LoginResult,
  LotTraceTimeline,
  ManufacturingOrder,
  Order,
  OrderHistoryEntry,
  OrderPriority,
  OrderStatus,
  OrderValidationStatus,
  ReportAnomalyInput,
  ReportBomAnomalyInput,
  ReportingDashboardOptions,
  RuptureForecast,
  SupplierDelay,
  SupplierDelayInput,
  UpdateBomOrderInput,
  AppNotification,
  ReturnItem,
  Shipment,
  DeliveryStatus,
  CreateReservationInput,
  StockLevel,
  StockReservation,
  User,
  UserRole
} from '~/types'

export interface AuthAdapter {
  login(credentials: LoginCredentials): Promise<LoginResult>
  logout(refreshToken: string): Promise<void>
  me(accessToken: string): Promise<User>
  switchRole?(userId: string, role: UserRole): Promise<User>
}

export interface StockAdapter {
  listLevels(): Promise<StockLevel[]>
  createLevel(input: CreateStockLevelInput): Promise<StockLevel>
  updateLevel(id: number, qty: number): Promise<StockLevel>
  deleteLevel(id: number): Promise<void>
  listReturned(): Promise<ReturnItem[]>
  createReturned(input: CreateReturnItemInput): Promise<ReturnItem>
  updateReturned(id: number, qty: number, state: ReturnItem['state']): Promise<ReturnItem>
  deleteReturned(id: number): Promise<void>
  listReservations(ofId?: string): Promise<StockReservation[]>
  createReservation(input: CreateReservationInput): Promise<StockReservation[]>
  releaseReservation(id: number): Promise<StockReservation>
  cancelReservation(id: number): Promise<StockReservation>
  getRuptureForecast(): Promise<RuptureForecast[]>
  reportSupplierDelay(input: SupplierDelayInput): Promise<SupplierDelay>
  listSupplierDelays(): Promise<SupplierDelay[]>
}

export interface ProductionAdapter {
  listBomOrders(): Promise<ManufacturingOrder[]>
  createBomOrder(input: CreateManufacturingOrderInput): Promise<ManufacturingOrder>
  updateBomOrder(input: UpdateBomOrderInput): Promise<ManufacturingOrder>
  updateBomOrderStatus(id: number, status: ManufacturingOrder['status']): Promise<ManufacturingOrder>
  listBatches(): Promise<Batch[]>
  createBatch(input: CreateBatchInput): Promise<Batch>
  updateBatchStatus(id: number, status: BatchStatus): Promise<Batch>
  reportAnomaly(input: ReportAnomalyInput): Promise<Batch>
  clearAnomaly(batchId: number): Promise<Batch>
  reportBomAnomaly(input: ReportBomAnomalyInput): Promise<ManufacturingOrder>
}

export interface AppendActivityInput {
  type: ActivityType
  title: string
  description: string
  userId?: string
  user: string
  meta?: string
}

export interface OrderAdapter {
  list(): Promise<Order[]>
  create(input: CreateOrderInput): Promise<Order>
  updateStatus(id: number, status: OrderStatus): Promise<Order>
  validate(id: number): Promise<Order>
  reject(id: number): Promise<Order>
  changePriority(id: number, priority: OrderPriority): Promise<Order>
  reportAnomaly(id: number): Promise<Order>
  clearAnomaly(id: number): Promise<Order>
  getClientStats(client: string): Promise<ClientStats>
  getOrderHistory(orderId: number): Promise<OrderHistoryEntry[]>
}

export interface ShipmentAdapter {
  list(): Promise<Shipment[]>
  create(input: CreateShipmentInput): Promise<Shipment>
  updateStatus(id: number, status: DeliveryStatus): Promise<Shipment>
}

export interface AuditAdapter {
  listActivities(): Promise<Activity[]>
  append(input: AppendActivityInput): Promise<Activity>
  traceLot(lotNumber: string): Promise<LotTraceTimeline>
}

export interface ReportingAdapter {
  getDashboard(options?: ReportingDashboardOptions): Promise<KpiDashboard>
}

export interface NotificationAdapter {
  list(): Promise<AppNotification[]>
}

export interface Adapters {
  auth: AuthAdapter
  stock: StockAdapter
  production: ProductionAdapter
  order: OrderAdapter
  shipment: ShipmentAdapter
  audit: AuditAdapter
  reporting: ReportingAdapter
  notification: NotificationAdapter
}
