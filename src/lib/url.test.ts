import { displayUrl } from './url';

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
