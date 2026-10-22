# Heyokyay

A [TRMNL](https://trmnl.com) plugin that displays the latest or a random comic
from [heyokyay](https://heyokyay.com), [islieb](https://islieb.de), or
[isfies](https://islieb.de/finde/isfies/).

[View the Heyokyay recipe on TRMNL](https://trmnl.com/recipes/243525)

<img width="150" alt="Works with TRMNL" src="https://trmnl.com/images/brand/badges/light/works-with-trmnl/trmnl-badge-works-with-light.svg" />

## Development

This repository is connected through
[GitHub Sync](https://help.trmnl.com/en/articles/15977899-github-sync).
Templates and settings live in [`src/`](src/) and can be previewed locally
with [trmnlp](https://github.com/usetrmnl/trmnlp):

```sh
gem install trmnl_preview
trmnlp serve
```

## License

Published under the
[TRMNL Community Plugin License](https://trmnl.com/plugin-license), which
applies CC BY 4.0 terms to the visual design, data parsing logic, and markup.
See [`LICENSE`](LICENSE) for details.

## Feed availability and troubleshooting

As of 22 October 2026, the original WordPress feeds `https://heyokyay.com/feed/`
(HTTP 404) and `https://islieb.de/feed/` (HTTP 503) cannot be reliably
polled by TRMNL. The recipe's polling sources are therefore set to the
creators' official Mastodon accounts, using their media-only RSS feeds:

- EN (heyokyay): `https://mastodon.social/@heyokyay/media.rss`
- DE (islieb): `https://mastodon.social/@islieb/media.rss`
- DE (isfies): `https://mastodon.social/@isfies/media.rss`

Mastodon uses `media:content` instead of the image HTML used by WordPress.
The Serverless transform now recognizes both formats and skips text-only posts.

**Deployment note:** This is a proposed workaround. The Mastodon RSS endpoints
could not be fetched end-to-end by the automated verification environment.
Before merging, verify all three feeds from TRMNL's Polling configuration,
preview the OG/X layouts, and ensure each displays a comic image. After a
successful sync, use **Reset Health** on any degraded TRMNL instances.
