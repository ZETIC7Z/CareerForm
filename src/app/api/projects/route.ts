import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCurrentUser } from '@/lib/auth';
import { getProjectsCollection, toPublicProject, PDSProject } from '@/lib/db';
import { emptyPDS, progress, validatedDraft } from '@/lib/model';

// GET /api/projects - List all projects for authenticated user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const col = await getProjectsCollection();
    const projects = await col
      .find({ userId: user.id })
      .sort({ lastModified: -1 })
      .toArray();

    return NextResponse.json({ ok: true, projects: projects.map(toPublicProject) });
  } catch (error) {
    console.error('Failed to load projects:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const title = (body.title || 'Personal Data Sheet 2026').trim().slice(0, 120);
    const description = (body.description || '').trim().slice(0, 250);
    const kind: PDSProject['kind'] = body.kind === 'cover-letter' ? 'cover-letter' : 'pds';

    let initialData = emptyPDS();
    if (body.data) {
      try {
        initialData = validatedDraft(body.data);
      } catch {
        initialData = emptyPDS();
      }
    }

    const projectId = 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();
    const completionRate = progress(initialData);

    const newProject: PDSProject = {
      id: projectId,
      userId: user.id,
      title,
      description,
      data: initialData,
      completionRate,
      lastModified: now,
      createdAt: now,
      isFavorite: false,
      kind,
    };

    const col = await getProjectsCollection();
    await col.insertOne(newProject);

    return NextResponse.json({ ok: true, project: toPublicProject(newProject) }, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
