import React, { useEffect, useState } from 'react';
import { ShieldCheck, Wifi, Activity, Database, Server } from 'lucide-react';
import { SystemStats, Settings } from '../types';

interface StatusFooterProps {
    stats: SystemStats;
    settings: Settings;
}

const StatusFooter: React.FC<StatusFooterProps> = ({ stats, settings }) => {
    const [uptime, setUptime] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setUptime(u => u + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <div className="h-7 bg-[#0a0f1e] border-t border-gem-700 flex items-center justify-between px-3 text-[10px] font-mono text-slate-500 select-none z-50">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-emerald-500">
                    <ShieldCheck className="w-3 h-3" />
                    <span>ENCRYPTED::AES-GCM-256</span>
                </div>
                <div className="hidden md:flex items-center gap-1.5">
                    <Server className="w-3 h-3 text-purple-400" />
                    <span className="text-slate-400">HOST: {settings.ollamaEndpoint.replace('http://', '')}</span>
                </div>
                <div className="hidden md:flex items-center gap-1.5">
                     <Activity className="w-3 h-3 text-sky-400" />
                     <span className="text-slate-400">TPS: {stats.tokensPerSecond.toFixed(1)}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-pink-400" />
                    <span>MEM: {((stats.contextUsage / settings.contextWindow) * 100).toFixed(1)}%</span>
                </div>
                <div className="hidden md:flex items-center gap-1.5">
                    <Wifi className={`w-3 h-3 ${stats.isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
                    <span>{stats.isConnected ? 'LINK_ESTABLISHED' : 'LINK_LOST'}</span>
                </div>
                <div className="w-16 text-right text-slate-600">
                    T+{formatUptime(uptime)}
                </div>
            </div>
        </div>
    );
};

export default StatusFooter;