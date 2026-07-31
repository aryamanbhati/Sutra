import { env } from '../env.js';
import type { TransitFeatures } from '../astro/transits.js';
import { SYSTEM_PROMPT, featuresToPromptInput, fallbackNarrative } from './prompt.js';

export interface GenerationResult {
  narrative: string;
  model: string;
}

/**
 * Grounded daily-reading generation. The model receives ONLY the structured transit
 * features (see prompt.ts) and narrates them. Provider: xAI Grok via its
 * chat-completions endpoint (Groq — OpenAI-compatible). If no key is set, or it fails,
 * we fall back to a deterministic template built from the same features — so the app
 * always returns a real, grounded reading.
 */
export async function generateReading(
  features: TransitFeatures,
  name: string,
): Promise<GenerationResult> {
  if (!env.GROQ_API_KEY) {
    return { narrative: fallbackNarrative(features, name), model: 'fallback-template' };
  }

  try {
    const res = await fetch(`${env.GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature: 0.4, // low: grounded, minimal invention
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: featuresToPromptInput(features, name) },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[reading] groq ${res.status}: ${body.slice(0, 200)}`);
      return { narrative: fallbackNarrative(features, name), model: 'fallback-template' };
    }

    const data = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { narrative: fallbackNarrative(features, name), model: 'fallback-template' };
    }
    return { narrative: text, model: data.model ?? env.GROQ_MODEL };
  } catch (e) {
    console.error('[reading] generation failed:', (e as Error).message);
    return { narrative: fallbackNarrative(features, name), model: 'fallback-template' };
  }
}
