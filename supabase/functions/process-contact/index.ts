// Phase 3 AI pipeline: for one contact, ask Gemini to (1) structure a
// contact card from typed notes + photos + company URL + name, identifying
// which company they work at even without a URL, and (2) research the
// person and company and suggest jobs tailored to the student's profile.
// See PROMPT.md "Phase 3 — AI pipeline, full spec" and "Profile & tailored
// jobs".
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
import { loadStudentProfile } from '../_shared/profile.ts';
import { normalizeHttpUrl, verifyUrl } from '../_shared/urls.ts';

const MAX_PHOTOS = 6;
const MAX_ALTERNATIVES = 3;
const MAX_JOBS = 5;
const JOB_KINDS = ['internship', 'co_op', 'new_grad', 'other'] as const;
type JobKind = (typeof JOB_KINDS)[number];
const SPONSORSHIP = ['likely', 'unknown', 'unlikely'] as const;
type Sponsorship = (typeof SPONSORSHIP)[number];

type CompanyCandidate = { name: string; description: string; website: string };

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
  companyDescription: string;
  companyWebsite: string;
  careersUrl: string;
  companyConfidence: 'high' | 'low';
  companyAlternatives: CompanyCandidate[];
};

const CARD_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Job title. Empty string if unknown.' },
    company: {
      type: 'string',
      description: 'The official name of the company they work at (e.g. "Hunter Industries", not just "Hunter"). Empty string if unknown.',
    },
    email: { type: 'string', description: 'Email address. Empty string if unknown.' },
    linkedinUrl: { type: 'string', description: 'LinkedIn profile URL, only if it appears in the notes or photos. Empty string otherwise.' },
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
      description: "How promising this contact seems for the student's goals, based on the conversation.",
    },
    companyDescription: {
      type: 'string',
      description: 'One line saying what the company does, so the student can tell it is the right company. Empty string if the company is unknown.',
    },
    companyWebsite: {
      type: 'string',
      description: "The company's official homepage URL, only if you are confident. Empty string otherwise.",
    },
    careersUrl: {
      type: 'string',
      description: "The company's official careers/jobs page URL, only if you are confident it exists. Empty string otherwise. Never a specific job posting.",
    },
    companyConfidence: {
      type: 'string',
      enum: ['high', 'low'],
      description: '"high" only if the context makes it clear which company this is; "low" if the name is ambiguous (several companies share it) or you are guessing.',
    },
    companyAlternatives: {
      type: 'array',
      description: 'If companyConfidence is "low": up to 3 OTHER real companies it could plausibly be. Empty array if confidence is "high".',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', description: 'One line: what they do.' },
          website: { type: 'string', description: 'Official homepage URL, or empty string.' },
        },
        required: ['name', 'description', 'website'],
      },
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
    'companyDescription',
    'companyWebsite',
    'careersUrl',
    'companyConfidence',
    'companyAlternatives',
  ],
};

