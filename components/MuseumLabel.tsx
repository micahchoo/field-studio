
import React from 'react';
import { Icon } from './Icon';

interface MuseumLabelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  type?: 'field-note' | 'exhibit' | 'spec';
}

export const MuseumLabel: React.FC<MuseumLabelProps> = ({ title, subtitle, children, type = 'field-note' }) => {
  const styles = {
    'field-note': 'bg-amber-50 border-amber-200 text-amber-900',
    'exhibit': 'bg-blue-50 border-blue-200 text-blue-900',
    'spec': 'bg-slate-900 border-slate-700 text-slate-100',
  };

  return (
    <div className={`p-4 rounded-xl border-l-4 shadow-sm my-4 animate-in fade-in slide-in-from-left-2 ${styles[type]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon name={type === 'field-note' ? 'history_edu' : type === 'exhibit' ? 'account_balance' : 'terminal'} className="text-sm opacity-60" />
        <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</h4>
      </div>
      {subtitle && <p className="text-xs font-bold mb-2">{subtitle}</p>}
      <div className="text-xs leading-relaxed opacity-90 italic">
        {children}
      </div>
    </div>
  );
};
