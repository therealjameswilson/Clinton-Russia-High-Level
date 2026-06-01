const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function siteUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\.\//, ""), SITE_BASE_URL).href;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function htmlCell(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function chronologySort(a, b) {
  return (
    a.sortDate.localeCompare(b.sortDate) ||
    (a.sortOrder || 0) - (b.sortOrder || 0) ||
    a.title.localeCompare(b.title)
  );
}

function candidateDocuments(records) {
  return records
    .filter(
      (record) =>
        record.chapter.name === "Clinton-Yeltsin Chronology" &&
        (record.type === "Memcon" || record.type === "Telcon") &&
        record.potentialFrusDocument !== false &&
        Number.isInteger(record.pageCount) &&
        /^public\/documents\/.+\.pdf$/i.test(record.pdfUrl || "")
    )
    .sort(chronologySort);
}

function compactParticipants(value) {
  const text = clean(value);
  if (text.length <= 360) return text;
  return `${text.slice(0, 357).trim()}...`;
}

function facePageAddenda(face) {
  const parts = [];
  if (face.subject) parts.push(`Subject: ${face.subject}`);
  if (face.dateTimePlace) parts.push(`Date/time/place: ${face.dateTimePlace}`);
  if (face.classification?.marking) parts.push(`Face-page marking: ${face.classification.marking}`);
  if (face.classification?.classifiedBy) parts.push(`Classified by: ${face.classification.classifiedBy}`);
  if (face.classification?.reason) parts.push(`Reason: ${face.classification.reason}`);
  if (face.classification?.declassifyOn) parts.push(`Declassify on: ${face.classification.declassifyOn}`);
  if (face.notetaker) parts.push(`Notetaker: ${face.notetaker}`);
  if (face.interpreter) parts.push(`Interpreter: ${face.interpreter}`);
  if (face.participantsBlock) parts.push(`Participants block: ${compactParticipants(face.participantsBlock)}`);
  return parts.join(" | ");
}

function reviewFlags(face) {
  const flags = [...(face.missingFields || [])];
  if (face.reviewStatus !== "Parsed" && !flags.length) flags.push("face-page parse review");
  if (!face.classification?.classifiedBy) flags.push("classified-by line not parsed");
  if (!face.classification?.reason) flags.push("classification reason not parsed");
  if (!face.classification?.declassifyOn) flags.push("declassify-on line not parsed");
  return [...new Set(flags)];
}

function sourceNoteDraft(record, face, packet) {
  const base = record.frusSourceNote || record.sourceNote || "Source: [source note pending].";
  const packetText = packet
    ? ` Compiler packet pages ${packet.packetPageStart}-${packet.packetPageEnd}; actual conversation pages ${packet.actualConversationPacketPageStart}-${packet.actualConversationPacketPageEnd}.`
    : "";
  const sourcePages = record.sourcePdfPages ? ` Source PDF pages ${record.sourcePdfPages}.` : "";
  const addenda = facePageAddenda(face);
  return clean(`${base}${sourcePages}${packetText}${addenda ? ` Face-page metadata for verification: ${addenda}.` : ""}`);
}

