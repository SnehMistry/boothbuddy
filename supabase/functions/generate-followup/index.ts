// Phase 4 End-of-Day recap: drafts a LinkedIn connection note, a longer
// LinkedIn message, and (if an email address is known) a follow-up email
// for one contact. See PROMPT.md "Phase 4 — End-of-Day recap, full spec".
//
// No Google Search grounding here (this is pure drafting from context
// already on the contact, not research), so — unlike process-contact —
// this can safely use generateStructured's responseSchema without the
// tools-vs-schema conflict.
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';
import { generateStructured, type GeminiSchema } from '../_shared/gemini.ts';

const TONES = ['casual', 'professional', 'enthusiastic'] as const;
type Tone = (typeof TONES)[number];

type Draft = {
  linkedinNote: string;
  linkedinMessage: string;
  emailSubject: string;
  emailDraft: string;
};

const DRAFT_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    linkedinNote: {
      type: 'string',
      description: 'A LinkedIn connection request note. MUST be under 300 characters.',
    },
    linkedinMessage: {
      type: 'string',
      description: 'A longer follow-up message to send after they accept the connection.',
    },
    emailSubject: {
      type: 'string',
      description: 'Just the email subject line, no "Subject:" prefix. Empty string if told not to write an email.',
    },
    emailDraft: {
      type: 'string',
      description: 'The email body only, not including the subject line. Empty string if told not to write one.',
    },
  },
  required: ['linkedinNote', 'linkedinMessage', 'emailSubject', 'emailDraft'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const body = await req.json();
    const contactId: string | undefined = body.contactId;
    const requestedTone: string | undefined = body.tone;
    if (!contactId) return jsonResponse({ error: 'contactId is required' }, 400);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY is not configured');

    const supabase = createClient(
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

    const tone: Tone = TONES.includes(requestedTone as Tone)
      ? (requestedTone as Tone)
      : (contact.followup_tone as Tone) || 'casual';

    const contextLines = [
      `Name: ${contact.name}`,
      contact.title ? `Title: ${contact.title}` : null,
      contact.company ? `Company: ${contact.company}` : null,
      contact.summary ? `Conversation summary: ${contact.summary}` : null,
      contact.topics?.length ? `Topics discussed: ${contact.topics.join(', ')}` : null,
      contact.roles_mentioned?.length
        ? `Roles/opportunities mentioned: ${contact.roles_mentioned.join(', ')}`
        : null,
      contact.memorable ? `Something memorable: ${contact.memorable}` : null,
      contact.notes ? `Raw notes from the conversation:\n${contact.notes}` : null,
      contact.research?.person?.summary ? `Research on them: ${contact.research.person.summary}` : null,
      contact.research?.company?.summary
        ? `Research on their company: ${contact.research.company.summary}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    if (!contextLines.trim()) {
      return jsonResponse(
        { error: 'Not enough information about this contact yet — add notes or process it with AI first.' },
        400,
      );
    }

    const prompt = `You are a college student writing follow-up messages after meeting someone at a career fair. Write in a ${tone} tone — sound like a real student, not corporate or cringe.

${contextLines}

Write:
1. A LinkedIn connection request note. It MUST be under 300 characters (LinkedIn's hard limit). Reference something specific from the conversation.
2. A longer follow-up message for after they accept the connection request — also reference specifics, and ${
      contact.roles_mentioned?.length ? 'mention the opportunity discussed if relevant.' : "keep it warm and specific."
    }
3. A follow-up email: a short subject line and a body${
      contact.email ? '' : ' — there is no email on file, so return empty strings for both of these fields'
    }.

Don't invent details that aren't given above. Respond with the JSON object matching the schema, nothing else.`;

    const draft = await generateStructured<Draft>(geminiApiKey, [{ text: prompt }], DRAFT_SCHEMA);

    // The model is told to stay under 300 chars but isn't always reliable
    // about hard limits — enforce it rather than trust the prompt alone.
    const linkedinNote = draft.linkedinNote.slice(0, 300);

    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update({
        linkedin_note: linkedinNote,
        linkedin_message: draft.linkedinMessage,
        email_subject: contact.email ? draft.emailSubject || null : null,
        email_draft: contact.email ? draft.emailDraft || null : null,
        followup_tone: tone,
        followup_generated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .select()
      .single();
    if (updateError) throw updateError;

    return jsonResponse({ contact: updatedContact });
  } catch (error) {
    console.error('generate-followup failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
