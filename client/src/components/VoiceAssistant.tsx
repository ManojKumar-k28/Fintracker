import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, Minimize2, MessageCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useVoice } from '../contexts/VoiceContext';

const VoiceAssistant: React.FC = () => {
  const { isListening, startListening, stopListening, transcript, status } = useVoice();
  const [isMinimized, setIsMinimized] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (transcript) {
      setShowTranscript(true);
      const timer = setTimeout(() => {
        setShowTranscript(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [transcript]);

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return 'from-red-500 to-red-600';
      case 'processing': return 'from-amber-500 to-amber-600';
      case 'responding': return 'from-green-500 to-green-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'responding': return 'Responding...';
      default: return 'Ready';
    }
  };

  if (isMinimized) {
    return (
      <div className={`
        fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}
      `}>
        {/* Transcript Bubble for Minimized State */}
        {showTranscript && transcript && (
          <div className="absolute bottom-full right-0 mb-2 max-w-xs animate-fade-in">
            <div className="bg-gray-900 text-white p-2 rounded-lg shadow-lg relative text-xs">
              <div className="text-gray-300 mb-1">You said:</div>
              <div className="font-medium">"{transcript}"</div>
              <div className="absolute bottom-0 right-3 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            </div>
          </div>
        )}
        
        <button
          onClick={() => setIsMinimized(false)}
          className={`
            w-10 h-10 rounded-full shadow-lg flex items-center justify-center 
            transition-all duration-300 transform hover:scale-110 hover:shadow-xl
            bg-gradient-to-r ${getStatusColor()}
            ${status === 'listening' ? 'voice-pulse' : ''}
          `}
          aria-label="Open voice assistant"
        >
          {isListening ? (
            <MicOff className="w-4 h-4 text-white" />
          ) : (
            <Mic className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`
      fixed bottom-4 right-4 z-50 
      transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}
    `}>
      {/* Transcript Bubble */}
      {showTranscript && transcript && (
        <div className="absolute bottom-full right-0 mb-3 max-w-xs animate-fade-in">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-3 rounded-xl shadow-xl relative border border-gray-700">
            <div className="flex items-start gap-2">
              <MessageCircle className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-gray-300 font-medium mb-1">You said:</div>
                <div className="text-sm font-medium text-white">"{transcript}"</div>
              </div>
            </div>
            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800 border-r border-b border-gray-700"></div>
          </div>
        </div>
      )}

      {/* Main Voice Assistant Panel */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-72">
        {/* Compact Header */}
        <div className={`bg-gradient-to-r ${getStatusColor()} p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Volume2 className="w-3 h-3 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Voice Assistant</h3>
                <p className="text-white text-opacity-80 text-xs">{getStatusText()}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="w-6 h-6 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
                aria-label="Toggle help"
              >
                <HelpCircle className="w-3 h-3 text-white" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="w-6 h-6 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
                aria-label="Minimize"
              >
                <Minimize2 className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Microphone Button */}
          <div className="text-center mb-3">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={status === 'processing' || status === 'responding'}
              className={`
                w-12 h-12 rounded-full 
                flex items-center justify-center transition-all duration-300 
                focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg
                relative overflow-hidden mx-auto
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-red-300 voice-listening'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-300 hover:scale-105'
                }
              `}
              aria-label={isListening ? 'Stop listening' : 'Start voice assistant'}
            >
              {isListening && (
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 rounded-full animate-ping opacity-75"></div>
              )}
              <div className="relative z-10">
                {isListening ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-white" />
                )}
              </div>
            </button>
            
            {/* Status Indicator */}
            <div className="mt-2">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shadow-sm ${
                isListening 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : status === 'processing'
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : status === 'responding'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                <div className={`w-1 h-1 rounded-full mr-1.5 ${
                  isListening ? 'bg-red-500 animate-pulse' : 
                  status === 'processing' ? 'bg-amber-500 animate-pulse' :
                  status === 'responding' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                {getStatusText()}
              </div>
            </div>
          </div>

          {/* Commands Help */}
          <div className="mb-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 text-xs font-medium text-gray-700"
            >
              <span>Voice Commands</span>
              {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            {showHelp && (
              <div className="mt-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded-md border border-blue-100">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">"Go to dashboard"</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded-md border border-green-100">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">"Add income of ₹500"</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded-md border border-red-100">
                    <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                    <span className="text-gray-700">"Add expense of ₹200 for food"</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded-md border border-purple-100">
                    <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700">"Show reports"</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Transcript Display */}
          {transcript && (
            <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <MessageCircle className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-blue-800 mb-0.5">Last Command:</div>
                  <div className="text-xs text-blue-700">"{transcript}"</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;