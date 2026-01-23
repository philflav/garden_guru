
import React, { useState, useEffect } from 'react';
import { fetchSeasonalTips } from '../services/geminiService';
import { CalendarIcon, SparklesIcon } from './icons';

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
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-4 pl-4 marker:text-primary">
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
        <h4 key={index} className="text-xl font-bold text-gray-800 mt-6 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
          {processLine(trimmedLine.substring(4))}
        </h4>
      );
    } else if (trimmedLine.startsWith('* ')) {
      currentListItems.push(
        <li key={index} className="text-gray-700 leading-relaxed">
          {processLine(trimmedLine.substring(2))}
        </li>
      );
    } else if (trimmedLine === '') {
      flushList();
    } else {
      flushList();
      if (trimmedLine.length > 0) {
        elements.push(
          <p key={index} className="my-2 text-gray-700">
            {processLine(line)}
          </p>
        );
      }
    }
  });

  flushList();

  return (
    <div className="font-sans">
      {elements}
    </div>
  );
};

const SeasonalTips: React.FC = () => {
  const [tips, setTips] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState('');

  useEffect(() => {
    const date = new Date();
    const month = date.toLocaleString('en-GB', { month: 'long' });
    setCurrentMonth(month);

    const loadTips = async () => {
      setLoading(true);
      try {
        const storedTips = localStorage.getItem(`garden-guru-tips-${month}`);
        if (storedTips) {
            setTips(storedTips);
        } else {
            const fetchedTips = await fetchSeasonalTips(month);
            setTips(fetchedTips);
            localStorage.setItem(`garden-guru-tips-${month}`, fetchedTips);
        }
      } catch (error) {
        console.error("Failed to fetch seasonal tips", error);
        setTips("Sorry, we couldn't load the seasonal tips right now. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadTips();
  }, []);

  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-lg border border-white/20">
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-full text-primary">
            <CalendarIcon className="w-8 h-8" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Your {currentMonth} Guide</h2>
            <p className="text-gray-500">Essential tasks for the UK garden right now</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-gray-600 animate-pulse flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                Asking the Guru for {currentMonth}'s advice...
            </p>
        </div>
      ) : (
        <div className="animate-fade-in bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            {tips && <ContentRenderer content={tips} />}
        </div>
      )}
    </div>
  );
};

export default SeasonalTips;
