import { NextRequest, NextResponse } from 'next/server';

type SignSession = {
  id: string;
  signature?: string;
  createdAt: number;
};

// In-memory ephemeral store for active QR signing sessions
const sessions = new Map<string, SignSession>();

// Cleanup stale sessions older than 15 minutes
function purgeStaleSessions() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > 15 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}

export async function GET(req: NextRequest) {
  purgeStaleSessions();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
  }

  const session = sessions.get(id);
  if (!session) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  if (session.signature) {
    return NextResponse.json({ status: 'completed', signature: session.signature });
  }

  return NextResponse.json({ status: 'pending' });
}

export async function POST(req: NextRequest) {
  purgeStaleSessions();
  try {
    const body = await req.json();
    const { id, signature, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
    }

    if (action === 'init') {
      sessions.set(id, { id, createdAt: Date.now() });
      return NextResponse.json({ ok: true, status: 'initialized' });
    }

    if (signature) {
      const existing: SignSession = sessions.get(id) || { id, createdAt: Date.now() };
      existing.signature = signature;
      sessions.set(id, existing);
      return NextResponse.json({ ok: true, status: 'completed' });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}