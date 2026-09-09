# site.js

## Purpose
Site-level identity, introduction, section names, activity notes, domain, and footer links. Project-specific content lives in the project ledger and page Markdown.

## Contracts
- `homeTitle` is the homepage heading. `name` retains the archive identity used in shared navigation, feeds, and metadata.
- `tagline` is displayed below the homepage heading with evenly spaced letters, plus an intact accessible label.
- `about` supplies the homepage introduction.
- `domain` is a bare hostname used for canonical URLs and discovery files.
- `genera` IDs must match the project ledger; their order controls homepage sections.
- `chronica` entries optionally reference stable project slugs.
- `elsewhere` links with no URL are omitted.
