export const SITE = {
  name: 'Engineering Investor',
  tagline: 'Razlaga trgov skozi aktualne dogodke.',
  description:
    'Finančno-izobraževalna vsebina za slovensko občinstvo. Filtriramo informacije, razlagamo trge in geopolitiko. Brez hypea, brez finančnih nasvetov.',
  url: 'https://engineeringinvestor.si',
  twitterHandle: '@JazJst',
  twitterUrl: 'https://x.com/JazJst',
};

export const NAV_LINKS = [
  { label: 'Analize', href: '/analize' },
  { label: 'Koledar', href: '/koledar' },
];

export const CATEGORIES = [
  'Makro',
  'Geopolitika',
  'Trgi',
  'Bitcoin',
  'Delnice',
] as const;

export type Category = (typeof CATEGORIES)[number];
