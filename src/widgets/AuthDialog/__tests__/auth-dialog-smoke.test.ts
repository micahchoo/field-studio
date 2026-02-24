/**
 * AuthDialog — smoke tests
 *
 * Purpose: verify the IIIF Authorization Flow 2.0 dialog mounts without
 * crashing for all three auth profiles (active, kiosk, external).
 *
 * AuthDialog makes a fetch() call on mount to probe the resource. We stub
 * globalThis.fetch so the probe resolves immediately without network I/O.
 *
 * Pattern: mount → flushSync → assert non-empty DOM → unmount.
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

  it('mounts with an active-profile service without crashing', () => {
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
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with a kiosk-profile service without crashing', () => {
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
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with an external-profile service without crashing', () => {
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
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with no services without crashing', () => {
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
    expect(target.firstChild).not.toBeNull();
  });
});

// Clean up the global fetch stub after all tests in this file
afterAll(() => {
  fetchSpy.mockRestore();
});
