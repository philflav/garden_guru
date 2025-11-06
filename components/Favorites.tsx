import React, { useState } from 'react';
import type { FavouritePlant, PlantInfo } from '../types';
import { fetchRhsExplanation } from '../services/geminiService';
import { SproutIcon, TrashIcon, ChevronDownIcon, InfoIcon, XIcon } from './icons';

interface FavouritesProps {
  favourites: FavouritePlant[];
  removeFavourite: (scientificName: string) => void;
  setChatContextPlant: (plant: PlantInfo | null) => void;
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

  // FIX: Replaced JSX.Element with React.ReactElement to resolve namespace issue.
  const elements: React.ReactElement[] = [];
  const lines = content.split('\n');
  // FIX: Replaced JSX.Element with React.ReactElement to resolve namespace issue.
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
        <h4 key={index} className="text-lg font-bold text-gray-800 mt-4 mb-2">
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
        <p key={index} className="my-2">
          {processLine(line)}
        </p>
      );
    }
  });

  flushList();

  return (
    <div className="font-sans text-gray-700 text-base leading-relaxed">
      {elements}
    </div>
  );
};


const FavouriteItem: React.FC<{ plant: FavouritePlant, onRemove: (scientificName: string) => void, onOpen: (plant: PlantInfo) => void }> = ({ plant, onRemove, onOpen }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isRhsModalOpen, setIsRhsModalOpen] = useState(false);
    const [rhsModalContent, setRhsModalContent] = useState('');
    const [loadingRhs, setLoadingRhs] = useState(false);

    const handleToggleOpen = () => {
        if (!isOpen) {
            onOpen(plant);
        }
        setIsOpen(!isOpen);
    }

    const handleFetchRhsExplanation = async (rating: string) => {
        if (!rating || loadingRhs) return;
        setLoadingRhs(true);
        try {
          const explanation = await fetchRhsExplanation(rating);
          setRhsModalContent(explanation);
          setIsRhsModalOpen(true);
        } catch (e) {
          console.error("Failed to fetch RHS explanation", e);
          setRhsModalContent("Sorry, we couldn't fetch the explanation for this rating right now.");
          setIsRhsModalOpen(true);
        } finally {
          setLoadingRhs(false);
        }
    };

    return (
        <>
            <div className="bg-secondary p-4 rounded-lg transition-all duration-300">
                <div className="flex justify-between items-center cursor-pointer" onClick={handleToggleOpen}>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{plant.plantName}</h3>
                        <p className="text-sm italic text-gray-600">{plant.scientificName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(plant.scientificName);
                            }} 
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"
                            aria-label={`Remove ${plant.plantName} from favourites`}
                        >
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                        <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>
                <div className={`overflow-hidden transition-[max-height] duration-700 ease-in-out ${isOpen ? 'max-h-[2000px] mt-4' : 'max-h-0'}`}>
                    <div className="border-t border-gray-200 pt-4 mt-2 space-y-4">
                        <p className="text-gray-700">{plant.description}</p>
                        
                        {plant.summary && (
                        <div>
                            <h4 className="text-md font-bold text-gray-800 mb-2">Plant Profile</h4>
                            <div className="text-sm space-y-1 text-gray-600 bg-white/50 p-3 rounded-md">
                                <p><span className="font-semibold text-gray-800">Type:</span> {plant.summary.plantType}</p>
                                <p><span className="font-semibold text-gray-800">Size:</span> {plant.summary.size}</p>
                                <p className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-800">Hardiness:</span> 
                                    <button 
                                        onClick={() => handleFetchRhsExplanation(plant.summary.hardiness)}
                                        disabled={loadingRhs}
                                        className="flex items-center gap-1.5 text-left text-primary hover:underline disabled:cursor-wait disabled:no-underline"
                                    >
                                        <span>{plant.summary.hardiness}</span>
                                         {loadingRhs ? 
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            : <InfoIcon className="w-4 h-4 flex-shrink-0" />
                                          }
                                    </button>
                                </p>
                                <p><span className="font-semibold text-gray-800">Growth Rate:</span> {plant.summary.growthRate}</p>
                                <p><span className="font-semibold text-gray-800">Characteristics:</span> {plant.summary.keyCharacteristics}</p>
                            </div>
                        </div>
                        )}
                        
                        <div>
                            <h4 className="text-md font-bold text-gray-800 mb-2">Care Instructions</h4>
                            <ContentRenderer content={plant.careInstructions} />
                        </div>

                        {plant.pestsAndDiseases && (
                            <div>
                                <h4 className="text-md font-bold text-gray-800 mb-2">Pests & Diseases</h4>
                                <ContentRenderer content={plant.pestsAndDiseases} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isRhsModalOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in"
                onClick={() => setIsRhsModalOpen(false)}
                role="dialog"
                aria-modal="true"
              >
                  <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">RHS Hardiness Rating</h3>
                      <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <ContentRenderer content={rhsModalContent} />
                      </div>
                      <button 
                        onClick={() => setIsRhsModalOpen(false)} 
                        className="absolute top-3 right-3 p-2 text-gray-500 hover:bg-gray-200 rounded-full"
                        aria-label="Close"
                      >
                          <XIcon className="w-5 h-5" />
                      </button>
                  </div>
              </div>
          )}
        </>
    )
}

const Favourites: React.FC<FavouritesProps> = ({ favourites, removeFavourite, setChatContextPlant }) => {
  return (
    <div className="bg-base-100 p-6 sm:p-8 rounded-xl shadow-lg flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-center text-gray-700">Favourite Plants</h2>
      {favourites.length > 0 ? (
        <div className="w-full space-y-4">
          {favourites.map((plant) => (
            <FavouriteItem 
                key={plant.scientificName} 
                plant={plant} 
                onRemove={removeFavourite} 
                onOpen={setChatContextPlant}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-6 bg-secondary rounded-lg w-full">
            <SproutIcon className="w-16 h-16 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">Your garden is empty!</h3>
          <p className="text-gray-500 mt-2">
            Use the 'Plant ID' tab to identify and save your favourite plants.
          </p>
        </div>
      )}
    </div>
  );
};

export default Favourites;