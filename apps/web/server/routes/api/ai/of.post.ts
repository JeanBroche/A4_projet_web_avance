import { z } from 'zod'
import {
  aiOfMaterialSchema,
  buildOfAssistantSystemPrompt,
  filterBomByKnownMaterials,
  parseAiOfResponse
} from '~/lib/validation/ai-of'
import { formatOllamaError, resolveOllamaModel } from '../../../utils/ollama'

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
  const preferredModel = config.ollamaModel as string
  const model = await resolveOllamaModel(config.ollamaBaseUrl as string, preferredModel)

  try {
    const ollamaResponse = await $fetch<OllamaGenerateResponse>(
      `${config.ollamaBaseUrl}/api/generate`,
      {
        method: 'POST',
        body: {
          model,
          prompt,
          system,
          stream: false,
          format: 'json'
        },
        timeout: 120_000
      }
    )

    const proposal = filterBomByKnownMaterials(
      parseAiOfResponse(ollamaResponse.response),
      materials
    )

    return { proposal, model }
  } catch (e) {
    const message = formatOllamaError(e, preferredModel)
    const statusCode = message.includes('pas démarré') || message.includes('introuvable') ? 503 : 502
    throw createError({ statusCode, message })
  }
})
