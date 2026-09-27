// Phase 3 AI pipeline: for one contact, ask Gemini to (1) structure a
// contact card from typed notes + photos + company URL + name, and
// (2) research the person and company, finding open jobs where possible.
// See PROMPT.md "Phase 3 — AI pipeline, full spec".
//
// Runs as the calling user (their Authorization header is forwarded), not
// the service role — RLS naturally scopes every read/write to their own
// rows, so there's no separate ownership check needed here.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

import { corsHeaders } from '../_shared/cors.ts';
import {
  generateGrounded,
  generateStructured,
  type GeminiPart,
  type GeminiSchema,
} from '../_shared/gemini.ts';

const MAX_PHOTOS = 6;

type StructuredCard = {
  title: string;
  company: string;
  email: string;
  linkedinUrl: string;
  summary: string;
  topics: string[];
  rolesMentioned: string[];
  deadlines: string[];
  actionItems: string[];
  memorable: string;
  interestLevel: 'hot' | 'warm' | 'cold';
};

const CARD_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Job title. Empty string if unknown.' },
    company: { type: 'string', description: 'Company name. Empty string if unknown.' },
    email: { type: 'string', description: 'Email address. Empty string if unknown.' },
    linkedinUrl: { type: 'string', description: 'LinkedIn profile URL. Empty string if unknown.' },
    summary: { type: 'string', description: '2-3 sentence summary of the conversation.' },
    topics: { type: 'array', items: { type: 'string' }, description: 'Key topics discussed.' },
    rolesMentioned: {
      type: 'array',
      items: { type: 'string' },
      description: 'Internships, full-time roles, or other opportunities mentioned in conversation.',
    },
    deadlines: {
      type: 'array',
      items: { type: 'string' },
      description: 'Deadlines mentioned in the conversation, as plain text, e.g. "Internship apps due Oct 15".',
    },
    actionItems: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concrete follow-up actions, e.g. "Send resume", "Email the recruiter".',
    },
    memorable: {
      type: 'string',
      description: 'Something personal or memorable to reference later, e.g. a shared school or hobby. Empty string if nothing.',
    },
    interestLevel: {
      type: 'string',
      enum: ['hot', 'warm', 'cold'],
      description: 'How promising this contact seems for the student, based on the conversation.',
    },
  },
  required: [
    'title',
    'company',
    'email',
    'linkedinUrl',
    'summary',
    'topics',
    'rolesMentioned',
    'deadlines',
    'actionItems',
    'memorable',
    'interestLevel',
  ],
};

type ResearchJson = {
  personSummary?: string;
  personConfidence?: 'high' | 'low';
  companySummary?: string;
  sources?: { title?: string; url?: string }[];
  jobs?: { title?: string; url?: string; deadline?: string }[];
};

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

