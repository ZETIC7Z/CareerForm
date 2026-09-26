'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * The site's live status pill: date, then the clock, then the weather.
 *
 * The clock is the widest, loudest element on purpose — the date and the weather read as
 * quiet context either side of it. The weather "icon" is not an emoji: it is a tiny inline
 * SVG whose sun rays spin, clouds drift, rain falls and lightning flashes, so the pill
 * feels alive at the same moment the seconds tick.
 *
 * The city used to render as "Cebu%20City" in production: Vercel's `x-vercel-ip-city`
 * header arrives percent-encoded and nothing ever decoded it. Both ends are fixed — the
 * API route decodes the header before answering, and anything already cached in
 * localStorage with a stray %20 is repaired on read.
 */

interface WeatherData {
  city: string;
  region: string;
  temperature: number;
  condition: string;
  icon: string;
}

type IconKind = 'sun' | 'partly' | 'cloud' | 'rain' | 'thunder' | 'fog';

/** Repair a percent-encoded city/region that slipped into the cache (e.g. "Cebu%20City"). */
const fixEncoded = (value: string): string => {
  if (!/%[0-9A-Fa-f]{2}/.test(value)) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Map the API's condition label onto which little animation to draw. */
const iconKindFor = (condition: string): IconKind => {
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return 'thunder';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'rain';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return 'fog';
  if (c.includes('overcast')) return 'cloud';
  if (c.includes('partly') || c.includes('mostly')) return 'partly';
  return 'sun';
};

/**
 * The animated weather glyph. One 24×24 SVG per kind, drawn from the palette the pill
 * already uses; every moving part is a CSS animation defined in globals.css (`wi-*`), so
 * there is no JS ticking behind it and it costs nothing when the pill is off screen.
 */
function WeatherIcon({ kind }: { kind: IconKind }) {
  const rays = useMemo(
    () =>
      [0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
        <line
          key={angle}
          x1="12"
          y1="2.6"
          x2="12"
          y2="5.2"
          transform={`rotate(${angle} 12 12)`}
        />
      )),
    []
  );

  return (
    <svg className={`wi wi-${kind}`} viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
      {/* The sun sits behind the cloud for "partly", and alone otherwise. */}
      {kind !== 'cloud' && kind !== 'rain' && kind !== 'thunder' && kind !== 'fog' && (
        <g className="wi-sun">
          <circle className="wi-sun-core" cx="12" cy="12" r="4.1" />
          <g className="wi-rays" stroke="#fbbf24" strokeWidth="1.7" strokeLinecap="round">
            {rays}
          </g>
        </g>
      )}

      {(kind === 'partly' || kind === 'cloud' || kind === 'rain' || kind === 'thunder' || kind === 'fog') && (
        <g className="wi-cloud">
          <path
            className="wi-cloud-body"
            d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
          />
        </g>
      )}

      {kind === 'rain' && (
        <g className="wi-drops" stroke="#7dd3fc" strokeWidth="1.7" strokeLinecap="round">
          <line className="wi-drop" x1="9" y1="20" x2="9" y2="21.8" />
          <line className="wi-drop wi-drop-2" x1="12.5" y1="20" x2="12.5" y2="21.8" />
          <line className="wi-drop wi-drop-3" x1="16" y1="20" x2="16" y2="21.8" />
        </g>
      )}

      {kind === 'thunder' && (
        <path
          className="wi-bolt"
          d="M12.6 17.5l-2.8 4.1h2.1l-1.2 3.4 3.9-4.9h-2.2l1.6-2.6z"
          transform="translate(0 -2.5)"
        />
      )}

      {kind === 'fog' && (
        <g className="wi-fog-lines" strokeLinecap="round" strokeWidth="1.6">
          <line className="wi-fog-line" x1="6.5" y1="20.4" x2="17.5" y2="20.4" />
          <line className="wi-fog-line wi-fog-line-2" x1="8" y1="22.6" x2="16" y2="22.6" />
        </g>
      )}
    </svg>
  );
}

export default function LiveTimeWeather({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // 12-hour realtime clock with seconds (e.g. 03:45:12 PM)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateFormatted = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      setTimeStr(timeFormatted);
      setDateStr(dateFormatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-fetch location & weather without any browser permission prompt
  useEffect(() => {
    let cancelled = false;

    // Load cached location if available — repairing a %20 that an older build cached.
    try {
      const cached = localStorage.getItem('careerform_user_weather');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.city) setWeather({ ...parsed, city: fixEncoded(parsed.city), region: fixEncoded(parsed.region ?? '') });
      }
    } catch {}

    const fetchWeather = async () => {
      try {
        let queryParams = '';
        // Fast client-side IP check (HTTP-only endpoint; skipped silently on HTTPS pages
        // where the browser blocks the mixed-content call, and the server's Vercel geo
        // headers take over).
        try {
          const ipRes = await fetch('http://ip-api.com/json/', { signal: AbortSignal.timeout(1800) });
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData?.status === 'success' && ipData?.lat && ipData?.lon) {
              const cName = ipData.city || '';
              const rName = ipData.regionName || '';
              const isCebu =
                cName === 'Lahug' ||
                cName.toLowerCase().includes('cebu') ||
                rName.toLowerCase().includes('cebu') ||
                ipData.zip === '6000';
              const cityResolved = isCebu ? 'Cebu' : cName;
              queryParams = `?city=${encodeURIComponent(cityResolved)}&lat=${ipData.lat}&lon=${ipData.lon}`;
            }
          }
        } catch {
          // Continue to standard /api/weather
        }

        const res = await fetch(`/api/weather${queryParams}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data?.ok) {
            const weatherPayload: WeatherData = {
              city: fixEncoded(data.city),
              region: fixEncoded(data.region ?? ''),
              temperature: data.temperature,
              condition: data.condition,
              icon: data.icon,
            };
            setWeather(weatherPayload);
            try {
              localStorage.setItem('careerform_user_weather', JSON.stringify(weatherPayload));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Could not load live weather:', err);
      }
    };

    fetchWeather();
    // Refresh weather every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!timeStr) return null;

  const kind: IconKind = weather ? iconKindFor(weather.condition) : 'sun';

  return (
    <div className={`ltw-pill ${className}`.trim()} style={style} role="timer" aria-label={`Live status: ${dateStr}, ${timeStr}${weather ? `, ${weather.temperature} degrees in ${weather.city}` : ''}`}>
      <span className="ltw-dot" aria-hidden="true" />

      {/* Date — the quiet left edge. */}
      <span className="ltw-date">{dateStr}</span>

      <span className="ltw-sep" aria-hidden="true" />

      {/* The clock — the pill's centre of gravity, deliberately the biggest thing here. */}
      <span className="ltw-time">{timeStr}</span>

      {weather && (
        <>
          <span className="ltw-sep" aria-hidden="true" />

          {/* Weather — animated glyph, the temperature, then the auto-detected city. */}
          <span className="ltw-weather">
            <WeatherIcon kind={kind} />
            <span className="ltw-temp">{weather.temperature}°C</span>
            <span className="ltw-city">
              <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true" className="ltw-pin">
                <path
                  d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="10" r="2.4" fill="currentColor" />
              </svg>
              {weather.city}
            </span>
          </span>
        </>
      )}
    </div>
  );
}
