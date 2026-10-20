import { UserSettings, SessionReport, VocabularyItem, CorrectionItem, LearningStats } from '../types/index.ts';

const SETTINGS_KEY = 'drive_english_settings_v1';
const STATS_KEY = 'drive_english_stats_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  level: 'B1',
  durationMinutes: 15,
  topicMode: 'random',
  customTopic: '',
  correctionMode: 'gentle',
  translationMode: 'with_translation',
  voiceURI: null,
  speechRate: 1.0,
};

const INITIAL_VOCABULARY: VocabularyItem[] = [
  {
    id: 'vocab-1',
    english: 'commute',
    german: 'pendeln, der Arbeitsweg',
    exampleSentence: 'My daily commute on the highway takes about thirty minutes.',
    cefrLevel: 'B1',
    savedAt: '2026-10-18T08:30:00Z',
    mastered: true,
  },
  {
    id: 'vocab-2',
    english: 'rush hour',
    german: 'die Hauptverkehrszeit, Berufsverkehr',
    exampleSentence: 'I try to leave early to beat the morning rush hour.',
    cefrLevel: 'B1',
    savedAt: '2026-10-18T08:35:00Z',
    mastered: false,
  },
  {
    id: 'vocab-3',
    english: 'pivotal moment',
    german: 'entscheidender Wendepunkt',
    exampleSentence: 'Electric mobility represents a pivotal moment for transportation.',
    cefrLevel: 'B2',
    savedAt: '2026-10-19T14:15:00Z',
    mastered: false,
  },
  {
    id: 'vocab-4',
    english: 'hands-free',
    german: 'freihändig, ohne Hände',
    exampleSentence: 'Using a hands-free voice coach keeps your eyes on the road.',
    cefrLevel: 'A2',
    savedAt: '2026-10-19T14:20:00Z',
    mastered: true,
  },
];

const INITIAL_CORRECTIONS: CorrectionItem[] = [
  {
    id: 'corr-1',
    userSaid: 'I am driving since five years.',
    betterWay: 'I have been driving for five years.',
    explanationDe: 'Für Handlungen, die in der Vergangenheit begonnen haben und bis jetzt andauern, verwenden wir "Present Perfect Continuous" mit "for".',
    date: '2026-10-18T08:45:00Z',
  },
  {
    id: 'corr-2',
    userSaid: 'The traffic was very big today.',
    betterWay: 'The traffic was very heavy today.',
    explanationDe: 'Verkehr wird im Englischen nicht mit "big", sondern mit "heavy" (stark) oder "light" (schwach) beschrieben.',
    date: '2026-10-19T14:30:00Z',
  },
];

const INITIAL_SESSIONS: SessionReport[] = [
  {
    id: 'session-demo-1',
    date: '2026-10-18T08:45:00Z',
    durationMinutes: 10,
    level: 'B1',
    topic: 'Wirtschaft & Mobilität',
    grammarScore: 74,
    vocabScore: 70,
    fluencyScore: 82,
    overallScore: 75,
    feedbackSummary: 'Starker Einstieg! Dein Redefluss war zügig und lebendig. Achte bei Zeitenwechseln darauf, nicht ins deutsche Präsens abzudriften.',
    corrections: [INITIAL_CORRECTIONS[0]],
    vocabularyHarvest: [INITIAL_VOCABULARY[0], INITIAL_VOCABULARY[1]],
    messagesCount: 14,
  },
  {
    id: 'session-demo-2',
    date: '2026-10-19T14:30:00Z',
    durationMinutes: 15,
    level: 'B1',
    topic: 'Tagesaktuelle News & Tech',
    grammarScore: 82,
    vocabScore: 79,
    fluencyScore: 88,
    overallScore: 83,
    feedbackSummary: 'Klasse Fortschritt im Vergleich zum ersten Training! Du hast spontan reagiert und komplexere Satzstrukturen mutig ausprobiert.',
    corrections: [INITIAL_CORRECTIONS[1]],
    vocabularyHarvest: [INITIAL_VOCABULARY[2], INITIAL_VOCABULARY[3]],
    messagesCount: 22,
  },
];

export const storageService = {
  loadSettings(): UserSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage', e);
    }
  },

  loadStats(): LearningStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          totalMinutes: parsed.totalMinutes ?? 25,
          totalSessions: parsed.totalSessions ?? 2,
          totalWordsLearned: parsed.totalWordsLearned ?? 4,
          history: parsed.history || INITIAL_SESSIONS,
          vocabularyBook: parsed.vocabularyBook || INITIAL_VOCABULARY,
          pastCorrections: parsed.pastCorrections || INITIAL_CORRECTIONS,
        };
      }
    } catch (e) {
      console.warn('Failed to load stats from localStorage', e);
    }
    return {
      totalMinutes: 25,
      totalSessions: 2,
      totalWordsLearned: 4,
      history: INITIAL_SESSIONS,
      vocabularyBook: INITIAL_VOCABULARY,
      pastCorrections: INITIAL_CORRECTIONS,
    };
  },

  saveStats(stats: LearningStats): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.warn('Failed to save stats to localStorage', e);
    }
  },

  addSessionReport(report: SessionReport): LearningStats {
    const current = this.loadStats();
    const updatedHistory = [report, ...current.history];
    const updatedCorrections = [...report.corrections, ...current.pastCorrections];

    // Merge vocabulary without duplicates
    const vocabMap = new Map<string, VocabularyItem>();
    current.vocabularyBook.forEach((v) => vocabMap.set(v.english.toLowerCase(), v));
    report.vocabularyHarvest.forEach((v) => vocabMap.set(v.english.toLowerCase(), v));

    const updatedStats: LearningStats = {
      totalMinutes: current.totalMinutes + report.durationMinutes,
      totalSessions: current.totalSessions + 1,
      totalWordsLearned: vocabMap.size,
      history: updatedHistory,
      vocabularyBook: Array.from(vocabMap.values()),
      pastCorrections: updatedCorrections,
    };

    this.saveStats(updatedStats);
    return updatedStats;
  },

  toggleVocabMastered(id: string): LearningStats {
    const stats = this.loadStats();
    stats.vocabularyBook = stats.vocabularyBook.map((v) =>
      v.id === id ? { ...v, mastered: !v.mastered } : v
    );
    this.saveStats(stats);
    return stats;
  },

  deleteVocab(id: string): LearningStats {
    const stats = this.loadStats();
    stats.vocabularyBook = stats.vocabularyBook.filter((v) => v.id !== id);
    stats.totalWordsLearned = stats.vocabularyBook.length;
    this.saveStats(stats);
    return stats;
  },

  saveSingleVocab(item: VocabularyItem): LearningStats {
    const stats = this.loadStats();
    const exists = stats.vocabularyBook.some(
      (v) => v.english.toLowerCase() === item.english.toLowerCase()
    );
    if (!exists) {
      stats.vocabularyBook = [item, ...stats.vocabularyBook];
      stats.totalWordsLearned = stats.vocabularyBook.length;
      this.saveStats(stats);
    }
    return stats;
  },
};
