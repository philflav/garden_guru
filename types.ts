export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface PlantInfo {
  plantName: string;
  scientificName: string;
  description: string;
  summary: {
    plantType: string;
    size: string;
    hardiness: string;
    growthRate: string;
    keyCharacteristics: string;
  };
}

export interface FavouritePlant extends PlantInfo {
  careInstructions: string;
  pestsAndDiseases?: string;
  imagePreview?: string;
}
