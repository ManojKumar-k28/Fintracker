import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

export type VoiceStatus = 'ready' | 'listening' | 'processing' | 'responding';
export type VoiceGender = 'auto' | 'female' | 'male';

interface VoiceContextType {
  isListening: boolean;
  status: VoiceStatus;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
  confidence: number;
  speak: (text: string) => void;
  voiceGender: VoiceGender;
  setVoiceGender: (g: VoiceGender) => void;
}

// Optional: set your API base if not on same origin
// axios.defaults.baseURL = import.meta.env.VITE_API_BASE;
axios.defaults.withCredentials = true;

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const FEMALE_NAME_HINTS = [
  'female','samantha','victoria','karen','tessa','serena','moira',
  'zira','aria','jenny','joanna','salli','ivy','kimberly','kendra',
  'olivia','emma','susan','allison','ava','natasha'
];

const MALE_NAME_HINTS = [
  'male','daniel','alex','fred','arthur','oliver','brian','justin',
  'joey','matthew','guy','eric','adam','chris','george','david','michael'
];

function chooseVoiceByGender(voices: SpeechSynthesisVoice[], gender: VoiceGender, preferredLang = 'en') {
  const stored = localStorage.getItem('preferredVoiceName');
  if (stored) {
    const exact = voices.find(v => v.name === stored);
    if (exact) return exact;
  }
  const byLang = voices.filter(v => v.lang?.toLowerCase().startsWith(preferredLang));
  const matchHints = (list: SpeechSynthesisVoice[], hints: string[]) =>
    list.find(v => hints.some(h => v.name.toLowerCase().includes(h)));

  if (gender === 'female') {
    return matchHints(byLang, FEMALE_NAME_HINTS) || matchHints(voices, FEMALE_NAME_HINTS) || byLang[0] || voices[0];
  }
  if (gender === 'male') {
    return matchHints(byLang, MALE_NAME_HINTS) || matchHints(voices, MALE_NAME_HINTS) || byLang[0] || voices[0];
  }
  return byLang[0] || voices[0];
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const useVoice = () => {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within a VoiceProvider');
  return ctx;
};

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('ready');
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [recognition, setRecognition] = useState<any>(null);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);

  const [voiceGender, setVoiceGender] = useState<VoiceGender>(
    () => (localStorage.getItem('preferredVoiceGender') as VoiceGender) || 'female'
  );

  const navigate = useNavigate();
  const micWarmedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Super-fast earcons (beeps) instead of TTS cues
  const ensureAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const beep = (freq = 1100, durationMs = 70, volume = 0.03) => {
    try {
      const ctx = ensureAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, durationMs);
    } catch {}
  };

  const doubleBeep = () => {
    beep(1200, 60, 0.03);
    setTimeout(() => beep(1500, 60, 0.03), 100);
  };

  useEffect(() => {
    localStorage.setItem('preferredVoiceGender', voiceGender);
    if (synthesis) {
      const voices = synthesis.getVoices();
      if (voices && voices.length) {
        setSelectedVoice(chooseVoiceByGender(voices, voiceGender, 'en') || null);
      }
    }
  }, [voiceGender, synthesis]);

  useEffect(() => {
    // Init Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.continuous = false; // one-shot for lowest latency
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setStatus('listening');
        // Safety stop if engine stalls (no result/no end)
        if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = setTimeout(() => {
          // Force-stop to avoid hanging state
          try { rec.abort?.(); } catch {}
          setIsListening(false);
          setStatus('ready');
          toast.error('Listening timeout. Try again.');
        }, 6000);
      };

      rec.onresult = (event: any) => {
        const result = event.results[0];
        const spokenText = result[0].transcript.toLowerCase().trim();
        const conf = result[0].confidence;
        setTranscript(spokenText);
        setConfidence(conf);

        // Stop immediately for fastest turnaround
        try { rec.abort?.(); } catch {}
        try { rec.stop(); } catch {}

        // Process command ASAP
        handleVoiceCommand(spokenText);
      };

      rec.onspeechend = () => {
        // End of speech -> end quickly
        try { rec.stop(); } catch {}
      };

      rec.onend = () => {
        setIsListening(false);
        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current);
          startTimeoutRef.current = null;
        }
        // Don't force ready if we're currently "responding"
        if (status !== 'responding') setStatus('ready');
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setStatus('ready');
        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current);
          startTimeoutRef.current = null;
        }
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            toast.error('Microphone permission blocked. Allow mic in site settings.');
            break;
          case 'no-speech':
            toast.error('No speech detected. Try again.');
            break;
          case 'audio-capture':
            toast.error('No microphone detected.');
            break;
          default:
            toast.error('Voice recognition failed.');
        }
      };

      setRecognition(rec);
    } else {
      toast.error('Voice input not supported. Use Chrome over HTTPS.');
    }

    // Init Speech Synthesis + voice + warm-up
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      setSynthesis(synth);

      const assignVoiceAndWarm = () => {
        const voices = synth.getVoices();
        if (!voices || voices.length === 0) return;
        const voice = chooseVoiceByGender(voices, voiceGender, 'en');
        setSelectedVoice(voice || null);
        // warm-up removes first-time TTS lag
        const u = new SpeechSynthesisUtterance(' ');
        if (voice) u.voice = voice;
        u.lang = voice?.lang || 'en-US';
        u.volume = 0;
        try { synth.speak(u); } catch {}
      };

      if (synth.getVoices().length) {
        assignVoiceAndWarm();
      } else {
        synth.addEventListener('voiceschanged', assignVoiceAndWarm, { once: true } as any);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prewarmMic = async () => {
    if (micWarmedRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      micWarmedRef.current = true;
    } catch {
      // ignore
    }
  };

  const speakWithOptions = (
    text: string,
    opts?: { interrupt?: boolean; rate?: number; pitch?: number; volume?: number; onend?: () => void; setResponding?: boolean }
  ) => {
    if (!synthesis) return;
    if (opts?.interrupt && synthesis.speaking) synthesis.cancel();
    if (opts?.setResponding) setStatus('responding');

    const utter = new SpeechSynthesisUtterance(text);
    const defaults = voiceGender === 'male'
      ? { rate: 1.06, pitch: 0.95, volume: 0.95 }
      : { rate: 1.12, pitch: 1.06, volume: 0.95 }; // fast/snappy

    utter.rate = opts?.rate ?? defaults.rate;
    utter.pitch = opts?.pitch ?? defaults.pitch;
    utter.volume = opts?.volume ?? defaults.volume;

    if (selectedVoice) {
      utter.voice = selectedVoice;
      utter.lang = selectedVoice.lang;
    } else {
      utter.lang = 'en-US';
    }

    if (opts?.onend) utter.onend = opts.onend;
    synthesis.speak(utter);
  };

  const speak = (text: string) => speakWithOptions(text, { interrupt: true });

  const stopRecognitionQuick = () => {
    if (!recognition) return;
    // Update UI immediately (don’t wait for onend)
    setIsListening(false);
    setStatus('ready');
    try { recognition.abort?.(); } catch {}
    try { recognition.stop(); } catch {}
  };

  const navigateInstant = (path: string | number) => {
    navigate(path as any); // instant route change
  };

  // Navigate first, then quick beep (fastest UX)
  const handleNav = (path: string | number, ackText?: string) => {
    stopRecognitionQuick();
    navigateInstant(path);
    // quick ack sound; speaking later if text provided
    setTimeout(() => {
      doubleBeep();
      if (ackText) speakWithOptions(ackText, { interrupt: true });
    }, 20);
  };

  const extractAmount = (command: string): number | null => {
    const digit = command.match(/(\d+(?:\.\d+)?)/);
    if (digit) return parseFloat(digit[0]);

    // words (basic + lakh/crore)
    const words = command.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(Boolean);
    const small: Record<string, number> = {
      zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
      ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19
    };
    const tens: Record<string, number> = {
      twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90
    };
    const scales: Record<string, number> = {
      hundred:100, thousand:1000, lakh:100000, million:1000000, crore:10000000
    };

    let total = 0, current = 0, matched = false;
    for (const w of words) {
      if (small[w] !== undefined) { current += small[w]; matched = true; continue; }
      if (tens[w] !== undefined) { current += tens[w]; matched = true; continue; }
      if (w === 'and' || w === 'rupees' || w === 'rs' || w === 'inr') continue;
      if (scales[w] !== undefined) {
        current = (current || 1) * scales[w];
        total += current;
        current = 0;
        matched = true;
        continue;
      }
    }
    const value = total + current;
    return matched && value > 0 ? value : null;
  };

  const handleTransactionCommand = async (command: string) => {
    let toastId: string | undefined;
    try {
      setStatus('processing');

      const isIncome = command.includes('add income') || command.includes('record income');
      const isExpense = command.includes('add expense') || command.includes('record expense');
      if (!isIncome && !isExpense) {
        beep(400, 80, 0.04);
        speakWithOptions('Please say add income or add expense with the amount.', { interrupt: true });
        setStatus('ready');
        return;
      }

      const endpoint = isIncome ? 'income' : 'expenses';
      const amount = extractAmount(command);
      if (!amount) {
        beep(400, 80, 0.04);
        speakWithOptions('I could not find an amount. Please specify an amount.', { interrupt: true });
        toast.error('Could not extract amount from command');
        setStatus('ready');
        return;
      }

      const descriptionMatch = command.match(/(?:from|for)\s+(.+)/);
      const description = descriptionMatch ? descriptionMatch[1].trim() : `Voice ${isIncome ? 'income' : 'expense'} entry`;

      const transactionData = {
        description,
        amount,
        category: isIncome ? 'Other Income' : 'Other Expense',
        date: new Date().toISOString().split('T')[0],
      };

      const typeLabel = isIncome ? 'income' : 'expense';

      // Instant UX: navigate first + quick ack
      toastId = toast.loading(`Adding ${typeLabel} of ₹${amount}...`);
      stopRecognitionQuick();
      navigateInstant(isIncome ? '/income' : '/expenses');
      setTimeout(() => doubleBeep(), 20);

      // Save in background
      const res = await axios.post(`/api/${endpoint}`, transactionData, { timeout: 7000 });

      if (res.status === 200 || res.status === 201) {
        toast.success(`Added ${typeLabel} of ₹${amount}`, { id: toastId });
        // very short confirmation
        speakWithOptions('Done.', { interrupt: true });
      } else {
        throw new Error('Unexpected response');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to add transaction';
      if (toastId) toast.error(msg, { id: toastId }); else toast.error(msg);
      beep(400, 100, 0.05);
      speakWithOptions('Sorry, that did not save.', { interrupt: true });
      console.error('Transaction error:', error);
    } finally {
      setStatus('ready');
    }
  };

  const handleVoiceCommand = async (command: string) => {
    // NAVIGATION (instant, with quick ack)
    if (command.includes('go to dashboard') || command.includes('open dashboard') || command.includes('show dashboard') || command.includes('home') || command.includes('go home')) {
      return handleNav('/dashboard');
    }
    if (command.includes('open income') || command.includes('go to income') || command.includes('show income')) {
      return handleNav('/income');
    }
    if (
      command.includes('open expense') || command.includes('show expense') || command.includes('go to expense') ||
      command.includes('open expenses') || command.includes('show expenses') || command.includes('go to expenses')
    ) {
      return handleNav('/expenses');
    }
    if (command.includes('show history') || command.includes('transaction history') || command.includes('open history')) {
      return handleNav('/history');
    }
    if (command.includes('open budget') || command.includes('show budget') || command.includes('go to budget')) {
      return handleNav('/budget');
    }
    if (command.includes('open report') || command.includes('show report') || command.includes('go to report') || command.includes('open reports') || command.includes('show reports')) {
      return handleNav('/reports');
    }
    if (command.includes('open categories') || command.includes('show categories')) {
      return handleNav('/categories');
    }
    if (command.includes('open profile') || command.includes('show profile') || command.includes('go to profile') || command.includes('open settings') || command.includes('settings')) {
      return handleNav('/profile');
    }
    if (command.includes('go back') || command.includes('back')) {
      stopRecognitionQuick();
      navigateInstant(-1);
      setTimeout(() => beep(1000, 60, 0.03), 20);
      return;
    }
    if (command.includes('go forward') || command.includes('forward')) {
      stopRecognitionQuick();
      navigateInstant(1);
      setTimeout(() => beep(1000, 60, 0.03), 20);
      return;
    }
    if (command.includes('log out') || command.includes('logout')) {
      doubleBeep();
      speakWithOptions('Logging you out. Goodbye!', { interrupt: true });
      // TODO: add logout logic
      return;
    }

    // TRANSACTIONS
    if (command.includes('add income') || command.includes('add expense') || command.includes('record income') || command.includes('record expense')) {
      await handleTransactionCommand(command);
      return;
    }

    // HELP
    if (command.includes('help') || command.includes('what can you do')) {
      speakWithOptions('Try: "Go to dashboard", "Add income of 500", or "Add expense of 200 for food".', { interrupt: true });
      toast.success('Voice commands available');
      return;
    }

    // FALLBACK
    beep(400, 80, 0.04);
    speakWithOptions('I did not understand that. Try: "Go to dashboard", or say "help".', { interrupt: true });
    toast.error('Command not recognized');
  };

  const startListening = () => {
    if (!window.isSecureContext) {
      toast.error('Voice requires HTTPS or localhost.');
      return;
    }
    if (!recognition) {
      toast.error('Voice input not supported. Use Chrome over HTTPS.');
      return;
    }
    if (isListening) return;

    prewarmMic();
    ensureAudioCtx();
    setTranscript('');
    setStatus('listening');

    // Instant tactile cue; start recognition immediately
  
    try { recognition.start(); } catch {}

    // Optional one-time greeting (does not block recognition)
    if (!hasGreeted) {
      setHasGreeted(true);
      setTimeout(() => {
        speakWithOptions('Welcome to FinTracker.', { interrupt: true });
      }, 150);
    }
  };

  const stopListening = () => {
    stopRecognitionQuick();
    beep(500, 70, 0.03);
  };

  const value: VoiceContextType = {
    isListening,
    status,
    startListening,
    stopListening,
    transcript,
    confidence,
    speak,
    voiceGender,
    setVoiceGender,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};