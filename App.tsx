
import React, { useState, useEffect } from 'react';
import PlantIdentifier from './components/PlantIdentifier';
import GardeningChat from './components/GardeningChat';
import Favourites from './components/Favorites';
import SeasonalTips from './components/SeasonalTips';
import { LeafIcon, MessageCircleIcon, HeartIcon, GardenLogoIcon, SparklesIcon, SproutIcon, CalendarIcon } from './components/icons';
import type { FavouritePlant, PlantInfo } from './types';

type View = 'identifier' | 'chat' | 'favourites' | 'tips';

const App: React.FC = () => {
  const [view, setView] = useState<View>('identifier');
  const [favourites, setFavourites] = useState<FavouritePlant[]>([]);
  const [chatContextPlant, setChatContextPlant] = useState<PlantInfo | null>(null);
  const [backgroundClass, setBackgroundClass] = useState('bg-secondary');

  useEffect(() => {
    // Set background based on UK Seasons
    const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
    
    // Winter: Dec, Jan, Feb
    if (month === 11 || month === 0 || month === 1) {
        setBackgroundClass('bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200');
    } 
    // Spring: Mar, Apr, May
    else if (month >= 2 && month <= 4) {
        setBackgroundClass('bg-gradient-to-br from-green-50 via-emerald-100 to-green-50');
    }
    // Summer: Jun, Jul, Aug
    else if (month >= 5 && month <= 7) {
        setBackgroundClass('bg-gradient-to-br from-yellow-50 via-green-100 to-yellow-50');
    }
    // Autumn: Sep, Oct, Nov
    else {
        setBackgroundClass('bg-gradient-to-br from-orange-50 via-amber-100 to-orange-50');
    }
  }, []);

  // Load favourites from localStorage on initial render
  useEffect(() => {
    try {
      const storedFavourites = localStorage.getItem('garden-guru-favourites');
      if (storedFavourites) {
        setFavourites(JSON.parse(storedFavourites));
      }
    } catch (error) {
      console.error("Failed to parse favourites from localStorage", error);
    }
  }, []);

  // Save favourites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('garden-guru-favourites', JSON.stringify(favourites));
    } catch (error) {
      console.error("Failed to save favourites to localStorage", error);
    }
  }, [favourites]);

  const addFavourite = (plant: FavouritePlant) => {
    setFavourites(prev => [...prev, plant]);
  };

  const removeFavourite = (scientificName: string) => {
    setFavourites(prev => prev.filter(p => p.scientificName !== scientificName));
  };

  const navButtonClasses = "flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-full font-semibold transition-all duration-300 ease-in-out text-sm sm:text-base whitespace-nowrap";
  const activeNavButtonClasses = "bg-primary text-primary-content shadow-md transform scale-105";
  const inactiveNavButtonClasses = "bg-white/50 text-gray-600 hover:bg-white/80 hover:text-primary";

  return (
    <div className={`min-h-screen text-gray-800 font-sans selection:bg-green-200 ${backgroundClass} transition-colors duration-1000`}>
      <div className="container mx-auto p-4 max-w-4xl">
        <header className="text-center my-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-4 bg-white rounded-full shadow-lg ring-4 ring-white/50">
              <GardenLogoIcon className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 tracking-tight drop-shadow-sm">
                Garden Guru
              </h1>
              <p className="text-lg text-gray-600 mt-2 font-medium">Identify. Care. Cultivate.</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-white/40 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-2 mb-2">
                 <SparklesIcon className="w-5 h-5 text-primary" />
                 <h3 className="font-bold text-gray-800">Identify Instantly</h3>
               </div>
               <p className="text-sm text-gray-600">Snap a photo to get accurate UK-specific plant identification and hardiness ratings.</p>
            </div>
             <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-white/40 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-2 mb-2">
                 <SproutIcon className="w-5 h-5 text-primary" />
                 <h3 className="font-bold text-gray-800">Expert Care</h3>
               </div>
               <p className="text-sm text-gray-600">Receive detailed instructions for water, light, and soil to help your garden thrive.</p>
            </div>
             <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-white/40 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex items-center gap-2 mb-2">
                 <MessageCircleIcon className="w-5 h-5 text-primary" />
                 <h3 className="font-bold text-gray-800">Chat with AI</h3>
               </div>
               <p className="text-sm text-gray-600">Have a specific problem? Chat with our botanist to diagnose pests and diseases.</p>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap justify-center items-center gap-2 p-2 bg-white/40 rounded-3xl my-8 max-w-2xl mx-auto shadow-sm sticky top-4 z-40 backdrop-blur-md border border-white/20">
          <button
            onClick={() => setView('identifier')}
            className={`${navButtonClasses} ${view === 'identifier' ? activeNavButtonClasses : inactiveNavButtonClasses}`}
          >
            <LeafIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Plant ID
          </button>
          <button
            onClick={() => setView('chat')}
            className={`${navButtonClasses} ${view === 'chat' ? activeNavButtonClasses : inactiveNavButtonClasses}`}
          >
            <MessageCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Ask Guru
          </button>
          <button
            onClick={() => setView('tips')}
            className={`${navButtonClasses} ${view === 'tips' ? activeNavButtonClasses : inactiveNavButtonClasses}`}
          >
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Seasonal Tips
          </button>
          <button
            onClick={() => setView('favourites')}
            className={`${navButtonClasses} ${view === 'favourites' ? activeNavButtonClasses : inactiveNavButtonClasses}`}
          >
            <HeartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            My Garden
          </button>
        </nav>

        <main className="min-h-[50vh]">
          {view === 'identifier' && <PlantIdentifier favourites={favourites} addFavourite={addFavourite} removeFavourite={removeFavourite} setChatContextPlant={setChatContextPlant} />}
          {view === 'chat' && <GardeningChat chatContextPlant={chatContextPlant} />}
          {view === 'tips' && <SeasonalTips />}
          {view === 'favourites' && <Favourites favourites={favourites} removeFavourite={removeFavourite} setChatContextPlant={setChatContextPlant} />}
        </main>
        
        <footer className="text-center text-gray-500 text-sm mt-12 pb-6 pt-6">
            <p>© {new Date().getFullYear()} Garden Guru • Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
