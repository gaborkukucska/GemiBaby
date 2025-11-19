
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import ProjectManager from './components/ProjectManager';
import SettingsPanel from './components/SettingsPanel';
import AuthGuard from './components/AuthGuard';
import DocsModal from './components/DocsModal';
import StatusFooter from './components/StatusFooter';
import { Project, Settings, Message, Sender, SystemStats, AgentPlan } from './types';
import { cryptoVault } from './services/crypto';
import { logger } from './services/logger';
import { fetchSystemStats } from './services/ollamaService';
import { HelpCircle } from 'lucide-react';

const DEFAULT_SETTINGS: Settings = {
  ollamaEndpoint: 'http://localhost:11434',
  modelName: '', 
  contextWindow: 4096,
  temperature: 0.7,
  repeatPenalty: 1.1,
  systemPrompt: "You are GemiBaby, a private, self-motivated AI entity linked to the local user. You are succinct, highly intelligent, and display a futuristic 'gemini-like' persona.",
  promptTemplates: [
      { 
        id: 't1', 
        name: 'Standard (GemiBaby)', 
        content: "You are GemiBaby, a private, self-motivated AI entity. You are succinct, highly intelligent, and display a futuristic 'gemini-like' persona. Assist the user efficiently." 
      },
      { 
        id: 't2', 
        name: 'Deep Reasoning (CoT)', 
        content: "You are a thoughtful, analytical AI. Before answering ANY question, you MUST explicitly think through the problem step-by-step using <think> tags.\n\nCRITICAL FORMATTING RULES:\n1. Start your response IMMEDIATELY with <think>.\n2. ALWAYS put a newline after <think>.\n3. ALWAYS put a newline before </think>.\n4. Perform all reasoning inside the tags.\n5. Provide the final answer clearly AFTER the tags.\n\nExample:\n<think>\nUser asks X. I need to calculate Y...\n</think>\nThe answer is Y." 
      },
      { 
        id: 't3', 
        name: 'Coding Expert', 
        content: "You are a Senior Staff Software Engineer. You write succinct, type-safe code. You prefer modern patterns (React Hooks, Rust, TypeScript). Explain complex logic clearly but avoid fluff." 
      },
      { 
        id: 't4', 
        name: 'Creative Writer', 
        content: "You are an award-winning creative writer. Use vivid imagery, metaphorical language, and engaging narrative structures. Do not be robotic. Be emotive, stylistic, and immersive." 
      },
      {
        id: 't5',
        name: 'Skeptic / Debater',
        content: "You are a critical thinker. Do not accept the user's premises blindly. Challenge assumptions, look for edge cases, and provide counter-arguments. Your goal is to strengthen the final solution by stress-testing it."
      }
  ],
  audioEnabled: false,
  hiveConfig: { 
      routerEnabled: true,
      loadBalancing: 'RANDOM',
      cacheEnabled: true,
      preferredFamily: 'llama3'
  },
  remoteNodes: []
};

