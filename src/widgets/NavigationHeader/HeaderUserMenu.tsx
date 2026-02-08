/**
 * HeaderUserMenu Component
 *
 * Displays user context controls: help, settings, and user menu.
 *
 * @widget
 */

import React from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';

export interface HeaderUserMenuProps {
  /** Current field mode - affects avatar styling */
  fieldMode: boolean;
  /** User name to display */
  userName?: string;
  /** User avatar URL */
  userAvatar?: string;
  /** Organization name to display */
  organizationName?: string;
  /** Contextual muted text color class */
  textMutedColor: string;
  /** Callback for help button */
  onHelp?: () => void;
  /** Callback for settings button */
  onSettings?: () => void;
  /** Callback for user menu button */
  onUserMenu?: () => void;
  /** Terminology function */
  t: (key: string) => string;
}

/**
 * HeaderUserMenu displays help, settings, and user profile controls.
 *
 * @example
 * <HeaderUserMenu
 *   fieldMode={false}
 *   userName="Jane Doe"
 *   organizationName="Example Museum"
 *   textMutedColor="text-nb-black/50"
 *   onHelp={handleHelp}
 *   onSettings={handleSettings}
 *   onUserMenu={handleUserMenu}
 *   t={t}
 * />
 */
export const HeaderUserMenu: React.FC<HeaderUserMenuProps> = ({
  fieldMode,
  userName,
  userAvatar,
  organizationName,
  textMutedColor,
  onHelp,
  onSettings,
  onUserMenu,
  t,
}) => {
  const avatarBgColor = fieldMode
    ? 'rgba(250, 204, 21, 0.2)'
    : 'rgba(59, 130, 246, 0.2)';
  const avatarTextColor = fieldMode ? '#facc15' : '#3b82f6';

  return (
    <div className="flex items-center gap-2">
      {/* Help Button */}
      {onHelp && (
        <IconButton
          icon="help_outline"
          ariaLabel={t('help') || 'Help'}
          onClick={onHelp}
          variant="ghost"
          size="md"
          title={t('help') || 'Help'}
        />
      )}

      {/* Settings Button */}
      {onSettings && (
        <IconButton
          icon="settings"
          ariaLabel={t('settings') || 'Settings'}
          onClick={onSettings}
          variant="ghost"
          size="md"
          title={t('settings') || 'Settings'}
        />
      )}

      {/* User Menu */}
      {onUserMenu && (
        <Button
          onClick={onUserMenu}
          variant="ghost"
          size="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          aria-label={`${t('user_menu') || 'User menu'}: ${userName || ''}`}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt=""
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: avatarBgColor,
                color: avatarTextColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {userName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="hidden md:block text-left">
            <div
              style={{ fontSize: '14px', fontWeight: 500, color: 'inherit' }}
            >
              {userName || t('guest') || 'Guest'}
            </div>
            {organizationName && (
              <div style={{ fontSize: '12px', color: textMutedColor }}>
                {organizationName}
              </div>
            )}
          </div>
          <Icon name="expand_more" className="text-sm" />
        </Button>
      )}
    </div>
  );
};

export default HeaderUserMenu;
