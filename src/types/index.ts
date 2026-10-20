export type CEFRLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type TopicMode = 'random' | 'news' | 'business' | 'society' | 'custom';

export type CorrectionMode = 'free' | 'gentle' | 'strict';

export type TranslationMode = 'english_only' | 'with_translation' | 'on_demand';

export interface UserSettings {
  level: CEFRLevel;
  durationMinutes: number;
  topicMode: TopicMode;
  customTopic: string;
  correctionMode: CorrectionMode;
  translationMode: TranslationMode;
  voiceURI: string | null;
  speechRate: number; // 0.7 - 1.3
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  translation?: string;
  correctionFeedback?: string;
  timestamp: number;
}

export interface CorrectionItem {
  id: string;
  userSaid: string;
  betterWay: string;
  explanationDe: string;
  date: string;
}

export interface VocabularyItem {
  id: string;
  english: string;
  german: string;
  exampleSentence: string;
  cefrLevel: string;
  savedAt: string;
  mastered?: boolean;
}

export interface SessionReport {
  id: string;
  date: string;
  durationMinutes: number;
  level: CEFRLevel;
  topic: string;
  grammarScore: number;
  vocabScore: number;
  fluencyScore: number;
  overallScore: number;
  feedbackSummary: string;
  corrections: CorrectionItem[];
  vocabularyHarvest: VocabularyItem[];
  messagesCount: number;
}

export interface LearningStats {
  totalMinutes: number;
  totalSessions: number;
  totalWordsLearned: number;
  history: SessionReport[];
  vocabularyBook: VocabularyItem[];
  pastCorrections: CorrectionItem[];
}