function buildRows(records, faceAudit, packetManifest) {
  const faceById = new Map(faceAudit.rows.map((row) => [row.id, row]));
  const packetById = new Map(packetManifest.rows.map((row) => [row.id, row]));
  return candidateDocuments(records).map((record) => {
    const face = faceById.get(record.id) || {};
    const packet = packetById.get(record.id) || {};
    const flags = reviewFlags(face);
    return {
      id: record.id,
      sequence: packet.sequence || null,
      date: record.date,
      type: record.type,
      title: record.documentTitle || record.title,
      sourceNoteReviewStatus: flags.length ? "Needs source-note review" : "Parsed face-page fields available",
      reviewFlags: flags,
      baseFrusSourceNote: record.frusSourceNote || record.sourceNote || "",
      sourceNoteDraftForReview: sourceNoteDraft(record, face, packet),
      facePageAddendaForReview: facePageAddenda(face),
      subject: face.subject || "",
      dateTimePlace: face.dateTimePlace || "",
      participantsBlock: face.participantsBlock || "",
      notetaker: face.notetaker || "",
      interpreter: face.interpreter || "",
      classificationMarking: face.classification?.marking || "",
      classifiedBy: face.classification?.classifiedBy || "",
      reason: face.classification?.reason || "",
      declassifyOn: face.classification?.declassifyOn || "",
      declassifiedBy: (face.classification?.declassifiedBy || []).join(" | "),
      packetPages: packet.packetPageStart ? `${packet.packetPageStart}-${packet.packetPageEnd}` : "",
      actualConversationPacketPages: packet.actualConversationPacketPageStart
        ? `${packet.actualConversationPacketPageStart}-${packet.actualConversationPacketPageEnd}`
        : "",
      sourcePdfPages: record.sourcePdfPages || "",
      pdfUrl: siteUrl(record.pdfUrl),
      sourcePacketUrl: siteUrl(record.sourcePdfUrl || record.source?.pdfUrl || record.catalogUrl || "")
    };
  });
}

function writeCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "sourceNoteReviewStatus",
    "reviewFlags",
    "title",
    "sourceNoteDraftForReview",
    "baseFrusSourceNote",
    "facePageAddendaForReview",
    "subject",
    "dateTimePlace",
    "participantsBlock",
    "notetaker",
    "interpreter",
    "classificationMarking",
    "classifiedBy",
    "reason",
    "declassifyOn",
    "declassifiedBy",
    "packetPages",
    "actualConversationPacketPages",
    "sourcePdfPages",
    "pdfUrl",
    "sourcePacketUrl"
  ];
  const body = rows.map((row) =>
    [
      row.sequence,
      row.date,
      row.type,
      row.sourceNoteReviewStatus,
      row.reviewFlags.join("; "),
      row.title,
      row.sourceNoteDraftForReview,
      row.baseFrusSourceNote,
      row.facePageAddendaForReview,
      row.subject,
      row.dateTimePlace,
      row.participantsBlock,
      row.notetaker,
      row.interpreter,
      row.classificationMarking,
      row.classifiedBy,
      row.reason,
      row.declassifyOn,
      row.declassifiedBy,
      row.packetPages,
      row.actualConversationPacketPages,
      row.sourcePdfPages,
      row.pdfUrl,
      row.sourcePacketUrl
    ]
      .map(csvCell)
      .join(",")
  );
  fs.writeFileSync(
    path.join(ROOT, "reports/source-note-drafts.csv"),
    `${fields.join(",")}\n${body.join("\n")}\n`
  );
}