// The research call can't use responseSchema (Gemini doesn't support
// combining structured output with the googleSearch tool on this model —
// see _shared/gemini.ts), so it's asked nicely for JSON instead. Parse
// leniently and never let a malformed response take down the whole pipeline
// — worst case, the raw text becomes the summary.
function parseResearch(rawText: string): ResearchJson {
  try {
    return JSON.parse(stripCodeFences(rawText)) as ResearchJson;
  } catch {
    return { personSummary: rawText.slice(0, 2000), personConfidence: 'low' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  let contactId: string | undefined;
  let supabase: ReturnType<typeof createClient> | undefined;

  try {
    const body = await req.json();
    contactId = body.contactId;
    if (!contactId) return jsonResponse({ error: 'contactId is required' }, 400);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY is not configured');

    supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();
    if (contactError) throw contactError;
    if (!contact) return jsonResponse({ error: 'Contact not found' }, 404);

    const { data: photoRows, error: photosError } = await supabase
      .from('contact_photos')
      .select('storage_path')
      .eq('contact_id', contactId);
    if (photosError) throw photosError;

    await supabase
      .from('contacts')
      .update({ ai_status: 'processing', ai_error: null })
      .eq('id', contactId);

    // Download each photo and inline it as base64 — the bucket is private,
    // so Gemini can't be handed a URL to fetch itself.
    const photoParts: GeminiPart[] = [];
    for (const row of (photoRows ?? []).slice(0, MAX_PHOTOS)) {
      const { data: blob, error: downloadError } = await supabase.storage
        .from('photos')
        .download(row.storage_path);
      if (downloadError || !blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      photoParts.push({ inlineData: { mimeType: 'image/jpeg', data: encodeBase64(bytes) } });
    }

    const contextLines = [
      `Name: ${contact.name}`,
      contact.company_url ? `Company URL: ${contact.company_url}` : null,
      contact.notes ? `Notes from the conversation:\n${contact.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const structuringPrompt = `You are helping a college student who just met someone at a career fair turn their rough notes and photos into a structured contact card.

${contextLines}

${
  photoParts.length > 0
    ? "Photos of this person's business card, badge, or booth are attached — read them for any missing details (name, title, company, email, LinkedIn)."
    : 'No photos were attached.'
}

Fill in every field you can. Leave a field as an empty string (or empty array) if genuinely nothing suggests it — don't guess or invent details.`;

    const card = await generateStructured<StructuredCard>(
      geminiApiKey,
      [{ text: structuringPrompt }, ...photoParts],
      CARD_SCHEMA,
    );

    const researchPrompt = `You are researching a person and their company for a college student who just met them at a career fair, so the student can write a well-informed follow-up message and find relevant open roles.

Person: ${contact.name}${card.title ? `, ${card.title}` : ''}${card.company ? ` at ${card.company}` : ''}
${contact.company_url ? `Company URL: ${contact.company_url}` : ''}
${contact.notes ? `Notes from the conversation:\n${contact.notes}` : ''}

Search for public professional information about this specific person (e.g. LinkedIn presence, talks, posts) and their company (recent news, open internship/new-grad roles). If you don't have live search results, answer from your own knowledge and be clear you might be out of date.

Respond with ONLY a single JSON object (no markdown fences, no commentary) in exactly this shape:
{
  "personSummary": "what you found about the person, or empty string if nothing",
  "personConfidence": "high" or "low" — "high" only if you're confident this is the right person; "low" if the name is common/ambiguous or you're unsure,
  "companySummary": "what you found about the company, or empty string if nothing",
  "sources": [{"title": "...", "url": "..."}],
  "jobs": [{"title": "...", "url": "...", "deadline": "..."}]
}

"jobs" should list open internship/new-grad roles at this company, deadline as plain text or empty string if unknown. Never invent a LinkedIn profile URL, source, or job link — only include ones you actually found.`;

    const grounded = await generateGrounded(geminiApiKey, [{ text: researchPrompt }]);
    const research = parseResearch(grounded.text);

    const sources = [
      ...(research.sources ?? []).filter((s) => s.url).map((s) => ({ title: s.title ?? '', url: s.url! })),
      ...grounded.groundingSources,
    ];
    const dedupedSources = [...new Map(sources.map((s) => [s.url, s])).values()];

    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({
        title: card.title || null,
        company: card.company || null,
        email: card.email || null,
        linkedin_url: card.linkedinUrl || null,
        summary: card.summary || null,
        topics: card.topics,
        roles_mentioned: card.rolesMentioned,
        deadlines: card.deadlines,
        memorable: card.memorable || null,
        interest_level: card.interestLevel,
        research: {
          person: { summary: research.personSummary ?? '', confidence: research.personConfidence ?? 'low' },
          company: { summary: research.companySummary ?? '' },
          sources: dedupedSources,
          grounded: grounded.grounded,
          matchStatus: 'unconfirmed',
        },
        ai_status: 'done',
        ai_error: null,
        ai_processed_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .select()
      .single();
    if (updateError) throw updateError;

    // Reprocessing replaces action items and jobs rather than appending —
    // otherwise re-running after an edit would keep piling up duplicates.
    await supabase.from('action_items').delete().eq('contact_id', contactId);
    await supabase.from('job_opportunities').delete().eq('contact_id', contactId);

    const { data: actionItems, error: actionItemsError } = card.actionItems.length
      ? await supabase
          .from('action_items')
          .insert(card.actionItems.map((text) => ({ contact_id: contactId, text })))
          .select()
      : { data: [], error: null };
    if (actionItemsError) throw actionItemsError;

    const jobs = (research.jobs ?? []).filter((j) => j.title);
    const { data: jobRows, error: jobsError } = jobs.length
      ? await supabase
          .from('job_opportunities')
          .insert(
            jobs.map((job) => ({
              contact_id: contactId,
              title: job.title,
              url: job.url || null,
              deadline: job.deadline || null,
            })),
          )
          .select()
      : { data: [], error: null };
    if (jobsError) throw jobsError;

    return jsonResponse({ contact: updatedContact, actionItems, jobs: jobRows });
  } catch (error) {
    console.error('process-contact failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (supabase && contactId) {
      await supabase
        .from('contacts')
        .update({ ai_status: 'error', ai_error: message })
        .eq('id', contactId);
    }
    return jsonResponse({ error: message }, 500);
  }
});
