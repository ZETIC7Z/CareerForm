'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface WeatherData {
  city: string;
  region: string;
  temperature: number;
  condition: string;
  icon: string;
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
      // 12-hour time format with seconds
      const timeFormatted = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      // Date format (e.g. Sun, Sep 20, 2026)
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

    // Load cached location if available
    try {
      const cached = localStorage.getItem('careerform_user_weather');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.city) setWeather(parsed);
      }
    } catch {}

    const fetchWeather = async () => {
      try {
        let queryParams = '';
        // Fast client-side IP check
        try {
          const ipRes = await fetch('http://ip-api.com/json/', { signal: AbortSignal.timeout(1800) });
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData?.status === 'success' && ipData?.lat && ipData?.lon) {
              const cName = ipData.city || '';
              const rName = ipData.regionName || '';
              const isCebu = cName === 'Lahug' || cName.toLowerCase().includes('cebu') || rName.toLowerCase().includes('cebu') || ipData.zip === '6000';
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
            const weatherPayload = {
              city: data.city,
              region: data.region,
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

  return (
    <div
      className={`live-time-weather-bar ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '5px 14px',
        borderRadius: '999px',
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        fontSize: '12px',
        color: '#f8fafc',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 12-Hour Clock with High-Tech Font (Image 6 style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px #10b981',
            animation: 'pulse 2s infinite',
          }}
        />
        <span
          style={{
            fontWeight: 800,
            fontSize: '13px',
            color: '#ffffff',
            letterSpacing: '0.03em',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {timeStr}
        </span>
      </div>

      <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>

      {/* Live Date */}
      <span style={{ color: '#94a3b8', fontSize: '11.5px', fontWeight: 500 }}>
        {dateStr}
      </span>

      {/* Auto-detected Weather & Location */}
      {weather && (
        <>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '13px' }}>{weather.icon}</span>
            <span style={{ fontWeight: 600, color: '#38bdf8' }}>
              {weather.temperature}°C
            </span>
            <span style={{ color: '#64748b', fontSize: '11px' }}>
              <MapPin size={11} style={{ display: 'inline', marginRight: '2px', verticalAlign: '-1px' }} />
              {weather.city}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