function writeHtml(report) {
  const cards = report.rows
    .map(
      (row) => `<article>
        <header>
          <p>#${htmlCell(row.sequence)} ${htmlCell(row.date)} ${htmlCell(row.type)} / ${htmlCell(row.packetPages)}</p>
          <h2><a href="${htmlCell(row.pdfUrl)}">${htmlCell(row.title)}</a></h2>
        </header>
        <p><strong>Status:</strong> ${htmlCell(row.sourceNoteReviewStatus)}${row.reviewFlags.length ? ` / ${htmlCell(row.reviewFlags.join(", "))}` : ""}</p>
        <h3>Draft Source Note For Review</h3>
        <pre>${htmlCell(row.sourceNoteDraftForReview)}</pre>
        <dl>
          <div><dt>Subject</dt><dd>${htmlCell(row.subject)}</dd></div>
          <div><dt>Date / Time / Place</dt><dd>${htmlCell(row.dateTimePlace)}</dd></div>
          <div><dt>Classification</dt><dd>${htmlCell(row.classificationMarking || "Review PDF")}</dd></div>
          <div><dt>Notetaker / Interpreter</dt><dd>${htmlCell([row.notetaker, row.interpreter].filter(Boolean).join(" / "))}</dd></div>
        </dl>
      </article>`
    )
    .join("\n");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Source-Note Drafts</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f6; }
      main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); }
      h2 { margin: 0; font-size: clamp(1.25rem, 2.2vw, 1.8rem); }
      h3 { margin: 18px 0 8px; font-size: 1rem; }
      a { color: #25364f; font-weight: 800; }
      .lede { max-width: 900px; color: #5f6874; font-size: 1.05rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #25364f; border-radius: 6px; }
      .actions a:nth-child(even) { color: #25364f; background: white; border: 1px solid #d7dedb; }
      .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      .summary div, article { padding: 16px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      .summary dt, dl dt { color: #5f6874; font-size: .78rem; font-weight: 900; text-transform: uppercase; }
      .summary dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.55rem; font-weight: 800; }
      article { margin-top: 12px; }
      article header p { margin: 0 0 5px; color: #5f6874; font-weight: 800; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f4f7f6; padding: 12px; border: 1px solid #d7dedb; border-radius: 6px; }
      dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 12px 0 0; }
      dl div { padding: 10px; background: #f8faf9; border: 1px solid #d7dedb; border-radius: 6px; }
      dl dd { margin: 3px 0 0; }
      @media (max-width: 760px) { .summary, dl { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Source-Note Drafts</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)} from the FRUS-style source-note stems, packet page ranges, and face-page metadata audit. These are copy-ready drafting aids, not final source notes; verify all OCR-derived face-page markings against the PDFs.</p>
      <div class="actions">
        <a href="source-note-drafts.csv">Download source-note CSV</a>
        <a href="source-note-drafts.json">Open JSON</a>
        <a href="face-page-metadata.html">Open face-page audit</a>
        <a href="../public/documents/clinton-yeltsin-core-reading-packet.pdf">Open reading packet PDF</a>
      </div>
      <dl class="summary">
        <div><dt>Drafts</dt><dd>${htmlCell(report.summary.drafts)}</dd></div>
        <div><dt>Base Source Stems</dt><dd>${htmlCell(report.summary.baseSourceStems)}</dd></div>
        <div><dt>Needs Review</dt><dd>${htmlCell(report.summary.rowsNeedingSourceNoteReview)}</dd></div>
        <div><dt>Face Addenda</dt><dd>${htmlCell(report.summary.rowsWithFacePageAddenda)}</dd></div>
      </dl>
      ${cards}
    </main>
  </body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, "reports/source-note-drafts.html"), html);
}

const records = readJson(path.join(ROOT, "data", "memcons.json"));
const faceAudit = readJson(path.join(ROOT, "reports", "face-page-metadata.json"));
const packetManifest = readJson(path.join(ROOT, "reports", "reading-packet-manifest.json"));
const rows = buildRows(records, faceAudit, packetManifest);
const report = {
  generatedAt: new Date().toISOString(),
  scope:
    "Source-note drafting packet for the 85 page-counted Clinton-Yeltsin memcons and telcons. Combines FRUS-style source-note stems with packet ranges and OCR-derived face-page metadata for verification.",
  warning:
    "Face-page metadata is OCR-derived and must be checked against the PDF image before final FRUS source-note use.",
  summary: {
    drafts: rows.length,
    baseSourceStems: rows.filter((row) => /^Source: /.test(row.baseFrusSourceNote)).length,
    rowsNeedingSourceNoteReview: rows.filter((row) => row.reviewFlags.length).length,
    rowsWithFacePageAddenda: rows.filter((row) => row.facePageAddendaForReview).length,
    rowsWithClassificationMarking: rows.filter((row) => row.classificationMarking).length,
    rowsWithNotetaker: rows.filter((row) => row.notetaker).length,
    rowsWithInterpreter: rows.filter((row) => row.interpreter).length
  },
  rows
};

fs.writeFileSync(path.join(ROOT, "reports/source-note-drafts.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(rows);
writeHtml(report);
console.log(JSON.stringify(report.summary, null, 2));
