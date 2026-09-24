import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBookmarksCollection, pushNotification } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Job bookmarks for the signed-in user.
 *
 * Every handler is scoped to `userId` taken from the signed session cookie — the
 * client can never ask for, or write, another account's bookmarks. No Mongo
 * response object is ever returned raw, only the fields the UI needs.
 */
async function listSavedIds(userId: string): Promise<string[]> {
  const col = await getBookmarksCollection();
  const rows = await col.find({ userId }, { projection: { jobId: 1, _id: 0 } }).toArray();
  return rows.map(r => r.jobId);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const col = await getBookmarksCollection();
    const bookmarks = await col.find({ userId: user.id }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(
      {
        ok: true,
        count: bookmarks.length,
        savedIds: bookmarks.map(b => b.jobId),
        bookmarks: bookmarks.map(b => ({
          id: b.id,
          jobId: b.jobId,
          createdAt: b.createdAt,
          job: b.job,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not load bookmarks.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const jobId = typeof body?.jobId === 'string' ? body.jobId : '';
    if (!jobId) return NextResponse.json({ ok: false, error: 'jobId is required.' }, { status: 400 });

    const col = await getBookmarksCollection();
    const existing = await col.findOne({ userId: user.id, jobId });
    if (!existing) {
      const job = body?.job && typeof body.job === 'object' ? body.job : {};
      await col.insertOne({
        id: 'bmk_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
        userId: user.id,
        jobId,
        job,
        createdAt: new Date().toISOString(),
      });
      await pushNotification(user.id, {
        type: 'bookmark',
        title: 'Job bookmarked',
        body: `${job?.title || 'A job posting'} at ${job?.agencyAcronym || job?.agency || 'an agency'} was saved to your dashboard.`,
        href: '/dashboard?tab=bookmarks',
        jobId,
        read: false,
      });
    }

    return NextResponse.json({ ok: true, savedIds: await listSavedIds(user.id) });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not save bookmark.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const jobId = typeof body?.jobId === 'string' ? body.jobId : '';
    if (!jobId) return NextResponse.json({ ok: false, error: 'jobId is required.' }, { status: 400 });

    const col = await getBookmarksCollection();
    await col.deleteOne({ userId: user.id, jobId });
    return NextResponse.json({ ok: true, savedIds: await listSavedIds(user.id) });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not remove bookmark.' }, { status: 500 });
  }
}
