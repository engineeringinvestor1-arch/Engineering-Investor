/**
 * Vrne pravilno pot z upoštevanjem Astro base URL.
 * Ostane uporabno, če bo stran kdaj gostovana na podmapi.
 */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}
