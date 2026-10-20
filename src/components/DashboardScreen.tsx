import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  History,
  Clock,
  Car,
  Award,
  Volume2,
  Check,
  Trash2,
  AlertCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { LearningStats, VocabularyItem, CorrectionItem } from '../types/index.ts';
import { storageService } from '../services/storageService.ts';
import { speechService } from '../services/speechService.ts';

interface DashboardScreenProps {
  stats: LearningStats;
  onRefreshStats: () => void;
  onStartNewDrive: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  stats,
  onRefreshStats,
  onStartNewDrive,
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'vocab' | 'corrections' | 'history'>('chart');
  const [vocabFilter, setVocabFilter] = useState<'all' | 'learning' | 'mastered'>('all');

  const handleSpeak = (text: string) => {
    speechService.speak(text, { rate: 0.9 });
  };

  const handleToggleMastered = (id: string) => {
    storageService.toggleVocabMastered(id);
    onRefreshStats();
  };

  const handleDeleteVocab = (id: string) => {
    storageService.deleteVocab(id);
    onRefreshStats();
  };

  // Filter vocabulary
  const filteredVocab = stats.vocabularyBook.filter((v) => {
    if (vocabFilter === 'learning') return !v.mastered;
    if (vocabFilter === 'mastered') return v.mastered;
    return true;
  });

  // Calculate average score
  const avgScore =
    stats.history.length > 0
      ? Math.round(
          stats.history.reduce((acc, curr) => acc + curr.overallScore, 0) / stats.history.length
        )
      : 0;

