import { useMemo, useState } from 'react';

import type { Contact, InterestLevel } from '@/lib/types';

export type InterestFilter = InterestLevel | 'all';

// Shared by the mobile event timeline and the web dashboard's contacts
// table — client-side only, matching PROMPT.md's "quick search/filter of
// contacts by name, company, interest level" (an event's contact list is
// small enough that this doesn't need a server-side query).
export function useContactFilter(contacts: Contact[]) {
  const [search, setSearch] = useState('');
  const [interestFilter, setInterestFilter] = useState<InterestFilter>('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (interestFilter !== 'all' && contact.interestLevel !== interestFilter) return false;
      if (!query) return true;
      return (
        contact.name.toLowerCase().includes(query) ||
        (contact.company ?? '').toLowerCase().includes(query)
      );
    });
  }, [contacts, search, interestFilter]);

  return { filtered, search, setSearch, interestFilter, setInterestFilter };
}
