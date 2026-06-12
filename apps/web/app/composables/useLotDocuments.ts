import { toFailureResult } from '~/lib/api/envelope'
import type { AsyncStatus, LotDocument } from '~/types'

const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

export function useLotDocuments() {
  const adapters = useAdapters()

  const documents = ref<LotDocument[]>([])
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const isUploading = ref(false)

  async function load(lotNumber: string) {
    status.value = 'pending'
    error.value = null
    try {
      documents.value = await adapters.audit.listLotDocuments(lotNumber)
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
      documents.value = []
    }
  }

  function reset() {
    documents.value = []
    status.value = 'idle'
    error.value = null
  }

  async function upload(lotNumber: string, file: File) {
    if (file.size > DOCUMENT_MAX_BYTES) {
      throw new Error(`Fichier trop volumineux (max ${formatBytes(DOCUMENT_MAX_BYTES)})`)
    }
    isUploading.value = true
    error.value = null
    try {
      const contentBase64 = await fileToBase64(file)
      const doc = await adapters.audit.uploadLotDocument(lotNumber, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        contentBase64
      })
      documents.value = [doc, ...documents.value]
      return doc
    } catch (e) {
      const failure = toFailureResult(e)
      error.value = failure.message
      throw e
    } finally {
      isUploading.value = false
    }
  }

  async function openDownload(documentId: string) {
    if (!import.meta.client) {
      return adapters.audit.getLotDocumentUrl(documentId)
    }
    try {
      const payload = await adapters.audit.downloadLotDocument(documentId)
      const blob = base64ToBlob(payload.contentBase64, payload.contentType)
      triggerBlobDownload(blob, payload.filename)
      return payload.filename
    } catch (e) {
      const failure = toFailureResult(e)
      error.value = failure.message
      throw e
    }
  }

  return {
    documents,
    status,
    error,
    isUploading,
    load,
    reset,
    upload,
    openDownload,
    maxBytes: DOCUMENT_MAX_BYTES
  }
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: contentType })
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Lecture du fichier impossible'))
        return
      }
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Contenu du fichier invalide'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
