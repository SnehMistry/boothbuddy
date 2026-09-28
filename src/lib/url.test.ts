import { displayUrl, stripTrackingParams } from './url';

describe('displayUrl', () => {
  it('strips protocol and www.', () => {
    expect(displayUrl('https://www.baesystems.com/careers')).toBe('baesystems.com/careers');
  });

  it('strips a tracking query string', () => {
    expect(displayUrl('https://jobs.baesystems.com/roles?utm_source=linkedin&utm_medium=share')).toBe(
      'jobs.baesystems.com/roles',
    );
  });

  it('drops a bare root path', () => {
    expect(displayUrl('https://example.com/')).toBe('example.com');
  });

  it('falls back to the raw string for an unparseable URL', () => {
    expect(displayUrl('not a url')).toBe('not a url');
  });
});

describe('stripTrackingParams', () => {
  it('removes utm_ params but keeps real query params and the path', () => {
    expect(
      stripTrackingParams('https://jobs.baesystems.com/roles?ref=career-fair&utm_source=linkedin&utm_medium=share'),
    ).toBe('https://jobs.baesystems.com/roles?ref=career-fair');
  });

  it('drops the whole query string when only tracking params were present', () => {
    expect(stripTrackingParams('https://example.com/careers?utm_source=linkedin')).toBe(
      'https://example.com/careers',
    );
  });

  it('leaves a URL with no tracking params unchanged', () => {
    expect(stripTrackingParams('https://example.com/careers')).toBe('https://example.com/careers');
  });

  it('falls back to the raw string for an unparseable URL', () => {
    expect(stripTrackingParams('not a url')).toBe('not a url');
  });
});
