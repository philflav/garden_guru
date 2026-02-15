import React, { useState, useCallback, useRef, useEffect } from 'react';
import { identifyPlant, fetchCareInstructions, fetchPestsAndDiseases, fetchRhsExplanation } from '../services/geminiService';
import type { PlantInfo, FavouritePlant } from '../types';
import { UploadCloudIcon, SparklesIcon, CameraIcon, HeartIcon, BugIcon, RulerIcon, ThermometerIcon, ZapIcon, StarIcon, TreePineIcon, InfoIcon, XIcon } from './icons';

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [mimeType, base64] = result.split(';base64,');
      resolve({ base64, mimeType: mimeType.replace('data:', '') });
    };
    reader.onerror = (error) => reject(error);
  });
};

// Helper function to compress images
const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const [mimeTypePart, base64] = dataUrl.split(';base64,');
                    resolve({ 
                        base64: base64, 
                        mimeType: mimeTypePart.replace('data:', '') 
                    });
                } else {
                    reject(new Error("Could not get canvas context"));
                }
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

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

interface PlantIdentifierProps {
    favourites: FavouritePlant[];
    addFavourite: (plant: FavouritePlant) => void;
    removeFavourite: (scientificName: string) => void;
    setChatContextPlant: (plant: PlantInfo | null) => void;
}

