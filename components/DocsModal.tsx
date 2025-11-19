
import React, { useState } from 'react';
import { Book, Shield, Cpu, Network, X, ListChecks, Globe, Command, Keyboard, FileText, Zap, Layers, Terminal, Eye, Bot } from 'lucide-react';

const DocsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('start');

  const navItems = [
      { id: 'start', label: 'Quick Start', icon: <Zap size={16}/> },
      { id: 'cmd', label: 'Commands & Shortcuts', icon: <Terminal size={16}/> },
      { id: 'features', label: 'Advanced Features', icon: <Layers size={16}/> },
      { id: 'arch', label: 'Architecture', icon: <Cpu size={16}/> }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
       <div className="bg-gem-900 border border-gem-700 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gem-700 flex justify-between items-center bg-gem-950">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Book className="w-6 h-6 text-gem-accent" /> GemiBaby Framework Manual v3.6
             </h2>
             <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Nav */}
              <div className="w-64 bg-gem-900 border-r border-gem-700 p-4 space-y-2 hidden md:block">
                  {navItems.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === item.id ? 'bg-gem-800 text-white border border-gem-700' : 'text-slate-400 hover:text-white hover:bg-gem-800/50'}`}
                      >
                          {item.icon} {item.label}
                      </button>
                  ))}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-8 text-slate-300 leading-relaxed bg-gem-900/50">
                 
                 {activeSection === 'start' && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <h3 className="text-2xl font-bold text-white mb-4">Overview</h3>
                        <p>
                           GemiBaby is a local-first AI emulator designed to mimic the capabilities of next-gen distributed AI systems. 
                           It runs entirely in your browser, orchestrating local LLMs (via Ollama) to provide a secure, private, and highly capable workspace.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="bg-gem-800/50 p-4 rounded-lg border border-gem-700 hover:border-gem-600 transition-colors">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400"/> 1. Projects</h4>
                                <p className="text-xs">Separate containers for context. Each has isolated short-term chat and long-term memory summaries.</p>
                            </div>
                            <div className="bg-gem-800/50 p-4 rounded-lg border border-gem-700 hover:border-gem-600 transition-colors">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Network className="w-4 h-4 text-sky-400"/> 2. Mesh Routing</h4>
                                <p className="text-xs">Use the "Neural Router" to dispatch tasks to specialized models (e.g., Coder, Creative) automatically.</p>
                            </div>
                            <div className="bg-gem-800/50 p-4 rounded-lg border border-gem-700 hover:border-gem-600 transition-colors">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400"/> 3. Security</h4>
                                <p className="text-xs">AES-GCM encryption ensures your data is unreadable without your master key, even if the database file is stolen.</p>
                            </div>
                        </div>
                     </div>
                 )}

                 {activeSection === 'cmd' && (
                     <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                         <div>
                             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Terminal className="w-5 h-5 text-gem-accent"/> CLI Commands</h3>
                             <p className="text-sm mb-4">Type these commands directly into the chat input bar to control the environment.</p>
                             <div className="overflow-hidden rounded-lg border border-gem-700 shadow-lg">
                                 <table className="min-w-full divide-y divide-gem-700 bg-gem-800/30">
                                     <thead className="bg-gem-900">
                                         <tr>
                                             <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Command</th>
                                             <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Arguments</th>
                                             <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-gem-700 text-sm font-mono">
                                         <tr className="hover:bg-gem-800/50 transition-colors"><td className="px-4 py-2 text-gem-accent">/clear</td><td className="px-4 py-2 text-slate-500">-</td><td className="px-4 py-2">Wipe chat history (preserves long-term memory)</td></tr>
                                         <tr className="hover:bg-gem-800/50 transition-colors"><td className="px-4 py-2 text-gem-accent">/mode</td><td className="px-4 py-2 text-slate-500">auto | code | creative</td><td className="px-4 py-2">Force neural routing strategy</td></tr>
                                         <tr className="hover:bg-gem-800/50 transition-colors"><td className="px-4 py-2 text-gem-accent">/load</td><td className="px-4 py-2 text-slate-500">&lt;template name&gt;</td><td className="px-4 py-2">Switch active persona (fuzzy match)</td></tr>
                                         <tr className="hover:bg-gem-800/50 transition-colors"><td className="px-4 py-2 text-gem-accent">/plan</td><td className="px-4 py-2 text-slate-500">[goal]</td><td className="px-4 py-2">Initialize Agent Planner with optional goal</td></tr>
                                         <tr className="hover:bg-gem-800/50 transition-colors"><td className="px-4 py-2 text-gem-accent">/sys</td><td className="px-4 py-2 text-slate-500">&lt;prompt text&gt;</td><td className="px-4 py-2">Override System Prompt for session</td></tr>
                                         <tr className="hover:bg-gem-800/50 transition-colors"><td className="px-4 py-2 text-gem-accent">/memory</td><td className="px-4 py-2 text-slate-500">-</td><td className="px-4 py-2">Open Memory Editor modal</td></tr>
                                         <tr className="hover:bg-gem-800/50 transition-colors"><td className="px-4 py-2 text-gem-accent">/forget</td><td className="px-4 py-2 text-slate-500">-</td><td className="px-4 py-2">Clear Long-term Memory summary</td></tr>
                                         <tr className="hover:bg-gem-800/50 transition-colors"><td className="px-4 py-2 text-gem-accent">/status</td><td className="px-4 py-2 text-slate-500">-</td><td className="px-4 py-2">Print current context/model stats to chat</td></tr>
                                     </tbody>
                                 </table>
                             </div>
                         </div>

                         <div>
                             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Keyboard className="w-5 h-5 text-pink-400"/> Keyboard Shortcuts</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="flex justify-between items-center bg-gem-800/50 p-3 rounded border border-gem-700">
                                     <span className="text-sm">Clear Chat</span>
                                     <kbd className="px-2 py-1 bg-gem-900 rounded border border-gem-600 font-mono text-xs text-slate-400">Ctrl + L</kbd>
                                 </div>
                                 <div className="flex justify-between items-center bg-gem-800/50 p-3 rounded border border-gem-700">
                                     <span className="text-sm">Stop Generation</span>
                                     <kbd className="px-2 py-1 bg-gem-900 rounded border border-gem-600 font-mono text-xs text-slate-400">Esc</kbd>
                                 </div>
                                 <div className="flex justify-between items-center bg-gem-800/50 p-3 rounded border border-gem-700">
                                     <span className="text-sm">Recall Previous Command</span>
                                     <kbd className="px-2 py-1 bg-gem-900 rounded border border-gem-600 font-mono text-xs text-slate-400">↑ / ↓</kbd>
                                 </div>
                                 <div className="flex justify-between items-center bg-gem-800/50 p-3 rounded border border-gem-700">
                                     <span className="text-sm">Send Message</span>
                                     <kbd className="px-2 py-1 bg-gem-900 rounded border border-gem-600 font-mono text-xs text-slate-400">Enter</kbd>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}

                 {activeSection === 'features' && (
                     <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-gem-800/30 p-6 rounded-xl border border-gem-700">
                                 <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2"><ListChecks className="w-5 h-5"/> Agent Planner</h3>
                                 <p className="text-sm mb-3">GemiBaby can now decompose complex goals into executable steps. This is optimized for small models that struggle with long-horizon tasks.</p>
                                 <ol className="list-decimal pl-4 space-y-2 text-sm text-slate-400">
                                     <li>Click the <strong className="text-white">Planner Icon</strong> in the Chat header or type <code className="bg-gem-900 px-1 rounded">/plan</code>.</li>
                                     <li>Enter a high-level goal (e.g., "Create a Python snake game").</li>
                                     <li>GemiBaby will generate a structured plan.</li>
                                     <li>Click <strong className="text-emerald-400">Auto-Run</strong> to execute the plan sequentially. The context from each step is fed into the next.</li>
                                 </ol>
                             </div>
                             <div className="bg-gem-800/30 p-6 rounded-xl border border-gem-700">
                                 <h3 className="text-lg font-bold text-sky-400 mb-3 flex items-center gap-2"><Globe className="w-5 h-5"/> Community Mesh</h3>
                                 <p className="text-sm mb-3">Connect to external LLM endpoints (friends, tunnels, secondary servers) to distribute workload.</p>
                                 <ul className="list-disc pl-4 space-y-2 text-sm text-slate-400">
                                     <li>Add remote nodes in <strong className="text-white">Settings</strong>.</li>
                                     <li>Use the <strong>Verify</strong> button to check connectivity.</li>
                                     <li>Use the <strong>Neural Router</strong> in chat to send specific prompts to these specialized nodes (e.g. routing complex coding tasks to a stronger remote model).</li>
                                 </ul>
                             </div>
                         </section>

                         <section>
                             <h3 className="text-lg font-bold text-white mb-4">Drag & Drop Support</h3>
                             <div className="bg-gem-800/30 p-4 rounded-xl border border-gem-700 flex items-center gap-4">
                                 <FileText className="w-8 h-8 text-slate-500" />
                                 <div>
                                     <p className="text-sm">You can now drag files directly onto the chat window.</p>
                                     <ul className="text-xs text-slate-400 list-disc pl-4 mt-1">
                                         <li><strong>Images:</strong> Sent to multi-modal models (e.g., LLaVA, Llama-3-V).</li>
                                         <li><strong>Code/Text:</strong> Content is read and appended to your prompt automatically, allowing for "Chat with File" workflows.</li>
                                     </ul>
                                 </div>
                             </div>
                         </section>
                         
                         <section>
                             <h3 className="text-lg font-bold text-white mb-4">Deep Reasoning (CoT)</h3>
                             <div className="bg-gem-800/30 p-4 rounded-xl border border-gem-700 flex items-center gap-4">
                                 <Eye className="w-8 h-8 text-pink-400" />
                                 <div>
                                     <p className="text-sm">Switch to the <strong>Deep Reasoning</strong> persona to enable Chain of Thought visualization.</p>
                                     <p className="text-xs text-slate-400 mt-2">
                                         This persona forces the model to output <code>&lt;think&gt;</code> tags. The UI parses these tags and displays a collapsible "Thinking Process" section, allowing you to see the model's logic (assumptions, step-by-step verification) before the final answer.
                                     </p>
                                 </div>
                             </div>
                         </section>
                     </div>
                 )}

                 {activeSection === 'arch' && (
                     <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                         <div>
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-400"/> Security Core</h3>
                            <p className="text-sm mb-2">GemiBaby uses a zero-trust local architecture.</p>
                            <ul className="list-disc pl-5 space-y-2 text-sm">
                               <li><strong className="text-emerald-400">AES-GCM Encryption:</strong> All projects and messages are encrypted at rest using a key derived from your password (PBKDF2).</li>
                               <li><strong className="text-emerald-400">Local Execution:</strong> No data leaves your machine (unless you explicitly configure a Remote Mesh Node).</li>
                               <li><strong className="text-emerald-400">Session Handling:</strong> Keys exist only in RAM. Reloading the page locks the vault immediately.</li>
                            </ul>
                         </div>
                         <div>
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Network className="w-5 h-5 text-pink-400"/> Hive Mesh</h3>
                            <ul className="list-disc pl-5 space-y-2 text-sm">
                               <li><strong className="text-pink-400">Neural Routing:</strong> Dispatch queries to specialized models (e.g., Codellama for code, Llama3 for chat).</li>
                               <li><strong className="text-pink-400">Telemetry:</strong> Real-time token throughput (TPS) and latency tracking via the Dashboard.</li>
                               <li><strong className="text-pink-400">Multi-Modal:</strong> Ingest images and text files directly into the context window.</li>
                            </ul>
                         </div>
                         <div>
                             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Bot className="w-5 h-5 text-sky-400"/> SLM Optimization</h3>
                             <p className="text-sm">
                                 The backend service is optimized for Small Language Models (SLMs) like Phi-3 or Llama-3-8B. 
                                 We use strict <strong>XML Tagging</strong> (<code>&lt;instruction&gt;</code>, <code>&lt;context&gt;</code>) to force these smaller models to adhere to system prompts and separate memory from current user input.
                             </p>
                         </div>
                     </div>
                 )}

              </div>
          </div>
       </div>
    </div>
  );
};

export default DocsModal;