const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ascii(value) {
  return String(value || "")
    .replace(/\f/g, "")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function pageSum(records) {
  return records.reduce((sum, record) => sum + (Number.isInteger(record.pageCount) ? record.pageCount : 0), 0);
}

function candidateConversationRecords(records) {
  return records.filter(
    (record) =>
      record.chapter.name === "Clinton-Yeltsin Chronology" &&
      (record.type === "Memcon" || record.type === "Telcon") &&
      record.potentialFrusDocument !== false
  );
}

function siteUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\.\//, ""), SITE_BASE_URL).href;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function markdownCell(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function markdownLink(label, url) {
  const href = siteUrl(url);
  if (!href) return "";
  return `[${markdownCell(label)}](${href})`;
}

function htmlCell(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlLink(label, url) {
  const href = siteUrl(url);
  if (!href) return "";
  return `<a href="${htmlCell(href)}">${htmlCell(label)}</a>`;
}

function compactText(value, maxLength = 96) {
  const text = ascii(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function chronologySort(a, b) {
  return (
    a.sortDate.localeCompare(b.sortDate) ||
    (a.sortOrder || 0) - (b.sortOrder || 0) ||
    a.title.localeCompare(b.title)
  );
}

function sourceLabel(record) {
  return record.source?.caseNumber || record.source?.name || record.naid || "Unknown";
}

function sourcePacketUrl(record) {
  return record.sourcePdfUrl || record.source?.pdfUrl || record.catalogUrl || "";
}

function derivativePdfUrl(record) {
  return /^public\/documents\//.test(record.pdfUrl || "") ? siteUrl(record.pdfUrl) : "";
}

function sourceCopyUrls(record, field) {
  return (record[field] || []).map((file) => siteUrl(file.url || file.id || "")).filter(Boolean).join(" | ");
}

function compilerAction(record) {
  if (Number.isInteger(record.pageCount)) {
    return (
      record.extractionStatus ||
      "Read for FRUS selection; face-page classification and distribution markings still require final compiler review."
    );
  }
  return (
    record.extractionStatus ||
    "Find released actual conversation pages; keep uncounted until the memcon or telcon text is located and page-verified."
  );
}

function buildCompilerChronologyRows(records) {
  return candidateConversationRecords(records)
    .sort(chronologySort)
    .map((record, index) => ({
      order: index + 1,
      id: record.id,
      date: record.date,
      type: record.type,
      title: record.documentTitle || record.title,
      status: Number.isInteger(record.pageCount) ? "counted" : "pending extent",
      actualConversationPages: Number.isInteger(record.pageCount) ? record.pageCount : "",
      countStatus: record.countStatus || (Number.isInteger(record.pageCount) ? "Counted" : "Extent pending"),
      source: sourceLabel(record),
      sourcePdfPages: record.sourcePdfPages || "",
      markerPage: record.markerPage || "",
      localDerivativePdf: derivativePdfUrl(record),
      sourcePacketUrl: siteUrl(sourcePacketUrl(record)),
      catalogUrl: siteUrl(record.catalogUrl || ""),
      googleDriveFiles: sourceCopyUrls(record, "googleDriveFiles"),
      strobeFiles: sourceCopyUrls(record, "strobeFiles"),
      frusSourceNote: record.frusSourceNote || "",
      extractionStatus: record.extractionStatus || "",
      compilerAction: compilerAction(record)
    }));
}

function buildCompilerChronologyCsv(records) {
  const rows = buildCompilerChronologyRows(records);
  const fields = [
    "order",
    "date",
    "type",
    "status",
    "actualConversationPages",
    "documentTitle",
    "source",
    "sourcePdfPages",
    "markerPage",
    "localDerivativePdf",
    "sourcePacketUrl",
    "catalogUrl",
    "googleDriveFiles",
    "strobeFiles",
    "frusSourceNote",
    "extractionStatus",
    "compilerAction"
  ];
  const body = rows.map((row) =>
    [
      row.order,
      row.date,
      row.type,
      row.status,
      row.actualConversationPages,
      row.title,
      row.source,
      row.sourcePdfPages,
      row.markerPage,
      row.localDerivativePdf,
      row.sourcePacketUrl,
      row.catalogUrl,
      row.googleDriveFiles,
      row.strobeFiles,
      row.frusSourceNote,
      row.extractionStatus,
      row.compilerAction
    ]
      .map(csvCell)
      .join(",")
  );
  return `${fields.join(",")}\n${body.join("\n")}\n`;
}

function worksheetThemes(row) {
  const text = `${row.title} ${row.extractionStatus} ${row.frusSourceNote}`.toLowerCase();
  const tags = [];
  if (/nato|partnership for peace|helsinki|paris|denver/i.test(text)) tags.push("NATO / European security");
  if (/ukraine|kravchuk|trilateral|nuclear|security issues/i.test(text)) tags.push("Ukraine / nuclear security");
  if (/kosovo|serbia|milosevic|balkans/i.test(text)) tags.push("Kosovo / Balkans");
  if (/chechnya|caucasus/i.test(text)) tags.push("Chechnya / internal Russia");
  if (/iraq|saddam/i.test(text)) tags.push("Iraq");
  if (/election|zyuganov|communist|democracy/i.test(text)) tags.push("Russian politics / elections");
  if (/economic|reform|imf|assistance|aid|loan|market/i.test(text)) tags.push("Economic reform / assistance");
  if (/arms|abm|start|missile|nuclear/i.test(text)) tags.push("Arms control");
  return [...new Set(tags)].join("; ");
}

function buildFrusSelectionWorksheetCsv(records) {
  const rows = buildCompilerChronologyRows(records);
  const fields = [
    "sequence",
    "includeInVolume",
    "proposedDocumentNumber",
    "editorialTreatment",
    "priority",
    "date",
    "type",
    "actualConversationPages",
    "documentTitle",
    "suggestedThemes",
    "source",
    "sourcePdfPages",
    "markerPage",
    "localDerivativePdf",
    "sourcePacketUrl",
    "frusSourceNote",
    "extractionQaStatus",
    "declassificationIssues",
    "annotationNeeds",
    "compilerNotes"
  ];
  const body = rows.map((row) =>
    [
      row.order,
      "",
      "",
      row.status === "counted" ? "Document candidate" : "Research gap / possible editorial note",
      row.status === "counted" ? "Core chronology" : "Hard source gap",
      row.date,
      row.type,
      row.actualConversationPages,
      row.title,
      worksheetThemes(row),
      row.source,
      row.sourcePdfPages,
      row.markerPage,
      row.localDerivativePdf,
      row.sourcePacketUrl,
      row.frusSourceNote,
      row.status === "counted"
        ? "PDF extent validated separately; final face-page markings still require compiler review"
        : "No extracted PDF; actual conversation pages not located",
      "",
      "",
      row.compilerAction
    ]
      .map(csvCell)
      .join(",")
  );
  return `${fields.join(",")}\n${body.join("\n")}\n`;
}

function buildConsolidated(rows) {
  const counted = rows.filter((row) => row.status === "counted");
  const memcons = counted.filter((row) => row.type === "Memcon");
  const telcons = counted.filter((row) => row.type === "Telcon");
  return {
    potentialDocuments: rows.length,
    countedDocuments: counted.length,
    pendingDocuments: rows.length - counted.length,
    totalConversationPages: counted.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
    totalMemconPages: memcons.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
    totalTelconPages: telcons.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0)
  };
}

function buildCompilerStartHereMarkdown(records) {
  const rows = buildCompilerChronologyRows(records);
  const counted = rows.filter((row) => row.status === "counted");
  const pending = rows.filter((row) => row.status !== "counted");
  const consolidated = buildConsolidated(rows);
  const extractedDerivativePdfs = candidateConversationRecords(records).filter(
    (record) => Number.isInteger(record.pageCount) && /^public\/documents\//.test(record.pdfUrl || "")
  ).length;
  const now = new Date().toISOString();
  const lines = [
    "# FRUS Compiler Start-Here Packet",
    "",
    `Generated: ${now}`,
    "",
    "Scope: Clinton-Yeltsin memcons and telcons for FRUS 1993-2000, Volume XVIII, Russia. Page counts include only actual conversation pages; administrative sheets, briefing material, duplicate packet copies, and withdrawal sheets are excluded.",
    "",
    "## Core Counts",
    "",
    `- Potential Clinton-Yeltsin memcons/telcons: ${consolidated.potentialDocuments}`,
    `- Page-counted documents: ${consolidated.countedDocuments}`,
    `- Pending extent records: ${consolidated.pendingDocuments}`,
    `- Actual conversation pages: ${consolidated.totalConversationPages}`,
    `- Memcon pages: ${consolidated.totalMemconPages}`,
    `- Telcon pages: ${consolidated.totalTelconPages}`,
    `- Extracted derivative PDFs: ${extractedDerivativePdfs}`,
    "",
    "## How To Use This Packet",
    "",
    "1. Start with the page-counted reading order below; each PDF should contain only the actual memcon/telcon pages plus the source marker page at the end.",
    "2. Use the CSV export for spreadsheet sorting, selection notes, and handoff tracking.",
    "3. Treat the pending queue as the hard archival follow-up list; do not count those records until actual released conversation pages are found.",
    "4. Use the site record rows for full source-note ledgers, duplicate-copy notes, and source links.",
    "",
    "## Page-Counted Reading Order",
    "",
    "| Seq | Date | Type | Pages | Document | Source | PDF | Source pages |",
    "| ---: | --- | --- | ---: | --- | --- | --- | --- |",
    ...counted.map((row) =>
      [
        `| ${row.order}`,
        markdownCell(row.date),
        markdownCell(row.type),
        row.actualConversationPages,
        markdownCell(compactText(row.title, 120)),
        markdownCell(row.source),
        markdownLink("PDF", row.localDerivativePdf),
        `${markdownCell(row.sourcePdfPages)} |`
      ].join(" | ")
    ),
    "",
    "## Pending Extent Queue",
    "",
    "| Seq | Date | Type | Document | Source | Known source-page problem | Action |",
    "| ---: | --- | --- | --- | --- | --- | --- |",
    ...pending.map((row) =>
      [
        `| ${row.order}`,
        markdownCell(row.date),
        markdownCell(row.type),
        markdownCell(compactText(row.title, 110)),
        markdownCell(row.source),
        markdownCell(row.sourcePdfPages || row.countStatus),
        `${markdownCell(compactText(row.compilerAction, 150))} |`
      ].join(" | ")
    ),
    "",
    "## Companion Files",
    "",
    "- [Draft chronological chapter outline](chronological-chapter-outline.html)",
    "- [Combined reading packet PDF](../public/documents/clinton-yeltsin-core-reading-packet.pdf)",
    "- [Contact dossier crosswalk](contact-dossier-crosswalk.html)",
    "- [Hard-source gap follow-up packet](hard-source-gap-packet.html)",
    "- [Topic and name index](topic-index.html)",
    "- [Selection-priority workbench](selection-priority-workbench.html)",
    "- [Page-budget scenarios](page-budget-scenarios.html)",
    "- [Thematic selection matrix](thematic-selection-matrix.html)",
    "- [Production-readiness checklist](production-readiness-checklist.html)",
    "- [Annotation workbench](annotation-workbench.html)",
    "- [Face-page metadata audit](face-page-metadata.html)",
    "- [Source-note drafting packet](source-note-drafts.html)",
    "- [Source-note element audit](source-note-element-audit.html)",
    "- [Reading packet manifest](reading-packet-manifest.json)",
    "- [Reading packet TOC CSV](reading-packet-toc.csv)",
    "- [Spreadsheet chronology](compiler-document-chronology.csv)",
    "- [FRUS selection worksheet](frus-selection-worksheet.csv)",
    "- [Document page tallies](document-page-tallies.json)",
    "- [Extracted PDF validation](extracted-pdf-validation.json)",
    "- [Compiler risk audit](compiler-risk-audit.json)",
    "- [Source-note style audit](frus-source-note-style-audit.json)"
  ];
  return `${lines.join("\n")}\n`;
}

function buildCompilerStartHereHtml(records) {
  const rows = buildCompilerChronologyRows(records);
  const counted = rows.filter((row) => row.status === "counted");
  const pending = rows.filter((row) => row.status !== "counted");
  const consolidated = buildConsolidated(rows);
  const extractedDerivativePdfs = candidateConversationRecords(records).filter(
    (record) => Number.isInteger(record.pageCount) && /^public\/documents\//.test(record.pdfUrl || "")
  ).length;
  const now = new Date().toISOString();
  const countRows = [
    ["Potential memcons/telcons", consolidated.potentialDocuments],
    ["Page-counted documents", consolidated.countedDocuments],
    ["Pending extent records", consolidated.pendingDocuments],
    ["Actual conversation pages", consolidated.totalConversationPages],
    ["Memcon pages", consolidated.totalMemconPages],
    ["Telcon pages", consolidated.totalTelconPages],
    ["Extracted derivative PDFs", extractedDerivativePdfs]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");
  const countedRows = counted
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.order)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.actualConversationPages)}</td>
        <td>${htmlCell(row.title)}</td>
        <td>${htmlCell(row.source)}</td>
        <td>${htmlLink("PDF", row.localDerivativePdf)}</td>
        <td>${htmlCell(row.sourcePdfPages)}</td>
      </tr>`
    )
    .join("\n");
  const pendingRows = pending
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.order)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.title)}</td>
        <td>${htmlCell(row.source)}</td>
        <td>${htmlCell(row.sourcePdfPages || row.countStatus)}</td>
        <td>${htmlCell(row.compilerAction)}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Compiler Start-Here Packet</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f6; }
      main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); }
      h2 { margin-top: 34px; font-size: clamp(1.5rem, 3vw, 2.2rem); }
      a { color: #25364f; font-weight: 800; }
      .lede { max-width: 850px; color: #5f6874; font-size: 1.05rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #25364f; border-radius: 6px; }
      .actions a:nth-child(even) { color: #25364f; background: white; border: 1px solid #d7dedb; }
      dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl div { padding: 14px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5f6874; font-size: .78rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.55rem; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #25364f; font-size: .78rem; text-transform: uppercase; }
      td:nth-child(1), td:nth-child(4) { text-align: right; white-space: nowrap; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      @media (max-width: 760px) { dl { grid-template-columns: 1fr 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Compiler Start-Here Packet</h1>
      <p class="lede">Generated ${htmlCell(now)}. This packet gives the chronological Clinton-Yeltsin memcon/telcon spine for FRUS 1993-2000, Volume XVIII, with actual conversation page counts, extracted PDFs, source-page ranges, and hard pending gaps.</p>
      <div class="actions">
        <a href="chronological-chapter-outline.html">Open chapter outline</a>
        <a href="../public/documents/clinton-yeltsin-core-reading-packet.pdf">Open reading packet PDF</a>
        <a href="contact-dossier-crosswalk.html">Open dossier crosswalk</a>
        <a href="hard-source-gap-packet.html">Open hard-gap packet</a>
        <a href="topic-index.html">Open topic index</a>
        <a href="selection-priority-workbench.html">Open selection priorities</a>
        <a href="page-budget-scenarios.html">Open page budgets</a>
        <a href="thematic-selection-matrix.html">Open thematic matrix</a>
        <a href="production-readiness-checklist.html">Open production checklist</a>
        <a href="annotation-workbench.html">Open annotation workbench</a>
        <a href="face-page-metadata.html">Open face-page audit</a>
        <a href="source-note-drafts.html">Open source-note drafts</a>
        <a href="source-note-element-audit.html">Open source-note elements</a>
        <a href="reading-packet-manifest.json">Open packet manifest</a>
        <a href="reading-packet-toc.csv">Download packet TOC</a>
        <a href="compiler-document-chronology.csv">Download chronology CSV</a>
        <a href="frus-selection-worksheet.csv">Download selection worksheet</a>
        <a href="compiler-start-here.md">Open Markdown packet</a>
        <a href="extracted-pdf-validation.json">Open PDF validation</a>
        <a href="document-page-tallies.json">Open page tallies JSON</a>
        <a href="compiler-risk-audit.json">Open risk audit JSON</a>
      </div>
      <dl>${countRows}</dl>
      <h2>Page-Counted Reading Order</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Seq</th><th>Date</th><th>Type</th><th>Pages</th><th>Document</th><th>Source</th><th>PDF</th><th>Source pages</th></tr></thead>
          <tbody>${countedRows}</tbody>
        </table>
      </div>
      <h2>Pending Extent Queue</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Seq</th><th>Date</th><th>Type</th><th>Document</th><th>Source</th><th>Known source-page problem</th><th>Action</th></tr></thead>
          <tbody>${pendingRows}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

const records = readJson(path.join(ROOT, "data", "memcons.json"));
const candidateRecords = candidateConversationRecords(records);
const reportsDir = path.join(ROOT, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "compiler-document-chronology.csv"), buildCompilerChronologyCsv(records));
fs.writeFileSync(path.join(reportsDir, "frus-selection-worksheet.csv"), buildFrusSelectionWorksheetCsv(records));
fs.writeFileSync(path.join(reportsDir, "compiler-start-here.md"), buildCompilerStartHereMarkdown(records));
fs.writeFileSync(path.join(reportsDir, "compiler-start-here.html"), buildCompilerStartHereHtml(records));
console.log(
  JSON.stringify(
    {
      records: records.length,
      potentialDocuments: candidateRecords.length,
      countedDocuments: candidateRecords.filter((record) => Number.isInteger(record.pageCount)).length,
      pendingDocuments: candidateRecords.filter((record) => !Number.isInteger(record.pageCount)).length,
      totalConversationPages: pageSum(candidateRecords),
      outputs: [
        "reports/compiler-start-here.html",
        "reports/compiler-start-here.md",
        "reports/compiler-document-chronology.csv",
        "reports/frus-selection-worksheet.csv"
      ]
    },
    null,
    2
  )
);
