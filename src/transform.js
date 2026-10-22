function transform(input) {
  const settings = input?.trmnl?.plugin_settings?.custom_fields_values || {};
  const feed = settings.feed || "heyokyay";
  const mode = settings.mode || "latest";

  // TRMNL may wrap multiple polling responses in IDX_0.
  const payload = input?.IDX_0 || input || {};
  const channel = payload?.rss?.channel || payload?.channel || {};
  const raw = channel.item || [];
  const items = Array.isArray(raw) ? raw : [raw];

  function asText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") {
      return asText(value["#cdata"] ?? value["#text"] ?? value._cdata ?? value._text ?? value._ ?? "");
    }
    return "";
  }

  function mediaUrl(node) {
    if (!node) return "";
    if (Array.isArray(node)) {
      for (const entry of node) {
        const url = mediaUrl(entry);
        if (url) return url;
      }
      return "";
    }
    if (typeof node === "string") return node;
    const url = node["@url"] ?? node["@_url"] ?? node.url ??
      node.$?.url ?? node.attributes?.url ?? node["@attributes"]?.url ??
      node["#attributes"]?.url ?? "";
    const type = asText(node["@type"] ?? node["@_type"] ?? node.type ??
      node.$?.type ?? node.attributes?.type).toLowerCase();
    if (type && !type.startsWith("image/")) return "";
    return asText(url);
  }

  function htmlImage(item) {
    const sources = [
      item["content:encoded"], item.encoded, item.content?.encoded,
      item.content, item.description
    ];
    for (const source of sources) {
      const html = asText(source);
      const img = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
      if (img) return img;
      const href = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
      if (href && /\.(?:png|jpe?g|webp|gif)(?:[?#]|$)/i.test(href)) return href;
    }
    return "";
  }

  function validImage(url) {
    const clean = String(url || "").replace(/&amp;/g, "&").trim();
    return /^https:\/\//i.test(clean) &&
      !/\.(?:mp4|webm|mov|mp3)(?:[?#]|$)/i.test(clean) ? clean : "";
  }

  // Mastodon puts comic images in media:content, often with XML attributes.
  // Keep the old WordPress HTML-image extraction for preview compatibility.
  const comics = items.map(item => {
    if (!item || typeof item !== "object") return null;
    const media = [
      item["media:content"], item.media?.content, item.media_content,
      item.enclosure, item["media:thumbnail"], item.media?.thumbnail
    ];
    const img = media.map(mediaUrl).map(validImage).find(Boolean) ||
      validImage(htmlImage(item));
    if (!img) return null; // e.g. a text-only announcement
    const rawTitle = asText(item.title) || asText(item.description);
    const title = rawTitle.replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|amp);/g, " ")
      .replace(/\s+/g, " ").trim().slice(0, 80) || "Comic";
    const link = asText(item.link).trim();
    return { img, title, link };
  }).filter(Boolean);

  if (!comics.length) {
    return { data: { img: null, title: "No comic image available", link: null, feed, mode } };
  }

  const index = mode === "random" ? Math.floor(Math.random() * comics.length) : 0;
  return { data: { ...comics[index], feed, mode } };
}
