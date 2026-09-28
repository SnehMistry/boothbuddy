// The Edge Functions store the raw Gemini/Supabase error message in
// ai_error. For the "AI is busy" case specifically (see
// supabase/functions/_shared/gemini.ts's AiBusyError), that raw message
// already has a friendly headline — this just splits it from the
// technical detail so the UI can show the headline plainly and the detail
// behind a "Show details" toggle, instead of raw text as the main message.
export function describeAiError(raw: string | undefined): { headline: string; detail: string } {
  if (!raw) return { headline: 'Something went wrong.', detail: '' };

  const marker = '\n\nDetails: ';
  const markerIndex = raw.indexOf(marker);
  if (raw.startsWith('Google AI is busy') && markerIndex !== -1) {
    return { headline: raw.slice(0, markerIndex), detail: raw.slice(markerIndex + marker.length) };
  }

  return { headline: 'AI processing failed.', detail: raw };
}
