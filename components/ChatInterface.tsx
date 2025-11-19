
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Sparkles, Bot, User as UserIcon, Archive, Eraser, Paperclip, X, Square, Database, ChevronDown, ChevronRight, FileText, Save, Network, Zap, ListChecks, Play, CheckSquare, Loader2, FastForward, Copy, Check, RefreshCw, Edit2, ArrowDown, Eye, Code, UploadCloud, Command, PieChart, Settings as SettingsIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Sender, Settings, Project, SystemStats, AgentPlan, TaskStep } from '../types';
import { chatWithLocalLLM, generateContextSummary, estimateTokens, generateAgentPlan, generateSmartTitle, fetchLocalModels } from '../services/ollamaService';
import { logger } from '../services/logger';
import AudioVisualizer from './AudioVisualizer';

interface ChatInterfaceProps {
  settings: Settings;
  activeProject: Project | null;
  onUpdateMessages: (messages: Message[]) => void;
  onUpdateContext: (summary: string) => void;
  onUpdatePlan: (plan: AgentPlan | undefined) => void;
  onUpdatePersona?: (persona: string | undefined) => void;
  onStatsUpdate: (stats: Partial<SystemStats>) => void;
  onRenameProject?: (id: string, newTitle: string) => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface AttachedDoc {
    name: string;
    content: string;
}

type RoutingMode = 'AUTO' | 'CREATIVE' | 'CODE';

// --- Artifact / Code Block Component ---
const CodeArtifact = ({ children, className, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match && !String(children).includes('\n');
    const [showPreview, setShowPreview] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const codeContent = String(children).replace(/\n$/, '');
    const language = match ? match[1] : '';
    const isPreviewable = language === 'html' || language === 'svg' || language === 'xml';

    const handleCopy = () => {
        navigator.clipboard.writeText(codeContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isInline) {
        return <code className="bg-gem-900/50 px-1.5 py-0.5 rounded text-pink-300 font-mono text-xs border border-pink-500/20" {...props}>{children}</code>;
    }

    const lines = codeContent.split('\n');

    return (
        <div className="not-prose my-3 rounded-lg overflow-hidden border border-gem-700 bg-[#0d1117] shadow-lg group">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gem-800 border-b border-gem-700">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{language || 'CODE'}</span>
                    {isPreviewable && (
                        <div className="flex bg-gem-900 rounded p-0.5 border border-gem-700/50">
                            <button 
                                onClick={() => setShowPreview(false)}
                                className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 transition-colors ${!showPreview ? 'bg-gem-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Code className="w-3 h-3" /> Code
                            </button>
                            <button 
                                onClick={() => setShowPreview(true)}
                                className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 transition-colors ${showPreview ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Eye className="w-3 h-3" /> Preview
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "COPIED" : "COPY"}
                </button>
            </div>
            
            {showPreview && isPreviewable ? (
                <div className="bg-white p-4 overflow-auto min-h-[150px] border-b border-gem-700">
                     {/* Sandboxed Preview */}
                     <iframe 
                        srcDoc={codeContent} 
                        title="artifact-preview"
                        className="w-full h-full min-h-[200px] border-0 bg-white"
                        sandbox="allow-scripts"
                     />
                </div>
            ) : (
                <div className="relative overflow-x-auto">
                    <div className="flex min-w-full">
                        {/* Line Numbers */}
                        <div className="flex flex-col text-right px-2 py-3 bg-gem-900/50 border-r border-gem-700/50 select-none text-[10px] font-mono text-slate-600">
                             {lines.map((_, i) => <span key={i} className="leading-relaxed">{i + 1}</span>)}
                        </div>
                        {/* Code Content */}
                        <pre className="flex-1 p-3 text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre tab-4">
                            <code className={className} {...props}>
                                {codeContent}
                            </code>
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
  };

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  settings, 
  activeProject, 
  onUpdateMessages,
  onUpdateContext,
  onUpdatePlan,
  onUpdatePersona,
  onStatsUpdate,
  onRenameProject
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [tempMemory, setTempMemory] = useState('');
  const [routingMode, setRoutingMode] = useState<RoutingMode>('AUTO');
  const [plannerMode, setPlannerMode] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [modelOverride, setModelOverride] = useState<string | null>(null);
  
  // Header UI States
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  // Message History for Up/Down Arrow Recall
  const [msgHistory, setMsgHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Context Usage State
  const [contextUsagePct, setContextUsagePct] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const synth = window.speechSynthesis;

  const messages = activeProject?.messages || [];
  const currentPlan = activeProject?.activePlan;

  useEffect(() => {
    if (activeProject) {
        let count = estimateTokens(activeProject.contextSummary || '') + estimateTokens(activeProject.customSystemPrompt || settings.systemPrompt);
        messages.forEach(m => count += estimateTokens(m.text));
        
        // Calculate percentage
        const pct = Math.min(100, (count / settings.contextWindow) * 100);
        setContextUsagePct(pct);

        onStatsUpdate({ contextUsage: count });
    }
  }, [messages, activeProject, settings.systemPrompt, settings.contextWindow, onStatsUpdate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Intelligent Scroll Handling
  const handleScroll = () => {
      if (scrollContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
          setShouldAutoScroll(isNearBottom);
          setShowScrollButton(!isNearBottom);
      }
  };

  useEffect(() => {
    if (shouldAutoScroll) {
        scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = '56px';
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Smart Renaming Logic
  useEffect(() => {
      const checkRename = async () => {
          if (activeProject && onRenameProject && messages.length === 3 && (activeProject.title.startsWith('New Project') || activeProject.title.startsWith('Untitled'))) {
             const userMsg = messages.find(m => m.sender === Sender.USER);
             if (userMsg) {
                 const newTitle = await generateSmartTitle(userMsg.text, settings);
                 if (newTitle) {
                     onRenameProject(activeProject.id, newTitle);
                     logger.info(`Smart Renamed project to: ${newTitle}`, 'System');
                 }
             }
          }
      };
      checkRename();
  }, [messages, activeProject, settings, onRenameProject]);

  useEffect(() => {
      if (isAutoRunning && currentPlan && !isProcessing && !generatingPlan) {
          const nextStep = currentPlan.steps.find(s => s.status === 'PENDING');
          if (nextStep) {
              const timer = setTimeout(() => executePlanStep(nextStep), 1500);
              return () => clearTimeout(timer);
          } else {
              setIsAutoRunning(false);
              speak("Agent plan execution complete.");
          }
      }
  }, [currentPlan, isAutoRunning, isProcessing, generatingPlan]);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      
      recognitionRef.current.onresult = (event: any) => {
        if(event.results[0].isFinal) {
            setInputValue(prev => (prev ? prev + " " : "") + event.results[0][0].transcript);
        }
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const speak = (text: string) => {
    if (!settings.audioEnabled) return;
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.speak(utterance);
  };

  const processFiles = (files: FileList) => {
      Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
               if (ev.target?.result) {
                   setAttachedImages(prev => [...prev, ev.target!.result as string]);
                   logger.info("Image attached via Drop", "Input", { name: file.name });
               }
            };
            reader.readAsDataURL(file);
          } 
          else if (
              file.type.startsWith('text/') || 
              file.name.match(/\.(js|ts|tsx|jsx|py|json|md|css|html|java|c|cpp|h|rs|go|sql|yaml|yml|toml)$/i)
          ) {
             const reader = new FileReader();
             reader.onload = (ev) => {
                if (ev.target?.result) {
                    setAttachedDocs(prev => [...prev, { name: file.name, content: ev.target!.result as string }]);
                    logger.info("Document attached via Drop", "Input", { name: file.name });
                }
             };
             reader.readAsText(file);
          }
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(e.dataTransfer.files);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsProcessing(false);
        setIsAutoRunning(false);
        logger.warn("User manually stopped generation", "ChatInterface");
    }
  };

  const handleGeneratePlan = async () => {
      if (!inputValue.trim()) return;
      setGeneratingPlan(true);
      setPlannerMode(true);
      
      try {
          const steps = await generateAgentPlan(inputValue, settings);
          const plan: AgentPlan = {
              id: Date.now().toString(),
              goal: inputValue,
              steps: steps,
              isActive: true
          };
          onUpdatePlan(plan);
          setInputValue('');
      } catch (e) {
          // Error handled in service
      } finally {
          setGeneratingPlan(false);
      }
  };
  
  const executePlanStep = async (step: TaskStep) => {
      if (!currentPlan || isProcessing) return;
      
      const updatedSteps = currentPlan.steps.map(s => s.id === step.id ? { ...s, status: 'IN_PROGRESS' } : s);
      onUpdatePlan({ ...currentPlan, steps: updatedSteps as any });

      const completedSteps = currentPlan.steps.filter(s => s.status === 'COMPLETED');
      const executionContext = completedSteps.length > 0 
        ? `\n\n[PREVIOUSLY COMPLETED STEPS & RESULTS]:\n${completedSteps.map(s => `- Step: ${s.description}\n  Result Summary: ${s.result?.substring(0, 200)}...`).join('\n')}` 
        : '';

      const prompt = `[AGENT EXECUTION - STEP: ${step.description}]\nGOAL: ${currentPlan.goal}${executionContext}\n\nCURRENT TASK: ${step.description}\nPlease execute this step thoroughly. Return your response.`;
      
      await handleSendInternal(prompt, [], [], true, (output) => {
          const finishedSteps = currentPlan.steps.map(s => s.id === step.id ? { ...s, status: 'COMPLETED', result: output } : s);
          onUpdatePlan({ ...currentPlan, steps: finishedSteps as any });
      });
  };

  const handleRegenerate = async () => {
      if (isProcessing || messages.length === 0) return;

      // Find the last user message
      let lastUserIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].sender === Sender.USER) {
              lastUserIndex = i;
              break;
          }
      }

      if (lastUserIndex !== -1) {
          // Keep messages up to the last user message
          const messagesToKeep = messages.slice(0, lastUserIndex + 1);
          
          setIsProcessing(true);
          const aiMsgId = (Date.now() + 1).toString();
          const aiPlaceholder: Message = {
            id: aiMsgId,
            text: '',
            sender: Sender.GEMIBABY,
            timestamp: Date.now(),
            isThinking: true,
            thoughtProcess: ''
          };
          
          // Atomic update
          const updatedMessages = [...messagesToKeep, aiPlaceholder];
          onUpdateMessages(updatedMessages);
          setShouldAutoScroll(true);
          
          const lastUserMsg = messages[lastUserIndex];
          triggerLLM(lastUserMsg.text, messagesToKeep, aiPlaceholder, updatedMessages);
      }
  };

  // Extracted LLM Trigger Logic to support Regeneration
  const triggerLLM = async (
      promptText: string, 
      history: Message[], 
      aiPlaceholder: Message, 
      fullMessageList: Message[],
      images: string[] = [],
      optionsOverride?: any,
      onComplete?: (output: string) => void
  ) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      let currentFullText = '';
      let currentThought = '';
      
      let targetModelOverride = modelOverride;
      let _optionsOverride = optionsOverride;

      if (routingMode === 'CODE') {
          if (settings.hiveConfig.coderModel) targetModelOverride = settings.hiveConfig.coderModel;
          _optionsOverride = { ..._optionsOverride, temperature: 0.2 };
      }
      else if (routingMode === 'CREATIVE') {
          if (settings.hiveConfig.creativeModel) targetModelOverride = settings.hiveConfig.creativeModel;
          _optionsOverride = { ..._optionsOverride, temperature: 0.9 };
      }

      logger.debug(`Dispatching to Neural Router`, 'ChatInterface', { mode: routingMode, target: targetModelOverride || 'DEFAULT' });

      const stats = await chatWithLocalLLM(
          promptText,
          history, // Pass history WITHOUT the placeholder
          activeProject?.contextSummary || '',
          activeProject?.customSystemPrompt,
          settings,
          images,
          abortController.signal,
          (chunk, thoughtChunk, isThinking) => {
              if (thoughtChunk) currentThought += thoughtChunk;
              if (chunk) currentFullText += chunk;
              
              const newHistory = fullMessageList.map(m => m.id === aiPlaceholder.id ? {
                  ...m,
                  text: currentFullText, 
                  thoughtProcess: currentThought,
                  isThinking: isThinking
              } : m);
              onUpdateMessages(newHistory);
          },
          targetModelOverride,
          _optionsOverride
      );
      
      // Final consistency check
      const newHistory = fullMessageList.map(m => m.id === aiPlaceholder.id ? {
          ...m,
          text: currentFullText || (currentThought ? "(Reasoning complete. No final response provided.)" : ""),
          thoughtProcess: currentThought,
          isThinking: false
      } : m);
      onUpdateMessages(newHistory);

      if (stats) {
          onStatsUpdate({
              lastLatency: stats.evalDuration, 
              tokensPerSecond: stats.tokensPerSecond,
              contextUsage: stats.promptEvalCount + stats.evalCount, 
              isConnected: true
          });
      }

      setIsProcessing(false);
      abortControllerRef.current = null;
      speak(currentFullText);
      if (onComplete) onComplete(currentFullText);
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeDoc = (index: number) => {
    setAttachedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendInternal = async (text: string, imgs: string[] = [], docs: AttachedDoc[] = [], isAgentAction = false, onComplete?: (fullText: string) => void) => {
      if (isProcessing) return;
      if (synth.speaking) synth.cancel();
      
      let fullText = text;
      if (docs.length > 0 && !isAgentAction) {
          fullText += "\n\n" + docs.map(doc => `--- FILE: ${doc.name} ---\n${doc.content}\n--- END FILE ---`).join("\n\n");
      }

      const userMsg: Message = {
        id: Date.now().toString(),
        text: isAgentAction ? `Execute Step: ${text.split('CURRENT TASK: ')[1]?.split('\n')[0] || text}` : fullText,
        sender: isAgentAction ? Sender.SYSTEM : Sender.USER,
        timestamp: Date.now(),
        images: (!isAgentAction && imgs.length > 0) ? [...imgs] : undefined
      };
      
      if (!isAgentAction) {
          setInputValue('');
          setAttachedImages([]);
          setAttachedDocs([]);
          // Update History
          setMsgHistory(prev => [text, ...prev]);
          setHistoryIndex(-1);
      }
      setIsProcessing(true);
      setShouldAutoScroll(true);

      const aiMsgId = (Date.now() + 1).toString();
      const aiPlaceholder: Message = {
        id: aiMsgId,
        text: '',
        sender: Sender.GEMIBABY,
        timestamp: Date.now(),
        isThinking: true,
        thoughtProcess: '' 
      };
      
      // Consolidate into single atomic update to prevent UI flicker
      const messagesWithUser = [...messages, userMsg];
      const messagesWithPlaceholder = [...messagesWithUser, aiPlaceholder];
      onUpdateMessages(messagesWithPlaceholder);
      
      const apiImages = userMsg.images?.map(img => img.split(',')[1]) || [];

      await triggerLLM(userMsg.text, messagesWithUser, aiPlaceholder, messagesWithPlaceholder, apiImages, undefined, onComplete);
  };

  const processSlashCommand = async (cmdString: string) => {
      const parts = cmdString.trim().split(' ');
      const cmd = parts[0].toLowerCase().slice(1);
      const args = parts.slice(1);
      const argStr = args.join(' ');

      setInputValue('');

      switch(cmd) {
          case 'clear':
          case 'cls':
              handleClearChat();
              break;
          case 'help':
              const helpMsg: Message = {
                  id: Date.now().toString(),
                  text: `### 🛠️ Terminal Commands Reference
| Command | Description |
| :--- | :--- |
| \`/clear\`, \`/cls\` | Clears the current session history. |
| \`/mode <type>\` | Routes logic: \`auto\`, \`code\`, \`creative\`. |
| \`/model <name>\` | Overrides the active model for this session. |
| \`/load <name>\` | Switches Persona (fuzzy search). |
| \`/plan <goal>\` | Activates Agent Planner with goal. |
| \`/sys <prompt>\` | Overrides the System Prompt for this session. |
| \`/memory\` | Opens the Long-term Memory editor. |
| \`/forget\` | Wipes the Long-term Memory summary. |
| \`/status\` | Displays current context and model stats. |`,
                  sender: Sender.SYSTEM,
                  timestamp: Date.now()
              };
              onUpdateMessages([...messages, helpMsg]);
              break;
          case 'mode':
              if (argStr) {
                  const m = argStr.toUpperCase();
                  if (['AUTO', 'CODE', 'CREATIVE'].includes(m)) {
                      setRoutingMode(m as RoutingMode);
                      onUpdateMessages([...messages, { id: Date.now().toString(), text: `Routing Mode switched to: **${m}**`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
                  } else {
                      onUpdateMessages([...messages, { id: Date.now().toString(), text: `Invalid mode. Use: AUTO, CODE, or CREATIVE`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
                  }
              }
              break;
          case 'switch':
          case 'model':
              if (argStr) {
                  setModelOverride(argStr);
                  onUpdateMessages([...messages, { id: Date.now().toString(), text: `**Session Model Override**: Switched to \`${argStr}\` for next request.`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
              } else {
                  try {
                    // Async fetch logic for UI feedback
                    const pendingMsgId = 'pending-' + Date.now();
                    const pendingMsg = { id: pendingMsgId, text: 'Network Scan: Fetching available models...', sender: Sender.SYSTEM, timestamp: Date.now() };
                    
                    // IMPORTANT: Use functional state updates or pass the EXACT new array to avoid stale closures issues with React Batching
                    // Since we are in a component, we use the prop `messages`.
                    // But we need to render this intermediate state.
                    const msgsWithPending = [...messages, pendingMsg];
                    onUpdateMessages(msgsWithPending);
                    
                    const available = await fetchLocalModels(settings.ollamaEndpoint);
                    const modelList = available.map(m => `\`${m}\``).join(', ');
                    
                    // Remove pending message and add the result
                    const finalMsgs = messages.filter(m => m.id !== pendingMsgId);
                    
                    onUpdateMessages([...finalMsgs, { 
                        id: Date.now().toString(), 
                        text: `**Current Session Model:** \`${modelOverride || settings.modelName}\`\n**Available Models:** ${modelList}\n\nUsage: \`/model <name>\` to switch.`, 
                        sender: Sender.SYSTEM, 
                        timestamp: Date.now() 
                    }]);
                  } catch(e) {
                      onUpdateMessages([...messages, { id: Date.now().toString(), text: `Failed to fetch model list. Current override: ${modelOverride || 'None'}.`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
                  }
              }
              break;
          case 'load':
              if (argStr && onUpdatePersona) {
                  const match = settings.promptTemplates?.find(t => t.name.toLowerCase().includes(argStr.toLowerCase()));
                  if (match) {
                      onUpdatePersona(match.content);
                       onUpdateMessages([...messages, { id: Date.now().toString(), text: `Persona updated to: **${match.name}**`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
                  } else {
                       onUpdateMessages([...messages, { id: Date.now().toString(), text: `Template not found: ${argStr}`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
                  }
              }
              break;
          case 'sys':
              if (argStr && onUpdatePersona) {
                  onUpdatePersona(argStr);
                  onUpdateMessages([...messages, { id: Date.now().toString(), text: `**System Persona updated** via CLI override.`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
              } else {
                  onUpdateMessages([...messages, { id: Date.now().toString(), text: `Usage: /sys <prompt text>`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
              }
              break;
          case 'memory':
              setTempMemory(activeProject?.contextSummary || '');
              setShowMemoryModal(true);
              break;
          case 'forget':
              onUpdateContext('');
              onUpdateMessages([...messages, { id: Date.now().toString(), text: `Project context memory wiped.`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
              break;
          case 'plan':
              setPlannerMode(true);
              if (argStr) {
                  setInputValue(argStr);
              }
              break;
          case 'status':
              const statusMsg = `**System Status**
- **Active Model:** ${modelOverride || settings.modelName}
- **Routing Mode:** ${routingMode}
- **Context Usage:** ${contextUsagePct.toFixed(1)}%
- **Persona:** ${activeProject?.customSystemPrompt ? 'Custom' : 'Standard'}
- **Planner:** ${currentPlan ? 'Active' : 'Idle'}`;
              onUpdateMessages([...messages, { id: Date.now().toString(), text: statusMsg, sender: Sender.SYSTEM, timestamp: Date.now() }]);
              break;
          default:
              onUpdateMessages([...messages, { id: Date.now().toString(), text: `Unknown command: /${cmd}. Type /help for list.`, sender: Sender.SYSTEM, timestamp: Date.now() }]);
      }
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && attachedImages.length === 0 && attachedDocs.length === 0) || isProcessing) return;
    
    if (inputValue.startsWith('/')) {
        processSlashCommand(inputValue);
        return;
    }

    if (plannerMode && !currentPlan) {
        handleGeneratePlan();
    } else {
        handleSendInternal(inputValue, attachedImages, attachedDocs);
    }
  };

  const handleCompressContext = async () => {
    if (!activeProject || isProcessing) return;
    setIsProcessing(true);
    logger.info("Manual context compression triggered", "ChatInterface");

    const msgsToSummarize = messages.slice(0, Math.floor(messages.length * 0.7));
    const textBlock = msgsToSummarize.map(m => `${m.sender}: ${m.text}`).join('\n');
    
    const summary = await generateContextSummary(textBlock, settings);
    const newSummary = activeProject.contextSummary ? activeProject.contextSummary + "\n[Update]: " + summary : summary;
    
    onUpdateContext(newSummary);
    const remainingMessages = messages.slice(Math.floor(messages.length * 0.7));
    const systemNote: Message = {
      id: Date.now().toString(),
      text: `[System]: Context memory compressed. Long-term storage updated.`,
      sender: Sender.SYSTEM,
      timestamp: Date.now()
    };

    onUpdateMessages([systemNote, ...remainingMessages]);
    setIsProcessing(false);
  };

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the chat history? This does not affect long-term memory.")) {
      logger.info("Chat history cleared by user", "ChatInterface");
      const systemMsg: Message = {
        id: Date.now().toString(),
        text: "Conversation history cleared.",
        sender: Sender.SYSTEM,
        timestamp: Date.now()
      };
      onUpdateMessages([systemMsg]);
      onUpdatePlan(undefined);
      setIsAutoRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Shortcuts
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        handleClearChat();
    }
    if (e.key === 'Escape') {
        handleStopGeneration();
    }
    
    // History Navigation
    if (e.key === 'ArrowUp') {
         if (inputValue === '') {
             e.preventDefault();
             if (msgHistory.length > 0) {
                 const nextIndex = historyIndex + 1;
                 if (nextIndex < msgHistory.length) {
                     setInputValue(msgHistory[nextIndex]);
                     setHistoryIndex(nextIndex);
                 }
             }
         } else if (historyIndex !== -1) {
             // If we are currently browsing history, allow navigating further up even if text exists
             e.preventDefault();
             const nextIndex = historyIndex + 1;
             if (nextIndex < msgHistory.length) {
                 setInputValue(msgHistory[nextIndex]);
                 setHistoryIndex(nextIndex);
             }
         }
    }
    
    if (e.key === 'ArrowDown') {
         if (historyIndex !== -1) {
             e.preventDefault();
             const nextIndex = historyIndex - 1;
             if (nextIndex >= 0) {
                 setInputValue(msgHistory[nextIndex]);
                 setHistoryIndex(nextIndex);
             } else {
                 setInputValue('');
                 setHistoryIndex(-1);
             }
         }
    }
  };

  const MessageContent: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return <div className="flex items-center gap-1 h-5 px-2"><div className="w-1.5 h-1.5 bg-gem-accent rounded-full animate-bounce"></div></div>;

    return (
        <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code: CodeArtifact, 
                    p: ({children}) => <p className="mb-2 leading-relaxed">{children}</p>,
                    h1: ({children}) => <h1 className="text-xl font-bold text-white mb-2 mt-4 border-b border-gem-700 pb-1">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-bold text-sky-300 mb-2 mt-3">{children}</h2>,
                    h3: ({children}) => <h3 className="text-md font-bold text-sky-400 mb-1 mt-2">{children}</h3>,
                    ul: ({children}) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
                    li: ({children, className}) => {
                        // Custom checkbox rendering for checklists
                        if (className === 'task-list-item') {
                             return <li className="flex items-start gap-2 list-none -ml-4 mb-1">{children}</li>;
                        }
                        return <li>{children}</li>;
                    },
                    input: (props: any) => {
                         if (props.type === 'checkbox') {
                             return (
                                 <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${props.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500 bg-transparent'}`}>
                                     {props.checked && <Check className="w-3 h-3 stroke-[3]" />}
                                 </div>
                             );
                         }
                         return <input {...props} />;
                    },
                    a: ({href, children}) => <a href={href} target="_blank" rel="noreferrer" className="text-gem-accent hover:underline decoration-dotted underline-offset-4">{children}</a>,
                    blockquote: ({children}) => <blockquote className="border-l-2 border-gem-accent/50 pl-4 py-1 my-2 text-slate-400 italic bg-gem-800/30 rounded-r">{children}</blockquote>,
                    table: ({children}) => <div className="overflow-x-auto my-3 border border-gem-700 rounded"><table className="min-w-full divide-y divide-gem-700">{children}</table></div>,
                    th: ({children}) => <th className="px-3 py-2 bg-gem-800 text-left text-xs font-bold text-white uppercase tracking-wider">{children}</th>,
                    td: ({children}) => <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300 border-t border-gem-700">{children}</td>,
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
  };

  const MessageActions = ({ msg }: { msg: Message }) => {
      const [copied, setCopied] = useState(false);
      const handleCopy = () => {
          navigator.clipboard.writeText(msg.text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      };
      
      return (
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end border-t border-white/5 pt-2">
              <button onClick={handleCopy} className="p-1 hover:bg-black/20 rounded text-slate-400 hover:text-white" title="Copy Message">
                  {copied ? <Check className="w-3 h-3 text-emerald-400"/> : <Copy className="w-3 h-3"/>}
              </button>
              {msg.sender === Sender.GEMIBABY && !isProcessing && (
                  <button onClick={handleRegenerate} className="p-1 hover:bg-black/20 rounded text-slate-400 hover:text-gem-accent" title="Regenerate Response">
                      <RefreshCw className="w-3 h-3"/>
                  </button>
              )}
               {msg.sender === Sender.USER && !isProcessing && (
                   <button onClick={() => setInputValue(msg.text)} className="p-1 hover:bg-black/20 rounded text-slate-400 hover:text-white" title="Edit / Reuse">
                       <Edit2 className="w-3 h-3"/>
                   </button>
               )}
          </div>
      );
  };

  const ThoughtProcess: React.FC<{ thought: string, isThinking: boolean }> = ({ thought, isThinking }) => {
    const [isOpen, setIsOpen] = useState(true);
    // If thought is empty and not thinking, don't show it.
    if (!thought && !isThinking) return null;
    
    return (
        <div className={`mb-3 rounded-lg border border-gem-700/50 bg-gem-900/30 overflow-hidden transition-all duration-500 ${isThinking ? 'animate-thinking-pulse border-pink-500/30' : ''}`}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:bg-gem-800/50 transition-colors">
                <Zap className={`w-3 h-3 text-pink-400 ${isThinking ? 'animate-pulse' : ''}`} />
                <span className="font-mono uppercase tracking-wider">Thinking Process</span>
                {isOpen ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
            {isOpen && <div className="px-3 py-2 text-xs font-mono text-slate-500 bg-black/20 border-t border-gem-800/50 whitespace-pre-wrap animate-in slide-in-from-top-1">{thought || <span className="italic opacity-50">Analyzing...</span>}</div>}
        </div>
    );
  };
  
  const PlanWidget = () => {
      if (!currentPlan) return null;
      return (
          <div className="absolute top-16 right-4 w-72 bg-gem-900/90 backdrop-blur border border-gem-700 rounded-xl shadow-2xl p-4 z-20 flex flex-col max-h-[60vh] transition-all animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-sm text-purple-400 flex items-center gap-2"><ListChecks className="w-4 h-4" /> Agent Plan</h4>
                  <div className="flex items-center gap-1">
                       <button 
                         onClick={() => setIsAutoRunning(!isAutoRunning)} 
                         disabled={isProcessing}
                         className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded border transition-colors ${isAutoRunning ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse' : 'bg-gem-800 text-slate-400 border-gem-700 hover:text-emerald-400'}`}
                         title="Auto-Run Sequence"
                       >
                           {isAutoRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <FastForward className="w-3 h-3" />}
                           {isAutoRunning ? 'RUNNING' : 'AUTO'}
                       </button>
                       <button onClick={() => { setIsAutoRunning(false); onUpdatePlan(undefined); }} className="text-slate-500 hover:text-white p-1"><X className="w-3 h-3"/></button>
                  </div>
              </div>
              <div className="text-xs text-slate-300 mb-3 font-medium leading-tight border-b border-gem-700 pb-2">{currentPlan.goal}</div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gem-700">
                  {currentPlan.steps.map((step, idx) => (
                      <div key={step.id} className={`p-2 rounded border text-xs flex gap-2 items-start transition-colors ${step.status === 'COMPLETED' ? 'bg-emerald-500/10 border-emerald-500/30 opacity-70' : step.status === 'IN_PROGRESS' ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'bg-gem-800 border-gem-700'}`}>
                          <div className="mt-0.5">
                              {step.status === 'COMPLETED' ? <CheckSquare className="w-3 h-3 text-emerald-400"/> : 
                               step.status === 'IN_PROGRESS' ? <Loader2 className="w-3 h-3 text-purple-400 animate-spin"/> :
                               <Square className="w-3 h-3 text-slate-500" />}
                          </div>
                          <div className="flex-1">
                              <span className={step.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-200'}>{step.description}</span>
                              {step.status === 'PENDING' && !isProcessing && !isAutoRunning && (
                                  <button onClick={() => executePlanStep(step)} className="block mt-1 text-[10px] text-sky-400 hover:underline flex items-center gap-1">
                                      <Play className="w-2 h-2" /> Execute
                                  </button>
                              )}
                              {step.status === 'COMPLETED' && step.result && (
                                  <div className="mt-1 text-[9px] text-emerald-400 truncate opacity-60">✓ Done</div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  if (!activeProject) return <div className="h-full flex items-center justify-center flex-col text-slate-500"><Bot className="w-16 h-16 mb-4 opacity-20" /><p>Select a project.</p></div>;

  // Helper to find active persona name
  const activePersonaName = activeProject.customSystemPrompt 
    ? settings.promptTemplates?.find(t => t.content === activeProject.customSystemPrompt)?.name || 'Custom'
    : 'Standard';

  return (
    <div 
        className="flex flex-col h-full relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
    >
      {/* Drag Overlay */}
      {isDragging && (
          <div className="absolute inset-0 z-50 bg-gem-900/90 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-gem-accent m-4 rounded-2xl animate-in fade-in duration-200">
              <UploadCloud className="w-16 h-16 text-gem-accent mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-white">Drop files to attach</h3>
              <p className="text-slate-400 mt-2">Images for vision • Code for analysis</p>
          </div>
      )}

      {/* Header */}
      <div className="h-14 border-b border-gem-700 bg-gem-900/50 backdrop-blur flex items-center justify-between px-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gem-accent animate-pulse"></div>
          <span className="font-bold text-gem-accent truncate max-w-[150px] sm:max-w-xs" title={activeProject.title}>{activeProject.title}</span>
          
          {/* Audio Visualizer */}
          <AudioVisualizer isActive={isSpeaking || isListening} mode={isSpeaking ? 'SPEAKING' : 'LISTENING'} />

          {/* Persona Switcher */}
          <div className="relative ml-2">
              <button 
                onClick={() => setShowPersonaMenu(!showPersonaMenu)} 
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border transition-all ${activePersonaName !== 'Standard' ? 'bg-pink-500/10 text-pink-400 border-pink-500/30' : 'bg-gem-800 text-slate-400 border-gem-700'}`}
              >
                  <Bot className="w-3 h-3" />
                  {activePersonaName}
                  <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
              
              {showPersonaMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-gem-900 border border-gem-700 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                      <div className="px-2 py-1 text-[10px] text-slate-500 font-bold uppercase bg-gem-950/50 border-b border-gem-800">Switch Persona</div>
                      <button 
                        onClick={() => { onUpdatePersona?.(undefined); setShowPersonaMenu(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-gem-800 hover:text-white flex items-center gap-2"
                      >
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Standard (Default)
                      </button>
                      {settings.promptTemplates?.map(t => (
                          <button 
                            key={t.id}
                            onClick={() => { onUpdatePersona?.(t.content); setShowPersonaMenu(false); }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-gem-800 hover:text-white flex items-center gap-2"
                          >
                              <div className="w-1.5 h-1.5 rounded-full bg-pink-500" /> {t.name}
                          </button>
                      ))}
                      <div className="border-t border-gem-800 p-2">
                         <div className="text-[10px] text-slate-500 italic text-center">Use /load to switch via cmd</div>
                      </div>
                  </div>
              )}
          </div>
        </div>

        <div className="flex items-center gap-2">
           {/* Context Gauge */}
           <div className="hidden md:flex items-center gap-2 mr-2 px-2 py-1 bg-gem-800 rounded-full border border-gem-700" title="Context Window Usage">
               <PieChart className="w-3 h-3 text-slate-400" />
               <div className="w-16 h-1.5 bg-gem-900 rounded-full overflow-hidden">
                   <div className={`h-full transition-all duration-500 ${contextUsagePct > 90 ? 'bg-red-500' : 'bg-emerald-400'}`} style={{ width: `${contextUsagePct}%` }} />
               </div>
               <span className="text-[9px] font-mono text-slate-400">{contextUsagePct.toFixed(0)}%</span>
           </div>

           <button onClick={() => setPlannerMode(!plannerMode)} className={`p-2 rounded-lg transition-colors ${plannerMode || currentPlan ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-gem-800 hover:text-purple-400'}`} title="Agent Planner"><ListChecks className="w-4 h-4" /></button>
           <button onClick={() => { setTempMemory(activeProject?.contextSummary || ''); setShowMemoryModal(true); }} className="p-2 hover:bg-gem-800 rounded-lg text-slate-400 hover:text-purple-400" title="Edit Memory"><Database className="w-4 h-4" /></button>
           <button onClick={handleClearChat} className="p-2 hover:bg-gem-800 rounded-lg text-slate-400 hover:text-gem-danger" title="Clear Chat"><Eraser className="w-4 h-4" /></button>
           <button onClick={handleCompressContext} disabled={isProcessing} className="p-2 hover:bg-gem-800 rounded-lg text-slate-400 hover:text-gem-accent" title="Compress"><Archive className="w-4 h-4" /></button>
        </div>
      </div>
      
      {/* Plan Widget Overlay */}
      <PlanWidget />

      {/* Messages - Added padding bottom for status footer */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 pb-12 space-y-6 relative">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-4xl group ${msg.sender === Sender.USER ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.sender === Sender.GEMIBABY ? 'bg-gradient-to-br from-gem-accent to-purple-600' : msg.sender === Sender.SYSTEM ? 'bg-purple-900' : 'bg-slate-700'}`}>
              {msg.sender === Sender.GEMIBABY ? <Sparkles className="w-4 h-4 text-white" /> : msg.sender === Sender.SYSTEM ? <Bot className="w-4 h-4 text-purple-300"/> : <UserIcon className="w-4 h-4 text-slate-300" />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[90%] min-w-[200px] ${msg.sender === Sender.USER ? 'bg-gem-700 text-white' : msg.sender === Sender.SYSTEM ? 'bg-purple-900/30 text-purple-100 border border-purple-500/30' : 'bg-gem-800/90 text-slate-300 border border-gem-700/50'}`}>
              {msg.images?.map((img, i) => <img key={i} src={img} alt="att" className="max-w-[200px] rounded mb-2" />)}
              {msg.sender === Sender.GEMIBABY && <ThoughtProcess thought={msg.thoughtProcess || ''} isThinking={!!msg.isThinking} />}
              <MessageContent text={msg.text} />
              {/* Message Actions Toolbar */}
              {(msg.sender === Sender.USER || msg.sender === Sender.GEMIBABY) && <MessageActions msg={msg} />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        
        {/* Scroll to Bottom Button */}
        {showScrollButton && (
            <button 
                onClick={() => { setShouldAutoScroll(true); scrollToBottom(); }} 
                className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-gem-700/90 text-white p-2 rounded-full shadow-lg border border-gem-600 hover:bg-gem-600 transition-all z-30 animate-bounce"
            >
                <ArrowDown className="w-4 h-4" />
            </button>
        )}
      </div>

      {/* Input Area with Mesh Router */}
      <div className={`p-4 bg-gem-900/95 border-t border-gem-700 transition-all duration-500 ${plannerMode && !currentPlan ? 'bg-purple-900/20 border-purple-500/30' : ''}`}>
        <div className="max-w-4xl mx-auto relative">
           {/* Planner Banner */}
           {plannerMode && !currentPlan && (
               <div className="absolute -top-10 left-0 text-xs text-purple-400 font-bold flex items-center gap-2 animate-bounce">
                   <Sparkles className="w-3 h-3" /> Agent Mode: Enter a complex goal to decompose & execute...
               </div>
           )}

           {(attachedImages.length > 0 || attachedDocs.length > 0) && (
               <div className="flex flex-wrap gap-2 mb-2">
                   {attachedImages.map((img, i) => (
                       <div key={`img-${i}`} className="relative group"><img src={img} className="h-12 rounded border border-gem-700" /><button onClick={()=>removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="w-3 h-3 text-white"/></button></div>
                   ))}
                   {attachedDocs.map((doc, i) => (
                       <div key={`doc-${i}`} className="relative group flex items-center gap-2 bg-gem-800 border border-gem-700 px-2 py-1 rounded h-12">
                           <FileText className="w-6 h-6 text-slate-400" />
                           <div className="flex flex-col max-w-[100px]"><span className="text-[10px] font-mono text-slate-200 truncate">{doc.name}</span></div>
                           <button onClick={()=>removeDoc(i)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="w-3 h-3 text-white"/></button>
                       </div>
                   ))}
                   {/* Clear All Button */}
                   <button onClick={() => { setAttachedImages([]); setAttachedDocs([]); }} className="text-[10px] text-red-400 hover:underline flex items-center self-center ml-2">Clear All</button>
               </div>
           )}
           
           {/* Routing Bar */}
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1"><Network className="w-3 h-3" /> Router:</span>
                  <div className="flex bg-gem-800 rounded p-0.5 border border-gem-700">
                    <button onClick={() => setRoutingMode('AUTO')} className={`px-2 py-0.5 text-[10px] rounded transition-colors ${routingMode === 'AUTO' ? 'bg-gem-700 text-white font-bold shadow' : 'text-slate-400 hover:text-white'}`}>Default</button>
                    <button onClick={() => setRoutingMode('CREATIVE')} className={`px-2 py-0.5 text-[10px] rounded transition-colors flex items-center gap-1 ${routingMode === 'CREATIVE' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50 font-bold' : 'text-slate-400 hover:text-pink-400'}`}>Creative</button>
                    <button onClick={() => setRoutingMode('CODE')} className={`px-2 py-0.5 text-[10px] rounded transition-colors flex items-center gap-1 ${routingMode === 'CODE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-bold' : 'text-slate-400 hover:text-emerald-400'}`}>Code</button>
                  </div>
                  {modelOverride && (
                      <span className="text-[9px] bg-gem-700 px-2 py-0.5 rounded-full text-slate-300 border border-gem-600 flex items-center gap-1">
                         Model Locked: {modelOverride}
                         <button onClick={() => setModelOverride(null)} className="hover:text-white"><X className="w-3 h-3"/></button>
                      </span>
                  )}
              </div>
              <div className="hidden sm:block text-[10px] text-slate-500 font-mono">
                  Type <span className="text-white bg-gem-800 px-1 rounded">/</span> for commands
              </div>
           </div>

           <div className="relative">
            <div className="absolute left-3 top-3 flex items-center gap-2">
                <button onClick={toggleListening} className={`p-1.5 rounded-lg ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-gem-accent'}`}><Mic className="w-5 h-5" /></button>
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-500 hover:text-gem-accent"><Paperclip className="w-5 h-5" /></button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*,text/*,.js,.jsx,.ts,.tsx,.py,.json,.md,.html,.css,.java,.c,.cpp,.h,.rs,.go" className="hidden" />
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : plannerMode && !currentPlan ? "Describe your goal for Agent decomposition..." : `Message GemiBaby...`}
              disabled={isProcessing || generatingPlan}
              className={`w-full bg-gem-800 border rounded-xl pl-24 pr-12 py-3 text-sm focus:outline-none resize-none overflow-hidden min-h-[56px] max-h-[200px] scrollbar-thin scrollbar-thumb-gem-700 transition-all ${plannerMode && !currentPlan ? 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'border-gem-700 focus:border-gem-accent'}`}
              rows={1}
            />
            {isProcessing || generatingPlan ? (
                <button onClick={handleStopGeneration} className="absolute right-2 top-2 p-1.5 bg-gem-danger text-white rounded-lg animate-pulse"><Square className="w-5 h-5 fill-current" /></button>
            ) : (
                <button onClick={handleSend} disabled={!inputValue.trim() && attachedImages.length === 0 && attachedDocs.length === 0} className={`absolute right-2 top-2 p-1.5 text-gem-900 rounded-lg disabled:opacity-50 ${plannerMode && !currentPlan ? 'bg-purple-500 hover:bg-purple-400' : 'bg-gem-accent'}`}><Send className="w-5 h-5" /></button>
            )}
           </div>
        </div>
      </div>

      {showMemoryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gem-900 border border-gem-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gem-700 flex justify-between items-center">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-purple-400"><Database className="w-5 h-5" /> Project Memory Core</h3>
                      <button onClick={() => setShowMemoryModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 flex-1 overflow-hidden flex flex-col">
                      <textarea value={tempMemory} onChange={(e) => setTempMemory(e.target.value)} className="flex-1 w-full bg-gem-800 border border-gem-700 rounded-lg p-4 font-mono text-xs text-slate-300 focus:border-purple-500 focus:outline-none resize-none" />
                  </div>
                  <div className="p-4 border-t border-gem-700 flex justify-end gap-2">
                      <button onClick={() => setShowMemoryModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                      <button onClick={() => { onUpdateContext(tempMemory); setShowMemoryModal(false); }} className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 flex items-center gap-2"><Save className="w-4 h-4" /> Save Memory</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ChatInterface;