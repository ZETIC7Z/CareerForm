import { NextResponse } from 'next/server';
import { getDynamicGovernmentJobs, TOP_HIRING_AGENCIES, PHILIPPINE_REGIONS, PHILIPPINE_AGENCIES } from '@/lib/government-jobs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const agency = searchParams.get('agency');
  const search = searchParams.get('search')?.toLowerCase();

  const now = new Date();
  let jobs = getDynamicGovernmentJobs(now);

  if (region && region !== 'All') {
    jobs = jobs.filter(
      j =>
        j.region === region ||
        j.region.toLowerCase().includes(region.split(' - ')[0].toLowerCase().trim()) ||
        (region.includes('Central Visayas') && (j.region.toLowerCase().includes('cebu') || j.placeOfAssignment.toLowerCase().includes('cebu')))
    );
  }
  if (agency && agency !== 'All') {
    jobs = jobs.filter(
      j => j.agencyAcronym === agency || j.agency.toLowerCase().includes(agency.toLowerCase())
    );
  }
  if (search) {
    jobs = jobs.filter(
      j =>
        j.title.toLowerCase().includes(search) ||
        j.agency.toLowerCase().includes(search) ||
        j.placeOfAssignment.toLowerCase().includes(search) ||
        j.competency.toLowerCase().includes(search)
    );
  }

  const closingSoonCount = jobs.filter(j => j.isClosingSoon).length;
  const deadlineTodayCount = jobs.filter(j => j.isDeadlineToday).length;
  const postedTodayCount = jobs.filter(j => j.isPostedToday).length;

  return NextResponse.json({
    ok: true,
    syncedAt: now.toISOString(),
    syncedFormatted: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    totalActive: 61,
    stats: {
      total: jobs.length,
      closingSoon: closingSoonCount,
      deadlineToday: deadlineTodayCount,
      postedToday: postedTodayCount,
      newThisWeek: 40,
    },
    topAgencies: TOP_HIRING_AGENCIES,
    agencies: PHILIPPINE_AGENCIES,
    regions: PHILIPPINE_REGIONS,
    jobs,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}
