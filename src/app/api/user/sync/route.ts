import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { getProjectsCollection, pushNotification, PDSProject } from '@/lib/db';
import { progress, validatedDraft } from '@/lib/model';

export const dynamic = 'force-dynamic';

/**
 * Hand the device's recent draft work to the signed-in account.
 *
 * The builder is offline-first: everything is written to localStorage immediately so
 * a PDS survives a closed tab, a dead battery or a dropped connection. Until now that
 * work stayed on one device. On sign-in the client posts its recent drafts here and we
 * reconcile them against `pds_projects`:
 *
 *   • a draft that matches an existing project (by id, else by title) is merged, and the
 *     newer of the two `lastModified` values wins, so a stale server copy never
 *     overwrites fresher local typing;
 *   • anything unknown becomes a real project, which is what makes it appear on the
 *     dashboard and in the builder's "recent projects" picker.
 *
 * Returns the user's project list so the caller can render the picker in one round trip.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const rawDrafts = Array.isArray(body?.drafts) ? body.drafts : [];
    const col = await getProjectsCollection();

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let skipped = 0;

    for (const raw of rawDrafts.slice(0, 25)) {
      if (!raw || typeof raw !== 'object') {
        skipped += 1;
        continue;
      }

      let data;
      try {
        data = validatedDraft(raw.data);
      } catch {
        // Never let one malformed draft poison the whole sync — but do say so, rather
        // than reporting a clean run while quietly discarding the user's work.
        skipped += 1;
        continue;
      }

      const title = (typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.trim()
        : 'Personal Data Sheet 2026'
      ).slice(0, 120);
      const clientModified = typeof raw.lastModified === 'string' ? raw.lastModified : new Date().toISOString();
      const completionRate = progress(data);
      const now = new Date().toISOString();

      const existing =
        (typeof raw.projectId === 'string' && raw.projectId
          ? await col.findOne({ userId: user.id, id: raw.projectId })
          : null) ?? (await col.findOne({ userId: user.id, title }));

      if (existing) {
        const serverModified = new Date(existing.lastModified || 0).getTime();
        if (new Date(clientModified).getTime() > serverModified) {
          await col.updateOne(
            { userId: user.id, id: existing.id },
            { $set: { data, completionRate, lastModified: clientModified, updatedAt: now } }
          );
          updated += 1;
        } else {
          unchanged += 1;
        }
        continue;
      }

      const project: PDSProject = {
        id: 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16),
        userId: user.id,
        title,
        description: 'Synced from this device on sign-in',
        data,
        completionRate,
        lastModified: clientModified,
        createdAt: now,
        isFavorite: false,
        kind: 'pds',
      };
      await col.insertOne(project);
      created += 1;
    }

    if (created > 0) {
      await pushNotification(user.id, {
        type: 'sync',
        title: `${created} draft${created > 1 ? 's' : ''} synced to your account`,
        body: 'Your recent PDS work is now saved to the cloud and will follow you to any device.',
        href: '/dashboard?tab=projects',
        read: false,
      });
    }

    const projects = await col.find({ userId: user.id }).sort({ lastModified: -1 }).limit(50).toArray();

    return NextResponse.json({
      ok: true,
      created,
      updated,
      unchanged,
      skipped,
      projects: projects.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        completionRate: p.completionRate ?? 0,
        lastModified: p.lastModified,
        createdAt: p.createdAt,
        kind: p.kind ?? 'pds',
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not sync drafts.' }, { status: 500 });
  }
}
