
import { Message, Sender, Settings, HiveNode, GenerationStats, TaskStep, RemoteNodeConfig, ModelCapability } from '../types';
import { logger } from './logger';

// --- Cache Implementation ---
const CACHE_PREFIX = 'gemibaby_cache_';

const generateCacheKey = async (model: string, prompt: string, options: any): Promise<string> => {
    const data = JSON.stringify({ model, prompt, options });
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return CACHE_PREFIX + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getCachedResponse = (key: string): string | null => {
    const item = sessionStorage.getItem(key);
    if (!item) return null;
    return item;
};

const setCachedResponse = (key: string, value: string) => {
    try {
        sessionStorage.setItem(key, value);
    } catch (e) {
        // Storage full, clear old cache
        logger.warn("Cache full, clearing old entries", "Cache");
        Object.keys(sessionStorage).forEach(k => {
            if (k.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(k);
        });
        sessionStorage.setItem(key, value);
    }
};

// --- Robustness: Retry logic ---
const fetchWithRetry = async (url: string, options: RequestInit, retries = 2, backoff = 500): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 404) {
        throw new Error("Model not found");
    }

    if (!response.ok && retries > 0 && response.status !== 401) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    if (!response.ok) {
         throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    return response;
  } catch (err: any) {
    // FAIL FAST on 404 or 401
    if (err.message === "Model not found" || err.message?.includes("404") || retries <= 0) {
        throw err;
    }
    
    logger.debug(`Retrying request to ${url}... (${retries} left)`, 'Network');
    await new Promise(r => setTimeout(r, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
};

export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
};

// --- Categorization Heuristics ---
const determineCapabilities = (name: string): ModelCapability[] => {
    const caps: ModelCapability[] = ['GENERAL'];
    const lower = name.toLowerCase();
    
    if (lower.includes('llava') || lower.includes('vision') || lower.includes('moondream') || lower.includes('bakllava')) {
        caps.push('VISION');
    }
    if (lower.includes('code') || lower.includes('deepseek') || lower.includes('starcoder') || lower.includes('sql') || lower.includes('qwen-coder')) {
        caps.push('CODER');
    }
    if (lower.includes('math') || lower.includes('wizard-math') || lower.includes('phi') || lower.includes('reason') || lower.includes('deepseek-r1')) {
        caps.push('MATH');
    }
    if (lower.includes('embed') || lower.includes('nomic') || lower.includes('bert')) {
        caps.push('EMBEDDING');
    }
    return caps;
};

// --- Provisioning ---
export const provisionModel = async (endpoint: string, modelName: string) => {
    logger.system(`Provisioning missing model: ${modelName} on ${endpoint}`, 'Provisioner');
    try {
        // Use streaming to avoid timeouts on large downloads
        const response = await fetch(`${endpoint}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName, stream: true })
        });

        if (!response.ok) throw new Error("Pull failed to start");
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let lastLog = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.trim());
            
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.error) throw new Error(json.error);
                    
                    // Log progress every 2 seconds to avoid spamming
                    const now = Date.now();
                    if (json.status && (now - lastLog > 2000)) {
                        logger.info(`[${modelName}] ${json.status} ${json.completed ? `(${Math.round((json.completed / json.total) * 100)}%)` : ''}`, 'Provisioner');
                        lastLog = now;
                    }
                } catch (e) { /* ignore partial json */ }
            }
        }

        logger.info(`Successfully pulled ${modelName}`, 'Provisioner');
        return true;
    } catch (e) {
        logger.error(`Failed to auto-provision ${modelName}`, 'Provisioner', e);
        return false;
    }
};

// --- Discovery & Mesh ---

export const scanNetworkForNodes = async (baseEndpoint: string): Promise<RemoteNodeConfig[]> => {
    const candidates = [
        { id: 'local-11434', name: 'Localhost Std', url: 'http://localhost:11434' },
        { id: 'local-ip', name: 'Local IP', url: 'http://127.0.0.1:11434' },
        { id: 'local-11435', name: 'Local Alt 1', url: 'http://localhost:11435' },
        { id: 'host-docker', name: 'Docker Host', url: 'http://host.docker.internal:11434' },
        { id: 'local-8080', name: 'Local Proxy', url: 'http://localhost:8080' },
        // mDNS
        { id: 'lan-mac', name: 'Mac Studio (mDNS)', url: 'http://mac-studio.local:11434' },
        { id: 'lan-pi', name: 'Raspberry Pi (mDNS)', url: 'http://raspberrypi.local:11434' },
        { id: 'lan-ubuntu', name: 'Ubuntu (mDNS)', url: 'http://ubuntu.local:11434' },
        { id: 'lan-gemini', name: 'Gemini Server (mDNS)', url: 'http://gemini.local:11434' },
        { id: 'lan-gemini-svr', name: 'Gemini Server Alt', url: 'http://gemini-server.local:11434' },
        { id: 'lan-win', name: 'Windows PC (mDNS)', url: 'http://desktop.local:11434' },
        { id: 'lan-generic', name: 'Generic Server (mDNS)', url: 'http://server.local:11434' },
        // Common IPs
        { id: 'lan-ip-100', name: 'LAN Node (.100)', url: 'http://192.168.1.100:11434' },
        { id: 'lan-ip-200', name: 'LAN Node (.200)', url: 'http://192.168.1.200:11434' },
        { id: 'lan-ip-10', name: 'LAN Node (10.0.0.2)', url: 'http://10.0.0.2:11434' }
    ];
    
    const active: RemoteNodeConfig[] = [];
    const baseClean = baseEndpoint.replace(/\/$/, '').toLowerCase();
    
    logger.info("Initiating Network Mesh Scan...", "Discovery");

    // Parallel scanning
    await Promise.all(candidates.map(async (cand) => {
        // Don't scan self if baseEndpoint matches
        const candUrl = cand.url.replace(/\/$/, '').toLowerCase();
        if (baseClean.includes(candUrl.split('://')[1]) || baseClean === candUrl) return;

        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2500); // 2.5s timeout for scanning
            const res = await fetch(`${cand.url}/api/version`, { signal: controller.signal });
            clearTimeout(id);
            if (res.ok) {
                active.push(cand);
                logger.info(`Discovered active node: ${cand.name} at ${cand.url}`, "Discovery");
            }
        } catch(e) { /* ignore unreachable */ }
    }));
    
    logger.info(`Network Scan complete. Found ${active.length} neighbors.`, 'Discovery');
    return active;
};

const resolveModelEndpoint = (modelName: string, settings: Settings): { url: string, authHeader?: string, isRemote: boolean } => {
  // 1. Specific Remote Node Targeting (NodeName/ModelName)
  if (settings.remoteNodes) {
    for (const node of settings.remoteNodes) {
        if (modelName.startsWith(`${node.name}/`)) {
            return { 
              url: node.url, 
              authHeader: node.apiKey ? `Bearer ${node.apiKey}` : undefined,
              isRemote: true
            };
        }
    }
  }
  
  // 2. Load Balancing / Auto-Routing
  // If it's a generic request, we check if configured remote nodes have the model too
  if (settings.hiveConfig.loadBalancing === 'RANDOM' && settings.remoteNodes && settings.remoteNodes.length > 0) {
       // Simple probabilistic load balancing
       const chance = Math.random();
       // 30% chance to offload if we have remotes. 
       if (chance > 0.7) { 
           const randomNode = settings.remoteNodes[Math.floor(Math.random() * settings.remoteNodes.length)];
           logger.info(`Load Balancing: Offloading to ${randomNode.name}`, 'Router');
           return {
               url: randomNode.url,
               authHeader: randomNode.apiKey ? `Bearer ${randomNode.apiKey}` : undefined,
               isRemote: true
           };
       }
  }
  
  // Default to Local
  return { url: settings.ollamaEndpoint, isRemote: false };
};

export const verifyRemoteNodeConnection = async (node: RemoteNodeConfig): Promise<boolean> => {
  try {
    logger.info(`Verifying connection to remote node: ${node.name}`, 'Network');
    const headers: any = {};
    if (node.apiKey) headers['Authorization'] = `Bearer ${node.apiKey}`;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); 

    const response = await fetch(`${node.url}/api/version`, {
       method: 'GET',
       headers,
       signal: controller.signal
    });
    clearTimeout(id);
    
    if (response.ok) return true;
    return false;
  } catch (e) {
    logger.warn(`Connection verification failed for ${node.name}`, 'Network', e);
    return false;
  }
};

export const fetchLocalModels = async (endpoint: string): Promise<string[]> => {
  try {
    const response = await fetchWithRetry(`${endpoint}/api/tags`, { method: 'GET' });
    const data = await response.json();
    const models = data.models.map((m: any) => m.name);
    return models;
  } catch (error: any) {
    logger.error("Ollama connection failed", 'Ollama', error.message);
    throw error;
  }
};

export const fetchSystemStats = async (settings: Settings): Promise<{ models: HiveNode[], isConnected: boolean }> => {
  try {
    // Fetch Local
    const response = await fetch(`${settings.ollamaEndpoint}/api/tags`);
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    
    const coderTarget = settings.hiveConfig?.coderModel || '';
    const creativeTarget = settings.hiveConfig?.creativeModel || '';

    let nodes: HiveNode[] = data.models.map((m: any, idx: number) => {
      let role: HiveNode['role'] = 'GENERAL';
      // Logic to auto-tag local models
      const nameLower = m.name.toLowerCase();
      if (coderTarget === m.name || nameLower.includes('code') || nameLower.includes('sql') || nameLower.includes('qwen')) role = 'CODER';
      else if (creativeTarget === m.name || nameLower.includes('vision') || nameLower.includes('mistral') || nameLower.includes('gemma') || nameLower.includes('hermes')) role = 'CREATIVE';

      const capabilities = determineCapabilities(m.name);

      return {
        id: m.digest ? m.digest.substring(0, 12) : `local-${idx}`,
        name: m.name,
        size: m.size ? (m.size / (1024 * 1024 * 1024)).toFixed(1) + ' GB' : 'Unknown',
        family: m.details?.family || 'Unknown',
        params: m.details?.parameter_size || '?',
        quantization: m.details?.quantization_level || '?',
        status: 'ONLINE',
        isRemote: false,
        role,
        capabilities
      };
    });

    if (settings.remoteNodes && settings.remoteNodes.length > 0) {
        const remoteChecks = settings.remoteNodes.map(async (r) => {
             const isOnline = await verifyRemoteNodeConnection(r);
             let role: HiveNode['role'] = 'GENERAL';
             let capabilities: ModelCapability[] = ['GENERAL'];
             let size = 'Unknown';
             let family = 'Remote Mesh';
             
             // Deep inspection of remote node
             if (isOnline) {
                 try {
                    const controller = new AbortController();
                    setTimeout(() => controller.abort(), 4000); // Increased timeout for detailed fetch
                    const tagsRes = await fetch(`${r.url}/api/tags`, { 
                        signal: controller.signal,
                        headers: r.apiKey ? { 'Authorization': `Bearer ${r.apiKey}` } : {}
                    });
                    if (tagsRes.ok) {
                        const tagData = await tagsRes.json();
                        const modelNames = tagData.models.map((m:any) => m.name.toLowerCase()).join(' ');
                        
                        // Heuristic Role Assignment based on inventory
                        if (modelNames.includes('deepseek') || modelNames.includes('code') || modelNames.includes('starcoder') || modelNames.includes('qwen-coder') || modelNames.includes('sql')) {
                            role = 'CODER';
                            capabilities.push('CODER');
                        } else if (modelNames.includes('llava') || modelNames.includes('mistral') || modelNames.includes('dolphin') || modelNames.includes('hermes') || modelNames.includes('gemma')) {
                            role = 'CREATIVE';
                        }
                        
                        if (modelNames.includes('llava') || modelNames.includes('vision') || modelNames.includes('bakllava') || modelNames.includes('moondream')) {
                            capabilities.push('VISION');
                        }
                        size = `${tagData.models.length} Models`;
                    }
                 } catch (e) { 
                     logger.warn(`Detailed scan failed for ${r.name}`, "Discovery");
                 }
             } else {
                 family = 'Unreachable';
             }
             
             const nodePrefix = `${r.name}/`;
             if (coderTarget.startsWith(nodePrefix)) role = 'CODER';
             else if (creativeTarget.startsWith(nodePrefix)) role = 'CREATIVE';

             return {
                id: r.id,
                name: r.name,
                size,
                family,
                status: isOnline ? 'ONLINE' : 'OFFLINE',
                isRemote: true,
                endpoint: r.url,
                role,
                capabilities
             } as HiveNode;
        });

        const remoteResults = await Promise.all(remoteChecks);
        nodes = [...nodes, ...remoteResults];
    }

    return { models: nodes, isConnected: true };
  } catch (e) {
    return { models: [], isConnected: false };
  }
};

export const unloadModel = async (endpoint: string, modelName: string): Promise<boolean> => {
  try {
    logger.system(`Requesting unload of model: ${modelName}`, 'MemoryManager');
    await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelName,
            keep_alive: 0
        })
    });
    return true;
  } catch (e) {
    logger.error("Failed to unload model", 'MemoryManager', e);
    return false;
  }
};

export const generateContextSummary = async (textToSummarize: string, settings: Settings): Promise<string> => {
  if (!textToSummarize.trim()) return "";
  try {
    const summaryPrompt = `
<system>You are a Context Compression Engine. Create a dense, factual summary.</system>
<input>${textToSummarize}</input>`;

    const response = await fetchWithRetry(`${settings.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.modelName,
        prompt: summaryPrompt,
        stream: false,
        options: { num_ctx: 8192, temperature: 0.3 }
      })
    });
    
    const data = await response.json();
    return data.response;
  } catch (e) {
    return "Context summarization unavailable.";
  }
};