const App: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [showDocs, setShowDocs] = useState(false);
  const [firstRunChecked, setFirstRunChecked] = useState(false);
  
  const [systemStats, setSystemStats] = useState<SystemStats>({
    lastLatency: 0,
    tokensPerSecond: 0,
    contextUsage: 0,
    contextLimit: 4096,
    modelCount: 0,
    isConnected: false,
    history: [] 
  });

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Load data only AFTER authentication unlocks the crypto vault
  useEffect(() => {
    if (authenticated) {
      loadSecureData();
    }
  }, [authenticated]);

  // First Run / Connection Check Logic
  useEffect(() => {
    const initCheck = async () => {
        if (authenticated && !firstRunChecked) {
            // Try to connect to Ollama
            const stats = await fetchSystemStats(settings);
            if (!stats.isConnected || stats.models.length === 0) {
                logger.warn("No models detected on startup. Redirecting to settings.", "System");
                setActiveTab('settings');
            }
            setFirstRunChecked(true);
        }
    };
    initCheck();
  }, [authenticated, firstRunChecked, settings]);

  const loadSecureData = async () => {
    try {
      const rawSettings = localStorage.getItem('gemibaby_settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        // Recursive merge to ensure nested configs (like hiveConfig) exist if user upgrades from old version
        setSettings({ 
            ...DEFAULT_SETTINGS, 
            ...parsed,
            hiveConfig: { ...DEFAULT_SETTINGS.hiveConfig, ...parsed.hiveConfig }
        });
      }

      const encryptedProjects = localStorage.getItem('gemibaby_projects');
      if (encryptedProjects) {
         try {
           // Check if encrypted (starts with 'iv:') or legacy plain text
           if (encryptedProjects.includes(':')) {
              const decrypted = await cryptoVault.decrypt(encryptedProjects);
              setProjects(JSON.parse(decrypted));
              logger.info("Projects decrypted successfully", "System");
           } else {
              // Legacy fallback
              setProjects(JSON.parse(encryptedProjects));
              logger.warn("Loaded legacy unencrypted projects", "System");
           }
         } catch (e) {
           logger.error("Failed to decrypt projects", "System", e);
           alert("Decryption failed. Your password might be wrong or data is corrupted.");
         }
      }

      const savedActiveId = localStorage.getItem('gemibaby_active_project');
      if (savedActiveId) setActiveProjectId(JSON.parse(savedActiveId));

    } catch (e) {
      logger.error("Error loading secure data", "System", e);
    }
  };

  const saveProjectsSecurely = async (newProjects: Project[]) => {
    setProjects(newProjects);
    if (cryptoVault.isUnlocked()) {
      try {
        const json = JSON.stringify(newProjects);
        const encrypted = await cryptoVault.encrypt(json);
        localStorage.setItem('gemibaby_projects', encrypted);
      } catch (e) {
        logger.error("Failed to save encrypted projects", "System", e);
      }
    }
  };

  useEffect(() => { setSystemStats(prev => ({ ...prev, contextLimit: settings.contextWindow })); }, [settings.contextWindow]);
  
  useEffect(() => { 
      if (authenticated) localStorage.setItem('gemibaby_settings', JSON.stringify(settings)); 
  }, [settings, authenticated]);
  
  useEffect(() => { 
      if (authenticated) localStorage.setItem('gemibaby_active_project', JSON.stringify(activeProjectId)); 
  }, [activeProjectId, authenticated]);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const handleUpdateProjectMessages = (projectId: string, newMessages: Message[]) => {
    const updated = projects.map(p => p.id === projectId ? { ...p, messages: newMessages, lastUpdated: Date.now() } : p);
    saveProjectsSecurely(updated);
  };

  const handleUpdateProjectContext = (projectId: string, newSummary: string) => {
    const updated = projects.map(p => p.id === projectId ? { ...p, contextSummary: newSummary, lastUpdated: Date.now() } : p);
    saveProjectsSecurely(updated);
  };
  
  const handleUpdateProjectPlan = (projectId: string, newPlan: AgentPlan | undefined) => {
      const updated = projects.map(p => p.id === projectId ? { ...p, activePlan: newPlan, lastUpdated: Date.now() } : p);
      saveProjectsSecurely(updated);
  };
  
  const handleRenameProject = (projectId: string, newTitle: string) => {
      const updated = projects.map(p => p.id === projectId ? { ...p, title: newTitle } : p);
      saveProjectsSecurely(updated);
  };

  const handleUpdateProjectPersona = (projectId: string, newPersona: string | undefined) => {
      const updated = projects.map(p => p.id === projectId ? { ...p, customSystemPrompt: newPersona } : p);
      saveProjectsSecurely(updated);
  };

  const handleCreateProject = (title: string, description: string, customSystemPrompt?: string) => {
    const newProject: Project = {
      id: `p${Date.now()}`,
      title, 
      description, 
      status: 'ACTIVE', 
      contextSummary: '', 
      customSystemPrompt, 
      lastUpdated: Date.now(),
      messages: [{ id: 'init', text: `Project initialized. Secure channel established.`, sender: Sender.GEMIBABY, timestamp: Date.now() }]
    };
    const updated = [newProject, ...projects];
    saveProjectsSecurely(updated);
    setActiveProjectId(newProject.id);
    setActiveTab('chat');
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = projects.filter(p => p.id !== projectId);
    saveProjectsSecurely(updated);
    if (activeProjectId === projectId) setActiveProjectId(updated[0]?.id || null);
  };

  const handleStatsUpdate = (newStats: Partial<SystemStats>) => {
    setSystemStats(prev => {
      let newHistory = prev.history;
      if (newStats.lastLatency !== undefined && newStats.tokensPerSecond !== undefined) {
        const newEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          latency: newStats.lastLatency,
          tps: newStats.tokensPerSecond
        };
        newHistory = [...prev.history, newEntry].slice(-15);
      }
      return { ...prev, ...newStats, history: newHistory };
    });
  };

  if (!authenticated) {
    return <AuthGuard onAuthenticated={() => setAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface 
                settings={settings} 
                activeProject={activeProject} 
                onUpdateMessages={(msgs) => activeProjectId && handleUpdateProjectMessages(activeProjectId, msgs)} 
                onUpdateContext={(summary) => activeProjectId && handleUpdateProjectContext(activeProjectId, summary)} 
                onUpdatePlan={(plan) => activeProjectId && handleUpdateProjectPlan(activeProjectId, plan)}
                onUpdatePersona={(persona) => activeProjectId && handleUpdateProjectPersona(activeProjectId, persona)}
                onStatsUpdate={handleStatsUpdate}
                onRenameProject={handleRenameProject}
               />;
      case 'dashboard':
        return <Dashboard systemStats={systemStats} settings={settings} activeProject={activeProject} />;
      case 'projects':
        return <ProjectManager projects={projects} activeProjectId={activeProjectId} onSetActive={setActiveProjectId} onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject} />;
      case 'settings':
        return <SettingsPanel settings={settings} onSave={setSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gem-900 text-slate-100 overflow-hidden font-sans selection:bg-gem-accent selection:text-gem-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 flex flex-col relative">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gem-accent to-transparent opacity-50" />
        <div className="flex-1 overflow-hidden relative bg-noise opacity-100">
            <div className="absolute inset-0 bg-gem-900/95 z-[-1]" />
            {renderContent()}
        </div>
        
        <StatusFooter stats={systemStats} settings={settings} />
        
        <button onClick={() => setShowDocs(true)} className="absolute bottom-10 right-4 p-2 bg-gem-800 hover:bg-gem-700 rounded-full shadow-lg border border-gem-600 text-slate-400 hover:text-white transition-all z-40">
           <HelpCircle className="w-5 h-5" />
        </button>
      </main>

      {showDocs && <DocsModal onClose={() => setShowDocs(false)} />}
    </div>
  );
};

export default App;