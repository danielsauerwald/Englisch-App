import React, { useState, useEffect } from 'react';
import {
  Car,
  Clock,
  Globe2,
  TrendingUp,
  Coffee,
  Sparkles,
  Edit3,
  Sliders,
  Volume2,
  Languages,
  CheckCircle,
  HelpCircle,
  VolumeX,
  Play,
  ShieldAlert,
} from 'lucide-react';
import {
  UserSettings,
  CEFRLevel,
  TopicMode,
  CorrectionMode,
  TranslationMode,
} from '../types/index.ts';
import { speechService } from '../services/speechService.ts';

interface SetupScreenProps {
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onStartDrive: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  settings,
  onSaveSettings,
  onStartDrive,
}) => {
  const [current, setCurrent] = useState<UserSettings>(settings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);

  useEffect(() => {
    setCurrent(settings);
  }, [settings]);

  useEffect(() => {
    speechService.getAvailableVoices().then((voices) => {
      const enVoices = speechService.getEnglishVoices(voices);
      setAvailableVoices(enVoices.length > 0 ? enVoices : voices);
    });
  }, []);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...current, [key]: value };
    setCurrent(updated);
    onSaveSettings(updated);
  };

  const handleTestVoice = () => {
    setIsPlayingTestVoice(true);
    speechService.speak(
      `Hello! I will be your English co-pilot for this drive at ${current.level} level. Are you ready?`,
      {
        voiceURI: current.voiceURI,
        rate: current.speechRate,
        onEnd: () => setIsPlayingTestVoice(false),
        onError: () => setIsPlayingTestVoice(false),
      }
    );
  };

  const levels: Array<{
    id: CEFRLevel;
    title: string;
    sub: string;
    badge: string;
    desc: string;
  }> = [
    {
      id: 'A2',
      title: 'A2 Grundlagen',
      sub: 'Elementary',
      badge: 'Basis',
      desc: 'Einfache kurze Sätze, alltäglicher Wortschatz, langsames klares Tempo.',
    },
    {
      id: 'B1',
      title: 'B1 Mittelstufe',
      sub: 'Intermediate',
      badge: 'Empfohlen',
      desc: 'Flüssige Unterhaltung, bekannte Redewendungen, Standard-Vokabular.',
    },
    {
      id: 'B2',
      title: 'B2 Gute Mittelstufe',
      sub: 'Upper-Intermediate',
      badge: 'Fortgeschritten',
      desc: 'Abwechslungsreicher Wortschatz, idiomatische Ausdrücke, Diskussionen.',
    },
    {
      id: 'C1',
      title: 'C1 Verhandlungssicher',
      sub: 'Advanced',
      badge: 'Profi',
      desc: 'Nuancierte Sprache, anspruchsvolle Themen, geschliffener Ausdruck.',
    },
    {
      id: 'C2',
      title: 'C2 Nahezu Muttersprachlich',
      sub: 'Mastery',
      badge: 'Native',
      desc: 'Höchstes Sprachniveau, komplexe Wortspiele und rhetorische Tiefe.',
    },
  ];

  const durations = [5, 10, 15, 20, 25, 30, 45];

  const topics: Array<{
    id: TopicMode;
    label: string;
    sub: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'random',
      label: 'Zufallsmodus',
      sub: 'Die KI wählt spontan ein spannendes Gesprächsthema',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      badge: 'Überraschung',
    },
    {
      id: 'news',
      label: 'Tagesaktuelle News',
      sub: 'Live-Suche nach aktuellen Weltnachrichten, Tech & Trends',
      icon: <Globe2 className="w-5 h-5 text-cyan-400" />,
      badge: 'Google Grounding',
    },
    {
      id: 'business',
      label: 'Wirtschaft & Finanzen',
      sub: 'Business English, Märkte, Unternehmertum & Karriere',
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'society',
      label: 'Gesellschaft & Alltag',
      sub: 'Kultur, Philosophie, Lebensstil & persönliche Gedanken',
      icon: <Coffee className="w-5 h-5 text-purple-400" />,
    },
    {
      id: 'custom',
      label: 'Eigenes Wunschthema',
      sub: 'Individuelles Thema per Freitext vorgeben',
      icon: <Edit3 className="w-5 h-5 text-rose-400" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 animate-fade-in pb-28">
      {/* Hero Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 mb-3">
              <Car className="w-3.5 h-3.5" />
              Smarter Car-Modus
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Bereit für die Fahrt?
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
              Konfiguriere dein Training vor der Fahrt. Im Car-Mode bleibt das Display aktiv (Wake
              Lock) und das Mikrofon schaltet sich nach jeder Antwort der KI automatisch wieder an.
            </p>
          </div>

          <button
            onClick={onStartDrive}
            className="w-full sm:w-auto shrink-0 py-4 px-8 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/30 active:scale-95 transition cursor-pointer"
          >
            <Car className="w-6 h-6 fill-current" />
            <span>Jetzt starten</span>
          </button>
        </div>
      </div>

      {/* 1. CEFR Level Tiles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">
              1
            </span>
            Sprachniveau (CEFR)
          </h2>
          <span className="text-xs text-slate-400">Wortschatz & Grammatik passen sich an</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {levels.map((lvl) => {
            const isSelected = current.level === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => updateSetting('level', lvl.id)}
                className={`text-left p-4 rounded-2xl border transition relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {lvl.badge}
                    </span>
                    {isSelected && <CheckCircle className="w-5 h-5 text-cyan-400" />}
                  </div>
                  <h3 className="text-base font-extrabold text-white">{lvl.title}</h3>
                  <span className="text-xs text-cyan-400 font-medium">{lvl.sub}</span>
                  <p className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {lvl.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Duration / Fahrt-Timer */}
      <section className="space-y-3 bg-slate-900/70 p-5 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">
              2
            </span>
            <Clock className="w-5 h-5 text-cyan-400" />
            Gesprächsdauer für die Autofahrt
          </h2>
          <span className="text-base font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-3 py-1 rounded-xl">
            {current.durationMinutes} Minuten
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Während der Fahrt läuft ein gut sichtbarer Countdown. Etwa 1–2 Minuten vor Ablauf leitet
          die KI das Gespräch natürlich zum Ende über und erstellt die Auswertung.
        </p>

        {/* Quick select buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => updateSetting('durationMinutes', d)}
              className={`flex-1 min-w-[50px] py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                current.durationMinutes === d
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="pt-2">
          <input
            type="range"
            min="3"
            max="60"
            step="1"
            value={current.durationMinutes}
            onChange={(e) => updateSetting('durationMinutes', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </section>

      {/* 3. Topics */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">
              3
            </span>
            Themen-Modus
          </h2>
          <span className="text-xs text-slate-400">Gesprächsgrundlage</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topics.map((t) => {
            const isSelected = current.topicMode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => updateSetting('topicMode', t.id)}
                className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-800 shrink-0 mt-0.5">{t.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white">{t.label}</h3>
                    {t.badge && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{t.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom topic input field */}
        {current.topicMode === 'custom' && (
          <div className="mt-2 p-4 rounded-2xl bg-slate-900 border border-rose-500/40 animate-fade-in space-y-2">
            <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider">
              Dein Wunschthema eingeben:
            </label>
            <input
              type="text"
              placeholder="z.B. Preparing for a job interview at a tech company"
              value={current.customTopic}
              onChange={(e) => updateSetting('customTopic', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
            />
          </div>
        )}
      </section>

      {/* 4. Korrektur-Verhalten */}
      <section className="space-y-3 bg-slate-900/70 p-5 rounded-2xl border border-slate-800/80">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">
            4
          </span>
          Korrektur-Verhalten der KI
        </h2>
        <p className="text-xs text-slate-400">
          Wie soll die KI reagieren, wenn du während der Fahrt grammatikalische Fehler machst?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            {
              id: 'free' as CorrectionMode,
              title: '1. Freies Gespräch',
              desc: 'Keine Unterbrechung. Korrekturen erst am Ende in der Auswertung.',
              badge: 'Entspannt',
            },
            {
              id: 'gentle' as CorrectionMode,
              title: '2. Sanfte Korrektur',
              desc: 'Die KI wiederholt Fehler beiläufig korrekt im Antwortsatz.',
              badge: 'Empfohlen',
            },
            {
              id: 'strict' as CorrectionMode,
              title: '3. Strikter Lehrer',
              desc: 'Weist sofort freundlich auf Fehler hin mit kurzer deutscher Erklärung.',
              badge: 'Intensiv',
            },
          ].map((mode) => {
            const isSelected = current.correctionMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => updateSetting('correctionMode', mode.id)}
                className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 ring-1 ring-cyan-400 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {mode.badge}
                    </span>
                    {isSelected && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{mode.title}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{mode.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Übersetzungs-Modus */}
      <section className="space-y-3 bg-slate-900/70 p-5 rounded-2xl border border-slate-800/80">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">
            5
          </span>
          <Languages className="w-5 h-5 text-cyan-400" />
          Übersetzungs-Modus
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            {
              id: 'english_only' as TranslationMode,
              title: '100 % Englisch',
              desc: 'Komplett englisches Gespräch für maximale Immersion.',
            },
            {
              id: 'with_translation' as TranslationMode,
              title: 'Englisch + Deutsch',
              desc: 'Die KI liefert bei jeder Aussage auch die deutsche Übersetzung.',
            },
            {
              id: 'on_demand' as TranslationMode,
              title: 'Hilfe auf Abruf',
              desc: 'Übersetzt nur auf Zuruf ("Was heißt das auf Deutsch?").',
            },
          ].map((mode) => {
            const isSelected = current.translationMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => updateSetting('translationMode', mode.id)}
                className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 ring-1 ring-cyan-400 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-white">{mode.title}</h4>
                  {isSelected && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Stimme & Sprechtempo */}
      <section className="space-y-4 bg-slate-900/70 p-5 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">
              6
            </span>
            <Volume2 className="w-5 h-5 text-cyan-400" />
            Stimme & Sprechtempo
          </h2>

          <button
            onClick={handleTestVoice}
            disabled={isPlayingTestVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 transition cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${isPlayingTestVoice ? 'animate-pulse' : ''}`} />
            <span>{isPlayingTestVoice ? 'Spielt...' : 'Probe hören'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Voice selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">Englische Systemstimme:</label>
            <select
              value={current.voiceURI || ''}
              onChange={(e) => updateSetting('voiceURI', e.target.value || null)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Standard (System Voice)</option>
              {availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speed slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-300">Grund-Sprechgeschwindigkeit:</label>
              <span className="font-mono font-bold text-cyan-400">{current.speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={current.speechRate}
              onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.7x (Ruhig)</span>
              <span>1.0x (Normal)</span>
              <span>1.3x (Zügig)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Button at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent backdrop-blur-md z-30">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onStartDrive}
            className="w-full h-20 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-xl flex items-center justify-center gap-4 shadow-2xl shadow-cyan-500/40 active:scale-[0.98] transition cursor-pointer"
          >
            <Car className="w-8 h-8 fill-current" />
            <div className="text-left">
              <div className="leading-tight">Fahrt & Car-Mode starten</div>
              <div className="text-xs font-semibold text-slate-900/80">
                Level {current.level} • {current.durationMinutes} Min • Freihändig
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
