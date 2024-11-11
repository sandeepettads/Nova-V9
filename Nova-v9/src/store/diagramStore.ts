import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useChunkingStore } from './chunkingStore';

interface DiagramState {
  savedDiagrams: Array<{
    id: string;
    plantUML: string;
    createdAt: Date;
  }>;
  isStoring: boolean;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  storeDiagram: (plantUML: string) => Promise<string>;
  getDiagram: (id: string) => Promise<any>;
  getAllDiagrams: () => Promise<void>;
  clearError: () => void;
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set, get) => ({
      savedDiagrams: [],
      isStoring: false,
      error: null,
      retryCount: 0,
      maxRetries: 3,

      storeDiagram: async (plantUML: string) => {
        const { addLog } = useChunkingStore.getState();
        const { retryCount, maxRetries } = get();
        
        set({ isStoring: true, error: null });
        
        try {
          // Validate PlantUML before sending
          if (!plantUML || typeof plantUML !== 'string') {
            throw new Error('Invalid PlantUML data');
          }

          addLog('Validating diagram data...', 'info');
          addLog(`Data length: ${plantUML.length} characters`, 'info');

          // Prepare request payload
          const payload = JSON.stringify({ plantUMLCode: plantUML });
          
          addLog('Storing diagram in MongoDB...', 'info');
          
          const response = await fetch('/api/storeDiagram', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: payload,
          });

          // Check for empty response
          const responseText = await response.text();
          if (!responseText) {
            throw new Error('Empty response from server');
          }

          // Parse response safely
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            addLog(`JSON Parse Error: ${parseError.message}`, 'error');
            addLog(`Response Text: ${responseText.substring(0, 100)}...`, 'error');
            throw new Error('Failed to parse server response');
          }
          if (!response.ok) {
            throw new Error(data.message || 'Failed to store diagram');
          }

          addLog('Diagram stored successfully', 'success');

          set(state => ({
            savedDiagrams: [
              ...state.savedDiagrams,
              {
                id: data.documentId,
                plantUML,
                createdAt: new Date(),
              },
            ],
            retryCount: 0,
          }));

          return data.documentId;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Error storing diagram: ${errorMessage}`, 'error');

          // Only retry on specific errors
          const shouldRetry = (
            error instanceof Error && 
            !error.message.includes('Invalid PlantUML data') &&
            retryCount < maxRetries
          );

          if (shouldRetry) {
            addLog(`Retrying... (Attempt ${retryCount + 1}/${maxRetries})`, 'info');
            set({ retryCount: retryCount + 1 });
            
            // Exponential backoff with jitter
            const baseDelay = Math.pow(2, retryCount) * 1000;
            const jitter = Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
            
            return get().storeDiagram(plantUML);
          }

          set({ 
            error: errorMessage,
            retryCount: 0
          });
          throw error;
        } finally {
          set({ isStoring: false });
        }
      },

      getDiagram: async (id: string) => {
        const { addLog } = useChunkingStore.getState();
        
        try {
          addLog(`Retrieving diagram ${id}...`, 'info');
          
          const response = await fetch(`/api/diagram/${id}`);
          const responseText = await response.text();

          if (!responseText) {
            throw new Error('Empty response from server');
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            addLog(`JSON Parse Error: ${parseError.message}`, 'error');
            throw new Error('Failed to parse server response');
          }

          if (!response.ok) {
            throw new Error(data.message || 'Failed to retrieve diagram');
          }

          addLog('Diagram retrieved successfully', 'success');
          return data.diagram;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Error retrieving diagram: ${errorMessage}`, 'error');
          set({ error: errorMessage });
          throw error;
        }
      },

      getAllDiagrams: async () => {
        const { addLog } = useChunkingStore.getState();
        
        try {
          addLog('Retrieving all diagrams...', 'info');
          
          const response = await fetch('/api/diagrams');
          const responseText = await response.text();

          if (!responseText) {
            throw new Error('Empty response from server');
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            addLog(`JSON Parse Error: ${parseError.message}`, 'error');
            throw new Error('Failed to parse server response');
          }

          if (!response.ok) {
            throw new Error(data.message || 'Failed to retrieve diagrams');
          }

          addLog(`Retrieved ${data.diagrams.length} diagrams`, 'success');
          
          set({
            savedDiagrams: data.diagrams.map((diagram: any) => ({
              id: diagram._id,
              plantUML: diagram.uml_code,
              createdAt: new Date(diagram.created_at),
            })),
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Error retrieving diagrams: ${errorMessage}`, 'error');
          set({ error: errorMessage });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'diagram-storage',
    }
  )
);