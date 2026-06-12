import type {
  Activity,
  ActivityType,
  Batch,
  BatchStatus,
  ClientStats,
  CreateBatchInput,
  CreateManufacturingOrderInput,
  CreateOrderInput,
  CreateProductInput,
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
  Product,
  ReportAnomalyInput,
  ReportingDashboardOptions,
  RuptureForecast,
  SupplierDelay,
  SupplierDelayInput,
  UpdateBomOrderInput,
  UpdateProductInput,
  AppNotification,
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
  refresh(refreshToken?: string): Promise<LoginResult>
  logout(refreshToken?: string, accessToken?: string | null): Promise<void>
  me(accessToken?: string): Promise<User>
  switchRole?(userId: string, role: UserRole): Promise<User>
}

export interface StockAlert {
  id: string
  materialCode: string
  materialName: string
  severity: 'warning' | 'critical'
  message: string
}

export interface StockAdapter {
  listLevels(): Promise<StockLevel[]>
  listConsolidatedLevels(): Promise<StockLevel[]>
  listAlerts(): Promise<StockAlert[]>
  createLevel(input: CreateStockLevelInput): Promise<StockLevel>
  updateLevel(id: number, qty: number): Promise<StockLevel>
  deleteLevel(id: number): Promise<void>
  listReservations(ofId?: string): Promise<StockReservation[]>
  createReservation(input: CreateReservationInput): Promise<StockReservation[]>
  updateReservation(id: number, qty: number): Promise<StockReservation>
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
  updateBomOrderPriority(id: number, priority: ManufacturingOrder['priority']): Promise<ManufacturingOrder>
  updateBomOrderQuantity(id: number, qty: number): Promise<ManufacturingOrder>
  deleteBomOrder(id: number): Promise<void>
  listBatches(): Promise<Batch[]>
  createBatch(input: CreateBatchInput): Promise<Batch>
  assignBatchToOf(lotNumber: string, ofNumber: string): Promise<Batch>
  updateBatchStatus(id: number, status: BatchStatus): Promise<Batch>
  reportAnomaly(input: ReportAnomalyInput): Promise<Batch>
  clearAnomaly(batchId: number): Promise<Batch>
  listProducts(): Promise<Product[]>
  getProduct(productCode: string): Promise<Product>
  createProduct(input: CreateProductInput): Promise<Product>
  updateProduct(input: UpdateProductInput): Promise<Product>
  deleteProduct(productCode: string): Promise<void>
}

export interface AppendActivityInput {
  type: ActivityType
  title: string
  description: string
  userId?: string
  user: string
  meta?: string
}

export interface OrderDelayRisk {
  orderId: number
  riskLevel: 'low' | 'medium' | 'high'
  message: string
}

export interface OrderAdapter {
  list(): Promise<Order[]>
  create(input: CreateOrderInput): Promise<Order>
  updateStatus(id: number, status: OrderStatus): Promise<Order>
  validate(id: number): Promise<Order>
  reject(id: number): Promise<Order>
  changePriority(id: number, priority: OrderPriority): Promise<Order>
  getClientStats(client: string): Promise<ClientStats>
  getOrderHistory(orderId: number): Promise<OrderHistoryEntry[]>
  getDelayRisk(orderId: number): Promise<OrderDelayRisk | null>
}

export interface ShipmentAdapter {
  list(): Promise<Shipment[]>
  create(input: CreateShipmentInput): Promise<Shipment>
  updateStatus(id: number, status: DeliveryStatus): Promise<Shipment>
}

export interface AuditAdapter {
  listActivities(): Promise<Activity[]>
  listCriticalEvents(): Promise<Activity[]>
  append(input: AppendActivityInput): Promise<Activity>
  traceLot(lotNumber: string): Promise<LotTraceTimeline>
  exportLot(lotNumber: string): Promise<string>
}

export interface ReportingAdapter {
  getDashboard(options?: ReportingDashboardOptions): Promise<KpiDashboard>
}

export interface NotificationAdapter {
  list(): Promise<AppNotification[]>
  markAsRead(id: string): Promise<void>
  unreadCount(): Promise<number>
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
