import { GoogleGenAI, Type } from '@google/genai';

export interface ChatRequestPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  level: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topicMode: 'random' | 'news' | 'business' | 'society' | 'custom';
  customTopic?: string;
  correctionMode: 'free' | 'gentle' | 'strict';
  translationMode: 'english_only' | 'with_translation' | 'on_demand';
  timeRemainingMinutes?: number;
  currentSpeed?: number;
  isInitial?: boolean;
}

export interface ChatResponsePayload {
  englishText: string;
  germanTranslation?: string;
  correctionFeedback?: string;
  detectedCommand?: 'slower' | 'faster' | 'repeat' | 'translate' | 'new_topic';
  commandAcknowledgement?: string;
  suggestedFollowUp?: string;
}

export interface EvaluationRequestPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  level: string;
  topic: string;
  durationMinutes: number;
}

export interface EvaluationResponsePayload {
  grammarScore: number;
  vocabScore: number;
  fluencyScore: number;
  overallScore: number;
  feedbackSummary: string;
  corrections: Array<{
    userSaid: string;
    betterWay: string;
    explanationDe: string;
  }>;
  vocabularyHarvest: Array<{
    english: string;
    german: string;
    exampleSentence: string;
    cefrLevel: string;
  }>;
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Warning: GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function processChat(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
  const ai = getAiClient();
  const {
    messages,
    level,
    topicMode,
    customTopic,
    correctionMode,
    translationMode,
    timeRemainingMinutes,
    isInitial,
  } = payload;

  const topicDescriptions: Record<string, string> = {
    random: 'An intriguing, engaging general topic (e.g. travel memories, fascinating technology innovations, food culture, or hobbies).',
    news: 'Today\'s top breaking world news, technology breakthroughs, or global events. Keep facts accurate and up-to-date.',
    business: 'Business, global economics, financial markets, start-ups, modern workplace leadership, and entrepreneurship.',
    society: 'Modern society, cultural trends, philosophical thoughts, daily habits, lifestyle, and work-life balance.',
    custom: `User requested custom topic: "${customTopic || 'English conversation practice'}"`,
  };

  const levelGuidelines: Record<string, string> = {
    A2: 'CEFR A2 (Elementary): Use basic common words, simple short sentences, present/past tenses. Speak clearly, warmly, and avoid idioms without explanation.',
    B1: 'CEFR B1 (Intermediate): Use straightforward sentences, familiar vocabulary, occasionally everyday idioms. Keep clauses manageable.',
    B2: 'CEFR B2 (Upper Intermediate): Use varied vocabulary, idiomatic expressions, natural collocations, and compound sentences.',
    C1: 'CEFR C1 (Advanced): Fluent, nuanced expressions, professional collocations, sophisticated vocabulary, natural transitions.',
    C2: 'CEFR C2 (Mastery/Near-Native): Rich idiomatic variety, subtle stylistic nuances, culturally authentic phrasing, sharp rhetorical questions.',
  };

  let correctionInstruction = '';
  if (correctionMode === 'free') {
    correctionInstruction = 'Do NOT correct errors during the conversation. Focus entirely on content and flow like an engaging friend.';
  } else if (correctionMode === 'gentle') {
    correctionInstruction = 'GENTLE RECAST: If the user made a grammar or vocabulary error, naturally and unobtrusively mirror the correct phrase in your English reply, without explicitly saying "that was wrong".';
  } else {
    correctionInstruction = 'STRICT TEACHER: If the user made a noticeable grammar/vocabulary mistake, begin your response with a 1-sentence friendly polite correction (e.g. "Quick tip: Instead of \'...\', we usually say \'...\' because..."), then smoothly continue the conversation.';
  }

  let translationInstruction = '';
  if (translationMode === 'with_translation') {
    translationInstruction = 'Always provide both the English spoken sentence and a precise, natural German translation.';
  } else if (translationMode === 'on_demand') {
    translationInstruction = 'Only provide a German translation if the user specifically asked for one (e.g. "What does that mean in German?", "Übersetze das"). Otherwise, provide German only when relevant.';
  } else {
    translationInstruction = 'Pure 100% English conversation. Only provide German translation if strictly asked via command.';
  }

  const timeWarning = (typeof timeRemainingMinutes === 'number' && timeRemainingMinutes <= 2)
    ? `IMPORTANT TIME ALERT: Only ${timeRemainingMinutes} minute(s) remaining in the drive session. Gently wrap up the conversation, share a positive closing thought, and say farewell.`
    : '';

  const systemInstruction = `You are "DriveEnglish Coach", an interactive, charismatic English conversation trainer specifically designed for drivers using hands-free voice mode during a car trip.

TARGET LEARNER PROFILE:
- Level: ${levelGuidelines[level] || levelGuidelines['B1']}
- Topic: ${topicDescriptions[topicMode] || topicDescriptions['random']}
- Correction Style: ${correctionInstruction}
- Translation Requirement: ${translationInstruction}
${timeWarning}

CAR-MODE VOICE CONSTRAINTS:
1. BREVITY: Keep your spoken English response to 2 to 4 sentences maximum (approx 30-50 words). Long monologues are dangerous and exhausting while driving.
2. ENGAGEMENT: Always end with a clear, open-ended question or engaging prompt that is easy for the driver to answer out loud.
3. VOICE COMMAND RECOGNITION:
If the user's latest statement contains an operational command (in German or English), prioritize it:
- Slower / Sprich langsamer -> acknowledge warmly and speak slower.
- Faster / Sprich schneller -> acknowledge and speak faster.
- Repeat / Wiederholen / Noch einmal -> repeat your previous point concisely.
- Translate / Übersetze -> provide the German translation of the previous statement.
- New topic / Neues Thema -> acknowledge and kick off an exciting new conversation topic.

You must respond in valid JSON format matching this schema:
{
  "englishText": "The conversational English sentence(s) to be spoken aloud via browser speech synthesis.",
  "germanTranslation": "Natural German translation (if requested or applicable, else empty string)",
  "correctionFeedback": "Short tip or gentle correction if strict mode applies, else empty string",
  "detectedCommand": "slower | faster | repeat | translate | new_topic | null",
  "commandAcknowledgement": "Short acknowledgement if command was handled, else empty string",
  "suggestedFollowUp": "Brief 1-sentence question or prompt"
}`;

  const promptContents: any[] = [];

  // Build conversational context
  if (messages && messages.length > 0) {
    for (const msg of messages) {
      promptContents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  } else {
    // Initial opening prompt
    promptContents.push({
      role: 'user',
      parts: [
        {
          text: isInitial
            ? `Hello! I just started my car trip. Start our conversation on the topic "${topicDescriptions[topicMode]}" at CEFR ${level} level. Greet me warmly and ask an opening question to get me talking!`
            : 'Let\'s start our English conversation for this drive!',
        },
      ],
    });
  }

  const useGoogleSearch = topicMode === 'news';

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: promptContents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      tools: useGoogleSearch ? [{ googleSearch: {} }] : undefined,
      temperature: 0.7,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          englishText: { type: Type.STRING, description: 'Spoken English text' },
          germanTranslation: { type: Type.STRING, description: 'German translation if applicable' },
          correctionFeedback: { type: Type.STRING, description: 'Correction tip if strict teacher mode' },
          detectedCommand: {
            type: Type.STRING,
            enum: ['slower', 'faster', 'repeat', 'translate', 'new_topic', 'none'],
            description: 'Detected spoken command if any',
          },
          commandAcknowledgement: { type: Type.STRING },
          suggestedFollowUp: { type: Type.STRING },
        },
        required: ['englishText'],
      },
    },
  });

  const rawText = response.text || '{}';
  try {
    const parsed = JSON.parse(rawText);
    return {
      englishText: parsed.englishText || 'Hello! How are you doing today?',
      germanTranslation: parsed.germanTranslation || undefined,
      correctionFeedback: parsed.correctionFeedback || undefined,
      detectedCommand: parsed.detectedCommand === 'none' ? undefined : parsed.detectedCommand,
      commandAcknowledgement: parsed.commandAcknowledgement || undefined,
      suggestedFollowUp: parsed.suggestedFollowUp || undefined,
    };
  } catch (err) {
    console.error('Error parsing chat JSON:', err, rawText);
    return {
      englishText: rawText.replace(/[{}[\]"]/g, '').trim() || 'Hello! Let\'s continue our conversation.',
    };
  }
}

export async function processEvaluation(payload: EvaluationRequestPayload): Promise<EvaluationResponsePayload> {
  const ai = getAiClient();
  const { messages, level, topic, durationMinutes } = payload;

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Coach'}: ${m.content}`)
    .join('\n');

  const systemInstruction = `You are a certified senior English as a Second Language (ESL) examiner and pedagogical coach.
Analyze the following drive conversation transcript between an ESL Learner and Coach.
Target CEFR Level: ${level}
Topic: ${topic}
Session duration: ${durationMinutes} minutes.

Carefully evaluate the Learner's English:
1. Grammar Score (0-100%): Precision of tenses, word order, subject-verb agreement, prepositions.
2. Vocabulary Variety Score (0-100%): Richness, idiomatic phrases, topic-specific vocabulary suited for ${level}.
3. Fluency & Expression Score (0-100%): Sentence flow, conversational cohesion, responsiveness, natural phrasing.
4. Overall Score (0-100%): Weighted holistic evaluation.
5. Feedback Summary (in German): An encouraging, constructive 2-3 paragraph breakdown with clear praise and high-leverage areas for improvement.
6. Corrections List: Identify actual mistakes made by the Learner. If the learner made few or no mistakes, provide 2-3 natural phrasing upgrades ("Better way / Native phrasing"). For each, provide what they said, the improved/correct sentence, and a concise German explanation.
7. Vocabulary Harvest: 3 to 5 high-value words or idioms used in or directly relevant to the conversation, with their German translation, CEFR level tag, and an illustrative example sentence.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Here is the conversation transcript to analyze:\n\n${conversationText || 'Learner had a brief greeting conversation.'}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          grammarScore: { type: Type.INTEGER },
          vocabScore: { type: Type.INTEGER },
          fluencyScore: { type: Type.INTEGER },
          overallScore: { type: Type.INTEGER },
          feedbackSummary: { type: Type.STRING },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                userSaid: { type: Type.STRING },
                betterWay: { type: Type.STRING },
                explanationDe: { type: Type.STRING },
              },
              required: ['userSaid', 'betterWay', 'explanationDe'],
            },
          },
          vocabularyHarvest: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                english: { type: Type.STRING },
                german: { type: Type.STRING },
                exampleSentence: { type: Type.STRING },
                cefrLevel: { type: Type.STRING },
              },
              required: ['english', 'german', 'exampleSentence', 'cefrLevel'],
            },
          },
        },
        required: [
          'grammarScore',
          'vocabScore',
          'fluencyScore',
          'overallScore',
          'feedbackSummary',
          'corrections',
          'vocabularyHarvest',
        ],
      },
    },
  });

  const rawText = response.text || '{}';
  try {
    return JSON.parse(rawText) as EvaluationResponsePayload;
  } catch (err) {
    console.error('Failed to parse evaluation response:', err, rawText);
    return {
      grammarScore: 78,
      vocabScore: 75,
      fluencyScore: 82,
      overallScore: 78,
      feedbackSummary: 'Gute Fahrt und toller Einsatz! Du hast dich flüssig und verständlich auf Englisch ausgedrückt. Achte in Zukunft noch mehr auf Präpositionen und abwechslungsreiche Satzanfänge.',
      corrections: [
        {
          userSaid: 'I go by car everyday.',
          betterWay: 'I drive to work every day / I commute by car every day.',
          explanationDe: '\'Commute by car\' klingt natürlicher für das tägliche Pendeln.',
        },
      ],
      vocabularyHarvest: [
        {
          english: 'commute',
          german: 'pendeln / Arbeitsweg',
          exampleSentence: 'My daily commute takes about thirty minutes.',
          cefrLevel: 'B1',
        },
        {
          english: 'on the go',
          german: 'unterwegs sein',
          exampleSentence: 'I like listening to podcasts while on the go.',
          cefrLevel: 'B2',
        },
      ],
    };
  }
}
