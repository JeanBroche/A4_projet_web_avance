import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity, getMockActivities } from '~/lib/adapters/mock/audit-store'
import { buildMockLotTrace } from '~/lib/adapters/mock/lot-trace'
import type { AuditAdapter } from '~/lib/adapters/types'
import type { LotDocument } from '~/types'

const mockDocuments = new Map<string, LotDocument[]>()
const mockDocumentContents = new Map<string, string>()

const SAMPLE_PDF_BASE64 =
  'JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+CmVuZG9iago=' 

export function createMockAuditAdapter(): AuditAdapter {
  return {
    async listActivities() {
      await simulateDelay()
      return getMockActivities().map(a => ({ ...a, date: new Date(a.date) }))
    },

    async append(input) {
      await simulateDelay(100)
      return appendMockActivity(input)
    },

    async traceLot(lotNumber) {
      await simulateDelay(120)
      return buildMockLotTrace(lotNumber)
    },

    async listCriticalEvents() {
      await simulateDelay(80)
      return getMockActivities()
        .filter(a => a.type === 'anomaly')
        .map((a, index) => ({ ...a, id: index + 1, date: new Date(a.date) }))
    },

    async exportLot(lotNumber) {
      await simulateDelay(100)
      const trace = buildMockLotTrace(lotNumber)
      return JSON.stringify(trace, null, 2)
    },

    async uploadLotDocument(lotId, file) {
      await simulateDelay(150)
      const doc: LotDocument = {
        id: crypto.randomUUID(),
        lotId,
        filename: file.filename,
        contentType: file.contentType,
        sizeBytes: Math.ceil(file.contentBase64.length * 0.75),
        uploadedBy: 'mock@aeronexis.test',
        uploadedAt: new Date().toISOString()
      }
      const current = mockDocuments.get(lotId) ?? []
      mockDocuments.set(lotId, [doc, ...current])
      mockDocumentContents.set(doc.id, file.contentBase64)
      return doc
    },

    async listLotDocuments(lotId) {
      await simulateDelay(80)
      return [...(mockDocuments.get(lotId) ?? [])]
    },

    async getLotDocumentUrl(documentId) {
      await simulateDelay(50)
      return `https://mock-minio.local/documents/${documentId}`
    },

    async downloadLotDocument(documentId) {
      await simulateDelay(80)
      let filename = 'document.pdf'
      let contentType = 'application/pdf'
      for (const docs of mockDocuments.values()) {
        const match = docs.find(d => d.id === documentId)
        if (match) {
          filename = match.filename
          contentType = match.contentType
          break
        }
      }
      const contentBase64 = mockDocumentContents.get(documentId) ?? SAMPLE_PDF_BASE64
      return {
        filename,
        contentType,
        contentBase64,
        sizeBytes: Math.ceil(contentBase64.length * 0.75)
      }
    }
  }
}
