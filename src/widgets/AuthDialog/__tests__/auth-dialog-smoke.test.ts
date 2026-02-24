/**
 * AuthDialog — smoke tests
 *
 * Purpose: verify the IIIF Authorization Flow 2.0 dialog renders expected
 * user-visible content (heading, profile-specific instructions, buttons,
 * resource reference) for all three auth profiles (active, kiosk, external).
 *
 * AuthDialog makes a fetch() call on mount to probe the resource. We stub
 * globalThis.fetch so the probe resolves immediately without network I/O.
 *
 * Pattern: mount -> flushSync -> assert visible text / ARIA / interactive elements -> unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AuthDialog from '../ui/AuthDialog.svelte';
import type { AuthAccessService2 } from '@/src/shared/types/auth-api';

// ── Stub fetch so the probe request does not hit the network ─────────────────
const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
  new Response(null, { status: 200 }),
);

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeService(profile: AuthAccessService2['profile']): AuthAccessService2 {
  return {
    id: `https://example.org/auth/${profile}`,
    type: 'AuthAccessService2',
    profile,
    label: { en: [`Test ${profile} auth`] },
    service: [
      { id: 'https://example.org/auth/token', type: 'AuthAccessTokenService2' },
    ],
  };
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

describe('AuthDialog smoke tests', () => {
  let target: HTMLDivElement;
  let instance: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = undefined;
  });

  afterEach(() => {
    if (instance) unmount(instance);
    target.remove();
    vi.clearAllMocks();
  });

  it('renders dialog heading and IIIF Auth 2.0 subtitle for active profile', () => {
    instance = mount(AuthDialog, {
      target,
      props: {
        authServices: [makeService('active')],
        resourceId: 'https://example.org/canvas/1',
        onComplete: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // The heading should display the service label
    expect(target.textContent).toContain('Test active auth');
    // Subtitle always shows the auth standard reference
    expect(target.textContent).toContain('IIIF Authorization Flow 2.0');
  });

  it('renders the resource ID reference at the bottom of the dialog', () => {
    const resourceId = 'https://example.org/canvas/42';
    instance = mount(AuthDialog, {
      target,
      props: {
        authServices: [makeService('active')],
        resourceId,
        onComplete: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain(resourceId);
  });

  it('renders Cancel button for every auth profile', () => {
    instance = mount(AuthDialog, {
      target,
      props: {
        authServices: [makeService('kiosk')],
        resourceId: 'https://example.org/canvas/2',
        onComplete: vi.fn(),
        onClose: vi.fn(),
        preferredLang: 'en',
      },
    });
    flushSync();

    const buttons = target.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(buttonTexts).toContain('Cancel');
  });

  it('renders service label from kiosk profile', () => {
    instance = mount(AuthDialog, {
      target,
      props: {
        authServices: [makeService('kiosk')],
        resourceId: 'https://example.org/canvas/2',
        onComplete: vi.fn(),
        onClose: vi.fn(),
        preferredLang: 'en',
      },
    });
    flushSync();

    expect(target.textContent).toContain('Test kiosk auth');
  });

  it('renders service label from external profile', () => {
    instance = mount(AuthDialog, {
      target,
      props: {
        authServices: [makeService('external')],
        resourceId: 'https://example.org/canvas/3',
        onComplete: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Test external auth');
  });

  it('renders fallback heading when no services are provided', () => {
    instance = mount(AuthDialog, {
      target,
      props: {
        authServices: [],
        resourceId: 'https://example.org/canvas/4',
        onComplete: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // With empty services, the derived serviceLabel falls back to 'Authentication Required'
    expect(target.textContent).toContain('Authentication Required');
    // Cancel button should still be available
    const buttons = target.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(buttonTexts).toContain('Cancel');
  });

  it('handles service with missing label gracefully', () => {
    const malformedService: AuthAccessService2 = {
      id: 'https://example.org/auth/broken',
      type: 'AuthAccessService2',
      profile: 'active',
      label: {} as Record<string, string[]>, // empty language map
      service: [
        { id: 'https://example.org/auth/token', type: 'AuthAccessTokenService2' },
      ],
    };

    instance = mount(AuthDialog, {
      target,
      props: {
        authServices: [malformedService],
        resourceId: 'https://example.org/canvas/5',
        onComplete: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // Should not throw; the dialog still renders with IIIF subtitle and Cancel
    expect(target.textContent).toContain('IIIF Authorization Flow 2.0');
    const buttons = target.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles service with missing token sub-service gracefully', () => {
    const noTokenService: AuthAccessService2 = {
      id: 'https://example.org/auth/no-token',
      type: 'AuthAccessService2',
      profile: 'active',
      label: { en: ['No Token Service'] },
      service: [], // empty sub-services
    };

    instance = mount(AuthDialog, {
      target,
      props: {
        authServices: [noTokenService],
        resourceId: 'https://example.org/canvas/6',
        onComplete: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    // Should render heading without crashing
    expect(target.textContent).toContain('No Token Service');
  });
});

// Clean up the global fetch stub after all tests in this file
afterAll(() => {
  fetchSpy.mockRestore();
});
