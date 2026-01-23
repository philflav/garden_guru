import React, { useState } from 'react';
import type { FavouritePlant, PlantInfo } from '../types';
import { fetchRhsExplanation } from '../services/geminiService';
import { SproutIcon, TrashIcon, ChevronDownIcon, InfoIcon, XIcon, TreePineIcon, SparklesIcon } from './icons';

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
            <div className="bg-secondary rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md border border-gray-100 overflow-hidden">
                <div className="p-4 flex justify-between items-center cursor-pointer" onClick={handleToggleOpen}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                          {plant.imageUrl ? (
                            <img src={plant.imageUrl} alt={plant.plantName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-green-100 flex items-center justify-center text-primary">
                              <TreePineIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{plant.plantName}</h3>
                            <p className="text-sm italic text-gray-600">{plant.scientificName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(plant.scientificName);
                            }} 
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            aria-label={`Remove ${plant.plantName} from favourites`}
                        >
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                        <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>
                <div className={`overflow-hidden transition-[max-height] duration-700 ease-in-out ${isOpen ? 'max-h-[3000px]' : 'max-h-0'}`}>
                    <div className="p-4 pt-0 border-t border-gray-200 mt-2 space-y-6">
                        {plant.imageUrl && (
                          <div className="w-full h-64 sm:h-80 mt-4 rounded-xl overflow-hidden shadow-lg border-4 border-white">
                            <img src={plant.imageUrl} alt={plant.plantName} className="w-full h-full object-cover" />
                          </div>
                        )}
                        
                        <div className="bg-white/60 p-5 rounded-xl">
                          <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-primary" />
                            About this Plant
                          </h4>
                          <p className="text-gray-700 leading-relaxed">{plant.description}</p>
                        </div>
                        
                        {plant.summary && (
                        <div className="bg-white/60 p-5 rounded-xl">
                            <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                              <TreePineIcon className="w-5 h-5 text-primary" />
                              Plant Profile
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
                                <p><span className="font-semibold text-gray-800">Type:</span> {plant.summary.plantType}</p>
                                <p><span className="font-semibold text-gray-800">Size:</span> {plant.summary.size}</p>
                                <div className="flex items-center gap-2">
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
                                </div>
                                <p><span className="font-semibold text-gray-800">Growth Rate:</span> {plant.summary.growthRate}</p>
                                <p className="sm:col-span-2 mt-2 pt-2 border-t border-gray-100"><span className="font-semibold text-gray-800">Characteristics:</span> {plant.summary.keyCharacteristics}</p>
                            </div>
                        </div>
                        )}
                        
                        <div className="bg-white/60 p-5 rounded-xl">
                            <h4 className="text-lg font-bold text-gray-800 mb-2">Care Instructions</h4>
                            <ContentRenderer content={plant.careInstructions} />
                        </div>

                        {plant.pestsAndDiseases && (
                            <div className="bg-white/60 p-5 rounded-xl">
                                <h4 className="text-lg font-bold text-gray-800 mb-2">Pests & Diseases</h4>
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
      <h2 className="text-2xl font-bold text-center text-gray-700">My Garden</h2>
      {favourites.length > 0 ? (
        <div className="w-full space-y-6">
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
        <div className="text-center py-12 px-6 bg-secondary rounded-2xl w-full border-2 border-dashed border-gray-200">
            <SproutIcon className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-gray-700">Your garden is empty!</h3>
          <p className="text-gray-500 mt-2 max-w-xs mx-auto">
            Identify your plants to save them here with their custom photos and care guides.
          </p>
        </div>
      )}
    </div>
  );
};

export default Favourites;