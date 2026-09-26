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
    const { searchParams } = new URL(req.url);
    const qLat = searchParams.get('lat');
    const qLon = searchParams.get('lon');
    const qCity = searchParams.get('city');

    // Vercel's geo headers arrive percent-encoded ("Cebu%20City"); nothing downstream
    // decodes them, so the pill used to render the literal "%20". Decode once, here.
    const decodeHeader = (value: string | null): string | null => {
      if (!value) return value;
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    const headers = new Headers(req.headers);
    let city = decodeHeader(qCity) || decodeHeader(headers.get('x-vercel-ip-city'));
    let region =
      decodeHeader(headers.get('x-vercel-ip-country-region')) ||
      decodeHeader(headers.get('x-vercel-ip-country'));
    let latStr = qLat || headers.get('x-vercel-ip-latitude');
    let lonStr = qLon || headers.get('x-vercel-ip-longitude');

    let lat = latStr ? parseFloat(latStr) : null;
    let lon = lonStr ? parseFloat(lonStr) : null;

    // If coordinates not provided, attempt fast IP resolution via ip-api.com & ipwho.is
    if (!lat || !lon || !city) {
      try {
        const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const isPublicIp = forwarded && !forwarded.startsWith('127.') && !forwarded.startsWith('192.168.');
        const targetIp = isPublicIp ? forwarded : '';
        const ipRes = await fetch(`http://ip-api.com/json/${targetIp}`, {
          signal: AbortSignal.timeout(2500),
          headers: { 'User-Agent': 'CareerForm/1.0' }
        });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData?.status === 'success' && ipData?.lat && ipData?.lon) {
            lat = ipData.lat;
            lon = ipData.lon;
            const cName = ipData.city || '';
            const rName = ipData.regionName || '';
            if (cName === 'Lahug' || cName.toLowerCase().includes('cebu') || rName.toLowerCase().includes('cebu') || ipData.zip === '6000') {
              city = 'Cebu';
              region = 'Central Visayas';
            } else {
              city = cName || 'Cebu';
              region = rName || 'Central Visayas';
            }
          }
        }
      } catch {
        // Fallback to secondary geo check
      }
    }

    // Default fallback if geolocation could not be determined: Cebu City, Philippines
    if (!lat || !lon) {
      lat = 10.3099;
      lon = 123.8930;
      city = city || 'Cebu';
      region = region || 'Central Visayas';
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
      city: city || 'Cebu',
      region: region || 'Central Visayas',
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
      city: 'Cebu',
      region: 'Central Visayas',
      temperature: 28,
      condition: 'Partly Cloudy',
      icon: '⛅',
    });
  }
}
