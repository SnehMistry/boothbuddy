import { describeAiError } from './ai-errors';

describe('describeAiError', () => {
  it('returns a generic headline with no detail when there is no error', () => {
    expect(describeAiError(undefined)).toEqual({
      headline: 'Something went wrong.',
      detail: '',
    });
  });

  it('splits an AiBusyError message into headline + detail', () => {
    const raw =
      'Google AI is busy right now — both gemini-flash-latest and gemini-3.5-flash-lite are overloaded. Please try again in a bit.\n\nDetails: Gemini 503 (gemini-flash-latest): boom | Gemini 503 (gemini-3.5-flash-lite): boom';

    const { headline, detail } = describeAiError(raw);

    expect(headline).toBe(
      'Google AI is busy right now — both gemini-flash-latest and gemini-3.5-flash-lite are overloaded. Please try again in a bit.',
    );
    expect(detail).toBe(
      'Gemini 503 (gemini-flash-latest): boom | Gemini 503 (gemini-3.5-flash-lite): boom',
    );
  });

  it('treats any other error as a generic headline with the raw text as detail', () => {
    const raw = 'Gemini 400 (gemini-flash-latest): Invalid request';
    expect(describeAiError(raw)).toEqual({
      headline: 'AI processing failed.',
      detail: raw,
    });
  });

  it('does not treat a "Google AI is busy" message without the Details marker as the busy case', () => {
    // Defensive: only split when the expected marker is actually present,
    // rather than assuming every message starting with that prefix has one.
    const raw = 'Google AI is busy right now, no details attached';
    expect(describeAiError(raw)).toEqual({
      headline: 'AI processing failed.',
      detail: raw,
    });
  });
});
