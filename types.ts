
export enum Sender {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  GEMIBABY = 'GEMIBABY'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isThinking?: boolean;
  tokensUsed?: number;
  images?: string[]; // Base64 encoded images
  thoughtProcess?: string; // Chain of thought / Reasoning trace
}

export interface TaskStep {
  id: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  result?: string;
}

export interface AgentPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  isActive: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  contextSummary: string; // Compressed context for small LLMs (Long-term memory)
  customSystemPrompt?: string; // Specific persona for this project
  lastUpdated: number;
  messages: Message[]; // Active conversation (Short-term memory)
  activePlan?: AgentPlan; // Agentic state
}

export type ModelCapability = 'GENERAL' | 'CODER' | 'VISION' | 'MATH' | 'EMBEDDING';

export interface HiveNode {
  id: string;
  name: string; // Model name
  size: string; // Model size (e.g. 4GB)
  family: string; // Model family
  status: 'ONLINE' | 'OFFLINE';
  params?: string;
  quantization?: string;
  role?: 'GENERAL' | 'CODER' | 'CREATIVE'; // Mesh Role (Legacy)
  capabilities: ModelCapability[]; // Auto-detected capabilities
  isRemote?: boolean;
  endpoint?: string;
}

export interface RemoteNodeConfig {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
}

export interface HiveConfig {
  coderModel?: string;
  creativeModel?: string;
  routerEnabled: boolean;
  loadBalancing: 'ROUND_ROBIN' | 'RANDOM';
  cacheEnabled: boolean;
  preferredFamily?: string; // e.g. 'llama3', 'mistral'
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface Settings {
  ollamaEndpoint: string;
  remoteNodes: RemoteNodeConfig[]; // Community/External Nodes
  modelName: string; // Primary General Model
  contextWindow: number;
  temperature: number;
  repeatPenalty: number;
  systemPrompt: string;
  promptTemplates: PromptTemplate[]; // Saved Personas
  audioEnabled: boolean;
  hiveConfig: HiveConfig;
}

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  latency: number;
  tps: number;
}

export interface GenerationStats {
  totalDuration: number; // ms
  loadDuration: number; // ms
  promptEvalCount: number;
  evalCount: number;
  evalDuration: number; // ms
  tokensPerSecond: number;
}

export interface SystemStats {
  lastLatency: number; // ms
  tokensPerSecond: number; // Real
  contextUsage: number; // Real tokens used
  contextLimit: number; // Max tokens
  modelCount: number; // Number of models available
  isConnected: boolean;
  history: PerformanceMetric[]; // Real session history
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SYSTEM';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  details?: any;
  source: string;
}