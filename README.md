# Clinton-Russia High-Level Files

Working compiler page for the planned Office of the Historian volume:

- FRUS 1993-2000, Volume XVIII, Russia
- Planned destination: https://history.state.gov/historicaldocuments/frus1993-00v18

The site follows the Bush41 Western Europe page pattern and organizes records into five research lanes:

1. Clinton-Yeltsin Chronology
2. Released Clinton Library Packets
3. Talbott FOIA Context
4. Clinton Public Statements
5. NARA Scout Leads

## Sources

- Clinton Library, Meetings and Telephone Calls with Foreign Leaders
- Clinton Library, Memcons and Telcons
- Clinton Library MDR releases 2015-0782-M-1, 2015-0782-M-2, 2014-0996-M, and 2014-0546-M-Release-A
- National Archives Catalog series 7585721, Presidential Records Series (PRS) Files
- National Archives Catalog item 163545404, Memcons between President William Jefferson Clinton and President Boris Yeltsin
- National Archives Catalog item 163545436, Memcon between President William Jefferson Clinton and President Boris Yeltsin
- Strobe Talbott FOIA manifest
- NARA Scout and National Archives Catalog leads

## Data Refresh

The generated site data lives in `data/memcons.json` and `data/memcons.js`.

```sh
node scripts/build-data.js
```

The builder expects the Clinton foreign-leader master-list text at `/private/tmp/clinton-foreign-meetings.txt`
unless `CLINTON_FOREIGN_MEETINGS_TXT` is set. It reads the Strobe manifest from the sibling
`strobe-talbott-foia` checkout unless `STROBE_MANIFEST` is set.

If only the compiler handoff packet needs to be refreshed from the already-generated site data:

```sh
node scripts/build-compiler-packet.js
```

Compiler-facing handoff files are generated in `reports/`:

- `compiler-start-here.html`: browser-ready start-here packet with consolidated counts, reading order, and hard source gaps.
- `compiler-start-here.md`: Markdown copy of the same packet for repo review.
- `chronological-chapter-outline.html`, `chronological-chapter-outline.json`, and `chronological-chapter-outline.csv`: draft phase-by-phase outline grouping the direct Clinton-Yeltsin chronology by narrative period, page load, selection anchors, issues, and hard gaps.
- `contact-dossier-crosswalk.html`, `contact-dossier-crosswalk.json`, and `contact-dossier-crosswalk.csv`: one-row-per-contact dossier joining each Clinton-Yeltsin memcon/telcon to Presidential Daily Diary references, Public Papers context, source-copy controls, and nearby NARA/Strobe support leads.
- `hard-source-gap-packet.html`, `hard-source-gap-packet.json`, and `hard-source-gap-packet.csv`: archival/MDR follow-up packet for the six uncounted direct Clinton-Yeltsin contacts, with corroborating hooks, false leads, and draft request language.
- `public/documents/clinton-yeltsin-core-reading-packet.pdf`: single chronological PDF packet of the 85 page-counted memcons/telcons.
- `reading-packet-manifest.json` and `reading-packet-toc.csv`: packet page ranges, document order, provenance-sheet pages, and source links.
- `topic-index.html`, `topic-index.json`, and `topic-index.csv`: keyword topic and name/organization index generated from extracted PDF text.
- `selection-priority-workbench.html`, `selection-priority-workbench.json`, and `selection-priority-workbench.csv`: nonbinding selection-priority triage for the direct Clinton-Yeltsin chronology, with tiers, issue coverage, source hooks, and decision prompts.
- `draft-selection-spine.html`, `draft-selection-spine.json`, and `draft-selection-spine.csv`: nonbinding starting document-selection spine that keeps all Tier 1 likely core documents and adds Tier 2 representatives for undercovered themes and thin narrative phases.
- `draft-spine-worksheet.html`, `draft-spine-worksheet.json`, and `draft-spine-worksheet.csv`: print-and-spreadsheet first-pass worksheet joining the draft spine to source-note drafts, face-page flags, annotation prompts, packet ranges, companion-source counts, and blank compiler decision fields.
- `provisional-document-list.html`, `provisional-document-list.json`, and `provisional-document-list.csv`: FRUS-style provisional document list for the 16-document draft spine, with placeholder document numbers, phase load, cumulative pages, production blockers, and blank final-decision fields.
- `compiler-next-actions.html`, `compiler-next-actions.json`, and `compiler-next-actions.csv`: prioritized production queue that turns the hard-gap, draft-spine, source-note, face-page, annotation, and selection reports into day-one tasks and cleanup batches.
- `page-budget-scenarios.html`, `page-budget-scenarios.json`, and `page-budget-scenarios.csv`: nonbinding document/page-budget scenarios for Tier 1, Tier 1-2, heavy annotation, broad draft, full counted set, and hard-gap estimates.
- `thematic-selection-matrix.html`, `thematic-selection-matrix.json`, and `thematic-selection-matrix.csv`: issue-by-scenario coverage matrix showing strong, adequate, and Tier 2-dependent thematic coverage across selection tiers.
- `production-readiness-checklist.html`, `production-readiness-checklist.json`, and `production-readiness-checklist.csv`: production-control checklist that consolidates PDF/provenance validation, source-note review, face-page metadata, annotation workload, selection tier, companion evidence, and next action for each direct contact.
- `annotation-workbench.html`, `annotation-workbench.json`, `annotation-targets.csv`, and `annotation-document-queue.csv`: annotation triage workbench with authority targets, issue clusters, first-reference prompts, and a document-level annotation queue.
- `face-page-metadata.html`, `face-page-metadata.json`, and `face-page-metadata.csv`: source-note drafting aid with parsed subject, participants, notetakers/interpreters, date/time/place, and classification lines from each extracted PDF's first page.
- `source-note-drafts.html`, `source-note-drafts.json`, and `source-note-drafts.csv`: FRUS-style source-note drafting packet that keeps formal source-note prose separate from working page maps, marker/provenance sheets, packet ranges, and OCR-derived face-page metadata.
- `source-note-element-audit.html`, `source-note-element-audit.json`, and `source-note-element-audit.csv`: source-family-aware citation element checklist for repository stems, NAIDs, MDR/FOIA/catalog authority, identifiers, separated working provenance, and face-page/source-note review flags.
- `compiler-document-chronology.csv`: spreadsheet-ready chronology with page counts, source-page ranges, PDFs, source notes, and follow-up actions.
- `frus-selection-worksheet.csv`: working selection sheet with blank include/document-number columns, suggested treatment, issue tags, and annotation/declassification note columns.
- `document-page-tallies.json`: machine-readable consolidated page counts and pending extent records.
- `extracted-pdf-validation.json`: mechanical audit of local derivative PDF page counts against the record data and extraction manifest.

