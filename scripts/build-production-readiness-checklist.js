const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "reports");
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
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function htmlLink(label, url) {
  const href = siteUrl(url);
  if (!href) return htmlCell(label);
  return `<a href="${htmlCell(href)}">${htmlCell(label)}</a>`;
}

function chronologySort(a, b) {
  return (
    a.sortDate.localeCompare(b.sortDate) ||
    (a.sortOrder || 0) - (b.sortOrder || 0) ||
    (a.documentTitle || a.title).localeCompare(b.documentTitle || b.title)
  );
}

function coreContacts(records) {
  return records
    .filter(
      (record) =>
        record.chapter?.name === "Clinton-Yeltsin Chronology" &&
        (record.type === "Memcon" || record.type === "Telcon") &&
        record.potentialFrusDocument !== false
    )
    .sort(chronologySort);
}

function byId(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

function statusFromValidation(record, validation) {
  if (!Number.isInteger(record.pageCount)) return "Pending source text";
  if (!validation) return "Needs PDF validation";
  if (validation.issue) return `Needs PDF/provenance repair: ${validation.issue}`;
  if (validation.hasLocalDerivativePdf && validation.fileExists) return "PDF/provenance mechanically valid";
  return "Derivative PDF missing";
}

function provenanceStatus(record, validation, manifest) {
  if (!Number.isInteger(record.pageCount)) return "No derivative PDF until actual conversation pages are found";
  if (!validation || validation.issue) return "Provenance not verified";
  if (Number.isInteger(validation.markerPage)) return `Marker/provenance sheet appended from source page ${validation.markerPage}`;
  if (manifest?.provenanceSheetPacketPage) return `Provenance sheet in packet page ${manifest.provenanceSheetPacketPage}`;
  return "No separate marker page recorded for this derivative";
}

function readinessBucket(record, validation, sourceNote, facePage) {
  if (!Number.isInteger(record.pageCount)) return "Hard source gap";
  if (!validation || validation.issue || !validation.fileExists) return "PDF/provenance repair";
  if (sourceNote?.sourceNoteReviewStatus === "Needs source-note review" || facePage?.reviewStatus === "Review fields") {
    return "Ready to read; source-note review";
  }
  return "Ready for selection reading";
}

function nextAction(bucket, row, gap) {
  if (bucket === "Hard source gap") {
    return gap?.nextAction || "Use the hard-source gap packet to locate released actual conversation pages before document selection.";
  }
  if (bucket === "PDF/provenance repair") {
    return "Repair or revalidate the derivative PDF and provenance sheet before compiler use.";
  }
  if (row.sourceNoteStatus === "Needs source-note review" || row.facePageStatus === "Review fields") {
    const parts = [];
    if (row.sourceNoteFlags.length) parts.push(`source-note flags: ${row.sourceNoteFlags.join("; ")}`);
    if (row.facePageMissingFields.length) parts.push(`face-page gaps: ${row.facePageMissingFields.join("; ")}`);
    return `Verify the first page and source-note addenda against the derivative PDF${parts.length ? ` (${parts.join(" | ")})` : ""}.`;
  }
  if (row.annotationTreatment === "Heavy annotation review") {
    return "Complete heavy annotation review, then make the include/excerpt/background decision.";
  }
  if (/Tier 1|Tier 2/.test(row.selectionTier)) {
    return "Make final selection decision against thematic balance and chapter limits.";
  }
  return "Keep in the chronological packet for selection comparison, annotation support, or contextual use.";
}

function buildRows(inputs) {
  const records = coreContacts(inputs.records);
  const validationById = byId(inputs.validation.rows);
  const sourceNoteById = byId(inputs.sourceNotes.rows);
  const facePageById = byId(inputs.facePages.rows);
  const annotationById = byId(inputs.annotation.documentQueue);
  const dossierById = byId(inputs.dossier.rows);
  const gapById = byId(inputs.gaps.rows);
  const selectionById = byId(inputs.selection.rows);
  const manifestById = byId(inputs.manifest.rows);

  return records.map((record, index) => {
    const validation = validationById.get(record.id);
    const sourceNote = sourceNoteById.get(record.id);
    const facePage = facePageById.get(record.id);
    const annotation = annotationById.get(record.id);
    const dossier = dossierById.get(record.id) || {};
    const gap = gapById.get(record.id);
    const selection = selectionById.get(record.id);
    const manifest = manifestById.get(record.id);
    const counted = Number.isInteger(record.pageCount);
    const bucket = readinessBucket(record, validation, sourceNote, facePage);

    const row = {
      sequence: index + 1,
      id: record.id,
      date: record.date,
      type: record.type,
      title: record.documentTitle || record.title,
      readinessBucket: bucket,
      actualConversationPages: counted ? record.pageCount : "",
      packetPages: manifest?.packetPageStart ? `${manifest.packetPageStart}-${manifest.packetPageEnd}` : annotation?.packetPages || dossier.packetPages || "",
      derivativePdfUrl: counted ? siteUrl(record.pdfUrl) : "",
      sourcePacketUrl: dossier.sourcePacketUrl || siteUrl(record.sourcePdfUrl || record.source?.pdfUrl || record.catalogUrl || ""),
      sourcePdfPages: record.sourcePdfPages || dossier.sourcePdfPages || "",
      extractionStatus: statusFromValidation(record, validation),
      provenanceStatus: provenanceStatus(record, validation, manifest),
      sourceNoteStatus: counted ? sourceNote?.sourceNoteReviewStatus || "Needs source-note review" : "Pending source text",
      sourceNoteFlags: counted ? sourceNote?.reviewFlags || [] : [],
      facePageStatus: counted ? facePage?.reviewStatus || "Review fields" : "Pending source text",
      facePageMissingFields: counted ? facePage?.missingFields || [] : [],
      annotationTreatment: counted ? annotation?.suggestedTreatment || "" : "Hard source follow-up",
      selectionTier: selection?.selectionTier || (counted ? "" : "Hard source gap"),
      selectionScore: selection?.selectionScore || "",
      dominantIssues: selection?.dominantIssues || annotation?.topTopics || [],
      authorityChecks: annotation?.topAuthorities || selection?.authorityChecks || [],
      pddReferences: (dossier.pddReferences || []).length,
      publicPapers: (dossier.publicSameDay || []).length + (dossier.publicNearby || []).length,
      sourceCopyControls: (dossier.sourceCopies || []).length,
      supportLeads: (dossier.strobeContext || []).length + (dossier.naraSupport || []).length,
      hardGapClass: gap?.gapClass || "",
      frusSourceNote: record.frusSourceNote || sourceNote?.baseFrusSourceNote || dossier.frusSourceNote || ""
    };
    row.nextAction = nextAction(bucket, row, gap);
    return row;
  });
}

function countBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = row[field] || "Unspecified";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildSummary(rows, inputs) {
  const counted = rows.filter((row) => row.actualConversationPages !== "");
  return {
    totalContacts: rows.length,
    countedDocuments: counted.length,
    pendingDocuments: rows.length - counted.length,
    actualConversationPages: counted.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
    pdfValidationIssues: inputs.validation.summary.rowsWithIssues,
    sourceNoteReviewNeeded: rows.filter((row) => row.sourceNoteStatus === "Needs source-note review").length,
    facePageReviewNeeded: rows.filter((row) => row.facePageStatus === "Review fields").length,
    heavyAnnotationRows: rows.filter((row) => row.annotationTreatment === "Heavy annotation review").length,
    tierOneRows: rows.filter((row) => row.selectionTier === "Tier 1 - likely core").length,
    tierTwoRows: rows.filter((row) => row.selectionTier === "Tier 2 - strong candidate").length,
    pddRows: rows.filter((row) => row.pddReferences > 0).length,
    publicPapersRows: rows.filter((row) => row.publicPapers > 0).length,
    sourceCopyRows: rows.filter((row) => row.sourceCopyControls > 0).length,
    supportLeadRows: rows.filter((row) => row.supportLeads > 0).length,
    byReadinessBucket: countBy(rows, "readinessBucket")
  };
}

function writeCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "readinessBucket",
    "actualConversationPages",
    "packetPages",
    "title",
    "extractionStatus",
    "provenanceStatus",
    "sourceNoteStatus",
    "sourceNoteFlags",
    "facePageStatus",
    "facePageMissingFields",
    "annotationTreatment",
    "selectionTier",
    "selectionScore",
    "dominantIssues",
    "authorityChecks",
    "pddReferences",
    "publicPapers",
    "sourceCopyControls",
    "supportLeads",
    "hardGapClass",
    "nextAction",
    "sourcePdfPages",
    "derivativePdfUrl",
    "sourcePacketUrl",
    "frusSourceNote"
  ];
  const body = rows.map((row) =>
    fields
      .map((field) => csvCell(row[field]))
      .join(",")
  );
  fs.writeFileSync(path.join(REPORTS_DIR, "production-readiness-checklist.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function buildHtml(report) {
  const summaryRows = [
    ["Contacts", report.summary.totalContacts],
    ["Counted", report.summary.countedDocuments],
    ["Pending", report.summary.pendingDocuments],
    ["Pages", report.summary.actualConversationPages],
    ["PDF Issues", report.summary.pdfValidationIssues],
    ["Source-Note Review", report.summary.sourceNoteReviewNeeded],
    ["Face-Page Review", report.summary.facePageReviewNeeded],
    ["Heavy Annotation", report.summary.heavyAnnotationRows],
    ["Tier 1", report.summary.tierOneRows],
    ["Tier 2", report.summary.tierTwoRows]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");

  const bucketRows = Object.entries(report.summary.byReadinessBucket)
    .map(([bucket, count]) => `<div><dt>${htmlCell(bucket)}</dt><dd>${htmlCell(count)}</dd></div>`)
    .join("\n");

  const tableRows = report.rows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.readinessBucket)}</td>
        <td>${htmlCell(row.actualConversationPages)}</td>
        <td>${htmlCell(row.packetPages)}</td>
        <td>${row.derivativePdfUrl ? htmlLink(row.title, row.derivativePdfUrl) : htmlCell(row.title)}</td>
        <td>${htmlCell(row.extractionStatus)}<br><span>${htmlCell(row.provenanceStatus)}</span></td>
        <td>${htmlCell(row.sourceNoteStatus)}${row.sourceNoteFlags.length ? `<br><span>${htmlCell(row.sourceNoteFlags.join("; "))}</span>` : ""}</td>
        <td>${htmlCell(row.facePageStatus)}${row.facePageMissingFields.length ? `<br><span>${htmlCell(row.facePageMissingFields.join("; "))}</span>` : ""}</td>
        <td>${htmlCell(row.annotationTreatment)}<br><span>${htmlCell(row.selectionTier)}</span></td>
        <td>${htmlCell(row.pddReferences)} / ${htmlCell(row.publicPapers)} / ${htmlCell(row.sourceCopyControls)} / ${htmlCell(row.supportLeads)}</td>
        <td>${htmlCell(row.nextAction)}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Production Readiness Checklist</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7f8; }
      main { width: min(1320px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.65rem); }
      h2 { margin-top: 34px; font-size: clamp(1.4rem, 3vw, 2.05rem); }
      a { color: #243d63; font-weight: 800; }
      .lede { max-width: 980px; color: #5b6470; font-size: 1.04rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #243d63; border-radius: 6px; }
      .actions a:nth-child(even) { color: #243d63; background: white; border: 1px solid #d7dedb; }
      dl.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl.summary div { padding: 13px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5b6470; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.42rem; font-weight: 800; }
      .note { max-width: 980px; padding: 12px 14px; background: #fffaf0; border: 1px solid #ead8aa; border-radius: 8px; color: #645233; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #243d63; font-size: .76rem; text-transform: uppercase; white-space: nowrap; }
      td { min-width: 95px; }
      td:nth-child(1), td:nth-child(5), td:nth-child(6), td:nth-child(12) { text-align: right; white-space: nowrap; }
      td:nth-child(7) { min-width: 260px; }
      td:nth-child(13) { min-width: 320px; }
      span { color: #687483; font-size: .9em; }
      @media (max-width: 900px) { dl.summary { grid-template-columns: 1fr 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Production Readiness Checklist</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This checklist consolidates the current production state for every direct Clinton-Yeltsin memcon and telcon: extraction/provenance, source-note review, face-page metadata, annotation workload, selection tier, companion evidence, and the next action still owed.</p>
      <div class="actions">
        <a href="production-readiness-checklist.csv">Download checklist CSV</a>
        <a href="production-readiness-checklist.json">Open checklist JSON</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
        <a href="selection-priority-workbench.html">Open selection priorities</a>
        <a href="source-note-drafts.html">Open source-note drafts</a>
        <a href="face-page-metadata.html">Open face-page audit</a>
        <a href="annotation-workbench.html">Open annotation workbench</a>
        <a href="hard-source-gap-packet.html">Open hard-gap packet</a>
      </div>
      <p class="note">This is a production-control checklist, not a claim that all compiler work is complete. It intentionally keeps source-note review, face-page review, and annotation work visible even when the underlying derivative PDF has passed mechanical validation.</p>
      <dl class="summary">${summaryRows}</dl>
      <h2>Readiness Buckets</h2>
      <dl class="summary">${bucketRows}</dl>
      <h2>Document Queue</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Seq</th><th>Date</th><th>Type</th><th>Readiness</th><th>Pages</th><th>Packet</th><th>Document</th><th>PDF / provenance</th><th>Source note</th><th>Face page</th><th>Annotation / selection</th><th>PDD / public / copy / support</th><th>Next action</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const inputs = {
    records: readJson(path.join(ROOT, "data", "memcons.json")),
    validation: readJson(path.join(REPORTS_DIR, "extracted-pdf-validation.json")),
    sourceNotes: readJson(path.join(REPORTS_DIR, "source-note-drafts.json")),
    facePages: readJson(path.join(REPORTS_DIR, "face-page-metadata.json")),
    annotation: readJson(path.join(REPORTS_DIR, "annotation-workbench.json")),
    dossier: readJson(path.join(REPORTS_DIR, "contact-dossier-crosswalk.json")),
    gaps: readJson(path.join(REPORTS_DIR, "hard-source-gap-packet.json")),
    selection: readJson(path.join(REPORTS_DIR, "selection-priority-workbench.json")),
    manifest: readJson(path.join(REPORTS_DIR, "reading-packet-manifest.json"))
  };
  const rows = buildRows(inputs);
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Production-readiness checklist for direct Clinton-Yeltsin memcons/telcons in the FRUS 1993-2000, Volume XVIII compiler packet.",
    summary: buildSummary(rows, inputs),
    rows
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "production-readiness-checklist.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.rows);
fs.writeFileSync(path.join(REPORTS_DIR, "production-readiness-checklist.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
