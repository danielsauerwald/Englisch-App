import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  BookmarkPlus,
  BookmarkCheck,
  Volume2,
  Car,
  BarChart3,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SessionReport, VocabularyItem } from '../types/index.ts';
import { storageService } from '../services/storageService.ts';
import { speechService } from '../services/speechService.ts';

interface EvaluationModalProps {
  report: SessionReport | null;
  isLoading: boolean;
  onGoToDashboard: () => void;
  onNewDrive: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  report,
  isLoading,
  onGoToDashboard,
  onNewDrive,
}) => {
  const [savedVocabIds, setSavedVocabIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
        <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-cyan-500/30 p-8 shadow-2xl text-center space-y-5 animate-pulse">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Auswertung wird erstellt...</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Die KI analysiert deinen gesamten Gesprächsverlauf, Grammatik, Wortschatz und deine
              Ausdrucksstärke.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const handleSaveVocab = (item: VocabularyItem) => {
    storageService.saveSingleVocab(item);
    setSavedVocabIds((prev) => new Set(prev).add(item.id));
  };

  const handleSpeakVocab = (text: string) => {
    speechService.speak(text, { rate: 0.9 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl text-slate-100 my-8 space-y-6">
        {/* Header with Overall Score Gauge */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/25 shrink-0">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Fahrt-Auswertung • Level {report.level}
              </span>
              <h2 className="text-2xl font-black text-white">Starke Leistung!</h2>
              <span className="text-xs text-slate-400">
                {report.durationMinutes} Minuten Training • {report.messagesCount} Redebeiträge
              </span>
            </div>
          </div>

          {/* Overall Score Badge */}
          <div className="flex flex-col items-center px-5 py-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/40">
            <span className="text-xs text-cyan-300 font-bold uppercase">Gesamt</span>
            <span className="text-3xl font-black text-cyan-400 font-mono">
              {report.overallScore}%
            </span>
          </div>
        </div>

        {/* 3 Detail Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block">Grammatik</span>
            <span className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono mt-0.5 block">
              {report.grammarScore}%
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block">Wortschatz</span>
            <span className="text-xl sm:text-2xl font-extrabold text-indigo-400 font-mono mt-0.5 block">
              {report.vocabScore}%
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block">Flüssigkeit</span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono mt-0.5 block">
              {report.fluencyScore}%
            </span>
          </div>
        </div>

        {/* AI Feedback Summary */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Trainer-Feedback
          </h4>
          <p className="text-sm text-slate-200 leading-relaxed">{report.feedbackSummary}</p>
        </div>

        {/* Corrections Breakdown ("Was du gesagt hast" vs "Besser") */}
        {report.corrections && report.corrections.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Fehler & Optimierungen aus dem Gespräch
            </h3>

            <div className="space-y-2.5">
              {report.corrections.map((corr, idx) => (
                <div
                  key={corr.id || idx}
                  className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 space-y-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-start gap-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold shrink-0">
                        Gesagt:
                      </span>
                      <span className="text-slate-300 italic">"{corr.userSaid}"</span>
                    </div>

                    <div className="flex items-start gap-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                        Besser:
                      </span>
                      <span className="text-emerald-300 font-semibold">"{corr.betterWay}"</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
                    💡 {corr.explanationDe}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vocabulary Harvest */}
        {report.vocabularyHarvest && report.vocabularyHarvest.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-cyan-400" />
                Vokabel-Ernte (Wichtige Begriffe zum Merken)
              </h3>
              <span className="text-[11px] text-slate-400">Für die nächste Fahrt</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {report.vocabularyHarvest.map((v) => {
                const isSaved = savedVocabIds.has(v.id);
                return (
                  <div
                    key={v.id}
                    className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                          {v.english}
                          <button
                            onClick={() => handleSpeakVocab(v.english)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300"
                            title="Aussprache anhören"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                          {v.cefrLevel || 'B1'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-300 block mb-1.5">{v.german}</span>
                      <p className="text-[11px] text-slate-400 italic line-clamp-2">
                        "{v.exampleSentence}"
                      </p>
                    </div>

                    <button
                      onClick={() => handleSaveVocab(v)}
                      disabled={isSaved}
                      className={`mt-2.5 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        isSaved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 cursor-pointer'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Im Vokabelheft gespeichert</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>Ins Vokabelheft übernehmen</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onNewDrive}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Car className="w-4 h-4 fill-current" />
            <span>Neue Fahrt planen</span>
          </button>

          <button
            onClick={onGoToDashboard}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Lernstatistiken & Vokabeln ansehen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