type ResearchJson = {
  personSummary?: string;
  personConfidence?: 'high' | 'low';
  companySummary?: string;
  sponsorship?: { likelihood?: string; note?: string };
  sources?: { title?: string; url?: string }[];
  jobs?: { title?: string; kind?: string; fitReason?: string; deadline?: string }[];
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

const norm = (s: string) => s.trim().toLowerCase();

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

    const [{ data: photoRows, error: photosError }, { data: event }, profile, { data: oldItems }, { data: oldJobs }] =
      await Promise.all([
        supabase.from('contact_photos').select('storage_path').eq('contact_id', contactId),
        supabase.from('events').select('name, date, location').eq('id', contact.event_id).maybeSingle(),
        loadStudentProfile(supabase),
        supabase.from('action_items').select('text, done').eq('contact_id', contactId),
        supabase.from('job_opportunities').select('title, applied').eq('contact_id', contactId),
      ]);
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

    // If the user already picked the company (resolving an ambiguous name),
    // that choice is authoritative — the model is told so and it's kept.
    const previousCompany = contact.research?.company ?? {};
    const companyConfirmed = !!previousCompany.userConfirmed && !!contact.company;

    const contextLines = [
      `Name: ${contact.name}`,
      companyConfirmed
        ? `Company (confirmed by the student — use exactly this): ${contact.company}`
        : contact.company
          ? `Company (from an earlier pass, may be wrong): ${contact.company}`
          : null,
      contact.company_url ? `Company URL (typed or scanned by the student): ${contact.company_url}` : null,
      event
        ? `Met at: ${event.name}, ${event.date}${event.location ? `, ${event.location}` : ''}`
        : null,
      contact.notes ? `Notes from the conversation:\n${contact.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const structuringPrompt = `You are helping a college student who just met someone at a career fair turn their rough notes and photos into a structured contact card.

${profile.promptBlock}

${contextLines}

${
  photoParts.length > 0
    ? "Photos of this person's business card, badge, or booth are attached — read them for any missing details (name, title, company, email, LinkedIn)."
    : 'No photos were attached.'
}

Fill in every field you can. Leave a field as an empty string (or empty array) if genuinely nothing suggests it — don't guess or invent details.

Identify which company this is even without a URL, using every clue: the company name, what they talked about, the photos, and the event (its location and what kind of fair it is). If several real companies share the name (e.g. "Hunter"), pick the most likely one, set companyConfidence to "low", and list the other plausible ones in companyAlternatives. Only give website/careers URLs you are confident are the official ones.`;

    const card = await generateStructured<StructuredCard>(
      geminiApiKey,
      [{ text: structuringPrompt }, ...photoParts],
      CARD_SCHEMA,
    );

    const companyName = companyConfirmed ? contact.company : card.company || contact.company || '';

    // Check model-suggested links really exist before storing them (see
    // _shared/urls.ts). A URL the student typed/scanned is kept as-is.
    const [website, careersUrl] = await Promise.all([
      contact.company_url
        ? Promise.resolve(normalizeHttpUrl(contact.company_url))
        : verifyUrl(card.companyWebsite || (companyConfirmed ? previousCompany.website : '')),
      verifyUrl(card.careersUrl),
    ]);

    const researchPrompt = `You are researching a person and their company for a college student who just met them at a career fair, so the student can write a well-informed follow-up message and find roles worth applying to.

${profile.promptBlock}

Person: ${contact.name}${card.title ? `, ${card.title}` : ''}${companyName ? ` at ${companyName}` : ''}
${website ? `Company website: ${website}` : ''}
${card.companyDescription ? `Company: ${card.companyDescription}` : ''}
${contact.notes ? `Notes from the conversation:\n${contact.notes}` : ''}

Search for public professional information about this specific person (e.g. talks, posts, their team) and their company (what they do, recent news, how they hire students). If you don't have live search results, answer from your own knowledge and be clear you might be out of date.

Respond with ONLY a single JSON object (no markdown fences, no commentary) in exactly this shape:
{
  "personSummary": "what you found about the person, or empty string if nothing",
  "personConfidence": "high" or "low" — "high" only if you're confident this is the right person; "low" if the name is common/ambiguous or you're unsure,
  "companySummary": "what the company does and anything relevant to a student applying there, or empty string",
  "sponsorship": {"likelihood": "likely" | "unknown" | "unlikely", "note": "one short sentence on why — e.g. history of H-1B filings, or a known policy"},
  "sources": [{"title": "...", "url": "..."}],
  "jobs": [{"title": "...", "kind": "internship" | "co_op" | "new_grad" | "other", "fitReason": "...", "deadline": "..."}]
}

"sponsorship": whether this company is known to sponsor international students (CPT/OPT) and H-1B visas. Use "unknown" unless you have real evidence either way.

"jobs": up to ${MAX_JOBS} kinds of roles at this company that fit the student's timeline (${profile.timeline}) and their major/interests — use the kind of titles the company actually uses (e.g. "Software Engineer Intern, Summer 2027"). "fitReason" is one sentence on why it fits THIS student. "deadline" only if you actually know it, otherwise empty string. Do NOT include any job URLs — the app links to the official careers page and job-board searches itself. Never invent a LinkedIn profile URL or a source.`;

    const grounded = await generateGrounded(geminiApiKey, [{ text: researchPrompt }]);
    const research = parseResearch(grounded.text);

    const sources = [
      ...(research.sources ?? []).filter((s) => s.url).map((s) => ({ title: s.title ?? '', url: s.url! })),
      ...grounded.groundingSources,
    ];
    const dedupedSources = [...new Map(sources.map((s) => [s.url, s])).values()];

    const sponsorshipLikelihood = SPONSORSHIP.includes(research.sponsorship?.likelihood as Sponsorship)
      ? (research.sponsorship!.likelihood as Sponsorship)
      : 'unknown';

    const alternatives = companyConfirmed || card.companyConfidence === 'high'
      ? []
      : (card.companyAlternatives ?? [])
          .filter((alt) => alt.name && norm(alt.name) !== norm(companyName))
          .slice(0, MAX_ALTERNATIVES)
          .map((alt) => ({
            name: alt.name,
            description: alt.description,
            website: normalizeHttpUrl(alt.website) ?? undefined,
          }));

    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({
        // AI fills gaps but never blanks out something already on the card
        // (e.g. a LinkedIn URL the student typed in by hand).
        title: card.title || contact.title || null,
        company: companyName || null,
        email: card.email || contact.email || null,
        linkedin_url: contact.linkedin_url || card.linkedinUrl || null,
        summary: card.summary || null,
        topics: card.topics,
        roles_mentioned: card.rolesMentioned,
        deadlines: card.deadlines,
        memorable: card.memorable || null,
        interest_level: card.interestLevel,
        research: {
          person: { summary: research.personSummary ?? '', confidence: research.personConfidence ?? 'low' },
          company: {
            summary: research.companySummary ?? '',
            name: companyName || undefined,
            description: card.companyDescription || previousCompany.description || undefined,
            website: website ?? undefined,
            careersUrl: careersUrl ?? undefined,
            confidence: companyConfirmed ? 'high' : card.companyConfidence,
            alternatives,
            userConfirmed: companyConfirmed,
            sponsorship: {
              likelihood: sponsorshipLikelihood,
              note: research.sponsorship?.note ?? '',
            },
          },
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
    // otherwise re-running after an edit would keep piling up duplicates —
    // but carries over checkmarks for any item/job that comes back with the
    // same text, so "Refresh with my profile" doesn't wipe progress.
    const doneTexts = new Set((oldItems ?? []).filter((i) => i.done).map((i) => norm(i.text)));
    const appliedTitles = new Set((oldJobs ?? []).filter((j) => j.applied).map((j) => norm(j.title)));
    await supabase.from('action_items').delete().eq('contact_id', contactId);
    await supabase.from('job_opportunities').delete().eq('contact_id', contactId);

    const { data: actionItems, error: actionItemsError } = card.actionItems.length
      ? await supabase
          .from('action_items')
          .insert(
            card.actionItems.map((text) => ({ contact_id: contactId, text, done: doneTexts.has(norm(text)) })),
          )
          .select()
      : { data: [], error: null };
    if (actionItemsError) throw actionItemsError;

    // Each suggestion links to the verified careers page (or homepage) —
    // never a model-supplied posting URL, which would likely be invented.
    const jobLink = careersUrl ?? website ?? null;
    const jobs = (research.jobs ?? []).filter((j) => j.title).slice(0, MAX_JOBS);
    const { data: jobRows, error: jobsError } = jobs.length
      ? await supabase
          .from('job_opportunities')
          .insert(
            jobs.map((job) => ({
              contact_id: contactId,
              title: job.title,
              kind: JOB_KINDS.includes(job.kind as JobKind) ? job.kind : 'other',
              fit_reason: job.fitReason || null,
              url: jobLink,
              deadline: job.deadline || null,
              applied: appliedTitles.has(norm(job.title!)),
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
