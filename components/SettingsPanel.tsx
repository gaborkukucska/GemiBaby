
import React, { useEffect, useState } from 'react';
import { Settings, Sliders, Database, AlertTriangle, CheckCircle, Network, Server, Plus, Trash2, Globe, Activity, Gauge, Bot, Save, FileCode, Zap, Download, Search, Box, RefreshCw, Info, X } from 'lucide-react';
import { Settings as SettingsType, RemoteNodeConfig, PromptTemplate } from '../types';
import { fetchLocalModels, verifyRemoteNodeConnection, scanNetworkForNodes, provisionModel } from '../services/ollamaService';
import { logger } from '../services/logger';

interface SettingsPanelProps {
  settings: SettingsType;
  onSave: (s: SettingsType) => void;
}

interface Notification {
    type: 'success' | 'error' | 'info';
    message: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave }) => {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [localSettings, setLocalSettings] = useState<SettingsType>(settings);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeUrl, setNewNodeUrl] = useState('http://');
  const [newNodeKey, setNewNodeKey] = useState('');
  const [verifyingNode, setVerifyingNode] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{id: string, ok: boolean} | null>(null);
  
  const [templateName, setTemplateName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const models = await fetchLocalModels(localSettings.ollamaEndpoint);
      setAvailableModels(models);
      setConnectionStatus('connected');
      if (models.length > 0 && (!localSettings.modelName || !models.includes(localSettings.modelName))) {
        handleChange('modelName', models[0]);
      }
    } catch (e) {
      setConnectionStatus('failed');
    }
  };

  const handleChange = (key: keyof SettingsType, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSave(newSettings);
  };

  const handleHiveChange = (key: keyof SettingsType['hiveConfig'], value: any) => {
    const newHive = { ...localSettings.hiveConfig, [key]: value };
    const newSettings = { ...localSettings, hiveConfig: newHive };
    setLocalSettings(newSettings);
    onSave(newSettings);
  };

  const addRemoteNode = async () => {
      if (!newNodeName || !newNodeUrl) return;
      const newNode: RemoteNodeConfig = {
          id: `rn-${Date.now()}`,
          name: newNodeName.trim(),
          url: newNodeUrl.trim(),
          apiKey: newNodeKey.trim() || undefined
      };
      
      setVerifyingNode(newNode.id);
      const isOk = await verifyRemoteNodeConnection(newNode);
      setVerifyingNode(null);
      
      if (isOk) {
          const newNodes = [...(localSettings.remoteNodes || []), newNode];
          handleChange('remoteNodes', newNodes);
          setNewNodeName('');
          setNewNodeUrl('http://');
          setNewNodeKey('');
          setNotification({ type: 'success', message: `Node "${newNode.name}" verified and added.` });
      } else {
          if (confirm("Connection verification failed. Add anyway?")) {
              const newNodes = [...(localSettings.remoteNodes || []), newNode];
              handleChange('remoteNodes', newNodes);
              setNewNodeName('');
              setNewNodeUrl('http://');
              setNewNodeKey('');
              setNotification({ type: 'info', message: `Node "${newNode.name}" added (Unverified).` });
          }
      }
  };

  const removeRemoteNode = (id: string) => {
      const newNodes = (localSettings.remoteNodes || []).filter(n => n.id !== id);
      handleChange('remoteNodes', newNodes);
  };

  const testNodeConnection = async (node: RemoteNodeConfig) => {
      setVerifyingNode(node.id);
      const isOk = await verifyRemoteNodeConnection(node);
      setVerifyingNode(null);
      setVerificationResult({ id: node.id, ok: isOk });
      // Clear status after 3 seconds
      setTimeout(() => {
          setVerificationResult(prev => (prev?.id === node.id ? null : prev));
      }, 3000);
  };

  const handleNetworkScan = async () => {
      setIsScanning(true);
      setNotification(null);
      try {
          const found = await scanNetworkForNodes(localSettings.ollamaEndpoint);
          if (found.length > 0) {
              const normalizeUrl = (u: string) => u.replace(/\/$/, '').replace('localhost', '127.0.0.1').toLowerCase();
              const existingUrls = new Set((localSettings.remoteNodes || []).map(n => normalizeUrl(n.url)));
              // Also check against configured ollama endpoint
              existingUrls.add(normalizeUrl(localSettings.ollamaEndpoint));
              
              const newNodes = [...(localSettings.remoteNodes || [])];
              let addedCount = 0;

              found.forEach(f => {
                  if (!existingUrls.has(normalizeUrl(f.url))) {
                      newNodes.push({ ...f, id: `auto-${Date.now()}-${Math.random().toString(36).substr(2,5)}` });
                      addedCount++;
                  }
              });
              
              if (addedCount > 0) {
                  handleChange('remoteNodes', newNodes);
                  logger.info(`Added ${addedCount} new nodes from scan.`, "Settings");
                  setNotification({ type: 'success', message: `Scan Complete: Added ${addedCount} new node(s) to mesh.` });
              } else {
                  logger.info("Scan found active nodes, but they are already configured.", "Settings");
                  setNotification({ type: 'info', message: "Scan Complete: No new nodes found (duplicates skipped)." });
              }
          } else {
              setNotification({ type: 'info', message: "Scan Complete: No nodes found on local network." });
          }
      } catch (e) {
          logger.error("Network scan failed", "Settings", e);
          setNotification({ type: 'error', message: "Network scan encountered an error." });
      } finally {
          setIsScanning(false);
      }
  };

  const handleQuickProvision = async (model: string) => {
      if (confirm(`Download ${model} to local node? This may take a while.`)) {
          setIsProvisioning(true);
          const success = await provisionModel(localSettings.ollamaEndpoint, model);
          setIsProvisioning(false);
          if (success) {
              setNotification({ type: 'success', message: `${model} installed successfully!` });
              checkConnection();
          } else {
              setNotification({ type: 'error', message: "Installation failed. Check console logs." });
          }
      }
  };

  const saveTemplate = () => {
      if (!templateName.trim()) return;
      const newTemplate: PromptTemplate = {
          id: Date.now().toString(),
          name: templateName,
          content: localSettings.systemPrompt
      };
      const newTemplates = [...(localSettings.promptTemplates || []), newTemplate];
      handleChange('promptTemplates', newTemplates);
      setTemplateName('');
      setNotification({ type: 'success', message: "Persona template saved." });
  };

  const loadTemplate = (id: string) => {
      const template = localSettings.promptTemplates.find(t => t.id === id);
      if (template) handleChange('systemPrompt', template.content);
  };

  const deleteTemplate = (id: string) => {
      const newTemplates = localSettings.promptTemplates.filter(t => t.id !== id);
      handleChange('promptTemplates', newTemplates);
  };

  return (
    <div className="h-full p-6 overflow-y-auto max-w-3xl mx-auto relative">
      
      {/* Notification Toast */}
      {notification && (
          <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl border animate-in fade-in slide-in-from-top-2 flex items-center gap-3 max-w-sm
              ${notification.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100' : 
                notification.type === 'error' ? 'bg-red-900/90 border-red-500/50 text-red-100' : 
                'bg-gem-800/90 border-gem-600 text-slate-200'}`}>
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
              <div className="text-sm font-medium">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="ml-auto hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>
      )}

      <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 text-gem-accent">
        <Settings className="w-6 h-6" />
        System Configuration
      </h2>

      {/* Connection Section */}
      <section className="mb-8 bg-gem-800/30 p-6 rounded-xl border border-gem-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          Local Inference Engine
        </h3>
        
        <div className="grid gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Ollama Endpoint</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={localSettings.ollamaEndpoint}
                onChange={(e) => handleChange('ollamaEndpoint', e.target.value)}
                className="flex-1 bg-gem-900 border border-gem-700 rounded-md px-3 py-2 focus:outline-none focus:border-gem-accent transition-colors"
                placeholder="http://localhost:11434"
              />
              <button 
                onClick={checkConnection}
                className={`px-4 py-2 rounded-md text-sm transition-colors font-medium
                  ${connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 
                    connectionStatus === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 
                    'bg-gem-700 hover:bg-gem-600'}`}
              >
                {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'failed' ? 'Retry' : 'Test'}
              </button>
            </div>
            {connectionStatus === 'failed' && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                 <div className="text-xs text-gem-danger flex items-center gap-1 font-bold mb-1">
                    <AlertTriangle className="w-3 h-3" /> Unable to connect to Ollama.
                 </div>
                 <p className="text-[10px] text-slate-400 leading-relaxed">
                    Ensure Ollama is running with CORS enabled. Use the installer script or run:
                 </p>
                 <code className="block mt-2 bg-black/30 p-2 rounded text-[10px] font-mono text-slate-300">
                    OLLAMA_ORIGINS="*" ollama serve
                 </code>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Primary Model (General Purpose)</label>
            <div className="flex gap-2">
                <select 
                value={localSettings.modelName}
                onChange={(e) => handleChange('modelName', e.target.value)}
                className="w-full bg-gem-900 border border-gem-700 rounded-md px-3 py-2 focus:outline-none focus:border-gem-accent"
                disabled={availableModels.length === 0}
                >
                <option value="" disabled>Select a model...</option>
                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button onClick={() => handleQuickProvision('llama3')} disabled={isProvisioning} className="px-3 bg-gem-800 hover:bg-gem-700 border border-gem-700 rounded text-slate-400 hover:text-white" title="Install Llama3">
                    {isProvisioning ? <Activity className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hive/Mesh Config */}
      <section className="mb-8 bg-gem-800/30 p-6 rounded-xl border border-gem-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2"><Network className="w-5 h-5 text-sky-400" /> Hive Mesh Topology</span>
          <button 
            onClick={handleNetworkScan} 
            disabled={isScanning}
            className={`text-xs px-3 py-1 rounded flex items-center gap-2 transition-colors border
                ${isScanning ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-sky-500/20 border-sky-500/50 text-sky-400 hover:bg-sky-500/30'}`}
          >
             {isScanning ? <Activity className="w-3 h-3 animate-spin"/> : <Search className="w-3 h-3"/>}
             {isScanning ? 'Scanning Subnet...' : 'Auto-Discover Nodes'}
          </button>
        </h3>
        
        <div className="mb-6">
            <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> Active Nodes</h4>
            <div className="space-y-2 mb-4">
                {(!localSettings.remoteNodes || localSettings.remoteNodes.length === 0) && <div className="text-xs text-slate-500 italic">No remote nodes configured.</div>}
                {localSettings.remoteNodes?.map(node => (
                    <div key={node.id} className="flex items-center justify-between bg-gem-900 p-2 rounded border border-gem-700">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                {node.name}
                                <span className="text-[9px] bg-slate-800 px-1 rounded text-slate-400">{node.id.startsWith('auto') ? 'AUTO' : 'MANUAL'}</span>
                                {verificationResult?.id === node.id && (
                                    <span className={`text-[9px] px-1 rounded font-bold animate-in fade-in duration-300 ${verificationResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {verificationResult.ok ? 'ONLINE' : 'UNREACHABLE'}
                                    </span>
                                )}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{node.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => testNodeConnection(node)} 
                                className="text-slate-500 hover:text-sky-400 p-1" 
                                title="Verify Connection"
                            >
                                {verifyingNode === node.id ? <Activity className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                            <button onClick={() => removeRemoteNode(node.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-gem-900/50 p-3 rounded border border-gem-700/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <input placeholder="Node Name" value={newNodeName} onChange={e => setNewNodeName(e.target.value)} className="bg-gem-800 border border-gem-700 rounded px-2 py-1 text-xs text-white" />
                    <input placeholder="URL (http://...)" value={newNodeUrl} onChange={e => setNewNodeUrl(e.target.value)} className="bg-gem-800 border border-gem-700 rounded px-2 py-1 text-xs text-white" />
                    <input placeholder="API Key (Optional)" value={newNodeKey} onChange={e => setNewNodeKey(e.target.value)} className="bg-gem-800 border border-gem-700 rounded px-2 py-1 text-xs text-white" type="password" />
                </div>
                <button onClick={addRemoteNode} disabled={verifyingNode !== null} className="w-full bg-gem-700 hover:bg-gem-600 text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors text-slate-200">
                    {verifyingNode ? <Activity className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Manual Node
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 border border-gem-700 rounded-lg bg-gem-900/50">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-pink-400 font-bold text-sm"><Server className="w-4 h-4" /> Creative Expert</div>
                    <button onClick={() => handleQuickProvision('mistral')} className="text-[9px] text-slate-500 hover:text-white flex items-center gap-1"><Download className="w-3 h-3"/> Install Mistral</button>
                </div>
                <select 
                   value={localSettings.hiveConfig?.creativeModel || ''}
                   onChange={(e) => handleHiveChange('creativeModel', e.target.value)}
                   className="w-full bg-gem-800 border border-gem-700 rounded px-2 py-1 text-xs text-slate-200"
               >
                   <option value="">Auto-Detect (Based on Load)</option>
                   {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                   {localSettings.remoteNodes?.map(n => <option key={n.id} value={`${n.name}/default`}>{n.name} (Default)</option>)}
               </select>
            </div>
            <div className="p-4 border border-gem-700 rounded-lg bg-gem-900/50">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm"><Server className="w-4 h-4" /> Coding Specialist</div>
                    <button onClick={() => handleQuickProvision('deepseek-coder')} className="text-[9px] text-slate-500 hover:text-white flex items-center gap-1"><Download className="w-3 h-3"/> Install DeepSeek</button>
                </div>
                 <select 
                    value={localSettings.hiveConfig?.coderModel || ''}
                    onChange={(e) => handleHiveChange('coderModel', e.target.value)}
                    className="w-full bg-gem-800 border border-gem-700 rounded px-2 py-1 text-xs text-slate-200"
                >
                    <option value="">Auto-Detect (Based on Load)</option>
                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                    {localSettings.remoteNodes?.map(n => <option key={n.id} value={`${n.name}/default`}>{n.name} (Default)</option>)}
                </select>
            </div>
        </div>

        {/* Advanced Optimization Toggles */}
        <div className="flex flex-col gap-3 pt-4 border-t border-gem-700/50">
            <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Smart Caching
                    <span className="text-[10px] text-slate-500">(Store responses to save compute)</span>
                </label>
                <input 
                    type="checkbox"
                    checked={localSettings.hiveConfig.cacheEnabled}
                    onChange={(e) => handleHiveChange('cacheEnabled', e.target.checked)}
                    className="w-4 h-4 accent-gem-accent bg-gem-900 border-gem-700 rounded"
                />
            </div>
            <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 flex items-center gap-2">
                    <Box className="w-4 h-4 text-orange-400" /> Load Balancing Strategy
                </label>
                <select 
                    value={localSettings.hiveConfig.loadBalancing}
                    onChange={(e) => handleHiveChange('loadBalancing', e.target.value)}
                    className="bg-gem-800 border border-gem-700 rounded text-xs px-2 py-1"
                >
                    <option value="RANDOM">Randomized Routing</option>
                    <option value="ROUND_ROBIN">Round Robin</option>
                </select>
            </div>
        </div>
      </section>

      {/* Persona Section */}
      <section className="mb-8 bg-gem-800/30 p-6 rounded-xl border border-gem-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-pink-400" />
          System Persona & Prompts
        </h3>
        <div className="space-y-4">
            <div className="bg-gem-900 p-3 rounded-lg border border-gem-700">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Global System Prompt</label>
                <textarea 
                  rows={4}
                  value={localSettings.systemPrompt}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  className="w-full bg-gem-800 border border-gem-700 rounded p-2 text-sm text-slate-200 focus:border-gem-accent focus:outline-none resize-none mb-2"
                />
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="New Template Name..." 
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="flex-1 bg-gem-800 border border-gem-700 rounded px-2 py-1 text-xs text-white"
                    />
                    <button onClick={saveTemplate} disabled={!templateName} className="px-3 py-1 bg-gem-700 hover:bg-gem-600 rounded text-xs flex items-center gap-1 transition-colors">
                        <Save className="w-3 h-3" /> Save as Template
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(localSettings.promptTemplates || []).map(t => (
                    <div key={t.id} className="bg-gem-900 border border-gem-700 rounded p-2 flex justify-between items-center group">
                        <span className="text-xs font-bold text-slate-300 truncate">{t.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => loadTemplate(t.id)} className="p-1 hover:text-emerald-400 text-slate-500" title="Load"><FileCode className="w-3 h-3"/></button>
                            <button onClick={() => deleteTemplate(t.id)} className="p-1 hover:text-red-400 text-slate-500" title="Delete"><Trash2 className="w-3 h-3"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Advanced Params */}
      <section className="mb-8 bg-gem-800/30 p-6 rounded-xl border border-gem-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          Inference Parameters
        </h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Context Window (Tokens)</label>
            <input 
              type="range" 
              min="2048" 
              max="32768" 
              step="1024"
              value={localSettings.contextWindow}
              onChange={(e) => handleChange('contextWindow', parseInt(e.target.value))}
              className="w-full accent-gem-accent"
            />
            <div className="text-right text-xs text-slate-500 font-mono">{localSettings.contextWindow} tokens</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2"><Gauge className="w-3 h-3" /> Temperature (Creativity)</label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.1"
                    value={localSettings.temperature || 0.7}
                    onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                    className="w-full accent-pink-400"
                  />
                  <div className="text-right text-xs text-slate-500 font-mono">{localSettings.temperature || 0.7}</div>
              </div>
              <div>
                  <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2"><Activity className="w-3 h-3" /> Repeat Penalty</label>
                  <input 
                    type="range" 
                    min="1.0" 
                    max="1.5" 
                    step="0.05"
                    value={localSettings.repeatPenalty || 1.1}
                    onChange={(e) => handleChange('repeatPenalty', parseFloat(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                  <div className="text-right text-xs text-slate-500 font-mono">{localSettings.repeatPenalty || 1.1}</div>
              </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPanel;
