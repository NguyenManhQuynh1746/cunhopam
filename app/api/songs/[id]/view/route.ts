import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: songId } = await params;
    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const secret = process.env.VIEW_HASH_SECRET || 'cunhopam-view-secret-key-2026';

    const viewerHash = crypto
      .createHash('sha256')
      .update(`${ip}:${userAgent}:${secret}`)
      .digest('hex');

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc('record_song_view', {
      p_song_id: songId,
      p_viewer_hash: viewerHash,
    });

    if (error) {
      console.error('Error calling record_song_view:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recorded: data === true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

