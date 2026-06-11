import { z } from 'zod'
import {
  aiOfMaterialSchema,
  buildOfAssistantSystemPrompt,
  filterBomByKnownMaterials,
  parseAiOfResponse
} from '~/lib/validation/ai-of'

interface OllamaGenerateResponse {
  response: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    throw createError({ statusCode: 400, message: 'Le champ prompt est requis.' })
  }

  const materialsParsed = z.array(aiOfMaterialSchema).safeParse(body?.materials ?? [])
  const materials = materialsParsed.success ? materialsParsed.data : []

  const system = buildOfAssistantSystemPrompt(materials)

  try {
    const ollamaResponse = await $fetch<OllamaGenerateResponse>(
      `${config.ollamaBaseUrl}/api/generate`,
      {
        method: 'POST',
        body: {
          model: config.ollamaModel,
          prompt,
          system,
          stream: false,
          format: 'json'
        }
      }
    )

    const proposal = filterBomByKnownMaterials(
      parseAiOfResponse(ollamaResponse.response),
      materials
    )

    return { proposal }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('JSON') || message.includes('parse')) {
      throw createError({
        statusCode: 502,
        message: 'Réponse IA invalide. Réessayez avec une description plus précise.'
      })
    }
    throw createError({
      statusCode: 500,
      message: 'Ollama/Mistral n\'est pas démarré.'
    })
  }
})
