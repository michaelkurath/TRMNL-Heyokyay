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

## Temporary source outages

The original feeds remain unchanged:

- English: https://heyokyay.com/feed/
- Deutsch / islieb: https://islieb.de/feed/
- Deutsch / isfies: https://islieb.de/finde/isfies/feed/

The polling URL in `src/settings.yml` now uses TRMNL's documented
sample JSON endpoint, `https://trmnl.com/custom_plugin_example_data.json`.
TRMNL Serverless then fetches the selected original comic URL itself, using a
3-second timeout (inside TRMNL's 5-second Serverless budget).

This is necessary because TRMNL stops processing before Liquid is rendered
when its own polling URL responds with HTTP 404/503. Returning a normal data
object (`data.status`: `ok`, `offline`, or `empty`) lets all four templates
show a readable status instead. English and German sources get localized
messages. The plugin retries the same original feed automatically at its
next normal refresh; no fallback or mirror feed is used.

The source status (including HTTP status, if available) appears in the
standard title bar. If the TRMNL sample endpoint itself fails, the Serverless
code cannot run and TRMNL may still mark the plugin as degraded.

Test with `node --test test/transform.test.js`.
Before publishing, check each source and the Latest/Random settings, and
preview all four TRMNL sizes. Existing instances that were already disabled
by repeated polling failures may need **Reset Health** after GitHub Sync.