export const generateSmartTitle = async (firstMessage: string, settings: Settings): Promise<string> => {
    try {
      const response = await fetchWithRetry(`${settings.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.modelName,
          prompt: `Create a 3-5 word title for this chat: "${firstMessage.substring(0, 150)}". Return ONLY the title. No quotes.`,
          stream: false,
          options: { temperature: 0.7 }
        })
      });
      const data = await response.json();
      return data.response.trim().replace(/^"|"$/g, '');
    } catch (e) {
      return "";
    }
};

export const generateAgentPlan = async (goal: string, settings: Settings): Promise<TaskStep[]> => {
    logger.info("Generating agent execution plan...", "Planner");
    const prompt = `
<role>You are an Autonomous Agent Planner.</role>
<goal>${goal}</goal>
<instruction>Break this goal into 3-8 sequential, executable steps. Return ONLY a valid JSON Array of strings.</instruction>`;

    const makeRequest = async (temp: number) => {
        return await fetchWithRetry(`${settings.ollamaEndpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                prompt: prompt,
                stream: false,
                format: 'json',
                options: { temperature: temp }
            })
        });
    };

    try {
        let response = await makeRequest(0.0);
        let data = await response.json();
        let cleanJson = data.response.trim().replace(/```json/g, '').replace(/```/g, '').trim();
        
        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (jsonMatch) cleanJson = jsonMatch[0];

        const rawArray = JSON.parse(cleanJson);
        
        if (Array.isArray(rawArray)) {
            return rawArray.map((step: string) => ({
                id: Math.random().toString(36).substr(2, 9),
                description: typeof step === 'string' ? step : JSON.stringify(step),
                status: 'PENDING'
            }));
        }
        throw new Error("Invalid JSON structure");
    } catch (e) {
        return [{ id: '1', description: "Auto-Plan failed. Proceed with: " + goal, status: 'PENDING'}];
    }
};

