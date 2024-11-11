import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

interface CodeModification {
  filePath: string;
  modifiedCode: string;
  changes: Array<{
    type: 'addition' | 'deletion';
    content: string;
  }>;
}

interface Tab {
  id: string;
  path: string | null;
  content: string;
  type: 'file' | 'response' | 'preview';
  title: string;
  isDirty: boolean;
  previewOf?: string;
}

interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string | null;
  pendingModification: CodeModification | null;
  addTab: (options: { path?: string; content: string; type: 'file' | 'response' | 'preview'; title?: string; previewOf?: string }) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  setTabDirty: (id: string, isDirty: boolean) => void;
  togglePreview: (fileTabId: string) => void;
  setPendingModification: (modification: CodeModification | null) => void;
  clearPendingModification: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  pendingModification: null,

  addTab: ({ path, content, type, title, previewOf }) => {
    const id = uuidv4();
    const newTab: Tab = {
      id,
      path: path || null,
      content,
      type,
      title: title || (path ? path.split('/').pop() || 'Untitled' : 'Response'),
      isDirty: false,
      previewOf
    };

    set(state => {
      let tabs = state.tabs;
      if (type === 'preview' && previewOf) {
        tabs = tabs.filter(t => !(t.type === 'preview' && t.previewOf === previewOf));
      } else if (type === 'file') {
        const existingTab = tabs.find(t => t.path === path && t.type === 'file');
        if (existingTab) {
          return { activeTabId: existingTab.id };
        }
      }

      return {
        tabs: [...tabs, newTab],
        activeTabId: id
      };
    });
  },

  closeTab: (id: string) => set(state => {
    let newTabs = state.tabs.filter(t => t.id !== id);
    let newActiveTabId = state.activeTabId;

    if (state.activeTabId === id) {
      const closedTabIndex = state.tabs.findIndex(t => t.id === id);
      if (newTabs.length > 0) {
        newActiveTabId = newTabs[closedTabIndex]?.id || newTabs[closedTabIndex - 1]?.id || null;
      } else {
        newActiveTabId = null;
      }
    }

    const closedTab = state.tabs.find(t => t.id === id);
    if (closedTab?.type === 'file') {
      newTabs = newTabs.filter(t => t.previewOf !== id);
    }

    return {
      tabs: newTabs,
      activeTabId: newActiveTabId
    };
  }),

  setActiveTab: (id: string) => set({ activeTabId: id }),

  updateTabContent: (id: string, content: string) => set(state => ({
    tabs: state.tabs.map(tab => {
      if (tab.id === id) {
        return { ...tab, content };
      }
      if (tab.type === 'preview' && tab.previewOf === id) {
        return { ...tab, content };
      }
      return tab;
    })
  })),

  setTabDirty: (id: string, isDirty: boolean) => set(state => ({
    tabs: state.tabs.map(tab =>
      tab.id === id ? { ...tab, isDirty } : tab
    )
  })),

  togglePreview: (fileTabId: string) => {
    const state = get();
    const fileTab = state.tabs.find(t => t.id === fileTabId);
    
    if (!fileTab) return;

    const existingPreview = state.tabs.find(t => 
      t.type === 'preview' && t.previewOf === fileTabId
    );

    if (existingPreview) {
      if (state.activeTabId === existingPreview.id) {
        set({ activeTabId: fileTabId });
      } else {
        set({ activeTabId: existingPreview.id });
      }
    } else {
      get().addTab({
        content: fileTab.content,
        type: 'preview',
        title: `Preview: ${fileTab.title}`,
        previewOf: fileTabId
      });
    }
  },

  setPendingModification: (modification: CodeModification | null) => 
    set({ pendingModification: modification }),

  clearPendingModification: () => set({ pendingModification: null })
}));