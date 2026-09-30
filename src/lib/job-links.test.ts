import { careersSearchUrl, linkedinJobsSearchUrl } from './job-links';

describe('linkedinJobsSearchUrl', () => {
  it('combines title and company into one keyword search', () => {
    expect(linkedinJobsSearchUrl('Software Engineer Intern, Summer 2027', 'Hunter Industries')).toBe(
      'https://www.linkedin.com/jobs/search/?keywords=Software%20Engineer%20Intern%20Summer%202027%20Hunter%20Industries',
    );
  });

  it('works without a company', () => {
    expect(linkedinJobsSearchUrl('New Grad SWE')).toBe(
      'https://www.linkedin.com/jobs/search/?keywords=New%20Grad%20SWE',
    );
  });
});

describe('careersSearchUrl', () => {
  it('site-searches the careers host when known', () => {
    expect(careersSearchUrl('SWE Intern', 'Acme', 'https://www.careers.acme.com/jobs?utm_source=x')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('site:careers.acme.com SWE Intern')}`,
    );
  });

  it('falls back to a company careers search without a URL', () => {
    expect(careersSearchUrl('SWE Intern', 'Acme')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('Acme careers SWE Intern')}`,
    );
  });
});
