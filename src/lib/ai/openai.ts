import { createOpenAI } from '@ai-sdk/openai'
import { generateObject, zodSchema } from 'ai'
import type { z } from 'zod'

let client: ReturnType<typeof createOpenAI> | null = null

export function getOpenAIProvider() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Add it to the server environment.',
    )
  }
  if (!client) {
    client = createOpenAI({ apiKey: key })
  }
  return client
}

export function getAiModelId() {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
}

export async function generateStructuredObject<TSchema extends z.ZodTypeAny>(args: {
  system: string
  prompt: string
  schema: TSchema
}): Promise<{
  object: z.infer<TSchema>
  tokensIn: number | null
  tokensOut: number | null
}> {
  const openai = getOpenAIProvider()
  const result = await generateObject({
    model: openai(getAiModelId()),
    system: `${args.system}

Schema rules: include every property. Use null (not omitted keys) for unknown optional strings/numbers. Use [] for empty arrays.`,
    prompt: args.prompt,
    schema: zodSchema(args.schema),
  })

  const usage = result.usage
  return {
    object: result.object as z.infer<TSchema>,
    tokensIn: usage?.inputTokens ?? null,
    tokensOut: usage?.outputTokens ?? null,
  }
}
