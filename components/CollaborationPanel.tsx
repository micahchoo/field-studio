/**
 * Collaboration Panel
 *
 * UI component for managing P2P collaboration sessions.
 * Provides real-time peer awareness and session management.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { SyncProvider } from '../services/sync/syncProvider';
import { SyncState } from '../services/sync/types';
import type { PresenceInfo } from '../services/sync/crdtAdapter';

export interface CollaborationPanelProps {
  syncProvider: SyncProvider | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PeerEntry {
  userId: string;
  userName: string;
  userColor: string;
  isLocal: boolean;
}

/**
 * Collaboration Panel Component
 *
 * Manages P2P collaboration session UI including:
 * - Connection/disconnection flow
 * - Real-time peer list with presence indicators
 * - Connection status display
 * - Error handling
 */
export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  syncProvider,
  isOpen,
  onClose,
}) => {
  // Connection form state
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection state
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [peers, setPeers] = useState<PeerEntry[]>([]);

  // Refs for subscription cleanup
  const stateChangeUnsubscribeRef = useRef<(() => void) | null>(null);
  const presenceChangeUnsubscribeRef = useRef<(() => void) | null>(null);

  // Set up focus trap for accessibility
  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
  });

  // Subscribe to sync provider state changes
  useEffect(() => {
    if (!syncProvider || !isOpen) {
      return;
    }

    // Get initial state
    setSyncState(syncProvider.getState());

    // Subscribe to state changes
    const originalOnStateChange = (syncProvider as unknown as { options: { onStateChange?: (state: SyncState) => void } }).options?.onStateChange;

    const handleStateChange = (state: SyncState) => {
      setSyncState(state);
      if (state.status === 'error') {
        setError(state.error);
        setIsConnecting(false);
      }
    };

    // Override the provider's state change handler
    (syncProvider as unknown as { options: { onStateChange?: (state: SyncState) => void } }).options = {
      ...(syncProvider as unknown as { options: Record<string, unknown> }).options,
      onStateChange: (state: SyncState) => {
        handleStateChange(state);
        originalOnStateChange?.(state);
      },
    };

    // Initial peer list
    updatePeerList();

    // Set up periodic peer list refresh when connected
    const intervalId = syncProvider.isConnected()
      ? setInterval(updatePeerList, 2000)
      : null;

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      // Restore original handler
      (syncProvider as unknown as { options: { onStateChange?: (state: SyncState) => void } }).options = {
        ...(syncProvider as unknown as { options: Record<string, unknown> }).options,
        onStateChange: originalOnStateChange,
      };
    };
  }, [syncProvider, isOpen]);

  // Update peer list from sync provider
  const updatePeerList = useCallback(() => {
    if (!syncProvider) return;

    const remotePeers = syncProvider.getPeers();
    const entries: PeerEntry[] = remotePeers.map((peer) => ({
      userId: peer.userId,
      userName: peer.userName,
      userColor: peer.userColor,
      isLocal: false,
    }));

    // Add local user entry at the bottom
    entries.push({
      userId: 'local',
      userName: 'You',
      userColor: '#3b82f6', // Default blue for local user
      isLocal: true,
    });

    setPeers(entries);
  }, [syncProvider]);

  // Handle connect button click
  const handleConnect = useCallback(async () => {
    if (!syncProvider || !roomId.trim()) return;

    setIsConnecting(true);
    setError(null);

    try {
      await syncProvider.connect(roomId.trim(), password.trim() || undefined);
      updatePeerList();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [syncProvider, roomId, password, updatePeerList]);

  // Handle disconnect button click
  const handleDisconnect = useCallback(() => {
    if (!syncProvider) return;

    syncProvider.disconnect();
    setSyncState(syncProvider.getState());
    setPeers([]);
    setRoomId('');
    setPassword('');
  }, [syncProvider]);

  // Handle input keydown (Enter to connect)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && roomId.trim() && !isConnecting) {
        handleConnect();
      }
    },
    [roomId, isConnecting, handleConnect]
  );

  // Validate room ID (alphanumeric, hyphens, underscores only)
  const isRoomIdValid = useCallback((id: string): boolean => {
    return /^[a-zA-Z0-9_-]+$/.test(id);
  }, []);

  // Determine if connect button should be disabled
  const isConnectDisabled = !roomId.trim() || isConnecting || !isRoomIdValid(roomId);

  // Get connection status display
  const getStatusDisplay = () => {
    if (!syncState) return { text: 'Unknown', color: 'text-gray-400', icon: 'help' };

    switch (syncState.status) {
      case 'connected':
        return { text: `Connected to ${syncState.roomId}`, color: 'text-green-600', icon: 'cloud_done' };
      case 'connecting':
        return { text: 'Connecting...', color: 'text-blue-600', icon: 'sync' };
      case 'error':
        return { text: 'Connection Error', color: 'text-red-600', icon: 'error' };
      case 'disconnected':
      default:
        return { text: 'Disconnected', color: 'text-gray-400', icon: 'cloud_off' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const isConnected = syncState?.status === 'connected';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collaboration-panel-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="h-14 border-b px-5 flex items-center justify-between bg-slate-50">
          <h2
            id="collaboration-panel-title"
            className="text-base font-bold text-slate-800 flex items-center gap-2"
          >
            <Icon name="group" className="text-blue-600" />
            Collaboration
          </h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Error Message */}
          {error && (
            <div
              className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex gap-3 animate-in slide-in-from-top-2"
              role="alert"
            >
              <Icon name="error" className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Connection Failed</p>
                <p className="opacity-80">{error}</p>
              </div>
            </div>
          )}

          {/* Connection Status */}
          {isConnected && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-50" />
              </div>
              <Icon name={statusDisplay.icon} className={statusDisplay.color} />
              <span className={`font-medium ${statusDisplay.color}`}>
                {statusDisplay.text}
              </span>
            </div>
          )}

          {/* Disconnected State */}
          {!isConnected && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              {/* Room ID Input */}
              <div>
                <label
                  htmlFor="room-id"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2"
                >
                  Room ID
                </label>
                <input
                  id="room-id"
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter room ID"
                  disabled={isConnecting}
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  aria-invalid={roomId && !isRoomIdValid(roomId) ? 'true' : 'false'}
                  aria-describedby={roomId && !isRoomIdValid(roomId) ? 'room-id-error' : undefined}
                />
                {roomId && !isRoomIdValid(roomId) && (
                  <p id="room-id-error" className="mt-2 text-xs text-red-600">
                    Room ID can only contain letters, numbers, hyphens, and underscores
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="room-password"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2"
                >
                  Password <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="room-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter password"
                  disabled={isConnecting}
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* Help Text */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <Icon name="info" className="shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <p className="font-medium mb-1">Real-time Collaboration</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Connect to a room to collaborate with others in real-time. All changes are
                      synchronized instantly using peer-to-peer technology.
                    </p>
                  </div>
                </div>
              </div>

              {/* Connect Button */}
              <button
                onClick={handleConnect}
                disabled={isConnectDisabled}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Icon name="link" />
                    Connect
                  </>
                )}
              </button>
            </div>
          )}

          {/* Connected State - Peer List */}
          {isConnected && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              {/* Peer Count */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">
                  {peers.length > 1 ? `${peers.length - 1} peer${peers.length > 2 ? 's' : ''} online` : 'No other peers'}
                </span>
                <span className="text-slate-400 text-xs">
                  Auto-sync active
                </span>
              </div>

              {/* Peer List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  Participants
                </div>
                <ul className="divide-y divide-slate-100" role="list">
                  {peers.map((peer) => (
                    <li
                      key={peer.userId}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      {/* Presence Indicator */}
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: peer.userColor }}
                        aria-hidden="true"
                      />

                      {/* Peer Name */}
                      <span className="flex-1 text-sm font-medium text-slate-700">
                        {peer.userName}
                      </span>

                      {/* Local User Badge */}
                      {peer.isLocal && (
                        <span className="text-xs text-slate-400 font-medium">
                          You
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sync Info */}
              {syncState?.lastSyncedAt && (
                <p className="text-xs text-slate-400 text-center">
                  Last synced: {new Date(syncState.lastSyncedAt).toLocaleTimeString()}
                </p>
              )}

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="w-full h-11 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-red-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <Icon name="link_off" />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationPanel;
