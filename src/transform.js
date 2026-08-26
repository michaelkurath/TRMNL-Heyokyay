function transform(input) {
  const settings = input?.trmnl?.plugin_settings?.custom_fields_values || {};
  const feed = settings.feed || "heyokyay";   // heyokyay | islieb | isfies
  const mode = settings.mode || "latest";     // latest | random

  // Polling URL order:
  // IDX_0 = https://heyokyay.com/feed/
  // IDX_1 = https://islieb.de/feed/
  // IDX_2 = https://islieb.de/finde/isfies/feed/
  let payload = input.IDX_0;
  if (feed === "islieb") payload = input.IDX_1;
  if (feed === "isfies") payload = input.IDX_2;

  const channel = (payload?.rss || {}).channel || {};
  const itemsRaw = channel.item;
  const items = Array.isArray(itemsRaw) ? itemsRaw : (itemsRaw ? [itemsRaw] : []);

  if (!items.length) {
    return { data: { img: null, link: null, title: "No item found", feed, mode } };
  }

  const pickIndex =
    (mode === "random") ? Math.floor(Math.random() * items.length) : 0;

  const it = items[pickIndex];

  // Normalize title/link (parser may store string or { "#text": "..." })
  const title = String(it.title?.["#text"] ?? it.title ?? "").trim();
  const link  = String(it.link?.["#text"]  ?? it.link  ?? "").trim();

  // Try several common shapes for namespaced content/CDATA
  const candidates = [
    it["content:encoded"],
    it.encoded,
    it.content?.encoded,
    it.content,
    it.description
  ];

  const htmlStr = candidates
    .map(v => (v && (v["#cdata"] || v["#text"] || v._cdata || v._text)) ?? v)
    .map(v => (v == null ? "" : String(v)))
    .find(s =>
      s.includes("<img") ||
      s.includes("wp-content/uploads") ||
      s.match(/\.(png|jpe?g|webp)(\?|#|$)/i)
    ) || "";

  // Extract image URL from <img src="...">
  let img = (htmlStr.match(/<img[^>]+src="([^"]+)"/i)?.[1] || "").trim();

  // Fallback: sometimes <a href="...png/jpg"> wraps the image
  if (!img) {
    const href = (htmlStr.match(/<a[^>]+href="([^"]+)"/i)?.[1] || "").trim();
    if (/\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(href)) img = href;
  }

  return { data: { img: img || null, title, link, feed, mode } };
}
