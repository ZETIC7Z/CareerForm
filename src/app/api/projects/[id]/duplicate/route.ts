import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { getProjectsCollection, PDSProject } from '@/lib/db';

export async function POST(
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
    const original = await col.findOne({ id, userId: user.id });

    if (!original) {
      return NextResponse.json({ error: 'Original project not found' }, { status: 404 });
    }

    const newId = 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();

    const duplicatedProject: PDSProject = {
      id: newId,
      userId: user.id,
      title: `${original.title} (Copy)`,
      description: original.description,
      data: JSON.parse(JSON.stringify(original.data)),
      completionRate: original.completionRate,
      lastModified: now,
      createdAt: now,
      isFavorite: false,
    };

    await col.insertOne(duplicatedProject);
    return NextResponse.json({ ok: true, project: duplicatedProject }, { status: 201 });
  } catch (error) {
    console.error('Failed to duplicate project:', error);
    return NextResponse.json({ error: 'Failed to duplicate project' }, { status: 500 });
  }
}
