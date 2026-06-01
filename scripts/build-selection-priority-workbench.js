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

function htmlLink(label, url) {
  const href = siteUrl(url);
  if (!href) return htmlCell(label);
  return `<a href="${htmlCell(href)}">${htmlCell(label)}</a>`;
}

function chronologySort(a, b) {
  return (
    a.sortDate.localeCompare(b.sortDate) ||
    (a.sortOrder || 0) - (b.sortOrder || 0) ||
    a.title.localeCompare(b.title)
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

function tierFor(row) {
  if (row.status === "pending") return "Hard source gap";
  if (row.selectionScore >= 100) return "Tier 1 - likely core";
  if (row.selectionScore >= 70) return "Tier 2 - strong candidate";
  if (row.selectionScore >= 45) return "Tier 3 - supporting candidate";
  return "Tier 4 - concise/confirmatory";
}

function suggestedTreatment(tier) {
  if (tier === "Tier 1 - likely core") return "Read first; strong candidate for full document treatment unless displaced by final thematic balance.";
  if (tier === "Tier 2 - strong candidate") return "Strong candidate; compare against adjacent documents in same issue cluster.";
  if (tier === "Tier 3 - supporting candidate") return "Useful support or context; consider excerpt, editorial-note use, or selection if the issue line needs continuity.";
  if (tier === "Tier 4 - concise/confirmatory") return "Likely confirmatory; keep available for chronology, annotation, or footnote support.";
  return "Do not select as a document until actual conversation pages are found; use the hard-gap packet for follow-up.";
}

function rationale(row, dossier, annotation, gap) {
  if (row.status === "pending") {
    const hooks = [];
    if ((gap?.corroboration || []).some((item) => item.kind === "Presidential Daily Diary")) hooks.push("PDD corroborates occurrence");
    if ((gap?.corroboration || []).some((item) => /Public Papers/.test(item.kind))) hooks.push("Public Papers/context hook exists");
    hooks.push(gap?.gapClass || "actual conversation text missing");
    return hooks.filter(Boolean).join("; ");
  }
  const parts = [];
  if (annotation?.suggestedTreatment) parts.push(annotation.suggestedTreatment);
  if ((dossier?.pddReferences || []).length) parts.push("PDD timing check");
  if ((dossier?.publicSameDay || []).length || (dossier?.publicNearby || []).length) parts.push("public framing available");
  if ((dossier?.sourceCopies || []).length) parts.push("source-copy control");
  if ((dossier?.strobeContext || []).length || (dossier?.naraSupport || []).length) parts.push("support/context leads");
  return parts.join("; ");
}

function buildRows(records, annotationReport, dossierReport, gapReport) {
  const annotationById = new Map((annotationReport.documentQueue || []).map((row) => [row.id, row]));
  const dossierById = new Map((dossierReport.rows || []).map((row) => [row.id, row]));
  const gapById = new Map((gapReport.rows || []).map((row) => [row.id, row]));
  return coreContacts(records).map((record, index) => {
    const annotation = annotationById.get(record.id);
    const dossier = dossierById.get(record.id) || {};
    const gap = gapById.get(record.id);
    const counted = Number.isInteger(record.pageCount);
    const base = {
      sequence: index + 1,
      id: record.id,
      date: record.date,
      type: record.type,
      status: counted ? "counted" : "pending",
      title: record.documentTitle || record.title,
      actualConversationPages: counted ? record.pageCount : "",
      packetPages: annotation?.packetPages || dossier.packetPages || "",
      pdfUrl: annotation?.pdfUrl || dossier.corePdfUrl || "",
      sourcePacketUrl: dossier.sourcePacketUrl || siteUrl(record.sourcePdfUrl || record.source?.pdfUrl || record.catalogUrl || ""),
      sourcePdfPages: record.sourcePdfPages || "",
      frusSourceNote: record.frusSourceNote || "",
      selectionScore: counted ? annotation?.annotationScore || 0 : "",
      dominantIssues: counted ? annotation?.topTopics || [] : [],
      authorityChecks: counted ? annotation?.topAuthorities || [] : [],
      pddReferences: (dossier.pddReferences || []).length,
      publicPapers: (dossier.publicSameDay || []).length + (dossier.publicNearby || []).length,
      sourceCopyControls: (dossier.sourceCopies || []).length,
      supportLeads: (dossier.strobeContext || []).length + (dossier.naraSupport || []).length,
      annotationTreatment: counted ? annotation?.suggestedTreatment || "" : "Hard source follow-up",
      hardGapClass: gap?.gapClass || "",
      decisionRemaining: counted
        ? "Compiler selection decision: include, excerpt/use in note, or retain as background after final thematic balancing."
        : "Source decision: locate released actual conversation pages before any document selection."
    };
    base.selectionTier = tierFor(base);
    base.suggestedTreatment = suggestedTreatment(base.selectionTier);
    base.rationale = rationale(base, dossier, annotation, gap);
    return base;
  });
}

function buildIssueCoverage(rows) {
  const coverage = new Map();
  for (const row of rows) {
    for (const issue of row.dominantIssues || []) {
      const label = issue.replace(/\s+\(\d+\)$/, "");
      if (!coverage.has(label)) {
        coverage.set(label, {
          issue: label,
          documents: 0,
          tier1: 0,
          tier2: 0,
          pages: 0,
          topDocuments: []
        });
      }
      const item = coverage.get(label);
      item.documents += 1;
      item.pages += Number(row.actualConversationPages || 0);
      if (row.selectionTier === "Tier 1 - likely core") item.tier1 += 1;
      if (row.selectionTier === "Tier 2 - strong candidate") item.tier2 += 1;
      item.topDocuments.push({
        sequence: row.sequence,
        date: row.date,
        title: row.title,
        tier: row.selectionTier,
        score: row.selectionScore,
        pdfUrl: row.pdfUrl
      });
    }
  }
  return [...coverage.values()]
    .map((item) => ({
      ...item,
      topDocuments: item.topDocuments
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || a.date.localeCompare(b.date))
        .slice(0, 8)
    }))
    .sort((a, b) => b.tier1 - a.tier1 || b.documents - a.documents || a.issue.localeCompare(b.issue));
}

function writeCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "status",
    "selectionTier",
    "selectionScore",
    "actualConversationPages",
    "packetPages",
    "title",
    "dominantIssues",
    "authorityChecks",
    "pddReferences",
    "publicPapers",
    "sourceCopyControls",
    "supportLeads",
    "annotationTreatment",
    "rationale",
    "suggestedTreatment",
    "decisionRemaining",
    "sourcePdfPages",
    "pdfUrl",
    "sourcePacketUrl",
    "frusSourceNote"
  ];
  const body = rows.map((row) =>
    [
      row.sequence,
      row.date,
      row.type,
      row.status,
      row.selectionTier,
      row.selectionScore,
      row.actualConversationPages,
      row.packetPages,
      row.title,
      row.dominantIssues.join("; "),
      row.authorityChecks.join("; "),
      row.pddReferences,
      row.publicPapers,
      row.sourceCopyControls,
      row.supportLeads,
      row.annotationTreatment,
      row.rationale,
      row.suggestedTreatment,
      row.decisionRemaining,
      row.sourcePdfPages,
      row.pdfUrl,
      row.sourcePacketUrl,
      row.frusSourceNote
    ]
      .map(csvCell)
      .join(",")
  );
  fs.writeFileSync(path.join(ROOT, "reports/selection-priority-workbench.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function issueLinks(docs) {
  return docs
    .slice(0, 5)
    .map((doc) => `${htmlLink(`#${doc.sequence} ${doc.date}`, doc.pdfUrl)} (${htmlCell(doc.tier)})`)
    .join("; ");
}

function buildHtml(report) {
  const tierRows = Object.entries(report.summary.byTier)
    .map(([tier, count]) => `<div><dt>${htmlCell(tier)}</dt><dd>${htmlCell(count)}</dd></div>`)
    .join("\n");
  const issueRows = report.issueCoverage
    .map(
      (item) => `<tr>
        <td>${htmlCell(item.issue)}</td>
        <td>${htmlCell(item.documents)}</td>
        <td>${htmlCell(item.tier1)}</td>
        <td>${htmlCell(item.tier2)}</td>
        <td>${htmlCell(item.pages)}</td>
        <td>${issueLinks(item.topDocuments)}</td>
      </tr>`
    )
    .join("\n");
  const rows = report.rows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.selectionTier)}</td>
        <td>${htmlCell(row.selectionScore)}</td>
        <td>${htmlCell(row.actualConversationPages)}</td>
        <td>${htmlCell(row.packetPages)}</td>
        <td>${row.pdfUrl ? htmlLink(row.title, row.pdfUrl) : htmlCell(row.title)}</td>
        <td>${htmlCell(row.dominantIssues.join("; "))}</td>
        <td>${htmlCell(row.rationale)}</td>
        <td>${htmlCell(row.decisionRemaining)}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Selection Priority Workbench</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f6; }
      main { width: min(1240px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); }
      h2 { margin-top: 34px; font-size: clamp(1.45rem, 3vw, 2.15rem); }
      a { color: #25364f; font-weight: 800; }
      .lede { max-width: 940px; color: #5f6874; font-size: 1.05rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #25364f; border-radius: 6px; }
      .actions a:nth-child(even) { color: #25364f; background: white; border: 1px solid #d7dedb; }
      .summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      .summary div { padding: 14px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5f6874; font-size: .78rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.45rem; font-weight: 800; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #25364f; font-size: .78rem; text-transform: uppercase; }
      td:nth-child(1), td:nth-child(5), td:nth-child(6), td:nth-child(7) { text-align: right; white-space: nowrap; }
      @media (max-width: 900px) { .summary { grid-template-columns: 1fr 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Selection Priority Workbench</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)} from the annotation workbench, dossier crosswalk, and hard-gap packet. Tiers are triage aids only: they are meant to focus first-pass reading and thematic balancing, not to make final FRUS selection decisions.</p>
      <div class="actions">
        <a href="selection-priority-workbench.csv">Download priority CSV</a>
        <a href="selection-priority-workbench.json">Open priority JSON</a>
        <a href="frus-selection-worksheet.csv">Open blank selection worksheet</a>
        <a href="annotation-workbench.html">Open annotation workbench</a>
        <a href="contact-dossier-crosswalk.html">Open dossier crosswalk</a>
      </div>
      <dl class="summary">
        <div><dt>Total Contacts</dt><dd>${htmlCell(report.summary.totalContacts)}</dd></div>
        <div><dt>Counted</dt><dd>${htmlCell(report.summary.countedDocuments)}</dd></div>
        <div><dt>Pending</dt><dd>${htmlCell(report.summary.pendingDocuments)}</dd></div>
        <div><dt>Pages</dt><dd>${htmlCell(report.summary.actualConversationPages)}</dd></div>
        <div><dt>Tier 1</dt><dd>${htmlCell(report.summary.byTier["Tier 1 - likely core"] || 0)}</dd></div>
      </dl>
      <h2>Tier Counts</h2>
      <dl class="summary">${tierRows}</dl>
      <h2>Issue Coverage</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Issue</th><th>Docs</th><th>Tier 1</th><th>Tier 2</th><th>Pages</th><th>Top documents</th></tr></thead>
          <tbody>${issueRows}</tbody>
        </table>
      </div>
      <h2>Selection Priority Queue</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Seq</th><th>Date</th><th>Type</th><th>Tier</th><th>Score</th><th>Pages</th><th>Packet</th><th>Document</th><th>Dominant issues</th><th>Rationale</th><th>Decision remaining</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const records = readJson(path.join(ROOT, "data", "memcons.json"));
  const annotation = readJson(path.join(ROOT, "reports", "annotation-workbench.json"));
  const dossier = readJson(path.join(ROOT, "reports", "contact-dossier-crosswalk.json"));
  const gaps = readJson(path.join(ROOT, "reports", "hard-source-gap-packet.json"));
  const rows = buildRows(records, annotation, dossier, gaps);
  const byTier = {};
  for (const row of rows) byTier[row.selectionTier] = (byTier[row.selectionTier] || 0) + 1;
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Nonbinding selection-priority triage for direct Clinton-Yeltsin memcons/telcons. Scores derive from annotation workload, issue/name density, companion-source hooks, source-copy controls, and hard-gap status.",
    summary: {
      totalContacts: rows.length,
      countedDocuments: rows.filter((row) => row.status === "counted").length,
      pendingDocuments: rows.filter((row) => row.status === "pending").length,
      actualConversationPages: rows.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
      byTier
    },
    issueCoverage: buildIssueCoverage(rows),
    rows
  };
}

const report = buildReport();
fs.writeFileSync(path.join(ROOT, "reports/selection-priority-workbench.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.rows);
fs.writeFileSync(path.join(ROOT, "reports/selection-priority-workbench.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
