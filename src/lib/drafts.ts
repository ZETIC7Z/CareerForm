'use client';

/**
 * Client-side bridge between the offline-first builder and the user's account.
 *
 * The builder persists work in localStorage so nothing is ever lost to a dropped
 * connection. These helpers find that work, hand it to the account on sign-in, and
 * raise real operating-system notifications for job alerts.
 */

export const STANDALONE_DRAFT_KEY = 'zeticuz-draft';
export const PROJECT_DRAFT_PREFIX = 'pds_project_';

export interface LocalDraft {
  projectId?: string;
  title: string;
  data: unknown;
  lastModified: string;
}

export interface SyncedProject {
  id: string;
  title: string;
  description?: string;
  completionRate: number;
  lastModified: string;
  createdAt: string;
  kind?: string;
}

/** Every draft this device is holding, newest first. */
export function collectLocalDrafts(): LocalDraft[] {
  if (typeof window === 'undefined') return [];
  const drafts: LocalDraft[] = [];

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(PROJECT_DRAFT_PREFIX)) {
        const projectId = key.slice(PROJECT_DRAFT_PREFIX.length);
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          drafts.push({
            projectId,
            title: `Personal Data Sheet ${projectId.slice(-6)}`,
            data: JSON.parse(raw),
            lastModified: new Date().toISOString(),
          });
        } catch {}
      } else if (key === STANDALONE_DRAFT_KEY) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const data = JSON.parse(raw);
          drafts.push({
            title: deriveDraftTitle(data),
            data,
            lastModified: localStorage.getItem(`${STANDALONE_DRAFT_KEY}-at`) || new Date().toISOString(),
          });
        } catch {}
      }
    }
  } catch {
    return [];
  }

  return drafts;
}

/** Best-effort human title from a draft, so a synced project isn't called "Untitled". */
function deriveDraftTitle(data: any): string {
  const values = data?.values || data || {};
  const position = values?.position?.value || values?.position;
  const agency = values?.agencyName?.value || values?.agency?.value || values?.agencyName;
  if (typeof position === 'string' && position.trim()) {
    return agency ? `${position} · ${agency}`.slice(0, 120) : position.slice(0, 120);
  }
  const surname = values?.surname?.value || values?.surname;
  if (typeof surname === 'string' && surname.trim()) return `${surname.trim()} — Personal Data Sheet`.slice(0, 120);
  return 'Personal Data Sheet 2026';
}

/**
 * Push this device's drafts into the signed-in account.
 * Returns the account's project list, which doubles as the "recent projects" source.
 */
export async function syncLocalDrafts(): Promise<{ projects: SyncedProject[]; created: number } | null> {
  const drafts = collectLocalDrafts();
  try {
    const res = await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drafts }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) return null;
    return { projects: data.projects || [], created: data.created || 0 };
  } catch {
    return null;
  }
}

/** Fetch the account's projects without pushing anything. */
export async function fetchProjects(): Promise<SyncedProject[]> {
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    return data?.ok && Array.isArray(data.projects) ? data.projects : [];
  } catch {
    return [];
  }
}

export type DevicePermission = 'granted' | 'denied' | 'unsupported' | 'dismissed';

/**
 * Ask the browser for permission to show operating-system notifications.
 * Resolves to the state the caller should reflect in its UI.
 */
export async function requestNotificationPermission(): Promise<DevicePermission> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'dismissed';
  } catch {
    return 'unsupported';
  }
}

/** Show an OS notification, routed to an in-app target when the user taps it. */
export function notifyDevice(title: string, body: string, href?: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }
  try {
    const n = new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: `careerform-${href || title}`,
    });
    if (href) {
      n.onclick = () => {
        window.focus();
        window.location.href = href;
      };
    }
    return true;
  } catch {
    return false;
  }
}
