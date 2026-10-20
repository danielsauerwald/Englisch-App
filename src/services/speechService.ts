// Web Speech API interface definitions for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type VoiceCommandType =
  | 'slower'
  | 'faster'
  | 'repeat'
  | 'translate'
  | 'new_topic'
  | 'finish';

export interface VoiceCommandDetection {
  command: VoiceCommandType;
  matchedPhrase: string;
  cleanTranscript: string;
}

class SpeechService {
  private recognition: any = null;
  private isRecognitionActive: boolean = false;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isIntentionalAbort: boolean = false;
  private autoListenEnabled: boolean = true;
  private restartTimeout: any = null;

  public isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public setAutoListen(enabled: boolean) {
    this.autoListenEnabled = enabled;
  }

  public async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isSpeechSynthesisSupported()) return [];

    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
      setTimeout(() => {
        resolve(window.speechSynthesis.getVoices());
      }, 500);
    });
  }

  public getEnglishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
    return voices.filter(
      (v) =>
        v.lang === 'en-US' ||
        v.lang === 'en-GB' ||
        v.lang.startsWith('en_US') ||
        v.lang.startsWith('en_GB') ||
        v.lang.startsWith('en')
    );
  }

  public detectVoiceCommand(transcript: string): VoiceCommandDetection | null {
    const text = transcript.toLowerCase().trim();

    // Slower
    const slowerMatch = /(sprich\s+langsamer|langsamer\s+bitte|langsamer|speak\s+slower|slow\s+down|a\s+bit\s+slower)/i;
    if (slowerMatch.test(text)) {
      return {
        command: 'slower',
        matchedPhrase: text.match(slowerMatch)![0],
        cleanTranscript: text.replace(slowerMatch, '').trim(),
      };
    }

    // Faster
    const fasterMatch = /(sprich\s+schneller|schneller\s+bitte|schneller|speak\s+faster|speed\s+up|a\s+bit\s+faster)/i;
    if (fasterMatch.test(text)) {
      return {
        command: 'faster',
        matchedPhrase: text.match(fasterMatch)![0],
        cleanTranscript: text.replace(fasterMatch, '').trim(),
      };
    }

    // Repeat
    const repeatMatch = /(wiederhole\s+das|wiederholen|noch\s+einmal|sag\s+das\s+nochmal|repeat\s+that|say\s+again|repeat\s+please|one\s+more\s+time)/i;
    if (repeatMatch.test(text)) {
      return {
        command: 'repeat',
        matchedPhrase: text.match(repeatMatch)![0],
        cleanTranscript: text.replace(repeatMatch, '').trim(),
      };
    }

    // Translate
    const translateMatch = /(übersetze\s+das|was\s+heißt\s+das|auf\s+deutsch|translate\s+to\s+german|translate\s+that|translate\s+please)/i;
    if (translateMatch.test(text)) {
      return {
        command: 'translate',
        matchedPhrase: text.match(translateMatch)![0],
        cleanTranscript: text.replace(translateMatch, '').trim(),
      };
    }

    // Change topic
    const topicMatch = /(neues\s+thema|thema\s+wechseln|anderes\s+thema|change\s+topic|switch\s+topic|next\s+topic)/i;
    if (topicMatch.test(text)) {
      return {
        command: 'new_topic',
        matchedPhrase: text.match(topicMatch)![0],
        cleanTranscript: text.replace(topicMatch, '').trim(),
      };
    }

    // Finish session
    const finishMatch = /(fahrt\s+beenden|gespräch\s+beenden|training\s+beenden|stop\s+training|finish\s+session|end\s+conversation)/i;
    if (finishMatch.test(text)) {
      return {
        command: 'finish',
        matchedPhrase: text.match(finishMatch)![0],
        cleanTranscript: text.replace(finishMatch, '').trim(),
      };
    }

    return null;
  }

  public initRecognition(callbacks: {
    onInterim: (text: string) => void;
    onFinal: (text: string) => void;
    onStateChange: (isListening: boolean) => void;
    onError: (error: string) => void;
  }) {
    if (!this.isSpeechRecognitionSupported()) {
      callbacks.onError('Web SpeechRecognition wird von diesem Browser leider nicht unterstützt.');
      return;
    }

    const SpeechRecClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isRecognitionActive = true;
      this.isIntentionalAbort = false;
      callbacks.onStateChange(true);
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        callbacks.onInterim(interim);
      }
      if (final) {
        callbacks.onFinal(final.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      if (this.isIntentionalAbort || event.error === 'aborted') {
        return;
      }
      if (event.error === 'no-speech') {
        return;
      }
      console.warn('Speech recognition event error:', event.error);
      callbacks.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isRecognitionActive = false;
      callbacks.onStateChange(false);
    };
  }

  public startListening(): void {
    if (this.isSpeaking) {
      // NEVER start mic while speaker is active
      return;
    }
    if (this.recognition && !this.isRecognitionActive) {
      try {
        this.isIntentionalAbort = false;
        this.recognition.start();
      } catch (e) {
        // Recognition might already be running or transitioning
      }
    }
  }

  // Strict separation: Abort mic capture immediately before audio output
  public abortListening(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition && this.isRecognitionActive) {
      this.isIntentionalAbort = true;
      try {
        this.recognition.abort();
      } catch (e) {
        try {
          this.recognition.stop();
        } catch (stopErr) {
          // Ignore
        }
      }
      this.isRecognitionActive = false;
    }
  }

  public stopListening(): void {
    this.abortListening();
  }

  public cancelSpeech(): void {
    if (this.isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  public speak(
    text: string,
    options: {
      voiceURI?: string | null;
      rate?: number;
      lang?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): void {
    if (!this.isSpeechSynthesisSupported()) {
      options.onEnd?.();
      return;
    }

    // 1. Zwingende Mikrofon- und Lautsprecher-Trennung:
    // Stoppe / breche das Mikrofon SOFORT ab, BEVOR die Sprachausgabe startet
    this.abortListening();

    // 2. Vor jedem neuen Sprechen muss window.speechSynthesis.cancel() aufgerufen werden
    this.cancelSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    const rate = options.rate ?? 1.0;
    utterance.rate = Math.max(0.6, Math.min(1.4, rate));
    utterance.pitch = 1.0;
    utterance.lang = options.lang || 'en-US';

    const voices = window.speechSynthesis.getVoices();
    if (options.voiceURI) {
      const selected = voices.find((v) => v.voiceURI === options.voiceURI);
      if (selected) {
        utterance.voice = selected;
      }
    } else {
      // Pick clean installed native English voices (en-US or en-GB)
      const enVoice =
        voices.find((v) => (v.lang === 'en-US' || v.lang === 'en-GB') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Siri'))) ||
        voices.find((v) => v.lang === 'en-US' || v.lang === 'en-GB') ||
        voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) {
        utterance.voice = enVoice;
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      // Re-verify mic is off
      this.abortListening();
      options.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      options.onEnd?.();

      // 400ms Verzögerung vor dem Neustart des Mikrofons
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
      }
      this.restartTimeout = setTimeout(() => {
        if (!this.isSpeaking && this.autoListenEnabled) {
          this.startListening();
        }
      }, 400);
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      console.warn('Speech synthesis error:', e);
      options.onError?.(e);

      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
      }
      this.restartTimeout = setTimeout(() => {
        if (!this.isSpeaking && this.autoListenEnabled) {
          this.startListening();
        }
      }, 400);
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const speechService = new SpeechService();
