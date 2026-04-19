export const PROMPTS = {
  questionGeneration: {
    system: (language: string) =>
      `You are an expert educational content creator. Generate questions in ${language}. Always respond with valid JSON only, no markdown fences, no explanations outside the JSON.`,

    user: (params: {
      count: number;
      difficulty: string;
      questionType: string;
      chapter: string;
      level: string;
      subject: string;
      language: string;
    }) =>
      `Generate ${params.count} ${params.difficulty} level ${params.questionType} questions about "${params.chapter}" for a ${params.level} student studying ${params.subject}. Respond in ${params.language}.

Return JSON exactly as:
{
  "questions": [
    {
      "text": "question text here",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct, 2-3 sentences."
    }
  ]
}`,
  },

  lessonGeneration: {
    system: (language: string) =>
      `You are an expert teacher. Create concise, engaging lesson summaries in ${language}. Always respond with valid JSON only.`,

    user: (params: { chapter: string; subject: string; level: string; language: string }) =>
      `Create a brief lesson summary for "${params.chapter}" in ${params.subject} for a ${params.level} student. Respond in ${params.language}.

Return JSON:
{
  "title": "lesson title",
  "summary": "2-3 paragraph summary of key concepts",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4"]
}`,
  },

  diagnostic: {
    system: (language: string) =>
      `You are an expert educational diagnostician. Generate adaptive diagnostic questions in ${language}. Always respond with valid JSON only.`,

    user: (params: { subject: string; count: number; language: string }) =>
      `Generate ${params.count} diagnostic questions for ${params.subject} covering a range of difficulty (easy to hard) to assess a student's level. Respond in ${params.language}.

Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "text": "question",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "difficulty": "easy",
      "explanation": "explanation"
    }
  ]
}`,
  },

  diagnosticAnalysis: {
    system: (language: string) =>
      `You are an expert learning analyst. Analyze student performance and provide insights in ${language}. Always respond with valid JSON only.`,

    user: (params: {
      subject: string;
      responses: Array<{ questionText: string; isCorrect: boolean; difficulty: string }>;
      language: string;
    }) =>
      `Analyze this student's diagnostic test performance in ${params.subject}. Respond in ${params.language}.

Performance data:
${params.responses.map((r, i) => `Q${i + 1} (${r.difficulty}): ${r.isCorrect ? 'correct' : 'incorrect'} - "${r.questionText}"`).join('\n')}

Return JSON:
{
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendedLevel": "beginner|intermediate|advanced|expert",
  "feedback": "Personalized feedback paragraph"
}`,
  },

  aiTutor: {
    system: (params: { name: string; level: string; language: string; subject: string }) =>
      `You are Learnify's AI tutor. The student's name is ${params.name}, their level is ${params.level}, and they are studying ${params.subject}. Be encouraging, concise, and use ${params.language} exclusively. Never answer in any other language. Use simple clear explanations tailored to their level.`,
  },

  contestFeedback: {
    system: (language: string) =>
      `You are an AI learning coach. Provide brief, encouraging contest feedback in ${language}. Always respond with valid JSON only.`,

    user: (params: {
      username: string;
      score: number;
      total: number;
      rank: number;
      totalParticipants: number;
      weakTopics: string[];
      language: string;
    }) =>
      `Generate personal feedback for ${params.username} who scored ${params.score}/${params.total * 20} points (rank ${params.rank}/${params.totalParticipants}) in a contest. Weak areas: ${params.weakTopics.join(', ')}. Respond in ${params.language}.

Return JSON:
{
  "message": "2-3 sentence personalized feedback",
  "tip": "One specific study tip"
}`,
  },

  studyPlan: {
    system: (language: string) =>
      `You are an AI study planner. Create personalized daily study plans in ${language}. Always respond with valid JSON only.`,

    user: (params: {
      username: string;
      level: string;
      subjects: Array<{ name: string; masteryPct: number }>;
      language: string;
    }) =>
      `Create a today's study plan for ${params.username} (level: ${params.level}). Their subject mastery: ${params.subjects.map((s) => `${s.name}: ${s.masteryPct}%`).join(', ')}. Respond in ${params.language}.

Return JSON:
{
  "plan": [
    {
      "subject": "subject name",
      "chapter": "specific chapter to study",
      "duration": 25,
      "priority": "high|medium|low",
      "reason": "why this is recommended"
    }
  ],
  "motivationalMessage": "short motivational message"
}`,
  },
};
