export type LicenseType =
  | 'public_domain'
  | 'creative_commons'
  | 'original'
  | 'permission'
  | 'user_submitted';

export interface ChordProSong {
  title: string;
  artist: string;
  key: string;
  rhythm?: string;
  genre?: string;
  license: LicenseType;
  rightsHolder?: string;
  source?: string;
  licenseNote?: string;
  content: string;
  chords: string[];
  slug: string;
}

export interface ParseResult {
  success: boolean;
  song?: ChordProSong;
  errors?: string[];
}

