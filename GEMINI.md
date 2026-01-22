# Garden Guru

## Project Overview

**Garden Guru** is a React-based personal gardening assistant application designed to help users identify plants, receive care instructions, and chat with an AI botanical expert. The application is specifically tailored for the UK market, utilizing RHS (Royal Horticultural Society) hardiness ratings and UK-specific gardening advice.

### Key Features
- **Plant Identification:** Identify plants from uploaded images or live camera feed using Gemini 2.5 Flash.
- **Detailed Care Info:** Get UK-specific care instructions (Light, Water, Soil, etc.) and pest/disease information.
- **Gardening Chat:** Interactive chat interface for follow-up questions, capable of maintaining context about a specific plant.
- **Favorites:** Save identified plants to a personal collection (persisted in local storage).
- **Localization:** All advice, measurements, and hardiness ratings are localized for the UK.

### Technologies
- **Frontend Framework:** React 19
- **Build Tool:** Vite 6
- **Language:** TypeScript
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Styling:** Tailwind CSS (inferred from utility classes)

### Architecture
- **Entry Point:** `src/main.tsx` (or `index.tsx`) mounts the `App` component.
- **State Management:** Local component state (`useState`) and `localStorage` for persistence.
- **Navigation:** Simple client-side routing via conditional rendering in `App.tsx`.
- **Services:**
  - `services/geminiService.ts`: Centralizes all Gemini API interactions (identification, chat, care instructions).
- **Components:**
  - `components/PlantIdentifier.tsx`: Main interface for image capture and analysis.
  - `components/GardeningChat.tsx`: Chat interface for Q&A.
  - `components/Favorites.tsx`: View for saved plants.

## Building and Running

### Prerequisites
- Node.js
- A Google Gemini API Key

### Setup
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Configuration:**
    Create a `.env.local` file in the root directory and add your API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

### Commands
- **Start Development Server:**
  ```bash
  npm run dev
  ```
- **Build for Production:**
  ```bash
  npm run build
  ```
- **Preview Production Build:**
  ```bash
  npm run preview
  ```

## Development Conventions

- **Component Style:** Functional components with React Hooks (`useState`, `useEffect`, `useCallback`).
- **Type Safety:** Strict TypeScript usage for props and state. defined in `types.ts` (inferred).
- **AI Service:** All direct calls to the Gemini API should be encapsulated within `services/geminiService.ts`. The service handles prompt engineering and response parsing.
- **Environment Variables:** API keys are injected via Vite's `define` config in `vite.config.ts`.
- **Prompt Engineering:** Prompts are structured to ensure JSON responses for data processing and Markdown responses for readable content, strictly enforcing UK-specific context.
