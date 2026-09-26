'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The live "how many accounts exist" badge in the site header.
 *
 * The number is one of the few things on the site that is not the visitor's own business,
 * so it is read from `/api/stats/accounts` (a plain count of the `users` collection, Google
 * sign-ups included) instead of being rendered on the server: the layout is shared by every
 * route, and looking the total up while rendering would turn every cached page into a
 * database round trip for a number that is a second out of date by the time it paints.
 *
 * "Live" is three separate things, because none of them covers the others:
 *
 *   1. A poll every POLL_MS keeps an open tab honest — that is what makes the number move
 *      when a stranger somewhere else signs up.
 *   2. A refetch when the tab is brought back to the front, since background tabs have
 *      their timers throttled hard and the first thing a returning visitor sees must not be
 *      a number from twenty minutes ago.
 *   3. A refetch the instant this browser creates an account (`careerform:account-created`,
 *      dispatched by the sign-up form), so the person who just registered watches the count
 *      tick up instead of waiting out a poll interval.
 *
 * The digits are an odometer: each column is a reel of 0–9 that slides to the new value.
 * The reels mount at 0 and roll to the real total as soon as the first answer lands — so
 * every page open plays the count rolling up — and any later change (a new registration
 * anywhere, picked up by the poll) rolls only the columns that moved. While the badge is
 * up the dot pulses and a fresh increase flashes green; if the site is mid-deploy, or the
 * database is unreachable, the dot dims and the last known total stays on screen — a stale
 * count is far better than a counter that blinks out.
 */
const POLL_MS = 15_000;

/** Fired by the sign-up form so the badge can tick up without waiting for the next poll. */
export const ACCOUNT_CREATED_EVENT = 'careerform:account-created';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * One odometer readout. Rendered from `display`, which starts at 0 and is set to the real
 * total by the first successful fetch — mounting at 0 and transitioning afterwards is what
 * makes the opening roll happen at all (a reel that mounts directly on its final transform
 * would never animate).
 */
function Odometer({ value }: { value: number }) {
  const chars = value.toLocaleString('en-US').split('');
  return (
    <span className="acc-odometer" aria-hidden="true">
      {chars.map((ch, i) =>
        ch >= '0' && ch <= '9' ? (
          <span key={i} className="acc-digit">
            <span className="acc-reel" style={{ transform: `translateY(-${Number(ch)}em)` }}>
              {DIGITS.map(d => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className="acc-sep">
            {ch}
          </span>
        )
      )}
    </span>
  );
}

export default function AccountsCounter({ className = '' }: { className?: string }) {
  // `display` drives the reels; `loaded` gates the dot and the accessible value.
  const [display, setDisplay] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [reachable, setReachable] = useState(true);
  const [ticked, setTicked] = useState(false);
  const previous = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);

  const read = useCallback(async () => {
    try {
      const res = await fetch('/api/stats/accounts', { cache: 'no-store' });
      const data = await res.json();
      if (!data?.ok || typeof data.total !== 'number') throw new Error('unusable payload');
      setReachable(true);
      // A jump is worth pointing at: it means somebody out there just joined. The very
      // first answer only rolls the reels up from zero — it is not an event to flash about.
      if (previous.current !== null && data.total > previous.current) {
        setTicked(true);
        if (flashTimer.current) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setTicked(false), 1800);
      }
      previous.current = data.total;
      setDisplay(data.total);
      setLoaded(true);
    } catch {
      setReachable(false);
    }
  }, []);

  useEffect(() => {
    void read();

    const timer = window.setInterval(() => void read(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void read();
    };
    const onCreated = () => void read();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener(ACCOUNT_CREATED_EVENT, onCreated);

    return () => {
      window.clearInterval(timer);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener(ACCOUNT_CREATED_EVENT, onCreated);
    };
  }, [read]);

  return (
    <div
      className={`acc-badge ${className}`.trim()}
      title="Total registered accounts — updated live"
      aria-label={`Total registered accounts: ${loaded ? display.toLocaleString('en-US') : 'loading'}`}
      role="status"
    >
      <span className="acc-badge-dot" data-reachable={reachable ? 'yes' : 'no'} aria-hidden="true" />
      <span className="acc-badge-label">Total registered accounts</span>
      <span className="acc-badge-value" data-ticked={ticked ? 'yes' : 'no'} data-loaded={loaded ? 'yes' : 'no'}>
        <Odometer value={display} />
      </span>
    </div>
  );
}
