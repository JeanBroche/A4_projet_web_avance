interface OllamaModelTag {
  name: string
}

interface OllamaTagsResponse {
  models: OllamaModelTag[]
}

export async function resolveOllamaModel(baseUrl: string, preferred: string): Promise<string> {
  try {
    const tags = await $fetch<OllamaTagsResponse>(`${baseUrl}/api/tags`)
    const names = tags.models.map(m => m.name)
    if (names.includes(preferred)) return preferred

    const base = preferred.split(':')[0]
    const partial = names.find(n => n === base || n.startsWith(`${base}:`))
    if (partial) return partial

    if (names.length > 0) return names[0]!
  } catch {
    // Ollama indisponible — le handler renverra une erreur explicite.
  }
  return preferred
}

export function formatOllamaError(error: unknown, preferredModel: string): string {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (lower.includes('econnrefused') || lower.includes('fetch failed') || lower.includes('connect')) {
    return 'Ollama n\'est pas démarré. Lancez ollama serve dans un terminal (port 11434).'
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return `Modèle « ${preferredModel} » introuvable. Installez-le : ollama pull ${preferredModel.split(':')[0]} — ou définissez OLLAMA_MODEL dans .env (ex. llama3:latest).`
  }
  if (message.includes('JSON') || message.includes('parse')) {
    return 'Réponse IA invalide. Reformulez la demande avec produit, quantité et matériaux.'
  }
  return `Assistant IA indisponible : ${message}`
}
