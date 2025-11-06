import React, { useState, useEffect } from 'react';
import PlantIdentifier from './components/PlantIdentifier';
import GardeningChat from './components/GardeningChat';
import Favourites from './components/Favorites';
import { LeafIcon, MessageCircleIcon, HeartIcon } from './components/icons';
import type { FavouritePlant, PlantInfo } from './types';

type View = 'identifier' | 'chat' | 'favourites';

const App: React.FC = () => {
  const [view, setView] = useState<View>('identifier');
  const [favourites, setFavourites] = useState<FavouritePlant[]>([]);
  const [chatContextPlant, setChatContextPlant] = useState<PlantInfo | null>(null);

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

  const navButtonClasses = "flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-300 ease-in-out text-sm sm:text-base";
  const activeNavButtonClasses = "bg-primary text-primary-content shadow-md";
  const inactiveNavButtonClasses = "bg-base-100 text-gray-700 hover:bg-green-100";

  return (
    <div className="min-h-screen bg-secondary text-gray-800 font-sans">
      <div className="container mx-auto p-4 max-w-4xl">
        <header className="text-center my-6">
          <div className="flex items-center justify-center gap-2">
            <LeafIcon className="w-10 h-10 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
              Garden Guru
            </h1>
          </div>
          <p className="text-gray-600 mt-2">Your Personal Gardening Assistant</p>
        </header>

        <nav className="flex justify-center items-center p-2 bg-base-200/50 rounded-full my-8 max-w-md mx-auto shadow-inner">
          <button
            onClick={() => setView('identifier')}
            className={`${navButtonClasses} ${view === 'identifier' ? activeNavButtonClasses : inactiveNavButtonClasses}`}
          >
            <LeafIcon className="w-5 h-5" />
            Plant ID
          </button>
          <button
            onClick={() => setView('chat')}
            className={`${navButtonClasses} ${view === 'chat' ? activeNavButtonClasses : inactiveNavButtonClasses}`}
          >
            <MessageCircleIcon className="w-5 h-5" />
            Chat
          </button>
          <button
            onClick={() => setView('favourites')}
            className={`${navButtonClasses} ${view === 'favourites' ? activeNavButtonClasses : inactiveNavButtonClasses}`}
          >
            <HeartIcon className="w-5 h-5" />
            Favourites
          </button>
        </nav>

        <main>
          {view === 'identifier' && <PlantIdentifier favourites={favourites} addFavourite={addFavourite} removeFavourite={removeFavourite} setChatContextPlant={setChatContextPlant} />}
          {view === 'chat' && <GardeningChat chatContextPlant={chatContextPlant} />}
          {view === 'favourites' && <Favourites favourites={favourites} removeFavourite={removeFavourite} setChatContextPlant={setChatContextPlant} />}
        </main>
        
        <footer className="text-center text-gray-500 text-sm mt-12 pb-4">
            <p>Powered by Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;