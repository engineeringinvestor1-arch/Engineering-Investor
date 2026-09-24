// Vir RSS: strojno berljiv seznam analiz. Bralniki (Feedly in podobni) ga preberejo in bralcu
// sporočijo, ko izide nov članek. Vsebuje izvleček in povezavo, ne celotnega besedila,
// da bralec pride na stran, kjer so grafi.
//
// Brez dodatnih knjižnic: seznam je preprost XML, ki ga sestavimo sami in ubežimo posebne znake.
import { getCollection } from 'astro:content';
import { SITE } from '../config';

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const analize = (await getCollection('analize')).sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const zadnja = analize[0]?.data.pubDate ?? new Date();

  const vnosi = analize.map((a) => {
    const url = `${SITE.url}/analize/${a.id}/`;
    return `    <item>
      <title>${esc(a.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${a.data.pubDate.toUTCString()}</pubDate>
      <category>${esc(a.data.category)}</category>
      ${a.data.description ? `<description>${esc(a.data.description)}</description>` : ''}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${SITE.url}/</link>
    <description>${esc(SITE.description)}</description>
    <language>sl</language>
    <lastBuildDate>${zadnja.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>
${vnosi}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
