import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface Command {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  section: 'Navigation' | 'Actions' | 'View';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const filteredCommands = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 50);
        setQuery('');
        setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isOpen) return;
          
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex(prev => Math.max(prev - 1, 0));
          } else if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredCommands[activeIndex]) {
                  filteredCommands[activeIndex].action();
                  onClose();
              }
          } else if (e.key === 'Escape') {
              onClose();
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, activeIndex]);

  if (!isOpen) return null;

  const grouped = filteredCommands.reduce((acc, cmd) => {
      if (!acc[cmd.section]) acc[cmd.section] = [];
      acc[cmd.section].push(cmd);
      return acc;
  }, {} as Record<string, Command[]>);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={onClose}>
        <div 
            className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
        >
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <Icon name="search" className="text-slate-400 text-xl"/>
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Type a command..." 
                    className="flex-1 text-lg outline-none text-slate-700 placeholder:text-slate-300"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                />
                <div className="text-xs font-bold text-slate-300 border border-slate-200 rounded px-1.5 py-0.5">ESC</div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <p>No commands found.</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([section, sectionCmds]: [string, Command[]]) => (
                        <div key={section} className="mb-2">
                            <div className="px-3 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                {section}
                            </div>
                            {sectionCmds.map(cmd => {
                                const globalIndex = filteredCommands.indexOf(cmd);
                                const isActive = globalIndex === activeIndex;
                                return (
                                    <button
                                        key={cmd.id}
                                        onClick={() => { cmd.action(); onClose(); }}
                                        className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group transition-colors ${
                                            isActive ? 'bg-iiif-blue text-white' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                        onMouseEnter={() => setActiveIndex(globalIndex)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon name={cmd.icon} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}/>
                                            <span className="font-medium">{cmd.label}</span>
                                        </div>
                                        {cmd.shortcut && (
                                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {cmd.shortcut}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
            
            <div className="bg-slate-50 p-2 text-center border-t border-slate-100 text-[10px] text-slate-400">
                <span className="font-bold">↑↓</span> to navigate <span className="font-bold mx-2">↵</span> to select
            </div>
        </div>
    </div>
  );
};