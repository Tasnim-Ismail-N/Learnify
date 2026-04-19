// Test contest question generation — same params as contest creation route
import './src/config/env.js';
import { generateQuestions } from './src/services/ai.service.js';

async function test() {
  console.log('--- Testing contest question generation ---');
  try {
    console.log('Generating 3 easy questions for Machine Learning (fr)...');
    const { questions } = await generateQuestions({
      count: 3,
      difficulty: 'easy',
      chapter: 'Machine Learning',
      level: 'intermediate',
      subject: 'Machine Learning',
      language: 'fr',
      questionType: 'multiple-choice',
    });
    console.log(`✅ OK — ${questions.length} questions generated`);
    console.log('   Q1:', questions[0]?.text?.slice(0, 80));
    console.log('   Options count:', questions[0]?.options?.length);
    console.log('   CorrectIndex:', questions[0]?.correctIndex);
  } catch (err: unknown) {
    console.error('❌ FAILED:', err instanceof Error ? err.message : err);
    if (err instanceof Error) console.error('Stack:', err.stack?.split('\n').slice(0, 5).join('\n'));
  }
}

test();
