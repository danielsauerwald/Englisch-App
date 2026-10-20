import {
  ConversationMessage,
  CEFRLevel,
  TopicMode,
  CorrectionMode,
  TranslationMode,
  SessionReport,
} from '../types/index.ts';

export interface ChatResponse {
  englishText: string;
  germanTranslation?: string;
  correctionFeedback?: string;
  detectedCommand?: string;
  commandAcknowledgement?: string;
  suggestedFollowUp?: string;
}

export interface EvaluationResponse {
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

function getApiKey(): string {
  // Check import.meta.env.VITE_GEMINI_API_KEY as requested
  const key =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    '';
  if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'VITE_GEMINI_API_KEY ist nicht hinterlegt. Bitte trage deinen Google Gemini API-Schlüssel in die Umgebung ein.'
    );
  }
  return key.trim();
}

/**
 * Direct fetch call to official Google Gemini API v1beta endpoint
 * Primary Model: gemini-2.5-flash
 * Automatic graceful fallback to gemini-3.8-flash if Google API returns 404 (model deprecated)
 */
async function callGeminiRestApi(
  bodyPayload: any,
  preferredModel = 'gemini-2.5-flash'
): Promise<any> {
  const apiKey = getApiKey();
  const primaryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${preferredModel}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  let res = await fetch(primaryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyPayload),
  });

  // If Google API returns 404 (e.g. model no longer available to new users), fallback to gemini-3.8-flash
  if (res.status === 404) {
    const errorJson = await res.json().catch(() => null);
    console.warn(`Model ${preferredModel} returned 404, falling back to gemini-3.8-flash:`, errorJson);
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;
    res = await fetch(fallbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    const serverMessage =
      errData?.error?.message ||
      `Gemini API Fehler ${res.status}: ${res.statusText || 'Verbindung fehlgeschlagen'}`;
    throw new Error(serverMessage);
  }

  const json = await res.json();
  const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error('Die Gemini API hat keine Text-Antwort zurückgegeben.');
  }

  return candidateText;
}

