
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, Network, Server, Zap, Database, Wifi, WifiOff, HardDrive, Power, Terminal, Globe, Share2, Lock } from 'lucide-react';
import { HiveNode, SystemStats, Project, Settings } from '../types';
import { fetchSystemStats, unloadModel } from '../services/ollamaService';
import DebugConsole from './DebugConsole';

interface DashboardProps {
  systemStats: SystemStats;
  settings: Settings;
  activeProject: Project | null;
}

const Dashboard: React.FC<DashboardProps> = ({ systemStats, settings, activeProject }) => {
  const [realNodes, setRealNodes] = useState<HiveNode[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unloadingId, setUnloadingId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const getNodes = async () => {
      const { models } = await fetchSystemStats(settings);
      setRealNodes(models);
    };
    getNodes();
    const interval = setInterval(getNodes, 10000);
    return () => clearInterval(interval);
  }, [settings, refreshKey]);

  const handleUnload = async (modelName: string, id: string) => {
      setUnloadingId(id);
      await unloadModel(settings.ollamaEndpoint, modelName);
      setUnloadingId(null);
      setRefreshKey(k => k + 1);
  };

  const contextPercent = Math.min(100, (systemStats.contextUsage / settings.contextWindow) * 100);
  const chartData = systemStats.history.length > 0 ? systemStats.history : [{ id: 'init', timestamp: 'Now', latency: 0, tps: 0 }];

  return (
    <div className="h-full p-6 overflow-y-auto relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gem-accent">
            <Network className="w-6 h-6" />
            Real-Time Telemetry
        </h2>
        <button 
           onClick={() => setShowDebug(true)} 
           className="flex items-center gap-2 px-3 py-1.5 bg-gem-800 border border-gem-700 rounded text-xs text-slate-400 hover:text-white hover:border-gem-500 transition-all"
        >
            <Terminal className="w-3 h-3" /> SYSTEM LOGS
        </button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={systemStats.isConnected ? <Wifi /> : <WifiOff />} label="Status" value={systemStats.isConnected ? "ONLINE" : "DISCONNECTED"} sub={settings.ollamaEndpoint} color={systemStats.isConnected ? "text-emerald-400" : "text-red-400"} />
        <StatCard icon={<Zap />} label="Latest Latency" value={`${systemStats.lastLatency.toFixed(0)}ms`} sub="Response Time" color="text-yellow-400" />
        <StatCard icon={<Activity />} label="Inference Speed" value={`${systemStats.tokensPerSecond.toFixed(1)} t/s`} sub="Token Throughput" color="text-pink-400" />
        <StatCard icon={<Database />} label="Context Load" value={`${contextPercent.toFixed(1)}%`} sub={`${systemStats.contextUsage} / ${settings.contextWindow}`} color="text-blue-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-gem-800/50 backdrop-blur-sm border border-gem-700 p-4 rounded-xl h-80 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-slate-300 flex items-center gap-2"><Cpu className="w-4 h-4" /> Session Performance History</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="timestamp" stroke="#64748b" hide />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} itemStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#f43f5e" fillOpacity={1} fill="url(#colorLat)" />
                <Area type="monotone" dataKey="tps" name="Speed (t/s)" stroke="#38bdf8" fillOpacity={1} fill="url(#colorTps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Local Hive Nodes */}
        <div className="bg-gem-800/50 backdrop-blur-sm border border-gem-700 p-4 rounded-xl h-80 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-slate-300 flex justify-between items-center">
            <span className="flex items-center gap-2"><Server className="w-4 h-4" /> Mesh Topology (Nodes)</span>
            <button onClick={() => setRefreshKey(k => k + 1)} className="text-xs bg-gem-700 px-2 py-1 rounded hover:bg-gem-600 transition-colors">REFRESH</button>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gem-700">
            {realNodes.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2"><WifiOff className="w-8 h-8 opacity-50" /><p>No models detected.</p></div>
            ) : (
              realNodes.map((node) => (
                <div key={node.id} className={`relative flex items-center justify-between p-3 rounded-lg border transition-all group ${settings.modelName === node.name ? 'bg-gem-accent/10 border-gem-accent shadow-[0_0_10px_rgba(56,189,248,0.1)]' : 'bg-gem-900/50 border-gem-700/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                         <div className={`w-2.5 h-2.5 rounded-full ${node.status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-mono font-bold text-slate-200 flex items-center gap-2">
                          {node.isRemote && <Globe className="w-3 h-3 text-purple-400" />}
                          {node.name}
                          {node.role === 'CODER' && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded border border-emerald-500/30 font-sans tracking-wider font-bold shadow-[0_0_5px_rgba(16,185,129,0.2)]">
                                  CODER
                              </span>
                          )}
                          {node.role === 'CREATIVE' && (
                              <span className="text-[9px] bg-pink-500/20 text-pink-400 px-1.5 rounded border border-pink-500/30 font-sans tracking-wider font-bold shadow-[0_0_5px_rgba(236,72,153,0.2)]">
                                  CREATIVE
                              </span>
                          )}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase flex gap-2 mt-0.5">
                          {node.isRemote ? (
                              <span className="text-purple-400 flex items-center gap-1"><Share2 className="w-2 h-2"/> Remote Node</span>
                          ) : (
                              <span className="flex items-center gap-1"><HardDrive className="w-3 h-3"/> Local • {node.size}</span>
                          )}
                          <span>•</span>
                          <span className="text-gem-glow">{node.family}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                     {!node.isRemote && (
                         <button onClick={() => handleUnload(node.name, node.id)} disabled={unloadingId === node.id} className="text-[9px] flex items-center gap-1 bg-gem-900 border border-gem-700 px-1.5 py-0.5 rounded text-slate-400 hover:text-red-400 hover:border-red-500 transition-colors">
                            <Power className="w-3 h-3" /> {unloadingId === node.id ? '...' : 'UNLOAD'}
                         </button>
                     )}
                     {node.isRemote && (
                         <span className="text-[9px] flex items-center gap-1 text-emerald-500 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-500/20">
                             <Lock className="w-2 h-2" /> ENCRYPTED
                         </span>
                     )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Context Visualization */}
      <div className="mt-6 bg-gem-800/50 backdrop-blur-sm border border-gem-700 p-4 rounded-xl">
         <h3 className="text-lg font-semibold mb-4 text-slate-300 flex justify-between">
            <span>Context Window Utilization</span>
            <span className="text-xs font-mono text-gem-accent">{systemStats.contextUsage} / {settings.contextWindow} TOKENS</span>
         </h3>
         <div className="h-4 w-full bg-gem-900 rounded-full overflow-hidden border border-gem-700 relative">
            <div className="absolute top-0 bottom-0 left-1/4 w-px bg-gem-700/50"></div>
            <div className="absolute top-0 bottom-0 left-2/4 w-px bg-gem-700/50"></div>
            <div className="absolute top-0 bottom-0 left-3/4 w-px bg-gem-700/50"></div>
            <div className={`h-full transition-all duration-700 ease-out ${contextPercent > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-gem-accent to-purple-500'}`} style={{ width: `${contextPercent}%` }} />
         </div>
      </div>

      {showDebug && <DebugConsole onClose={() => setShowDebug(false)} />}
    </div>
  );
};

const StatCard = ({ icon, label, value, sub, color }: any) => (
  <div className="bg-gem-800/50 p-4 rounded-xl border border-gem-700 flex items-center gap-4 hover:border-gem-600 transition-colors group">
    <div className={`p-3 rounded-lg bg-gem-900 ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
    <div className="min-w-0">
      <div className="text-slate-400 text-sm truncate">{label}</div>
      <div className="text-xl font-bold text-slate-100 truncate">{value}</div>
      <div className="text-xs text-slate-500 truncate">{sub}</div>
    </div>
  </div>
);

export default Dashboard;
