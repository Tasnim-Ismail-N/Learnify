// Full diagnostic test — simulates exactly what the route does
import './src/config/env.js';
import { generateQuestions, generateLesson } from './src/services/ai.service.js';

async function test() {
  console.log('--- Testing AI service directly ---');
  try {
    console.log('1. Generating questions...');
    const { questions } = await generateQuestions({
      count: 3,
      difficulty: 'easy',
      chapter: 'bibliotheque pandas',
      level: 'beginner',
      subject: 'Machine Learning',
      language: 'fr',
    });
    console.log('✅ Questions OK:', questions.length, 'questions generated');
    console.log('   Sample:', questions[0]?.text?.slice(0, 60));

    console.log('2. Generating lesson...');
    const lesson = await generateLesson({
      chapter: 'bibliotheque pandas',
      subject: 'Machine Learning',
      level: 'beginner',
      language: 'fr',
    });
    console.log('✅ Lesson OK:', lesson.title);
  } catch (err: unknown) {
    console.error('❌ FAILED:', err instanceof Error ? err.message : err);
    console.error('Stack:', err instanceof Error ? err.stack : '');
  }
}

test();