export const geminiClientService = {
  async chat(params: {
    messages: ConversationMessage[];
    level: CEFRLevel;
    topicMode: TopicMode;
    customTopic?: string;
    correctionMode: CorrectionMode;
    translationMode: TranslationMode;
    timeRemainingMinutes?: number;
    currentSpeed?: number;
    isInitial?: boolean;
  }): Promise<ChatResponse> {
    const {
      messages,
      level,
      topicMode,
      customTopic,
      correctionMode,
      translationMode,
      timeRemainingMinutes,
      isInitial,
    } = params;

    const topicDescriptions: Record<string, string> = {
      random: 'An intriguing, engaging general topic (e.g. travel memories, fascinating innovations, food culture, or hobbies).',
      news: 'Today\'s top breaking world news, technology breakthroughs, or global events. Keep facts accurate.',
      business: 'Business, global economics, financial markets, start-ups, and career leadership.',
      society: 'Modern society, cultural trends, daily habits, lifestyle, and work-life balance.',
      custom: `User requested custom topic: "${customTopic || 'English conversation practice'}"`,
    };

    const levelGuidelines: Record<string, string> = {
      A2: 'CEFR A2 (Elementary): Simple short sentences, familiar basic vocabulary, warm and easy-to-understand questions.',
      B1: 'CEFR B1 (Intermediate): Straightforward sentences, conversational vocabulary, clear everyday idioms.',
      B2: 'CEFR B2 (Upper Intermediate): Varied vocabulary, natural idiomatic expressions, engaging discussions.',
      C1: 'CEFR C1 (Advanced): Fluent, sophisticated vocabulary, natural transitions, rhetorical questions.',
      C2: 'CEFR C2 (Mastery): Highly authentic nuances, complex phrasing, rich conversational depth.',
    };

    let correctionInstruction = '';
    if (correctionMode === 'free') {
      correctionInstruction = 'Do NOT correct mistakes during the conversation. Keep the flow smooth and friendly.';
    } else if (correctionMode === 'gentle') {
      correctionInstruction = 'GENTLE RECAST: If the user made a grammar error, naturally mirror the correct form in your reply without calling it out as wrong.';
    } else {
      correctionInstruction = 'STRICT TEACHER: If the user made an error, include a brief polite 1-sentence tip before continuing.';
    }

    let translationInstruction = '';
    if (translationMode === 'with_translation') {
      translationInstruction = 'Always provide both the English spoken response and a natural German translation.';
    } else if (translationMode === 'on_demand') {
      translationInstruction = 'Only provide German if the user specifically asked for translation or clarification.';
    } else {
      translationInstruction = '100% English conversation only.';
    }

    const timeAlert =
      typeof timeRemainingMinutes === 'number' && timeRemainingMinutes <= 2
        ? `IMPORTANT: Only ${timeRemainingMinutes} minute(s) remaining. Gently conclude the conversation and share a warm farewell.`
        : '';

    const systemPrompt = `You are "DriveEnglish Coach", an interactive English conversation trainer designed specifically for drivers using hands-free voice mode during a car trip.

TARGET LEARNER PROFILE:
- Level: ${levelGuidelines[level] || levelGuidelines['B1']}
- Topic: ${topicDescriptions[topicMode] || topicDescriptions['random']}
- Correction Style: ${correctionInstruction}
- Translation Requirement: ${translationInstruction}
${timeAlert}

CAR-MODE VOICE CONSTRAINTS:
1. BREVITY: Keep your spoken English response to 2 to 4 sentences maximum (approx 30-50 words). Monologues are dangerous while driving.
2. DYNAMIC & ENGAGING: Always respond directly to what the user just said in the conversation history! Never repeat generic canned sentences.
3. CONVERSATIONAL HOOK: Always end with an engaging open question that is easy to answer out loud.

You must respond in valid JSON format matching this schema:
{
  "englishText": "The conversational English sentence(s) to be spoken aloud.",
  "germanTranslation": "Natural German translation (if requested or applicable, else empty string)",
  "correctionFeedback": "Short tip or gentle correction if strict mode applies, else empty string",
  "detectedCommand": "slower | faster | repeat | translate | new_topic | null",
  "commandAcknowledgement": "Short acknowledgement if command was handled, else empty string",
  "suggestedFollowUp": "Brief 1-sentence question or prompt"
}`;

    // Build chat contents with proper alternating roles
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (!messages || messages.length === 0) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: isInitial
              ? `Hello! I just started my car drive. Start our conversation on "${topicDescriptions[topicMode]}" at CEFR ${level} level. Greet me warmly and ask an opening question to get me talking!`
              : `Let's start our conversation on "${topicDescriptions[topicMode]}".`,
          },
        ],
      });
    } else {
      let hasUserStarted = false;
      for (const msg of messages) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        if (!hasUserStarted && role === 'model') {
          contents.push({
            role: 'user',
            parts: [
              {
                text: `Let's practice English on "${topicDescriptions[topicMode]}" at CEFR ${level} level.`,
              },
            ],
          });
          hasUserStarted = true;
        } else if (role === 'user') {
          hasUserStarted = true;
        }

        const prev = contents[contents.length - 1];
        if (prev && prev.role === role) {
          prev.parts[0].text += `\n${msg.content}`;
        } else {
          contents.push({
            role,
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    };

    const rawJson = await callGeminiRestApi(requestBody, 'gemini-2.5-flash');
    try {
      const parsed = JSON.parse(rawJson);
      return {
        englishText: parsed.englishText || '',
        germanTranslation: parsed.germanTranslation || undefined,
        correctionFeedback: parsed.correctionFeedback || undefined,
        detectedCommand: parsed.detectedCommand === 'none' ? undefined : parsed.detectedCommand,
        commandAcknowledgement: parsed.commandAcknowledgement || undefined,
        suggestedFollowUp: parsed.suggestedFollowUp || undefined,
      };
    } catch (parseErr) {
      return {
        englishText: rawJson.replace(/[{}[\]"]/g, '').trim(),
      };
    }
  },

  async evaluate(params: {
    messages: ConversationMessage[];
    level: string;
    topic: string;
    durationMinutes: number;
  }): Promise<EvaluationResponse> {
    const { messages, level, topic, durationMinutes } = params;

    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Learner' : 'Coach'}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are a certified senior English as a Second Language (ESL) examiner and pedagogical coach.
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
6. Corrections List: Identify actual mistakes made by the Learner. For each, provide what they said, the improved/correct sentence, and a concise German explanation.
7. Vocabulary Harvest: 3 to 5 high-value words or idioms used in or directly relevant to the conversation, with German translation, CEFR level tag, and an illustrative example sentence.

Respond strictly in valid JSON matching this structure:
{
  "grammarScore": 85,
  "vocabScore": 80,
  "fluencyScore": 88,
  "overallScore": 84,
  "feedbackSummary": "Text in German...",
  "corrections": [
    { "userSaid": "...", "betterWay": "...", "explanationDe": "..." }
  ],
  "vocabularyHarvest": [
    { "english": "...", "german": "...", "exampleSentence": "...", "cefrLevel": "B1" }
  ]
}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Here is the conversation transcript to analyze:\n\n${transcript || 'Learner had a brief greeting conversation.'}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    };

    const rawJson = await callGeminiRestApi(requestBody, 'gemini-2.5-flash');
    return JSON.parse(rawJson) as EvaluationResponse;
  },
};
