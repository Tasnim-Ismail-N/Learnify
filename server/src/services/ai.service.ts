import Groq from 'groq-sdk';
import NodeCache from 'node-cache';
import { z } from 'zod';
import { env } from '../config/env.js';
import { PROMPTS } from './prompts.js';
import { logger } from '../utils/logger.js';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// llama-3.1-8b-instant: 500k tokens/day free (vs 100k for the 70b model)
const MODEL = 'llama-3.1-8b-instant';

// ─── Zod schemas ────────────────────────────────────────────────────────────

const questionSchema = z.object({
  text: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});

const questionsResponseSchema = z.object({
  questions: z.array(questionSchema),
});

const lessonResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
});

const diagnosticQuestionSchema = questionSchema.extend({
  id: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const diagnosticResponseSchema = z.object({
  questions: z.array(diagnosticQuestionSchema),
});

const diagnosticAnalysisSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendedLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  feedback: z.string(),
});

const contestFeedbackSchema = z.object({
  message: z.string(),
  tip: z.string(),
});

const studyPlanSchema = z.object({
  plan: z.array(
    z.object({
      subject: z.string(),
      chapter: z.string(),
      duration: z.number(),
      priority: z.enum(['high', 'medium', 'low']),
      reason: z.string(),
    })
  ),
  motivationalMessage: z.string(),
});

// ─── Core helper ────────────────────────────────────────────────────────────

// Valid JSON escape characters after a backslash
const VALID_JSON_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);

function sanitizeJSON(raw: string): string {
  // Strip markdown fences
  const text = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let result = '';
  let inString = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const code = ch.charCodeAt(0);

    if (!inString) {
      if (ch === '"') inString = true;
      result += ch;
      i++;
      continue;
    }

    // ── Inside a JSON string ──────────────────────────────────────────────

    if (ch === '\\') {
      const next = text[i + 1];

      if (next === undefined) {
        // Trailing backslash — keep it
        result += ch;
        i++;
        continue;
      }

      if (VALID_JSON_ESCAPES.has(next)) {
        // Valid escape sequence (\", \\, \/, \b, \f, \n, \r, \t) — keep as-is
        result += ch + next;
        i += 2;
        continue;
      }

      if (next === 'u') {
        // \uXXXX — validate the 4 hex digits
        const hex = text.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          result += ch + next + hex;
          i += 6;
        } else {
          // Invalid \u — drop the backslash, keep rest
          i++;
        }
        continue;
      }

      // Invalid escape like \(, \), \k, \N, \-, \_ etc. (Groq LaTeX/math notation)
      // Drop the backslash — the character itself is fine
      i++;
      continue;
    }

    if (ch === '"') {
      inString = false;
      result += ch;
      i++;
      continue;
    }

    if (code < 0x20) {
      // Bare control character inside string — escape it properly
      if (ch === '\n') result += '\\n';
      else if (ch === '\r') result += '\\r';
      else if (ch === '\t') result += '\\t';
      // other control chars silently dropped
      i++;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

function extractJSONObject(raw: string): string {
  const cleaned = sanitizeJSON(raw);
  // Try direct parse first
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Find outermost { ... } block
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return cleaned.slice(start, end + 1);
    }
    return cleaned;
  }
}

function parseJSON<T>(text: string, schema: z.ZodSchema<T>): T {
  const extracted = extractJSONObject(text);
  const parsed = JSON.parse(extracted);
  return schema.parse(parsed);
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  cacheKey?: string,
  maxTokens = 1024
): Promise<string> {
  if (cacheKey) {
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      logger.debug('Cache hit:', cacheKey);
      return cached;
    }
  }

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const text = completion.choices[0]?.message?.content ?? '';

    if (cacheKey && text) {
      cache.set(cacheKey, text);
    }

    return text;
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      throw Object.assign(new Error('Daily AI quota reached. Please try again tomorrow or in a few minutes.'), { statusCode: 429, isOperational: true });
    }
    throw err;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate multiple-choice questions for a session or contest
 */
export async function generateQuestions(params: {
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  chapter: string;
  level: string;
  subject: string;
  language: string;
  questionType?: string;
}) {
  const cacheKey = `questions:${JSON.stringify(params)}`;
  const questionType = params.questionType ?? 'multiple-choice';
  // ~200 tokens per question (text + 4 options + explanation)
  const maxTokens = Math.min(params.count * 220 + 100, 2048);

  const text = await callGroq(
    PROMPTS.questionGeneration.system(params.language),
    PROMPTS.questionGeneration.user({ ...params, questionType }),
    cacheKey,
    maxTokens
  );

  return parseJSON(text, questionsResponseSchema);
}

/**
 * Generate a lesson summary for a session
 */
export async function generateLesson(params: {
  chapter: string;
  subject: string;
  level: string;
  language: string;
}) {
  const cacheKey = `lesson:${JSON.stringify(params)}`;
  const text = await callGroq(
    PROMPTS.lessonGeneration.system(params.language),
    PROMPTS.lessonGeneration.user(params),
    cacheKey,
    600
  );
  return parseJSON(text, lessonResponseSchema);
}

/**
 * Generate adaptive diagnostic questions
 */
export async function generateDiagnosticQuestions(params: {
  subject: string;
  count: number;
  language: string;
}) {
  const cacheKey = `diagnostic:${JSON.stringify(params)}`;
  const text = await callGroq(
    PROMPTS.diagnostic.system(params.language),
    PROMPTS.diagnostic.user(params),
    cacheKey,
    Math.min(params.count * 220 + 100, 2048)
  );
  return parseJSON(text, diagnosticResponseSchema);
}

/**
 * Analyze diagnostic results and build competency profile
 */
export async function analyzeDiagnostic(params: {
  subject: string;
  responses: Array<{ questionText: string; isCorrect: boolean; difficulty: string }>;
  language: string;
}) {
  const text = await callGroq(
    PROMPTS.diagnosticAnalysis.system(params.language),
    PROMPTS.diagnosticAnalysis.user(params),
    undefined,
    512
  );
  return parseJSON(text, diagnosticAnalysisSchema);
}

/**
 * Stream AI tutor response via SSE (token by token)
 */
export async function streamTutorResponse(
  params: { name: string; level: string; language: string; subject: string },
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (text: string) => void,
  onDone: () => void
) {
  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: PROMPTS.aiTutor.system(params) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.8,
    max_tokens: 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) onChunk(text);
  }

  onDone();
}

/**
 * Generate personalized contest results feedback
 */
export async function generateContestFeedback(params: {
  username: string;
  score: number;
  total: number;
  rank: number;
  totalParticipants: number;
  weakTopics: string[];
  language: string;
}) {
  const text = await callGroq(
    PROMPTS.contestFeedback.system(params.language),
    PROMPTS.contestFeedback.user(params),
    undefined,
    256
  );
  return parseJSON(text, contestFeedbackSchema);
}

/**
 * Generate personalized daily study plan
 */
export async function generateStudyPlan(params: {
  username: string;
  level: string;
  subjects: Array<{ name: string; masteryPct: number }>;
  language: string;
}) {
  const text = await callGroq(
    PROMPTS.studyPlan.system(params.language),
    PROMPTS.studyPlan.user(params),
    undefined,
    800
  );
  return parseJSON(text, studyPlanSchema);
}
