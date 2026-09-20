import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProjectsCollection } from '@/lib/db';
import { progress, validatedDraft } from '@/lib/model';

// GET /api/projects/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const col = await getProjectsCollection();
    const project = await col.findOne({ id, userId: user.id });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, project });
  } catch (error) {
    console.error('Failed to get project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PUT /api/projects/[id] - Auto-sync / update project data
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updateDoc: Record<string, any> = {
      lastModified: new Date().toISOString(),
    };

    if (body.title && typeof body.title === 'string') {
      updateDoc.title = body.title.trim().slice(0, 120);
    }
    if (typeof body.description === 'string') {
      updateDoc.description = body.description.trim().slice(0, 250);
    }
    if (typeof body.isFavorite === 'boolean') {
      updateDoc.isFavorite = body.isFavorite;
    }

    if (body.data) {
      try {
        const validated = validatedDraft(body.data);
        updateDoc.data = validated;
        updateDoc.completionRate = progress(validated);
      } catch {
        // If draft has raw changes, store sanitized copy
        updateDoc.data = body.data;
        if (body.completionRate !== undefined) {
          updateDoc.completionRate = body.completionRate;
        }
      }
    }

    const col = await getProjectsCollection();
    const result = await col.findOneAndUpdate(
      { id, userId: user.id },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, project: result });
  } catch (error) {
    console.error('Failed to sync project:', error);
    return NextResponse.json({ error: 'Failed to sync project' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const col = await getProjectsCollection();
    const result = await col.deleteOne({ id, userId: user.id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
