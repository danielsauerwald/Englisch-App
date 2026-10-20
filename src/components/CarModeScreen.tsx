import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Gauge,
  RotateCcw,
  Languages,
  Shuffle,
  Flag,
  Clock,
  Sparkles,
  Radio,
  Eye,
  ChevronDown,
} from 'lucide-react';
import {
  UserSettings,
  ConversationMessage,
} from '../types/index.ts';
import { speechService, VoiceCommandType } from '../services/speechService.ts';
import { wakeLockService } from '../services/wakeLockService.ts';

interface CarModeScreenProps {
  settings: UserSettings;
  onFinishSession: (messages: ConversationMessage[], durationMinutes: number) => void;
  onExitWithoutSave: () => void;
}

export const CarModeScreen: React.FC<CarModeScreenProps> = ({
  settings,
  onFinishSession,
  onExitWithoutSave,
}) => {
  // Session State
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastUserSpeech, setLastUserSpeech] = useState('');
  const [lastAiResponse, setLastAiResponse] = useState<{
    english: string;
    german?: string;
  }>({
    english: 'Starting conversation...',
  });

  // Voice Rate Control (modifiable via speech or buttons)
  const [currentSpeed, setCurrentSpeed] = useState<number>(settings.speechRate);
  const [statusMessage, setStatusMessage] = useState<string>('Verbindung wird aufgebaut...');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  // Drive Timer
  const totalSeconds = settings.durationMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const timerRef = useRef<any>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const hasTriggeredEndRef = useRef<boolean>(false);

  // Keep a ref to messages for handlers
  const messagesRef = useRef<ConversationMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Current settings ref
  const currentSpeedRef = useRef<number>(currentSpeed);
  useEffect(() => {
    currentSpeedRef.current = currentSpeed;
  }, [currentSpeed]);

  // Wake Lock Setup
  useEffect(() => {
    wakeLockService.acquire();
    return () => {
      wakeLockService.release();
      speechService.cancelSpeech();
      speechService.stopListening();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!hasTriggeredEndRef.current) {
            hasTriggeredEndRef.current = true;
            handleWrapUpAndFinish();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Speak AI response with current speed & voice
  const speakAiText = useCallback(
    (english: string, germanTranslation?: string, onComplete?: () => void) => {
      setIsAiSpeaking(true);
      setStatusMessage('KI spricht...');

      speechService.speak(english, {
        voiceURI: settings.voiceURI,
        rate: currentSpeedRef.current,
        onStart: () => {
          setIsAiSpeaking(true);
          setIsListening(false);
        },
        onEnd: () => {
          setIsAiSpeaking(false);
          // If translation mode is 'with_translation', should we speak the German sentence or just display it?
          // We display it prominently. Speaking both continuously in the car can feel cluttered, but if desired or on demand we can speak it!
          setStatusMessage('Höre zu...');
          if (!isUserPaused) {
            speechService.startListening();
          }
          onComplete?.();
        },
        onError: () => {
          setIsAiSpeaking(false);
          setStatusMessage('Höre zu...');
          if (!isUserPaused) {
            speechService.startListening();
          }
          onComplete?.();
        },
      });
    },
    [settings.voiceURI, isUserPaused]
  );

  // Send message to backend Gemini API
  const sendToGemini = useCallback(
    async (
      userText?: string,
      overrideTopicMode?: string,
      isInitialGreeting = false
    ) => {
      if (isAiThinking) return;

      setIsAiThinking(true);
      speechService.playThinkingChime();
      setStatusMessage('KI denkt nach...');
      speechService.stopListening();

      let currentHistory = messagesRef.current;
      if (userText) {
        const userMsg: ConversationMessage = {
          id: `msg-${Date.now()}-user`,
          role: 'user',
          content: userText,
          timestamp: Date.now(),
        };
        currentHistory = [...currentHistory, userMsg];
        setMessages(currentHistory);
      }

      const minutesLeft = Math.ceil(secondsRemaining / 60);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentHistory.map((m) => ({ role: m.role, content: m.content })),
            level: settings.level,
            topicMode: overrideTopicMode || settings.topicMode,
            customTopic: settings.customTopic,
            correctionMode: settings.correctionMode,
            translationMode: settings.translationMode,
            timeRemainingMinutes: minutesLeft,
            currentSpeed: currentSpeedRef.current,
            isInitial: isInitialGreeting,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.status}`);
        }

        const data = await response.json();
        const assistantText = data.englishText || 'I see. Please tell me more about your thoughts!';
        const germanText = data.germanTranslation || undefined;

        const assistantMsg: ConversationMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: assistantText,
          translation: germanText,
          correctionFeedback: data.correctionFeedback || undefined,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setLastAiResponse({ english: assistantText, german: germanText });
        setIsAiThinking(false);

        // Speak the English answer
        speakAiText(assistantText, germanText);
      } catch (err) {
        console.error('Error contacting Gemini backend:', err);
        setIsAiThinking(false);
        const fallbackText =
          'I am listening. That is an interesting point. Could you tell me more?';
        setLastAiResponse({ english: fallbackText });
        speakAiText(fallbackText);
      }
    },
    [isAiThinking, secondsRemaining, settings, speakAiText]
  );

  // Execute Voice Command
  const handleVoiceCommand = useCallback(
    (command: VoiceCommandType) => {
      speechService.playCommandChime();

      if (command === 'slower') {
        const newSpeed = Math.max(0.6, Number((currentSpeedRef.current - 0.15).toFixed(2)));
        setCurrentSpeed(newSpeed);
        currentSpeedRef.current = newSpeed;
        setCommandFeedback(`Sprechtempo reduziert (${newSpeed}x)`);
        speechService.speak('Sure, speaking a bit slower now.', {
          voiceURI: settings.voiceURI,
          rate: newSpeed,
        });
        setTimeout(() => setCommandFeedback(null), 3500);
      } else if (command === 'faster') {
        const newSpeed = Math.min(1.4, Number((currentSpeedRef.current + 0.15).toFixed(2)));
        setCurrentSpeed(newSpeed);
        currentSpeedRef.current = newSpeed;
        setCommandFeedback(`Sprechtempo erhöht (${newSpeed}x)`);
        speechService.speak('Got it, speeding up a bit!', {
          voiceURI: settings.voiceURI,
          rate: newSpeed,
        });
        setTimeout(() => setCommandFeedback(null), 3500);
      } else if (command === 'repeat') {
        setCommandFeedback('Wiederhole letzte Aussage');
        if (lastAiResponse.english) {
          speakAiText(lastAiResponse.english, lastAiResponse.german);
        }
        setTimeout(() => setCommandFeedback(null), 3500);
      } else if (command === 'translate') {
        setCommandFeedback('Deutsche Übersetzung');
        if (lastAiResponse.german) {
          speechService.speak(lastAiResponse.german, {
            lang: 'de-DE',
            rate: 1.0,
          });
        } else {
          // If no pre-calculated German translation, request translation directly
          sendToGemini('Please translate your last statement into German.');
        }
        setTimeout(() => setCommandFeedback(null), 4000);
      } else if (command === 'new_topic') {
        setCommandFeedback('Themenwechsel...');
        sendToGemini('Let\'s switch to a completely new, exciting topic!', 'random');
        setTimeout(() => setCommandFeedback(null), 3500);
      } else if (command === 'finish') {
        setCommandFeedback('Fahrt wird beendet...');
        handleWrapUpAndFinish();
      }
    },
    [lastAiResponse, sendToGemini, settings.voiceURI, speakAiText]
  );

  // Final Speech Transcript handler
  const handleFinalSpeech = useCallback(
    (transcript: string) => {
      if (!transcript || transcript.trim().length === 0) return;
      setLastUserSpeech(transcript);
      setInterimTranscript('');

      // Check for voice commands first
      const detected = speechService.detectVoiceCommand(transcript);
      if (detected) {
        handleVoiceCommand(detected.command);
        return;
      }

      // Normal conversation turn: forward to Gemini
      sendToGemini(transcript);
    },
    [handleVoiceCommand, sendToGemini]
  );

  // Initialize Speech Recognition on Mount
  useEffect(() => {
    speechService.initRecognition({
      onInterim: (text) => setInterimTranscript(text),
      onFinal: (text) => handleFinalSpeech(text),
      onStateChange: (listening) => {
        setIsListening(listening);
        if (listening) {
          setStatusMessage('Höre zu (Du kannst sprechen)...');
        }
      },
      onError: (err) => {
        console.warn('Recognition error:', err);
      },
    });

    // Start with warm AI opening greeting
    const timer = setTimeout(() => {
      sendToGemini(undefined, undefined, true);
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Wrap up & finish
  const handleWrapUpAndFinish = () => {
    speechService.cancelSpeech();
    speechService.stopListening();
    const elapsedMinutes = Math.max(
      1,
      Math.round((Date.now() - sessionStartTimeRef.current) / 60000)
    );
    onFinishSession(messagesRef.current, elapsedMinutes);
  };

  // Toggle Pause Mic
  const handleTogglePause = () => {
    if (isUserPaused) {
      setIsUserPaused(false);
      setStatusMessage('Höre zu...');
      speechService.startListening();
    } else {
      setIsUserPaused(true);
      setStatusMessage('Mikrofon pausiert');
      speechService.cancelSpeech();
      speechService.stopListening();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 select-none overflow-hidden relative">
      {/* Background ambient dashboard glow */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isListening
            ? 'bg-radial-[at_50%_40%] from-cyan-950/40 via-transparent to-transparent'
            : isAiSpeaking
            ? 'bg-radial-[at_50%_40%] from-purple-950/40 via-transparent to-transparent'
            : isAiThinking
            ? 'bg-radial-[at_50%_40%] from-amber-950/40 via-transparent to-transparent'
            : 'bg-transparent'
        }`}
      />

      {/* 1. TOP CAR DASHBOARD BAR (Extra high contrast) */}
      <div className="z-20 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl">
        {/* Left: Level & Topic Badges */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-sm tracking-wide">
            {settings.level}
          </span>
          <span className="hidden xs:inline-block px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 capitalize">
            {settings.topicMode === 'news'
              ? '🌐 News'
              : settings.topicMode === 'business'
              ? '📈 Business'
              : settings.topicMode === 'society'
              ? '☕ Alltag'
              : settings.topicMode === 'custom'
              ? '✍️ Thema'
              : '🎲 Zufall'}
          </span>
          <span className="px-2 py-1 rounded-xl bg-slate-800 text-cyan-400 font-mono text-xs border border-slate-700">
            {currentSpeed.toFixed(1)}x
          </span>
        </div>

        {/* Center: Drive Countdown Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl font-mono font-black text-xl sm:text-2xl tracking-wider transition ${
              secondsRemaining <= 120
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                : 'bg-slate-950 text-cyan-300 border border-cyan-500/30 shadow-inner'
            }`}
          >
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>
        </div>

        {/* Right: WakeLock & Exit */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
            title="Screen Wake Lock ist aktiv – Display bleibt an"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="hidden sm:inline">Display Aktiv</span>
          </div>

          <button
            onClick={onExitWithoutSave}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title="Zurück zum Setup"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Voice Command Toast notification */}
      {commandFeedback && (
        <div className="z-30 absolute top-20 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full bg-cyan-500 text-slate-950 font-extrabold text-sm shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{commandFeedback}</span>
        </div>
      )}

      {/* 2. CENTER STAGE: AUDIO LOOP & SUBTITLES */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center py-4 px-2 max-w-2xl mx-auto w-full text-center">
        {/* Pulsating Visual Soundwave / Radar Ring Indicator */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer glowing animated pulse rings */}
          {isListening && !isUserPaused && (
            <>
              <div className="absolute w-44 h-44 rounded-full bg-cyan-500/20 animate-ping opacity-75" />
              <div className="absolute w-56 h-56 rounded-full bg-cyan-400/10 animate-pulse" />
            </>
          )}

          {isAiSpeaking && (
            <>
              <div className="absolute w-44 h-44 rounded-full bg-purple-500/20 animate-ping opacity-60" />
              <div className="absolute w-56 h-56 rounded-full bg-indigo-500/10 animate-pulse" />
            </>
          )}

          {/* Central status orb */}
          <div
            className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition duration-500 border-4 ${
              isUserPaused
                ? 'bg-slate-900 border-amber-500/50 text-amber-400 shadow-amber-500/20'
                : isAiSpeaking
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 border-purple-300 text-white shadow-purple-500/40 scale-105'
                : isAiThinking
                ? 'bg-slate-900 border-amber-400 text-amber-400 animate-pulse shadow-amber-500/30'
                : isListening
                ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 border-cyan-200 text-slate-950 shadow-cyan-500/50 scale-110'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {isUserPaused ? (
              <>
                <MicOff className="w-10 h-10" />
                <span className="text-[10px] font-black uppercase tracking-wider mt-1">Pausiert</span>
              </>
            ) : isAiSpeaking ? (
              <>
                <Volume2 className="w-10 h-10 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider mt-1">KI spricht</span>
              </>
            ) : isAiThinking ? (
              <>
                <Sparkles className="w-10 h-10 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-wider mt-1">Überlegt...</span>
              </>
            ) : isListening ? (
              <>
                <Mic className="w-10 h-10 animate-bounce" />
                <span className="text-[10px] font-black uppercase tracking-wider mt-1">Höre zu</span>
              </>
            ) : (
              <>
                <Radio className="w-10 h-10" />
                <span className="text-[10px] font-black uppercase tracking-wider mt-1">Bereit</span>
              </>
            )}
          </div>
        </div>

        {/* Spoken Status Text */}
        <div className="mb-4">
          <span
            className={`inline-block text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full ${
              isUserPaused
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : isAiSpeaking
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : isAiThinking
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : isListening
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {statusMessage}
          </span>
        </div>

        {/* Large Subtitle Card (Read out of eye corner) */}
        <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md">
          {/* Spoken English Utterance (Big, crisp, high contrast) */}
          <div className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed tracking-tight">
            {lastAiResponse.english}
          </div>

          {/* German Translation (if enabled) */}
          {lastAiResponse.german && settings.translationMode !== 'english_only' && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-sm sm:text-base font-medium text-cyan-300/90 flex items-start justify-center gap-2">
              <Languages className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
              <span>{lastAiResponse.german}</span>
            </div>
          )}

          {/* Live User Speech Bubble / Interim */}
          {(interimTranscript || lastUserSpeech) && (
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs sm:text-sm text-slate-400 flex items-center justify-center gap-2">
              <span className="text-cyan-400 font-bold">Du:</span>
              <span className="italic text-slate-200">
                "{interimTranscript || lastUserSpeech}"
              </span>
            </div>
          )}
        </div>

        {/* Spoken Command Reminders Pill */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <span className="text-slate-400">Sprachbefehle:</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-300">
            "Langsamer"
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-300">
            "Schneller"
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-300">
            "Wiederholen"
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-300">
            "Übersetzen"
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-300">
            "Neues Thema"
          </span>
        </div>
      </div>

      {/* 3. BOTTOM CAR COCKPIT CONTROLS (Extra-Large thumb-friendly buttons 64px - 84px) */}
      <div className="z-20 max-w-2xl mx-auto w-full space-y-3 pb-2">
        {/* Giant Pause / Resume Button in Center (Height 76px) */}
        <button
          onClick={handleTogglePause}
          className={`w-full h-20 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition active:scale-[0.98] cursor-pointer ${
            isUserPaused
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-emerald-500/30'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-amber-500/30'
          }`}
        >
          {isUserPaused ? (
            <>
              <Mic className="w-8 h-8" />
              <span>Mikrofon FORTSETZEN</span>
            </>
          ) : (
            <>
              <MicOff className="w-8 h-8" />
              <span>Mikrofon PAUSIEREN</span>
            </>
          )}
        </button>

        {/* 4-Grid of Glanceable 1-Click Quick Controls (Height 68px each) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Slower (1-Click) */}
          <button
            onClick={() => handleVoiceCommand('slower')}
            className="h-18 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 p-2 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer shadow-lg"
          >
            <Gauge className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-bold text-white leading-tight">Langsamer</span>
            <span className="text-[10px] text-slate-400">-0.15x Tempo</span>
          </button>

          {/* Repeat (1-Click) */}
          <button
            onClick={() => handleVoiceCommand('repeat')}
            className="h-18 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 p-2 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-bold text-white leading-tight">Wiederholen</span>
            <span className="text-[10px] text-slate-400">Noch mal sagen</span>
          </button>

          {/* Translate (1-Click) */}
          <button
            onClick={() => handleVoiceCommand('translate')}
            className="h-18 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 p-2 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer shadow-lg"
          >
            <Languages className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-bold text-white leading-tight">Übersetzen</span>
            <span className="text-[10px] text-slate-400">Auf Deutsch</span>
          </button>

          {/* New Topic (1-Click) */}
          <button
            onClick={() => handleVoiceCommand('new_topic')}
            className="h-18 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 p-2 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer shadow-lg"
          >
            <Shuffle className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-bold text-white leading-tight">Thema wechseln</span>
            <span className="text-[10px] text-slate-400">Neuer Impuls</span>
          </button>
        </div>

        {/* 1-Click Finish & Evaluate Button (Height 64px) */}
        <button
          onClick={handleWrapUpAndFinish}
          className="w-full h-16 rounded-2xl bg-slate-900/90 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-rose-300 font-extrabold text-base flex items-center justify-center gap-2.5 transition active:scale-[0.99] cursor-pointer"
        >
          <Flag className="w-5 h-5 text-rose-400" />
          <span>Fahrt beenden & Auswertung erstellen</span>
        </button>
      </div>
    </div>
  );
};