const PlantIdentifier: React.FC<PlantIdentifierProps> = ({ favourites, addFavourite, removeFavourite, setChatContextPlant }) => {
  const [image, setImage] = useState<{ preview: string; file: File } | null>(null);
  const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
  const [careInstructions, setCareInstructions] = useState<string | null>(null);
  const [pestsAndDiseases, setPestsAndDiseases] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingPests, setLoadingPests] = useState(false);
  const [loadingRhs, setLoadingRhs] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [pestsError, setPestsError] = useState<string | null>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [favouriteStatusMsg, setFavouriteStatusMsg] = useState<string | null>(null);
  
  const [isRhsModalOpen, setIsRhsModalOpen] = useState(false);
  const [rhsModalContent, setRhsModalContent] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const startStream = async () => {
        if (isCameraOpen && navigator.mediaDevices?.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                setError("Could not access the camera. Please check permissions and try again.");
                setIsCameraOpen(false); 
            }
        }
    };

    startStream();

    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };
  }, [isCameraOpen]);

  useEffect(() => {
    if (plantInfo) {
      setIsFavourited(favourites.some(p => p.scientificName === plantInfo.scientificName));
    } else {
      setIsFavourited(false);
    }
  }, [plantInfo, favourites]);

  const resetAnalysisState = useCallback(() => {
    setPlantInfo(null);
    setCareInstructions(null);
    setPestsAndDiseases(null);
    setError(null);
    setPestsError(null);
    setChatContextPlant(null);
  }, [setChatContextPlant]);

  const processFile = useCallback((file: File) => {
    resetAnalysisState();
    setImage({
      preview: URL.createObjectURL(file),
      file: file,
    });
  }, [resetAnalysisState]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleIdentify = useCallback(async () => {
    if (!image) return;

    setLoading(true);
    resetAnalysisState();

    try {
      const { base64, mimeType } = await fileToBase64(image.file);
      const info = await identifyPlant(base64, mimeType);

      if (info && info.plantName !== 'Unknown Plant') {
        setPlantInfo(info);
        setChatContextPlant(info);
        const instructions = await fetchCareInstructions(info.plantName, info.scientificName);
        setCareInstructions(instructions);
      } else {
        setPlantInfo(info); 
        setChatContextPlant(null);
        setError("Could not identify the plant. Please try another photo.");
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [image, resetAnalysisState, setChatContextPlant]);

  const handleFetchPests = async () => {
    if (!plantInfo) return;
    setLoadingPests(true);
    setPestsError(null);
    try {
        const pestsInfo = await fetchPestsAndDiseases(plantInfo.plantName, plantInfo.scientificName);
        setPestsAndDiseases(pestsInfo);
    } catch (err) {
        console.error(err);
        setPestsError('Could not fetch pest and disease information.');
    } finally {
        setLoadingPests(false);
    }
  };

  const handleFavouriteToggle = async () => {
      if (!plantInfo || !careInstructions || !image) return;
      
      if (isFavourited) {
          removeFavourite(plantInfo.scientificName);
          setFavouriteStatusMsg("Removed from favourites");
          setTimeout(() => setFavouriteStatusMsg(null), 3000);
      } else {
          try {
            // Compress image before saving to favourites to save space
            const { base64, mimeType } = await compressImage(image.file);
            
            const plantData: FavouritePlant = {
                ...plantInfo,
                imageUrl: `data:${mimeType};base64,${base64}`,
                careInstructions,
                pestsAndDiseases: pestsAndDiseases ?? undefined,
            };
            
            // Check approximate size to warn if it might fail silent (though localStorage throws usually)
            // 5MB limit check is hard to be precise, but good to catch obvious large items
            try {
                addFavourite(plantData);
                setFavouriteStatusMsg("Added to your garden!");
                setTimeout(() => setFavouriteStatusMsg(null), 3000);
            } catch (storeError) {
                 console.error("Storage error:", storeError);
                 setError("Storage full! Please remove some plants from your garden.");
            }

          } catch (e) {
            console.error("Failed to save image for favourite", e);
            setError("Could not save the plant to favourites. Storage might be full.");
          }
      }
  };

  const handleOpenCamera = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setError(null);
      setIsCameraOpen(true);
    } else {
      setError("Camera access is not supported by your browser.");
    }
  };

  const closeCamera = () => {
      setIsCameraOpen(false);
  };

  const handleCapture = useCallback(() => {
      if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                  if (blob) {
                      const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                      processFile(capturedFile);
                  }
              }, 'image/jpeg', 0.9);
          }
          closeCamera();
      }
  }, [processFile]);

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

  const SummaryItem: React.FC<{ icon: React.ReactNode, label: string, value: React.ReactNode }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-green-100 text-primary rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm font-semibold text-gray-500">{label}</p>
            <div className="text-base font-medium text-gray-800">{value}</div>
        </div>
    </div>
  );

  return (
    <>
      <div className="bg-base-100 p-6 sm:p-8 rounded-xl shadow-lg flex flex-col items-center gap-6 relative overflow-hidden">
        <h2 className="text-2xl font-bold text-center text-gray-700">Identify a Plant</h2>
        
        {favouriteStatusMsg && (
          <div className="absolute top-4 bg-primary text-white px-4 py-2 rounded-full shadow-lg z-20 animate-bounce text-sm font-bold">
            {favouriteStatusMsg}
          </div>
        )}

        <div className="w-full max-w-md">
          <label htmlFor="plant-upload" className="w-full cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary hover:bg-green-50 transition-colors">
              {image ? (
                <img src={image.preview} alt="Plant preview" className="mx-auto max-h-48 rounded-lg shadow-md" />
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <UploadCloudIcon className="w-12 h-12 mb-2" />
                  <span className="font-semibold">Click to upload an image</span>
                  <span className="text-sm">PNG, JPG, WEBP</span>
                </div>
              )}
            </div>
          </label>
          <input id="plant-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />

          <div className="my-4 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            onClick={handleOpenCamera}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-base-200 text-gray-700 font-bold rounded-full hover:bg-base-300 transition-all"
          >
            <CameraIcon className="w-5 h-5" />
            Use Camera
          </button>
        </div>

        {image && !isCameraOpen && (
          <button
            onClick={handleIdentify}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-content font-bold rounded-full hover:bg-primary-focus transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
          >
            <SparklesIcon className="w-5 h-5" />
            {loading ? 'Identifying...' : 'Identify Plant'}
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-base-100 rounded-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-gray-600 animate-pulse">Analyzing your plant...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md w-full max-w-md">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {plantInfo && !loading && (
          <div className="w-full mt-4 space-y-6 animate-fade-in">
            <div className="bg-secondary p-6 rounded-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{plantInfo.plantName}</h3>
                        <p className="text-md italic text-gray-600">{plantInfo.scientificName}</p>
                    </div>
                    {careInstructions && plantInfo.plantName !== 'Unknown Plant' && (
                        <button 
                            onClick={handleFavouriteToggle}
                            className={`p-3 rounded-full transition-all duration-300 transform active:scale-150 ${
                                isFavourited ? 'text-red-500 bg-red-100 shadow-inner' : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                            }`}
                            aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
                        >
                            <HeartIcon className={`w-8 h-8 ${isFavourited ? 'fill-current' : 'fill-none'}`} />
                        </button>
                    )}
                </div>
                <p className="mt-4 text-gray-700 leading-relaxed">{plantInfo.description}</p>
            </div>
            
            {plantInfo.summary && plantInfo.plantName !== 'Unknown Plant' && (
              <div className="bg-secondary p-4 sm:p-6 rounded-lg">
                <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TreePineIcon className="w-6 h-6 text-primary" />
                  Plant Profile
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SummaryItem icon={<TreePineIcon className="w-5 h-5"/>} label="Plant Type" value={plantInfo.summary.plantType} />
                    <SummaryItem icon={<RulerIcon className="w-5 h-5"/>} label="Size" value={plantInfo.summary.size} />
                    <SummaryItem 
                      icon={<ThermometerIcon className="w-5 h-5"/>} 
                      label="RHS Hardiness" 
                      value={
                        <button 
                          onClick={() => handleFetchRhsExplanation(plantInfo.summary.hardiness)}
                          disabled={loadingRhs}
                          className="flex items-center gap-1.5 text-left text-primary hover:underline disabled:cursor-wait disabled:no-underline"
                        >
                          <span>{plantInfo.summary.hardiness}</span>
                          {loadingRhs ? 
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            : <InfoIcon className="w-4 h-4 flex-shrink-0" />
                          }
                        </button>
                      }
                    />
                    <SummaryItem icon={<ZapIcon className="w-5 h-5"/>} label="Growth Rate" value={plantInfo.summary.growthRate} />
                    <div className="sm:col-span-2">
                        <SummaryItem icon={<StarIcon className="w-5 h-5"/>} label="Key Characteristics" value={plantInfo.summary.keyCharacteristics} />
                    </div>
                </div>
              </div>
            )}

            {careInstructions && (
              <div className="bg-secondary p-6 rounded-lg">
                <h4 className="text-xl font-bold text-gray-800 mb-4">Care Instructions</h4>
                <ContentRenderer content={careInstructions} />
              </div>
            )}

            {careInstructions && (
                <div className="flex flex-col items-center">
                    {!pestsAndDiseases && (
                        <button
                            onClick={handleFetchPests}
                            disabled={loadingPests}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            <BugIcon className="w-5 h-5" />
                            {loadingPests ? 'Checking...' : 'Check Pests & Diseases'}
                        </button>
                    )}
                    {pestsError && <p className="text-red-500 text-sm mt-2">{pestsError}</p>}
                </div>
            )}
            
            {pestsAndDiseases && (
              <div className="bg-secondary p-6 rounded-lg animate-fade-in">
                <h4 className="text-xl font-bold text-gray-800 mb-4">Pests & Diseases</h4>
                <ContentRenderer content={pestsAndDiseases} />
              </div>
            )}
          </div>
        )}
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

      {isCameraOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
              <video ref={videoRef} autoPlay playsInline className="w-full h-auto max-h-[70vh] max-w-full rounded-lg mb-6 shadow-2xl border-4 border-gray-600" aria-label="Live camera feed"></video>
              <div className="flex items-center gap-4">
                  <button onClick={handleCapture} className="px-8 py-4 bg-primary text-primary-content font-bold rounded-full text-lg hover:bg-primary-focus transition-transform transform hover:scale-105" aria-label="Capture photo">
                      Capture
                  </button>
                  <button onClick={closeCamera} className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-full hover:bg-gray-600 transition-all" aria-label="Close camera">
                      Cancel
                  </button>
              </div>
          </div>
      )}
    </>
  );
};

export default PlantIdentifier;