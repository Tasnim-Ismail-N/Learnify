import './src/config/env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './src/config/env.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Say OK');
    console.log('✅ Works:', result.response.text());
  } catch (err: unknown) {
    console.error('Full error:', JSON.stringify(err, null, 2));
    if (err instanceof Error) console.error('Message:', err.message);
  }
}

test();
