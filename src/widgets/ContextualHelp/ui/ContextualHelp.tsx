
import React, { useEffect, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { guidance } from '@/src/shared/services/guidanceService';
import { WELCOME_MESSAGES } from '../constants/helpContent';

interface ContextualHelpProps {
  mode: string;
  isInspectorOpen?: boolean;
}

/**
 * Lightweight contextual help banner
 * Shows a brief welcome message the first time a user visits each view
 * Non-intrusive: appears at top of content area, easy to dismiss
 */
export const ContextualHelp: React.FC<ContextualHelpProps> = ({ mode }) => {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<typeof WELCOME_MESSAGES['archive'] | null>(null);

  useEffect(() => {
    // DISABLED: Too many tooltips create visual noise
    // Only show help if user explicitly asks for it via ? key
    setVisible(false);
    setContent(null);
    return;
    
    /* Original code - disabled
    const topicId = `intro-${mode}` as const;
    const welcomeContent = WELCOME_MESSAGES[mode];

    if (welcomeContent && !guidance.hasSeen(topicId)) {
      setContent(welcomeContent);
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      setContent(null);
    }
    */
  }, [mode]);

  const dismiss = () => {
    const topicId = `intro-${mode}`;
    guidance.markSeen(topicId as any);
    setVisible(false);
  };

  if (!visible || !content) return null;

  return (
    <div className="mx-4 mt-4 mb-2 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Icon name="lightbulb" className="text-blue-600 text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">{content.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-2">{content.body}</p>
            {content.tips && content.tips.length > 0 && (
              <ul className="space-y-1">
                {content.tips.slice(0, 2).map((tip, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Icon name="check" className="text-green-500 text-[10px]" />
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={dismiss}
            className="text-slate-400 hover:text-slate-600 p-1 shrink-0"
            title="Dismiss"
          >
            <Icon name="close" className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact view-specific help indicator
 * Shows in the corner, expands on hover/click
 */
export const ViewHelp: React.FC<{ mode: string }> = ({ mode }) => {
  const [expanded, setExpanded] = useState(false);
  const content = WELCOME_MESSAGES[mode];

  if (!content) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
          expanded
            ? 'bg-blue-100 text-blue-700'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Icon name="help_outline" className="text-sm" />
        {expanded && <span>Help</span>}
      </button>

      {expanded && (
        <div
          className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
        >
          <h4 className="text-xs font-semibold text-slate-700 mb-1">{content.title}</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{content.body}</p>
          {content.tips && (
            <ul className="space-y-1">
              {content.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                  <Icon name="arrow_right" className="text-[10px] text-slate-300 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
