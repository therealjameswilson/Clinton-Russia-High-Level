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
- `compiler-document-chronology.csv`: spreadsheet-ready chronology with page counts, source-page ranges, PDFs, source notes, and follow-up actions.
- `frus-selection-worksheet.csv`: working selection sheet with blank include/document-number columns, suggested treatment, issue tags, and annotation/declassification note columns.
- `document-page-tallies.json`: machine-readable consolidated page counts and pending extent records.
- `extracted-pdf-validation.json`: mechanical audit of local derivative PDF page counts against the record data and extraction manifest.

To re-run the local PDF extent/provenance audit:

```sh
node scripts/audit-extracted-pdfs.js
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
