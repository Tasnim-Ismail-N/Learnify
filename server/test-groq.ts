import './src/config/env.js';
import Groq from 'groq-sdk';
import { env } from './src/config/env.js';

async function test() {
  try {
    console.log('GROQ_API_KEY present:', !!env.GROQ_API_KEY, '| starts with:', env.GROQ_API_KEY?.slice(0, 8));
    const groq = new Groq({ apiKey: env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Say just: {"status":"ok"}' }],
      max_tokens: 50,
    });
    console.log('✅ Groq works:', completion.choices[0]?.message?.content);
  } catch (err: unknown) {
    console.error('❌ Error:', err instanceof Error ? err.message : JSON.stringify(err));
  }
}

test();
