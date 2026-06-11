export type NotificationSeverity = "CRITICAL" | "WARNING" | "INFO";

export type NotificationRecord = {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  siteCode: string;
  read: boolean;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type NotificationInput = Omit<
  NotificationRecord,
  "id" | "read" | "createdAt"
>;
