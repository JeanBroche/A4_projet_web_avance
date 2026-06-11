import { changeListAction } from "./change-list.js";
import { documentListAction } from "./document-list.js";
import { documentUploadAction } from "./document-upload.js";
import { documentUrlAction } from "./document-url.js";
import { siteDocumentGetAction } from "./site-document-get.js";
import { siteDocumentUploadAction } from "./site-document-upload.js";
import { eventListCriticalAction } from "./event-list-critical.js";
import { eventRecordAction } from "./event-record.js";
import { lotExportAction } from "./lot-export.js";
import { lotTraceAction } from "./lot-trace.js";
import { pingAction } from "./ping.js";

export const auditActions = {
  ping: pingAction,
  "change.list": changeListAction,
  "event.record": eventRecordAction,
  "event.listCritical": eventListCriticalAction,
  "lot.trace": lotTraceAction,
  "lot.export": lotExportAction,
  "document.upload": documentUploadAction,
  "document.list": documentListAction,
  "document.url": documentUrlAction,
  "siteDocument.upload": siteDocumentUploadAction,
  "siteDocument.get": siteDocumentGetAction
};