export const chatWithLocalLLM = async (
  currentMessage: string,
  history: Message[],
  projectContext: string,
  customSystemPrompt: string | undefined,
  settings: Settings,
  images: string[] = [],
  signal: AbortSignal,
  onChunk: (chunk: string | undefined, thoughtChunk: string | undefined, isThinking: boolean) => void,
  modelOverride?: string, 
  optionsOverride?: { temperature?: number }
): Promise<GenerationStats | null> => {
  
  let targetModel = modelOverride || settings.modelName;
  
  // Resolve Endpoint with Load Balancing / Routing logic
  let { url: endpoint, authHeader, isRemote } = resolveModelEndpoint(targetModel, settings);
  
  if (targetModel.includes('/')) {
      const parts = targetModel.split('/');
      const node = settings.remoteNodes.find(n => targetModel.startsWith(n.name + '/'));
      if (node) {
          targetModel = targetModel.replace(`${node.name}/`, '');
          logger.info(`Routing to Remote Mesh Node: ${node.name}`, 'Network');
          // endpoint, authHeader are already set by resolveModelEndpoint via specific matching
      }
  }

  // --- Cache Check ---
  if (settings.hiveConfig.cacheEnabled && images.length === 0) {
      const cacheKey = await generateCacheKey(targetModel, currentMessage, { historyLen: history.length });
      const cached = getCachedResponse(cacheKey);
      if (cached) {
          logger.info("Cache Hit! Serving locally.", "Cache");
          // Simulate streaming for UI consistency
          onChunk(cached, undefined, false);
          return {
              totalDuration: 10, loadDuration: 0, promptEvalCount: 0, evalCount: estimateTokens(cached), evalDuration: 10, tokensPerSecond: 9999
          };
      }
  }

  logger.info(`Starting generation`, 'InferenceEngine', { model: targetModel, endpoint, contextSize: history.length });

  try {
    let baseSystemPrompt = customSystemPrompt || settings.systemPrompt;
    let systemContent = `<system_persona>\n${baseSystemPrompt}\n</system_persona>`;
    
    if (projectContext) {
      systemContent += `\n\n<long_term_memory>\n${projectContext}\n</long_term_memory>\n\n<instruction>Use the memory above to maintain continuity. Respond to the User's last message in character.</instruction>`;
    }

    const reversedHistory = [...history].reverse();
    const reservedTokens = estimateTokens(systemContent) + estimateTokens(currentMessage) + 400;
    const availableContext = settings.contextWindow - reservedTokens;
    let usedContextTokens = 0;
    const limitedHistory: any[] = [];

    for (const msg of reversedHistory) {
      if (msg.sender === Sender.SYSTEM) continue;
      const msgTokens = estimateTokens(msg.text);
      if (usedContextTokens + msgTokens < availableContext) {
        const messageObj: any = {
          role: msg.sender === Sender.USER ? 'user' : 'assistant',
          content: msg.text
        };
        if (msg.images && msg.images.length > 0 && msg.sender === Sender.USER) messageObj.images = msg.images;
        limitedHistory.unshift(messageObj);
        usedContextTokens += msgTokens;
      } else {
        break;
      }
    }
    
    const payload = {
      model: targetModel,
      messages: [
        { role: 'system', content: systemContent },
        ...limitedHistory,
        { 
          role: 'user', 
          content: currentMessage, 
          images: images.length > 0 ? images : undefined 
        }
      ],
      stream: true,
      options: {
        num_ctx: settings.contextWindow,
        temperature: optionsOverride?.temperature ?? settings.temperature,
        repeat_penalty: settings.repeatPenalty
      }
    };

    // --- Request Executor with Fallback ---
    const executeRequest = async (url: string, header?: string) => {
        return await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(header ? { 'Authorization': header } : {})
            },
            body: JSON.stringify(payload),
            signal
        });
    };

    let response: Response;
    try {
        response = await executeRequest(endpoint, authHeader);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (e: any) {
        // Fallback Logic: If remote node fails, try local
        // We only fallback if it was remote AND not an abort signal
        if (isRemote && e.name !== 'AbortError') {
            logger.error(`Connection to Remote Mesh Node (${endpoint}) failed.`, "Network", e);
            logger.warn(`Initiating Failover to Local Host (${settings.ollamaEndpoint}).`, "Network");
            
            onChunk(`\n\n> ⚠️ **System Alert**: Mesh node \`${endpoint}\` is unresponsive. Rerouting request to local inference engine...\n\n`, undefined, false);
            
            endpoint = settings.ollamaEndpoint;
            authHeader = undefined;
            // Retry once with local endpoint
            response = await executeRequest(endpoint, authHeader);
        } else {
            throw e;
        }
    }

    if (!response.ok) throw new Error(`Ollama API Error: ${response.statusText}`);
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let fullResponseText = '';
    let isThinking = false;
    let tagBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            let content = json.message.content;
            fullResponseText += content;

            // --- Robust Streaming Tag Parsing ---
            if (!isThinking) {
                const checkStr = tagBuffer + content;
                const startIdx = checkStr.indexOf('<think>');
                
                if (startIdx !== -1) {
                    isThinking = true;
                    const beforeTag = checkStr.substring(0, startIdx);
                    if (beforeTag) onChunk(beforeTag, undefined, false);
                    const afterTag = checkStr.substring(startIdx + 7);
                    if (afterTag) onChunk(undefined, afterTag, true);
                    tagBuffer = ''; 
                } else {
                    let partialLen = 0;
                    const targets = ['<think', '<thin', '<thi', '<th', '<t', '<'];
                    for (const t of targets) { if (checkStr.endsWith(t)) { partialLen = t.length; break; } }

                    if (partialLen > 0) {
                         const safeContent = checkStr.substring(0, checkStr.length - partialLen);
                         if (safeContent) onChunk(safeContent, undefined, false);
                         tagBuffer = checkStr.substring(checkStr.length - partialLen);
                    } else {
                         if (checkStr) onChunk(checkStr, undefined, false);
                         tagBuffer = '';
                    }
                }
            } else {
                const checkStr = tagBuffer + content;
                const endIdx = checkStr.indexOf('</think>');
                
                if (endIdx !== -1) {
                    isThinking = false;
                    const thoughtContent = checkStr.substring(0, endIdx);
                    if (thoughtContent) onChunk(undefined, thoughtContent, true);
                    const afterTag = checkStr.substring(endIdx + 8);
                    if (afterTag) onChunk(afterTag, undefined, false);
                    tagBuffer = '';
                } else {
                     let partialLen = 0;
                     const targets = ['</think', '</thin', '</thi', '</th', '</t', '</', '<'];
                     for (const t of targets) { if (checkStr.endsWith(t)) { partialLen = t.length; break; } }

                     if (partialLen > 0) {
                         const safeThought = checkStr.substring(0, checkStr.length - partialLen);
                         if (safeThought) onChunk(undefined, safeThought, true);
                         tagBuffer = checkStr.substring(checkStr.length - partialLen);
                    } else {
                         if (checkStr) onChunk(undefined, checkStr, true);
                         tagBuffer = '';
                    }
                }
            }
          }
          
          if (json.done) {
            // --- Save to Cache ---
            if (settings.hiveConfig.cacheEnabled && fullResponseText && images.length === 0) {
                const cacheKey = await generateCacheKey(targetModel, currentMessage, { historyLen: history.length });
                setCachedResponse(cacheKey, fullResponseText);
            }

            return {
                totalDuration: json.total_duration / 1e6,
                loadDuration: json.load_duration / 1e6,
                promptEvalCount: json.prompt_eval_count,
                evalCount: json.eval_count,
                evalDuration: json.eval_duration / 1e6,
                tokensPerSecond: json.eval_count / (json.eval_duration / 1e9)
            };
          }
        } catch (e) {}
      }
    }
    return null;

  } catch (error: any) {
    if (error.name === 'AbortError') {
        logger.info("Generation aborted by user", "InferenceEngine");
    } else {
        logger.error("Generation failed", "InferenceEngine", error);
        onChunk(`\n\n**Error:** Connection to LLM lost. ${error.message}`, undefined, false);
    }
    return null;
  }
};