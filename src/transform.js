/*
 * TRMNL Serverless reads the unchanged comic RSS URLs. A source failure
 * becomes valid merge data instead of degrading the plugin's Polling fetch.
 */
const FEEDS = Object.freeze({
  heyokyay: 'https://heyokyay.com/feed/',
  islieb: 'https://islieb.de/feed/',
  isfies: 'https://islieb.de/finde/isfies/feed/'
});

function decodeEntities(text) {
  return String(text ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (all, num) => {
      const code = num[0].toLowerCase() === 'x'
        ? parseInt(num.slice(1), 16) : parseInt(num, 10);
      try { return String.fromCodePoint(code); } catch { return all; }
    })
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'").replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ');
}

function tagContent(xml, tag) {
  const match = xml.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '\\s*>', 'i'));
  return match ? decodeEntities(match[1]).trim() : '';
}

function attribute(markup, key) {
  return decodeEntities(markup.match(new RegExp("(?:^|\\s)" + key + "\\s*=\\s*([\"'])(.*?)\\1", 'i'))?.[2] || '');
}

function imageFromHtml(html) {
  const imgs = String(html || '').match(/<img\b[^>]*>/gi) || [];
  for (const img of imgs) {
    const url = attribute(img, 'data-src') || attribute(img, 'src');
    if (url && !url.startsWith('data:')) return url;
  }
  const links = String(html || '').match(/<a\b[^>]*>/gi) || [];
  for (const a of links) {
    const url = attribute(a, 'href');
    if (/\.(?:png|jpe?g|webp|gif)(?:[?#]|$)/i.test(url)) return url;
  }
  return '';
}

function mediaImage(xml) {
  const tags = String(xml).match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const type = attribute(tag, 'type');
    if (type && !type.startsWith('image/')) continue;
    const url = attribute(tag, 'url');
    if (url) return url;
  }
  return '';
}

function absoluteUrl(value, base) {
  try {
    const url = new URL(String(value || '').trim(), base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function parseComics(xml, feedUrl) {
  if (typeof xml !== 'string' || !/<(?:rss|rdf:RDF|item)\b/i.test(xml)) return [];
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi)];
  return items.flatMap((match) => {
    const item = match[1];
    const html = tagContent(item, 'content:encoded') || tagContent(item, 'description');
    const rawImage = mediaImage(item) || imageFromHtml(html);
    const img = absoluteUrl(rawImage, feedUrl);
    if (!img) return [];
    const title = decodeEntities(tagContent(item, 'title'))
      .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Comic';
    const link = absoluteUrl(tagContent(item, 'link'), feedUrl);
    return [{ img, title, link }];
  });
}

function result(feed, mode, status, values = {}) {
  return { data: { status, feed, mode, img: null, title: '', link: null, http_status: null, ...values } };
}

async function run(input) {
  const settings = input?.trmnl?.plugin_settings?.custom_fields_values || {};
  const feed = Object.prototype.hasOwnProperty.call(FEEDS, settings.feed) ? settings.feed : 'heyokyay';
  const mode = settings.mode === 'random' ? 'random' : 'latest';
  try {
    // TRMNL Serverless has a five-second overall runtime limit.
    const response = await fetch(FEEDS[feed], {
      signal: AbortSignal.timeout(3000),
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }
    });
    if (!response.ok) return result(feed, mode, 'offline', { http_status: response.status });
    const comics = parseComics(await response.text(), FEEDS[feed]);
    if (!comics.length) return result(feed, mode, 'empty');
    const index = mode === 'random' ? Math.floor(Math.random() * comics.length) : 0;
    return result(feed, mode, 'ok', comics[index]);
  } catch (_error) {
    return result(feed, mode, 'offline');
  }
}
if (typeof module !== 'undefined') {
  module.exports = { run, parseComics, decodeEntities, tagContent, imageFromHtml };
}
