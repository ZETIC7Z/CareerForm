import { NextResponse } from 'next/server';

function getWeatherCondition(code: number): { label: string; icon: string } {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return { label: 'Clear Sky', icon: '☀️' };
  if (code === 1) return { label: 'Mainly Clear', icon: '🌤️' };
  if (code === 2) return { label: 'Partly Cloudy', icon: '⛅' };
  if (code === 3) return { label: 'Overcast', icon: '☁️' };
  if ([45, 48].includes(code)) return { label: 'Foggy', icon: '🌫️' };
  if ([51, 53, 55].includes(code)) return { label: 'Drizzle', icon: '🌦️' };
  if ([61, 63, 65].includes(code)) return { label: 'Rain', icon: '🌧️' };
  if ([80, 81, 82].includes(code)) return { label: 'Rain Showers', icon: '🌦️' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: '⛈️' };
  return { label: 'Fair Weather', icon: '🌤️' };
}

export async function GET(req: Request) {
  try {
    const headers = new Headers(req.headers);
    let city = headers.get('x-vercel-ip-city');
    let region = headers.get('x-vercel-ip-country-region') || headers.get('x-vercel-ip-country');
    let latStr = headers.get('x-vercel-ip-latitude');
    let lonStr = headers.get('x-vercel-ip-longitude');

    let lat = latStr ? parseFloat(latStr) : null;
    let lon = lonStr ? parseFloat(lonStr) : null;

    // If headers not present (e.g. localhost or direct request), attempt fast IP resolution
    if (!lat || !lon || !city) {
      try {
        const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const ipQuery = forwarded && !forwarded.startsWith('127.') && !forwarded.startsWith('192.168.') ? `/${forwarded}` : '';
        const ipRes = await fetch(`https://ipapi.co${ipQuery}/json/`, {
          signal: AbortSignal.timeout(2500),
          headers: { 'User-Agent': 'CareerForm/1.0' }
        });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData?.city && ipData?.latitude && ipData?.longitude) {
            city = ipData.city;
            region = ipData.region || ipData.country_name || 'Philippines';
            lat = ipData.latitude;
            lon = ipData.longitude;
          }
        }
      } catch {
        // Fallback default: Metro Manila, Philippines
      }
    }

    // Default fallback if geolocation could not be determined
    if (!lat || !lon) {
      lat = 14.5995;
      lon = 120.9842;
      city = city || 'Manila';
      region = region || 'Metro Manila';
    }

    // Fetch live weather from Open-Meteo
    let tempC = 29;
    let condition = { label: 'Partly Cloudy', icon: '⛅' };

    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
      const wRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(3000) });
      if (wRes.ok) {
        const wData = await wRes.json();
        if (wData?.current) {
          tempC = Math.round(wData.current.temperature_2m);
          condition = getWeatherCondition(wData.current.weather_code ?? 2);
        }
      }
    } catch (err) {
      console.warn('Weather fetch warning:', err);
    }

    return NextResponse.json({
      ok: true,
      city: city || 'Manila',
      region: region || 'PH',
      temperature: tempC,
      condition: condition.label,
      icon: condition.icon,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      city: 'Manila',
      region: 'PH',
      temperature: 29,
      condition: 'Partly Cloudy',
      icon: '⛅',
    });
  }
}
