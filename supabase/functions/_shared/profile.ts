// Loads the caller's "My profile" row (RLS scopes it to them — the client
// forwards the user's Authorization header) and formats it for prompts.
// Every Gemini prompt in both Edge Functions includes this block, so
// research, job suggestions, and drafts are written for this student.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { describeTimeline, targetTimeline } from './timeline.ts';

export type ProfileRow = {
  school: string | null;
  major: string | null;
  year_in_school: string | null;
  graduation: string | null;
  work_authorization: string | null;
  interests: string | null;
};

export type StudentProfile = {
  row: ProfileRow | null;
  // Multi-line "About the student" block, or a note that no profile exists.
  promptBlock: string;
  // "Summer 2027 software/CS internships and co-ops, and new-grad roles
  // starting early 2028" — derived from the graduation date.
  timeline: string;
};

export async function loadStudentProfile(supabase: SupabaseClient): Promise<StudentProfile> {
  // A missing/unreadable profile must never fail the whole pipeline — the
  // prompts just fall back to "a college student".
  const { data } = await supabase.from('profiles').select('*').maybeSingle();
  const row = (data as ProfileRow | null) ?? null;
  const timeline = describeTimeline(targetTimeline(row?.graduation));

  const lines = row
    ? [
        row.school ? `School: ${row.school}` : null,
        row.major ? `Major: ${row.major}` : null,
        row.year_in_school ? `Year: ${row.year_in_school}` : null,
        row.graduation ? `Graduation: ${row.graduation}` : null,
        row.work_authorization ? `Work authorization: ${row.work_authorization}` : null,
        row.interests ? `Interests & skills: ${row.interests}` : null,
      ].filter(Boolean)
    : [];

  const promptBlock = lines.length
    ? `About the student (the app's user):\n${lines.join('\n')}\nThey are looking for: ${timeline}.`
    : `About the student: a college student (no profile filled in). They are looking for: ${timeline}.`;

  return { row, promptBlock, timeline };
}
