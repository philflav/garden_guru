import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this environment, we assume the key is present.
  console.error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
const model = 'gemini-2.5-flash';

const identificationModel = ai.models.generateContent;
const chatModel = ai.chats;

export const identifyPlant = async (imageBase64: string, mimeType: string) => {
  const response = await identificationModel({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        {
          text: `You are an expert botanist based in the UK. Identify the plant in this image. Respond ONLY in JSON format. For the 'hardiness' field, provide ONLY the UK's RHS (Royal Horticultural Society) hardiness rating code (e.g., H5, H7). Do not include the USDA zone. Make all responses UK-specific. The response must adhere to this schema: { "plantName": "string", "scientificName": "string", "description": "string", "summary": { "plantType": "string (e.g., Deciduous Tree, Evergreen Shrub, Annual Flower, Perennial Herb)", "size": "string (e.g., '10-15m tall, 8-12m wide')", "hardiness": "string (e.g., 'H5')", "growthRate": "string (e.g., 'Slow', 'Moderate', 'Fast')", "keyCharacteristics": "string (A brief sentence on key features)" } }. If you cannot identify the plant, respond with plantName as 'Unknown Plant' and provide null or empty strings for other fields.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plantName: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          description: { type: Type.STRING },
          summary: {
              type: Type.OBJECT,
              properties: {
                  plantType: { type: Type.STRING },
                  size: { type: Type.STRING },
                  hardiness: { type: Type.STRING },
                  growthRate: { type: Type.STRING },
                  keyCharacteristics: { type: Type.STRING },
              },
              required: ['plantType', 'size', 'hardiness', 'growthRate', 'keyCharacteristics'],
          }
        },
        required: ['plantName', 'scientificName', 'description', 'summary'],
      },
    }
  });

  const text = response.text.trim();
  return JSON.parse(text);
};

export const fetchCareInstructions = async (plantName: string, scientificName: string) => {
  const prompt = `You are an expert UK gardener. Provide detailed and easy-to-understand care instructions for a ${plantName} (${scientificName}). All advice, measurements (e.g., container sizes in litres), and product recommendations must be specific to the United Kingdom. Structure your response in Markdown format. Use level 3 headings (###) with emojis for the following sections: '☀️ Light', '💧 Water', '🪴 Soil', '🌡️ Temperature & Humidity', and '🌱 Fertilizer'. Use bullet points (*) for lists and bold text (**) for emphasis. Provide practical tips for a home gardener in the UK.`;

  const response = await identificationModel({
    model,
    contents: prompt,
  });

  return response.text;
};

export const fetchPestsAndDiseases = async (plantName: string, scientificName: string) => {
    const prompt = `You are a UK-based plant pathologist and entomologist. Provide a concise summary of common pests and diseases that affect ${plantName} (${scientificName}). All advice and product recommendations should be specific to the United Kingdom. Structure your response in Markdown format. Use level 3 headings (###) with emojis for '🐛 Common Pests' and '🍄 Common Diseases'. Use bullet points (*) for lists and bold text (**) for emphasis. Focus on identification and simple control methods for home gardeners in the UK. If there are no significant pests or diseases, state that.`;

    const response = await identificationModel({
        model,
        contents: prompt,
    });

    return response.text;
};

export const fetchRhsExplanation = async (rating: string) => {
    const prompt = `You are a horticultural expert from the RHS. Provide a detailed explanation for the RHS Hardiness Rating: '${rating}'. Structure the response in Markdown. Start with a level 3 heading (###) containing the rating's name (e.g., "### H5 - Hardy in most places throughout the UK"). Then, in the body, explain what it means for a UK gardener, including the minimum temperature range it can withstand and the typical conditions it's suited for. Use bold text (**) for emphasis on key terms or temperatures. Ensure the explanation is tailored for a UK audience.`;
    const response = await identificationModel({
        model,
        contents: prompt,
    });
    return response.text;
};

export const fetchSeasonalTips = async (month: string, latitude?: number, longitude?: number) => {
  let prompt = '';
  let tools = [];

  if (latitude && longitude) {
    prompt = `You are an expert UK gardener. The user is located at coordinates ${latitude}, ${longitude}.
    First, use Google Search to find the recent weather conditions (temperature and rainfall) for this general area (Region or County level) over the past week and the forecast for the next few days.
    
    IMPORTANT: When mentioning the location in your response, ONLY refer to the wider region or county (e.g., "South East England", "Yorkshire"). DO NOT mention specific towns, villages, or street names.

    Then, provide a concise seasonal gardening guide for ${month} in the UK, SPECIFICALLY tailored to these local weather conditions.
    For example, if it has been raining heavily, advise on drainage or holding off on soil work. If it's dry, advise on watering.
    
    Start with a brief summary of the local weather context found (referring only to the region/county).

    Structure the rest of the response in Markdown with these specific sections (level 3 headings ###):
    1. '🌱 Planting Now' (What to sow or plant out)
    2. '✂️ Jobs to do' (Pruning, maintenance, lawn care)
    3. '🧺 Harvest & Kitchen' (What's ready to eat, storage tips, or recipe ideas for gluts)
    
    Use bullet points (*) and bold text (**) for emphasis. Keep it practical and inspiring for a home gardener.`;
    tools = [{ googleSearch: {} }];
  } else {
    prompt = `You are an expert UK gardener. Provide a concise seasonal gardening guide for ${month} in the UK.
    Structure the response in Markdown with these specific sections (level 3 headings ###):
    1. '🌱 Planting Now' (What to sow or plant out)
    2. '✂️ Jobs to do' (Pruning, maintenance, lawn care)
    3. '🧺 Harvest & Kitchen' (What's ready to eat, storage tips, or recipe ideas for gluts)
    
    Use bullet points (*) and bold text (**) for emphasis. Keep it practical and inspiring for a home gardener.`;
  }
  
  const response = await identificationModel({
    model,
    contents: prompt,
    config: {
        tools: tools.length > 0 ? tools : undefined
    }
  });

  const text = response.text;
  
  // Extract sources if available
  const sources: { title: string; uri: string }[] = [];
  if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
     response.candidates[0].groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web) {
            sources.push({ title: chunk.web.title || 'Source', uri: chunk.web.uri || '#' });
        }
     });
  }

  return { text, sources };
};


export const getChatSession = (systemInstructionOverride?: string, location?: { lat: number, lng: number }) => {
    let systemInstruction = systemInstructionOverride || "You are Garden Guru, a friendly and knowledgeable gardening assistant based in the UK. All your advice, units of measurement (e.g., litres, meters), currency (£), and product recommendations must be UK-specific. Answer questions about gardening, plants, and related topics. Keep your answers helpful and encouraging.";
    
    let tools = [];

    if (location) {
        systemInstruction += `\n\nCONTEXT: The user is located at coordinates: Latitude ${location.lat}, Longitude ${location.lng}. 
        When the user asks questions where local climate, soil, or weather is relevant (e.g., "what grows well here?", "is it too cold to plant this?", "local frost dates"), 
        use the Google Search tool to find specific local information (hardiness zones, recent weather, soil types) to provide a tailored answer.
        
        IMPORTANT: When referring to the user's location in your response, ONLY refer to the wider Region or County (e.g., "South West England", "Norfolk"). DO NOT mention specific towns, villages, or street addresses.`;
        tools.push({ googleSearch: {} });
    }
    
    return chatModel.create({
        model,
        config: {
            systemInstruction: systemInstruction,
            tools: tools.length > 0 ? tools : undefined,
        }
    });
}