  // Chart data: reverse so oldest is first, up to last 8 sessions
  const chartSessions = [...stats.history].reverse().slice(-8);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 animate-fade-in">
      {/* 1. KPI HIGHLIGHT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Trainingszeit</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {stats.totalMinutes}{' '}
              <span className="text-xs font-normal text-slate-400">Min</span>
            </div>
            <span className="text-[11px] text-cyan-400 font-medium">Hinterm Steuer</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Fahrten</span>
            <Car className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{stats.totalSessions}</div>
            <span className="text-[11px] text-indigo-400 font-medium">Gesprächssitzungen</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Vokabeln</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{stats.totalWordsLearned}</div>
            <span className="text-[11px] text-emerald-400 font-medium">Im Vokabelheft</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Ø Score</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {avgScore}%
            </div>
            <span className="text-[11px] text-amber-400 font-medium">Durchschnitt</span>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'chart'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Fortschritts-Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'vocab'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Vokabelheft ({stats.vocabularyBook.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('corrections')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'corrections'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Fehler-Archiv ({stats.pastCorrections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Fahrten ({stats.history.length})</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* A. PROGRESSION CHART TAB */}
      {activeTab === 'chart' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Lernentwicklung über die letzten Sitzungen
              </h3>
              <p className="text-xs text-slate-400">
                Grammatik-, Wortschatz- und Gesamtscore im zeitlichen Verlauf.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Gesamt
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Grammatik
              </span>
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Wortschatz
              </span>
            </div>
          </div>

          {/* SVG Progression Chart */}
          <div className="w-full bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
            {chartSessions.length > 0 ? (
              <div className="space-y-4">
                <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const y = 170 - (val / 100) * 140;
                    return (
                      <g key={val}>
                        <line
                          x1="35"
                          y1={y}
                          x2="480"
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x="28"
                          y={y + 3}
                          fill="#64748b"
                          fontSize="9"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw Lines */}
                  {(() => {
                    const count = chartSessions.length;
                    const getX = (idx: number) => {
                      if (count <= 1) return 250;
                      return 45 + (idx / (count - 1)) * 420;
                    };
                    const getY = (score: number) => 170 - (score / 100) * 140;

                    const overallPoints = chartSessions.map(
                      (s, i) => `${getX(i)},${getY(s.overallScore)}`
                    );
                    const grammarPoints = chartSessions.map(
                      (s, i) => `${getX(i)},${getY(s.grammarScore)}`
                    );
                    const vocabPoints = chartSessions.map(
                      (s, i) => `${getX(i)},${getY(s.vocabScore)}`
                    );

                    return (
                      <>
                        {/* Grammar Line */}
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeOpacity="0.7"
                          points={grammarPoints.join(' ')}
                        />
                        {/* Vocab Line */}
                        <polyline
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2.5"
                          strokeOpacity="0.7"
                          points={vocabPoints.join(' ')}
                        />
                        {/* Overall Line (Thick glowing cyan) */}
                        <polyline
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3.5"
                          points={overallPoints.join(' ')}
                        />

                        {/* Interactive Data Dots */}
                        {chartSessions.map((s, i) => {
                          const cx = getX(i);
                          const cy = getY(s.overallScore);
                          return (
                            <g key={s.id || i} className="group">
                              <circle
                                cx={cx}
                                cy={cy}
                                r="5"
                                fill="#0284c7"
                                stroke="#38bdf8"
                                strokeWidth="2"
                                className="cursor-pointer hover:r-7 transition-all"
                              />
                              <text
                                x={cx}
                                y={cy - 10}
                                fill="#ffffff"
                                fontSize="10"
                                fontWeight="bold"
                                textAnchor="middle"
                                className="opacity-90"
                              >
                                {s.overallScore}%
                              </text>
                              {/* Session Date label */}
                              <text
                                x={cx}
                                y={190}
                                fill="#64748b"
                                fontSize="8"
                                textAnchor="middle"
                              >
                                #{i + 1}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-900">
                  <span>Start der Aufzeichnungen</span>
                  <span className="text-cyan-400 font-semibold">
                    Letztes Training: {chartSessions[chartSessions.length - 1]?.overallScore}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Noch keine Sitzungen erfasst. Starte deine erste Fahrt!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. VOCABULARY BOOK TAB */}
      {activeTab === 'vocab' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Dein persönliches Vokabelheft
              </h3>
              <p className="text-xs text-slate-400">
                Gesammelte Vokabeln & Redewendungen aus deinen Fahrten.
              </p>
            </div>

            {/* Filter Pill */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setVocabFilter('all')}
                className={`px-3 py-1 rounded-lg transition ${
                  vocabFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Alle ({stats.vocabularyBook.length})
              </button>
              <button
                onClick={() => setVocabFilter('learning')}
                className={`px-3 py-1 rounded-lg transition ${
                  vocabFilter === 'learning'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Zu Lernen ({stats.vocabularyBook.filter((v) => !v.mastered).length})
              </button>
              <button
                onClick={() => setVocabFilter('mastered')}
                className={`px-3 py-1 rounded-lg transition ${
                  vocabFilter === 'mastered'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gelernt ({stats.vocabularyBook.filter((v) => v.mastered).length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredVocab.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                  item.mastered
                    ? 'bg-slate-950/60 border-slate-850 opacity-80'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base font-extrabold text-white flex items-center gap-2">
                      {item.english}
                      <button
                        onClick={() => handleSpeak(item.english)}
                        className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                        title="Vorlesen"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                      {item.cefrLevel || 'B1'}
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-cyan-300 block mb-2">
                    {item.german}
                  </span>

                  <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 leading-relaxed">
                    "{item.exampleSentence}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-xs">
                  <button
                    onClick={() => handleToggleMastered(item.id)}
                    className={`flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg transition ${
                      item.mastered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{item.mastered ? 'Gelernt ✓' : 'Als gelernt markieren'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteVocab(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                    title="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredVocab.length === 0 && (
            <div className="py-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Keine Vokabeln in dieser Ansicht.</p>
            </div>
          )}
        </div>
      )}

      {/* C. ERROR & CORRECTIONS ARCHIVE */}
      {activeTab === 'corrections' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Fehler- & Korrektur-Archiv
            </h3>
            <p className="text-xs text-slate-400">
              Sieh dir vor der nächsten Autofahrt typische Stolpersteine noch einmal an.
            </p>
          </div>

          <div className="space-y-3">
            {stats.pastCorrections.map((corr) => (
              <div
                key={corr.id}
                className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2.5"
              >
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold shrink-0">
                      Gesagt:
                    </span>
                    <span className="text-slate-300 italic text-sm">"{corr.userSaid}"</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                      Richtig / Natürlich:
                    </span>
                    <span className="text-emerald-300 font-semibold text-sm">
                      "{corr.betterWay}"
                    </span>
                    <button
                      onClick={() => handleSpeak(corr.betterWay)}
                      className="p-1 rounded text-slate-400 hover:text-emerald-300"
                      title="Anhören"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-850 leading-relaxed">
                  💡 {corr.explanationDe}
                </p>
              </div>
            ))}

            {stats.pastCorrections.length === 0 && (
              <div className="py-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                <p>Bisher sind keine Fehler gespeichert. Großartig!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* D. PAST DRIVE SESSIONS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Vergangene Trainingsfahrten
            </h3>
            <p className="text-xs text-slate-400">Historie aller geführten Gespräche.</p>
          </div>

          <div className="space-y-3">
            {stats.history.map((sess) => (
              <div
                key={sess.id}
                className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs">
                      {sess.level}
                    </span>
                    <h4 className="font-bold text-white text-sm">{sess.topic}</h4>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>{new Date(sess.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{sess.durationMinutes} Minuten</span>
                    <span>•</span>
                    <span>{sess.messagesCount} Interaktionen</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                    {sess.feedbackSummary}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Score
                    </span>
                    <span className="text-2xl font-black text-cyan-400 font-mono">
                      {sess.overallScore}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-md z-30">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onStartNewDrive}
            className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/25 transition cursor-pointer"
          >
            <Car className="w-5 h-5 fill-current" />
            <span>Neue Fahrt starten</span>
          </button>
        </div>
      </div>
    </div>
  );
};
