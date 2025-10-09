import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

interface VoiceContextType {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
  confidence: number;
  speak: (text: string) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const result = event.results[0];
        const spokenText = result[0].transcript.toLowerCase();
        const confidence = result[0].confidence;
        
        setTranscript(spokenText);
        setConfidence(confidence);
        
        handleVoiceCommand(spokenText);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        speak('Sorry, I could not understand that. Please try again.');
        toast.error('Voice recognition failed');
      };

      setRecognition(recognitionInstance);
    }

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      setSynthesis(window.speechSynthesis);
    }
  }, []);

  const speak = (text: string) => {
    if (synthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      synthesis.speak(utterance);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 17) return 'Good afternoon!';
    return 'Good evening!';
  };

  const handleVoiceCommand = async (command: string) => {
    console.log('Voice command received:', command);

    // Greeting on first interaction
    if (!hasGreeted) {
      speak(`${getGreeting()} Welcome to FinTracker. How can I help you today?`);
      setHasGreeted(true);
    }

    // Navigation commands
    if (command.includes('go to dashboard') || command.includes('open dashboard') || command.includes('show dashboard')) {
      navigate('/dashboard');
      speak('Opening dashboard for you');
      toast.success('Navigating to dashboard');
    } 
    else if (command.includes('open income') || command.includes('go to income') || command.includes('show income')) {
      navigate('/income');
      speak('Opening income page');
      toast.success('Opening income page');
    } 
    else if (command.includes('open expense') || command.includes('show expense') || command.includes('go to expense')) {
      navigate('/expenses');
      speak('Opening expenses page');
      toast.success('Opening expenses page');
    } 
    else if (command.includes('show history') || command.includes('transaction history') || command.includes('open history')) {
      navigate('/history');
      speak('Opening transaction history');
      toast.success('Opening transaction history');
    } 
    else if (command.includes('open budget') || command.includes('show budget') || command.includes('go to budget')) {
      navigate('/budget');
      speak('Opening budget page');
      toast.success('Opening budget page');
    }
    else if (command.includes('open report') || command.includes('show report') || command.includes('go to report')) {
      navigate('/reports');
      speak('Opening reports page');
      toast.success('Opening reports page');
    }
    else if (command.includes('open categories') || command.includes('show categories')) {
      navigate('/categories');
      speak('Opening categories page');
      toast.success('Opening categories page');
    }
    else if (command.includes('open profile') || command.includes('show profile')) {
      navigate('/profile');
      speak('Opening profile page');
      toast.success('Opening profile page');
    }
    else if (command.includes('log out') || command.includes('logout')) {
      speak('Logging you out. Goodbye!');
      toast.success('Logging out...');
      // Handle logout logic here
    } 
    // Transaction commands
    else if (command.includes('add income') || command.includes('add expense')) {
      await handleTransactionCommand(command);
    }
    // Help commands
    else if (command.includes('help') || command.includes('what can you do')) {
      const helpText = 'I can help you navigate pages, add income and expenses. Try saying: Go to dashboard, Add income of 500, or Add expense of 200.';
      speak(helpText);
      toast.success('Voice commands available');
    }
    else {
      const errorText = 'I did not understand that command. Try saying: Go to dashboard, Add income of 500, or say help for more options.';
      speak(errorText);
      toast.error('Command not recognized');
    }
  };

  const handleTransactionCommand = async (command: string) => {
    try {
      const isIncome = command.includes('add income');
      const endpoint = isIncome ? 'income' : 'expenses';
      
      // Extract amount using regex
      const amountMatch = command.match(/(\d+(?:\.\d+)?)/);
      if (!amountMatch) {
        speak('I could not find an amount in your command. Please specify an amount.');
        toast.error('Could not extract amount from command');
        return;
      }
      
      const amount = parseFloat(amountMatch[0]);
      
      // Extract description (everything after "from" or "for")
      const descriptionMatch = command.match(/(from|for)\s+(.+)/);
      const description = descriptionMatch ? descriptionMatch[2].trim() : `Voice ${isIncome ? 'income' : 'expense'} entry`;
      
      const transactionData = {
        description,
        amount,
        category: isIncome ? 'Other Income' : 'Other Expense',
        date: new Date().toISOString().split('T')[0],
      };
      
      speak(`Adding ${isIncome ? 'income' : 'expense'} of ${amount} rupees. Please wait.`);
      
      const response = await axios.post(`/api/${endpoint}`, transactionData);
      
      if (response.status === 201) {
        const type = isIncome ? 'income' : 'expense';
        const successMessage = `Successfully added ${type} of ${amount} rupees to your account.`;
        speak(successMessage);
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} of ₹${amount} added successfully!`);
        
        // Navigate to the respective page to show the new entry
        if (isIncome) {
          navigate('/income');
        } else {
          navigate('/expenses');
        }
      }
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add transaction';
      speak('Sorry, I could not add that transaction. Please try again.');
      toast.error(errorMessage);
      console.error('Transaction error:', error);
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      setIsListening(true);
      setTranscript('');
      recognition.start();
      
      if (!hasGreeted) {
        speak(`${getGreeting()} I'm listening. How can I help you?`);
        setHasGreeted(true);
      } else {
        speak('I\'m listening. What would you like to do?');
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      speak('Stopped listening.');
    }
  };

  const value = {
    isListening,
    startListening,
    stopListening,
    transcript,
    confidence,
    speak,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};