import {
  ConversationMessage,
  CEFRLevel,
  TopicMode,
  CorrectionMode,
  TranslationMode,
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

/**
 * Ordered list of candidate models.
 * Automatically tries next model on overload or deprecation.
 */
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

function getApiKey(): string {
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
 * Check if the error indicates temporary capacity constraints / rate limits
 */
function isOverloadError(status: number, message: string): boolean {
  if (status === 429 || status === 503 || status === 533 || status === 504) {
    return true;
  }
  const lower = (message || '').toLowerCase();
  return (
    lower.includes('high demand') ||
    lower.includes('spikes in demand') ||
    lower.includes('resource_exhausted') ||
    lower.includes('unavailable') ||
    lower.includes('overload') ||
    lower.includes('rate limit') ||
    lower.includes('try again later') ||
    lower.includes('503') ||
    lower.includes('533') ||
    lower.includes('429')
  );
}

/**
 * Robust Google Gemini REST caller with automatic model fallback and 2-second overload retry
 */
async function callGeminiRestApi(
  bodyPayload: any,
  onStatusUpdate?: (statusText: string) => void
): Promise<string> {
  const apiKey = getApiKey();
  let lastError: Error | null = null;
  const maxPasses = 2;

  for (let pass = 1; pass <= maxPasses; pass++) {
    for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
      const model = CANDIDATE_MODELS[i];
      const nextModel = CANDIDATE_MODELS[i + 1] || CANDIDATE_MODELS[0];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          const json = await res.json();
          const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!candidateText) {
            throw new Error(`Modell ${model} hat eine leere Antwort geliefert.`);
          }
          return candidateText;
        }

        const errData = await res.json().catch(() => null);
        const serverMessage =
          errData?.error?.message ||
          `Gemini API Fehler ${res.status}: ${res.statusText || 'Verbindung fehlgeschlagen'}`;

        // 404: Model not available/deprecated for this account -> Switch immediately to next model
        if (res.status === 404) {
          console.warn(`Modell ${model} nicht verfügbar (404), wechsle zu ${nextModel}...`);
          lastError = new Error(serverMessage);
          continue;
        }

        // Overload error (429, 503, 533, High Demand, etc.) -> Wait 2 seconds and switch model
        if (isOverloadError(res.status, serverMessage)) {
          const notice = `Modell ${model} ausgelastet (${res.status}). Wechsle zu ${nextModel} (Retry in 2s)...`;
          console.warn(notice);
          onStatusUpdate?.(notice);
          lastError = new Error(`Modell ${model} ausgelastet: ${serverMessage}`);

          // Automatic 2-second retry wait
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        // If it's another non-overload error (e.g. 400 Invalid Argument or 403 Key Invalid), rethrow immediately
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error(serverMessage);
        }

        lastError = new Error(serverMessage);
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);

        // If API key is wrong, don't waste time retrying
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
          throw err;
        }

        if (isOverloadError(0, msg)) {
          const notice = `Netzwerk/Auslastung bei ${model}. Wechsle zu ${nextModel} (Retry in 2s)...`;
          console.warn(notice);
          onStatusUpdate?.(notice);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        // Proceed to next fallback model
        continue;
      }
    }
  }

  if (lastError) {
    const errorMsg = lastError.message || String(lastError);
    if (
      errorMsg.toLowerCase().includes('quota') ||
      errorMsg.toLowerCase().includes('resource_exhausted') ||
      errorMsg.includes('429')
    ) {
      throw new Error(
        'API-Quota vorübergehend erschöpft (Quota Exceeded / Rate Limit). Das Kontingent deines Gemini API-Keys ist momentan limitiert. Bitte warte 30 Sekunden und versuche es erneut, oder wechsle zu einem Key mit höherem Kontingent.'
      );
    }
    throw lastError;
  }

  throw new Error(
    'Alle Gemini-Modelle sind momentan ausgelastet. Bitte versuche es in wenigen Augenblicken erneut.'
  );
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
    onStatusUpdate?: (status: string) => void;
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
      onStatusUpdate,
    } = params;

    const topicDescriptions: Record<string, string> = {
      random:
        'An intriguing, engaging general topic (e.g. travel memories, fascinating innovations, food culture, or hobbies).',
      news: "Today's top breaking world news, technology breakthroughs, or global events. Keep facts accurate.",
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
      correctionInstruction =
        'Do NOT correct mistakes during the conversation. Keep the flow smooth and friendly.';
    } else if (correctionMode === 'gentle') {
      correctionInstruction =
        'GENTLE RECAST: If the user made a grammar error, naturally mirror the correct form in your reply without calling it out as wrong.';
    } else {
      correctionInstruction =
        'STRICT TEACHER: If the user made an error, include a brief polite 1-sentence tip before continuing.';
    }

    let translationInstruction = '';
    if (translationMode === 'with_translation') {
      translationInstruction =
        'Always provide both the English spoken response and a natural German translation.';
    } else if (translationMode === 'on_demand') {
      translationInstruction =
        'Only provide German if the user specifically asked for translation or clarification.';
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

    const rawJson = await callGeminiRestApi(requestBody, onStatusUpdate);
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
    onStatusUpdate?: (status: string) => void;
  }): Promise<EvaluationResponse> {
    const { messages, level, topic, durationMinutes, onStatusUpdate } = params;

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
              text: `Here is the conversation transcript to analyze:\n\n${
                transcript || 'Learner had a brief greeting conversation.'
              }`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    };

    const rawJson = await callGeminiRestApi(requestBody, onStatusUpdate);
    return JSON.parse(rawJson) as EvaluationResponse;
  },
};
