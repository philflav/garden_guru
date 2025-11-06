import React, { useState, useEffect, useRef, FormEvent } from 'react';
import type { Chat } from '@google/genai';
import { getChatSession } from '../services/geminiService';
import type { ChatMessage, PlantInfo } from '../types';
import { SendIcon, UserIcon, BotIcon } from './icons';

const ContentRenderer: React.FC<{ content: string }> = ({ content }) => {
  const processLine = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const elements: React.ReactElement[] = [];
  const lines = content.split('\n');
  let currentListItems: React.ReactElement[] = [];

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 pl-4">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={index} className="font-bold text-gray-800 mt-2 mb-1">
          {processLine(trimmedLine.substring(4))}
        </h4>
      );
    } else if (trimmedLine.startsWith('* ')) {
      currentListItems.push(
        <li key={index}>
          {processLine(trimmedLine.substring(2))}
        </li>
      );
    } else if (trimmedLine === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={index} className="my-1">
          {processLine(line)}
        </p>
      );
    }
  });

  flushList();

  return (
    <div className="font-sans text-sm leading-relaxed">
      {elements}
    </div>
  );
};

interface GardeningChatProps {
  chatContextPlant: PlantInfo | null;
}

const GardeningChat: React.FC<GardeningChatProps> = ({ chatContextPlant }) => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = () => {
      let systemInstruction: string | undefined = undefined;
      let welcomeMessage = "Hello! I'm Garden Guru, your AI gardening assistant based in the UK. Ask me anything about plants!";

      if (chatContextPlant) {
        systemInstruction = `You are Garden Guru, a friendly and knowledgeable gardening assistant based in the UK. All your advice, units of measurement (e.g., litres, meters), currency (£), and product recommendations must be UK-specific. The user is currently interested in the ${chatContextPlant.plantName} (${chatContextPlant.scientificName}). Prioritize answering questions about this plant, but also answer general gardening questions. Use Markdown for formatting.`;
        welcomeMessage = `I see you're looking at the ${chatContextPlant.plantName}. What would you like to know about it?`;
      }

      const session = getChatSession(systemInstruction);
      setChat(session);
      setMessages([{ role: 'model', content: welcomeMessage }]);
    };
    initChat();
  }, [chatContextPlant]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chat || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const stream = await chat.sendMessageStream({ message: input });
      
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = modelResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-base-100 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col" style={{ height: '70vh' }}>
      <h2 className="text-2xl font-bold text-center text-gray-700 mb-4">Gardening Chat</h2>
      <div className="flex-grow overflow-y-auto pr-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <BotIcon className="w-5 h-5 text-primary-content" />
              </div>
            )}
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-content rounded-br-none'
                  : 'bg-base-200 text-gray-800 rounded-bl-none'
              }`}
            >
              {msg.role === 'model' 
                ? <ContentRenderer content={msg.content} />
                : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              }
            </div>
             {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <BotIcon className="w-5 h-5 text-primary-content" />
                </div>
                <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-base-200 text-gray-800 rounded-bl-none">
                    <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-primary rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your plant..."
          className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:outline-none transition bg-white text-gray-800 placeholder-gray-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 bg-primary text-primary-content rounded-full hover:bg-primary-focus disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform transform hover:scale-110"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default GardeningChat;