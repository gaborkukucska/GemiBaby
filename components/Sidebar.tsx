
import React, { useState } from 'react';
import { MessageSquare, LayoutDashboard, FolderKanban, Settings, Hexagon, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  
  // Lazy initialization guarantees this runs exactly once per component lifecycle
  // preventing ID jitter in React Strict Mode or re-renders.
  const [sessionId] = useState(() => {
      const existing = sessionStorage.getItem('gemibaby_session_id');
      if (existing) return existing;
      
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newId = `SES-${ts}-${rnd}`;
      sessionStorage.setItem('gemibaby_session_id', newId);
      return newId;
  });

  const navItems = [
    { id: 'chat', icon: <MessageSquare size={20} />, label: 'Chat' },
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Hivemind' },
    { id: 'projects', icon: <FolderKanban size={20} />, label: 'Projects' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className={`${collapsed ? 'w-16' : 'w-16 md:w-64'} bg-gem-900 border-r border-gem-700 flex flex-col transition-all duration-300 relative`}>
      {/* Collapse Toggle */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 bg-gem-800 border border-gem-700 text-slate-400 rounded-full p-1 hover:text-white hover:bg-gem-700 hidden md:block z-50"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div className={`p-6 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
        <div className="relative flex-shrink-0">
          <Hexagon className="w-8 h-8 text-gem-accent fill-gem-accent/10" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-2 h-2 bg-white rounded-full animate-pulse-slow" />
          </div>
        </div>
        <span className={`text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden md:block'}`}>
          GemiBaby
        </span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative
              ${activeTab === item.id 
                ? 'bg-gem-800/80 text-gem-accent border border-gem-700/50 shadow-lg shadow-gem-900/50' 
                : 'text-slate-400 hover:bg-gem-800/40 hover:text-slate-200'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? item.label : undefined}
          >
            <div className={`${activeTab === item.id ? 'text-gem-accent' : 'group-hover:text-white'} flex-shrink-0`}>
              {item.icon}
            </div>
            <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden md:block'}`}>
              {item.label}
            </span>
            {activeTab === item.id && (
              <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-gem-accent shadow-[0_0_8px_rgba(56,189,248,0.8)] ${collapsed ? 'absolute top-2 right-2' : 'hidden md:block'}`} />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gem-700">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 cursor-help" title={`Session: ${sessionId}`}>
             OP
           </div>
           <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden md:block'}`}>
             <div className="text-sm font-medium text-slate-200 whitespace-nowrap">System Operator</div>
             <div className="text-xs text-emerald-400 whitespace-nowrap flex items-center gap-1 font-mono">
                 {sessionId || 'INITIALIZING...'}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;