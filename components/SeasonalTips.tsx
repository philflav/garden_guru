import React, { useState, useEffect } from 'react';
import { fetchSeasonalTips } from '../services/geminiService';
import { CalendarIcon, SparklesIcon, ZapIcon } from './icons';

interface TipsData {
    text: string;
    sources?: { title: string; uri: string }[];
}

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
  const [tipsData, setTipsData] = useState<TipsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState('');
  const [isLocalized, setIsLocalized] = useState(false);

  useEffect(() => {
    const date = new Date();
    const month = date.toLocaleString('en-GB', { month: 'long' });
    setCurrentMonth(month);

    const loadTips = async () => {
      setLoading(true);
      try {
        let lat, long;
        try {
            // Attempt to get location for weather-adjusted tips
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            lat = position.coords.latitude;
            long = position.coords.longitude;
            setIsLocalized(true);
        } catch (e) {
            console.log("Location access denied or failed, using generic UK tips.", e);
            setIsLocalized(false);
        }

        // Cache key includes 'local' if location was used to distinguish between generic and specific advice
        const storageKey = `garden-guru-tips-${month}${lat ? '-local' : ''}`;
        const storedData = localStorage.getItem(storageKey);

        if (storedData) {
            setTipsData(JSON.parse(storedData));
        } else {
            const fetchedData = await fetchSeasonalTips(month, lat, long);
            setTipsData(fetchedData);
            localStorage.setItem(storageKey, JSON.stringify(fetchedData));
        }
      } catch (error) {
        console.error("Failed to fetch seasonal tips", error);
        setTipsData({ text: "Sorry, we couldn't load the seasonal tips right now. Please try again later." });
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
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                Your {currentMonth} Guide
                {isLocalized && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200">Local Weather Adjusted</span>}
            </h2>
            <p className="text-gray-500">Essential tasks for the UK garden right now</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-gray-600 animate-pulse flex items-center gap-2">
                <SparklesIcon className="w-4 h-4" />
                Asking the Guru for {currentMonth}'s advice based on local weather...
            </p>
        </div>
      ) : (
        <div className="animate-fade-in bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            {tipsData && (
                <>
                    <ContentRenderer content={tipsData.text} />
                    {tipsData.sources && tipsData.sources.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-gray-100">
                            <h5 className="text-sm font-semibold text-gray-500 mb-2">Sources</h5>
                            <ul className="text-xs text-gray-400 space-y-1">
                                {tipsData.sources.map((source, idx) => (
                                    <li key={idx} className="truncate">
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                                            {source.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
      )}
    </div>
  );
};

export default SeasonalTips;