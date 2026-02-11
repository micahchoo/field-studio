
import React, { useEffect, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { guidance } from '@/src/shared/services/guidanceService';
import { WELCOME_MESSAGES } from '@/src/shared/constants/helpContent';
import { useContextualStyles } from '@/src/shared/lib/hooks/useContextualStyles';
import { cn } from '@/src/shared/lib/cn';

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
  const cx = useContextualStyles();
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
    <div className="mx-4 mt-4 mb-2 animate-in slide-in-from-top-2 ">
      <div className="bg-gradient-to-r from-nb-blue/10 to-nb-blue/10 border border-nb-blue/20 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-nb-blue/20 flex items-center justify-center shrink-0">
            <Icon name="lightbulb" className="text-nb-blue text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-semibold mb-1', cx.text)}>{content.title}</h4>
            <p className={cn('text-xs leading-relaxed mb-2', cx.textMuted)}>{content.body}</p>
            {content.tips && content.tips.length > 0 && (
              <ul className="space-y-1">
                {content.tips.slice(0, 2).map((tip, i) => (
                  <li key={i} className={cn('flex items-center gap-1.5 text-[11px]', cx.textMuted)}>
                    <Icon name="check" className="text-nb-green text-[10px]" />
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button variant="ghost" size="bare"
            onClick={dismiss}
            className="text-nb-black/40 hover:text-nb-black/60 p-1 shrink-0"
            title="Dismiss"
          >
            <Icon name="close" className="text-sm" />
          </Button>
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
  const cx = useContextualStyles();
  const [expanded, setExpanded] = useState(false);
  const content = WELCOME_MESSAGES[mode];

  if (!content) return null;

  return (
    <div className="relative">
      <Button variant="ghost" size="bare"
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs transition-nb ${
          expanded
            ? 'bg-nb-blue/20 text-nb-blue'
            : 'text-nb-black/40 hover:text-nb-black/60 hover:bg-nb-cream'
        }`}
      >
        <Icon name="help_outline" className="text-sm" />
        {expanded && <span>Help</span>}
      </Button>

      {expanded && (
        <div
          className={cn('absolute top-full right-0 mt-1 w-64 shadow-brutal p-3 z-50 animate-in fade-in zoom-in-95', cx.surface)}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
        >
          <h4 className={cn('text-xs font-semibold mb-1', cx.text)}>{content.title}</h4>
          <p className={cn('text-[11px] leading-relaxed mb-2', cx.textMuted)}>{content.body}</p>
          {content.tips && (
            <ul className="space-y-1">
              {content.tips.map((tip, i) => (
                <li key={i} className={cn('flex items-start gap-1.5 text-[10px]', cx.textMuted)}>
                  <Icon name="arrow_right" className="text-[10px] text-nb-black/30 mt-0.5" />
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
