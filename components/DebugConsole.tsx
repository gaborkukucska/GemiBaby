
import React, { useEffect, useState, useRef } from 'react';
import { Terminal, X, Maximize2, Minimize2, Filter, Trash2, Lock } from 'lucide-react';
import { logger } from '../services/logger';
import { LogEntry } from '../types';

const DebugConsole: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(logger.getHistory());
    const unsub = logger.subscribe((entry) => {
      setLogs(prev => [entry, ...prev]);
    });
    return unsub;
  }, []);

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.level === filter);

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'ERROR': return 'text-red-500';
      case 'WARN': return 'text-yellow-400';
      case 'INFO': return 'text-sky-400';
      case 'SYSTEM': return 'text-purple-400';
      case 'DEBUG': return 'text-slate-500';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className={`fixed bottom-0 right-0 bg-[#0f172a]/95 backdrop-blur-md border-t border-l border-gem-700 shadow-2xl transition-all duration-300 z-50 flex flex-col font-mono
      ${isExpanded ? 'w-full h-[80vh]' : 'w-full md:w-[600px] h-64'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gem-700 bg-gem-900">
        <div className="flex items-center gap-2 text-xs font-bold text-gem-accent">
          <Terminal className="w-4 h-4" />
          SYSTEM_TELEMETRY
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-gem-800 rounded p-0.5">
              {['ALL', 'INFO', 'WARN', 'ERROR', 'SYSTEM'].map(f => (
                 <button 
                   key={f} 
                   onClick={() => setFilter(f)}
                   className={`px-2 py-0.5 text-[10px] rounded ${filter === f ? 'bg-gem-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   {f}
                 </button>
              ))}
           </div>
           <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-slate-400 hover:text-white"><Maximize2 className="w-3 h-3"/></button>
           <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-3 h-3"/></button>
        </div>
      </div>

      {/* Log Stream */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs" ref={scrollRef}>
         {filteredLogs.length === 0 && <div className="text-slate-600 text-center mt-10 italic">Waiting for system events...</div>}
         {filteredLogs.map((log) => (
            <div key={log.id} className="flex gap-2 hover:bg-white/5 p-1 rounded group">
               <span className="text-slate-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}</span>
               <span className={`font-bold shrink-0 w-14 ${getLevelColor(log.level)}`}>{log.level}</span>
               <span className="text-slate-500 shrink-0 w-20 truncate">[{log.source}]</span>
               <span className="text-slate-300 break-all">
                  {log.message}
                  {log.details && <span className="text-slate-500 ml-2 block pl-4 border-l border-slate-700 mt-1">{JSON.stringify(log.details)}</span>}
               </span>
            </div>
         ))}
      </div>
    </div>
  );
};

export default DebugConsole;
