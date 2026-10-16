import React from 'react';
import { Metadata } from 'next';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import ChordFinderClient from '@/components/finder/ChordFinderClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tìm bài hát theo hợp âm đã biết | cunhopam',
  description: 'Chọn các hợp âm bạn đã biết để tìm những bài hát có thể chơi được ngay hoặc chỉ thiếu 1 hợp âm.',
};

export default async function FindByChordsPage() {
  let user = null;
  let initialDbChords: string[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      user = authData?.user || null;

      if (user) {
        const { data: knownRows } = await supabase
          .from('user_known_chords')
          .select('chord_name')
          .eq('user_id', user.id);

        if (knownRows) {
          initialDbChords = knownRows.map((r: any) => r.chord_name);
        }
      }
    } catch (err) {
      console.error('Error fetching user_known_chords:', err);
    }
  }

  return <ChordFinderClient user={user} initialDbChords={initialDbChords} />;
}