To rebuild the draft chronological chapter outline from the selection-priority workbench:

```sh
node scripts/build-chronological-chapter-outline.js
```

To re-run the local PDF extent/provenance audit:

```sh
node scripts/audit-extracted-pdfs.js
```

To rebuild the combined chronological reading packet:

```sh
node scripts/build-reading-packet.js
```

To rebuild the topic/name index from the extracted PDFs:

```sh
node scripts/build-topic-index.js
```

To rebuild the annotation workbench from the topic index and dossier crosswalk:

```sh
node scripts/build-annotation-workbench.js
```

To rebuild the selection-priority workbench from the annotation, dossier, and hard-gap reports:

```sh
node scripts/build-selection-priority-workbench.js
```

To rebuild the page-budget scenarios from the selection-priority workbench:

```sh
node scripts/build-page-budget-scenarios.js
```

To rebuild the draft selection spine from the selection, thematic, outline, and readiness reports:

```sh
node scripts/build-draft-selection-spine.js
```

To rebuild the draft spine working worksheet from the spine, source-note, face-page, annotation, dossier, packet, readiness, and next-action reports:

```sh
node scripts/build-draft-spine-worksheet.js
```

To rebuild the provisional FRUS-style document list from the draft spine, worksheet, outline, readiness, source-note, and next-action reports:

```sh
node scripts/build-provisional-document-list.js
```

To rebuild the compiler next-action queue from the spine, readiness, source-note, face-page, and hard-gap reports:

```sh
node scripts/build-compiler-next-actions.js
```

This command also refreshes `data/compiler-next-actions.js`, the compact landing-page dashboard payload.

To rebuild the thematic selection matrix from the selection, page-budget, topic, and annotation reports:

```sh
node scripts/build-thematic-selection-matrix.js
```

To rebuild the production-readiness checklist from the validation, source-note, metadata, annotation, dossier, hard-gap, and selection reports:

```sh
node scripts/build-production-readiness-checklist.js
```

To rebuild the face-page metadata audit:

```sh
node scripts/build-face-page-audit.js
```

To rebuild the source-note drafting packet:

```sh
node scripts/build-source-note-drafts.js
```

To rebuild the source-note element audit:

```sh
node scripts/build-source-note-element-audit.js
```

To rebuild the contact dossier crosswalk:

```sh
node scripts/build-contact-dossier-crosswalk.js
```

To rebuild the hard-source gap follow-up packet:

```sh
node scripts/build-hard-source-gap-packet.js
```

## Document Extraction Rule

When a source PDF contains a folder, packet, or withdrawal stack, derivative compiler PDFs should include only
the pages that are the actual memcon or telcon. Do not include surrounding talking points, briefing memos,
correspondence, finding-aid pages, or unrelated withdrawal sheets as document pages.

Append the original source marker page for that specific item as the last page of the new PDF. Treat that
marker page as the provenance sheet.

```sh
node scripts/extract-document-pdf.js \
  --source /path/to/source.pdf \
  --pages 10-12 \
  --marker 9 \
  --out public/documents/example-memcon.pdf
```

If a source PDF contains only a marker or withdrawal entry for the memcon/telcon, keep it as a lead and do not
create a derivative document until releasable pages containing the actual conversation are found.

## Local Preview

```sh
python3 -m http.server 4193 --bind 127.0.0.1
```

Then open http://127.0.0.1:4193/.
