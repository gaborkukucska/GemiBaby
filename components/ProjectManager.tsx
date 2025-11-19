
import React, { useState } from 'react';
import { Folder, PlayCircle, PauseCircle, CheckCircle, Plus, X, Trash2, Bot, Download, FileText } from 'lucide-react';
import { Project } from '../types';

interface ProjectManagerProps {
  projects: Project[];
  activeProjectId: string | null;
  onSetActive: (id: string) => void;
  onCreateProject: (title: string, description: string, customSystemPrompt?: string) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ 
  projects, 
  activeProjectId, 
  onSetActive, 
  onCreateProject,
  onDeleteProject 
}) => {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [showPromptField, setShowPromptField] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onCreateProject(newTitle, newDesc, newPrompt.trim() || undefined);
      setNewTitle('');
      setNewDesc('');
      setNewPrompt('');
      setShowPromptField(false);
      setShowNewProject(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      onDeleteProject(id);
    }
  };

  const handleExportJSON = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${project.title.replace(/\s+/g, '_')}_backup.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleExportMarkdown = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      const content = `# ${project.title}
> ${project.description}

**Context Summary**: ${project.contextSummary || 'None'}

---

${project.messages.map(m => `### ${m.sender} (${new Date(m.timestamp).toLocaleString()})
${m.text}
${m.thoughtProcess ? `\n> **Reasoning**: ${m.thoughtProcess}\n` : ''}
`).join('\n---\n\n')}
`;
      
      const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(content);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${project.title.replace(/\s+/g, '_')}.md`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gem-accent">
          <Folder className="w-6 h-6" />
          Active Workflows
        </h2>
        <button 
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-2 bg-gem-accent/10 text-gem-accent hover:bg-gem-accent/20 px-4 py-2 rounded-lg transition-all border border-gem-accent/50 hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* New Project Modal Overlay */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gem-900 border border-gem-700 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-gem-900 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Initialize New Workflow</h3>
              <button onClick={() => setShowNewProject(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Project Title</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-gem-800 border border-gem-700 rounded-lg px-3 py-2 text-white focus:border-gem-accent focus:outline-none transition-colors"
                    placeholder="e.g. Q4 Market Analysis"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Objective / Description</label>
                  <textarea 
                    rows={3}
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full bg-gem-800 border border-gem-700 rounded-lg px-3 py-2 text-white focus:border-gem-accent focus:outline-none resize-none transition-colors"
                    placeholder="Define the primary goal of this agent instance..."
                  />
                </div>

                {/* Custom Persona Toggle */}
                <div>
                   <button 
                    type="button"
                    onClick={() => setShowPromptField(!showPromptField)}
                    className="text-xs flex items-center gap-1 text-gem-accent hover:underline mb-2"
                   >
                      <Bot className="w-3 h-3" /> 
                      {showPromptField ? "Use Default System Prompt" : "Customize Agent Persona (System Prompt)"}
                   </button>
                   
                   {showPromptField && (
                     <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                       <label className="block text-sm text-slate-400 mb-1">Custom System Prompt</label>
                       <textarea 
                         rows={4}
                         value={newPrompt}
                         onChange={e => setNewPrompt(e.target.value)}
                         className="w-full bg-gem-900/50 border border-pink-500/30 rounded-lg px-3 py-2 text-xs font-mono text-pink-200 focus:border-pink-500 focus:outline-none resize-none transition-colors"
                         placeholder="You are a specialized coding assistant in Rust..."
                       />
                     </div>
                   )}
                </div>

                <button 
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="w-full bg-gem-accent text-gem-900 font-bold py-2.5 rounded-lg hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  Launch Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div 
            key={project.id}
            onClick={() => onSetActive(project.id)}
            className={`group relative p-5 rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col h-64
              ${activeProjectId === project.id 
                ? 'bg-gem-800 border-gem-accent shadow-[0_0_20px_rgba(56,189,248,0.1)]' 
                : 'bg-gem-800/40 border-gem-700 hover:border-gem-600 hover:bg-gem-800/60'}`}
          >
            {activeProjectId === project.id && (
              <div className="absolute top-0 left-0 w-1 h-full bg-gem-accent" />
            )}
            
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg truncate pr-4 text-slate-100">{project.title}</h3>
              <div className="flex items-center gap-1">
                <StatusIcon status={project.status} />
                <button 
                  onClick={(e) => handleExportMarkdown(e, project)}
                  className="text-slate-600 hover:text-purple-400 transition-colors p-1 rounded hover:bg-gem-900/50"
                  title="Export as Markdown"
                >
                   <FileText className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => handleExportJSON(e, project)}
                  className="text-slate-600 hover:text-emerald-400 transition-colors p-1 rounded hover:bg-gem-900/50"
                  title="Backup as JSON"
                >
                   <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => handleDelete(e, project.id, project.title)}
                  className="text-slate-600 hover:text-gem-danger transition-colors p-1 rounded hover:bg-gem-900/50"
                  title="Delete Project"
                >
                   <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-slate-400 text-sm mb-2 line-clamp-2 flex-1">
              {project.description}
            </p>

            {project.customSystemPrompt && (
               <div className="mb-4">
                 <span className="text-[10px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                   <Bot className="w-3 h-3" /> Custom Persona
                 </span>
               </div>
            )}

            <div className="space-y-3 mt-auto">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Memory Density</span>
                  <span>{Math.min(100, (project.contextSummary.length / 500) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1 w-full bg-gem-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gem-glow" 
                    style={{ width: `${Math.min(100, (project.contextSummary.length / 500) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gem-700/50">
                <span className="text-[10px] text-slate-500 font-mono">
                  LAST: {new Date(project.lastUpdated).toLocaleDateString()}
                </span>
                <span className={`text-[10px] px-2 py-1 rounded border 
                  ${project.status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  {project.messages.length} Msgs
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {projects.length === 0 && (
           <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-gem-700 rounded-xl">
             <Folder className="w-10 h-10 mb-2 opacity-50" />
             <p>No active projects. Initialize one to begin.</p>
           </div>
        )}
      </div>
    </div>
  );
};

const StatusIcon = ({ status }: { status: Project['status'] }) => {
  switch (status) {
    case 'ACTIVE': return <PlayCircle className="w-5 h-5 text-emerald-400 shadow-[0_0_10px_#10b981]" />;
    case 'PAUSED': return <PauseCircle className="w-5 h-5 text-amber-400" />;
    case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-slate-500" />;
  }
};

export default ProjectManager;
