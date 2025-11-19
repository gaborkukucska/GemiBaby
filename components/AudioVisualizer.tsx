import React from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  mode: 'SPEAKING' | 'LISTENING';
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, mode }) => {
  if (!isActive) return null;

  const colorClass = mode === 'SPEAKING' ? 'bg-gem-accent shadow-[0_0_8px_#38bdf8]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]';

  return (
    <div className="flex items-center justify-center gap-1 h-8 px-2">
      <div className={`w-1 rounded-full animate-wave ${colorClass}`} style={{ animationDuration: '0.8s' }}></div>
      <div className={`w-1 rounded-full animate-wave ${colorClass}`} style={{ animationDuration: '1.1s', animationDelay: '0.1s' }}></div>
      <div className={`w-1 rounded-full animate-wave ${colorClass}`} style={{ animationDuration: '1.3s', animationDelay: '0.2s' }}></div>
      <div className={`w-1 rounded-full animate-wave ${colorClass}`} style={{ animationDuration: '0.9s', animationDelay: '0.3s' }}></div>
      <div className={`w-1 rounded-full animate-wave ${colorClass}`} style={{ animationDuration: '1.2s', animationDelay: '0.1s' }}></div>
      {mode === 'LISTENING' && (
          <span className="ml-2 text-[10px] font-mono font-bold text-red-400 animate-pulse">REC</span>
      )}
    </div>
  );
};

export default AudioVisualizer;