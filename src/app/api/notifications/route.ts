import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getJobAlertsCollection,
  getNotificationsCollection,
  pushNotification,
} from '@/lib/db';
import { ensurePatchNotifications } from '@/lib/account';
import { PATCH_NOTES } from '@/lib/patch-notes';

export const dynamic = 'force-dynamic';

/**
 * Dashboard notifications + standing job-alert subscriptions.
 *
 * GET   → the signed-in user's notifications and unread count (drives the bell badge).
 * POST  → turn on "notify me when <agency> posts a new job" (body: { agency, agencyAcronym }).
 * PATCH → mark one notification, or all of them, as read.
 * DELETE→ clear the user's notification list.
 * All queries are scoped to the session's userId.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const col = await getNotificationsCollection();
    const alerts = await getJobAlertsCollection();

    // Every signed-in account receives each published "Site Updates & Patch Notes" entry
    // exactly once. Idempotent by id, so loading the dashboard repeatedly never stacks up
    // duplicates — see ensurePatchNotifications.
    await ensurePatchNotifications(
      user.id,
      PATCH_NOTES.slice(0, 2).map(n => ({ id: n.id, title: n.title, version: n.version, date: n.date }))
    );

    const notifications = await col.find({ userId: user.id }).sort({ createdAt: -1 }).limit(50).toArray();
    const subscriptions = await alerts.find({ userId: user.id }).sort({ createdAt: -1 }).toArray();
    const unread = notifications.filter(n => !n.read).length;

    return NextResponse.json(
      {
        ok: true,
        unread,
        count: notifications.length,
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          href: n.href,
          jobId: n.jobId,
          read: n.read,
          createdAt: n.createdAt,
        })),
        alerts: subscriptions.map(a => ({
          id: a.id,
          agency: a.agency,
          agencyAcronym: a.agencyAcronym,
          createdAt: a.createdAt,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not load notifications.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const agency = typeof body?.agency === 'string' ? body.agency.slice(0, 160) : '';
    const agencyAcronym = typeof body?.agencyAcronym === 'string' ? body.agencyAcronym.slice(0, 24) : '';
    if (!agency) return NextResponse.json({ ok: false, error: 'agency is required.' }, { status: 400 });

    const col = await getJobAlertsCollection();
    const existing = await col.findOne({ userId: user.id, agency });
    if (!existing) {
      await col.insertOne({
        id: 'alt_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
        userId: user.id,
        agency,
        agencyAcronym,
        createdAt: new Date().toISOString(),
      });
      await pushNotification(user.id, {
        type: 'alert',
        title: `${agencyAcronym || agency} job alerts on`,
        body: `We'll notify this device the moment ${agency} publishes a new vacancy.`,
        href: '/dashboard',
        read: false,
      });
    }

    return NextResponse.json({ ok: true, subscribed: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not save alert subscription.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const agency = typeof body?.agency === 'string' ? body.agency : '';
    const col = await getJobAlertsCollection();
    if (agency) {
      await col.deleteOne({ userId: user.id, agency });
    } else {
      const notifications = await getNotificationsCollection();
      await notifications.deleteMany({ userId: user.id });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not update alerts.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : '';
    const col = await getNotificationsCollection();
    if (id) {
      await col.updateOne({ userId: user.id, id }, { $set: { read: true } });
    } else {
      await col.updateMany({ userId: user.id, read: false }, { $set: { read: true } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not update notifications.' }, { status: 500 });
  }
}
