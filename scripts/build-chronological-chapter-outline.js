const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "reports");
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

const PHASES = [
  {
    id: "opening-channel-vancouver-tokyo",
    label: "Opening channel, Vancouver, and Tokyo",
    dateStart: "1993-01-20",
    dateEnd: "1993-07-31",
    narrativeUse:
      "Establishes the Clinton-Yeltsin relationship, Vancouver aid package, early security agenda, and G-7 framing."
  },
  {
    id: "ukraine-pfp-and-1994-balance",
    label: "Ukraine, Partnership for Peace, and the 1994 balance",
    dateStart: "1993-08-01",
    dateEnd: "1994-12-31",
    narrativeUse:
      "Covers Ukraine nuclear settlement, early NATO/PfP management, Russian politics, and the shift from aid optimism to strategic friction."
  },
  {
    id: "1995-summits-reform-and-nato-pressure",
    label: "1995 summits, reform assistance, and NATO pressure",
    dateStart: "1995-01-01",
    dateEnd: "1995-12-31",
    narrativeUse:
      "Tracks the Moscow, Halifax, Hyde Park, and New York sequence as economic reform, Chechnya, Bosnia, arms control, and NATO enlargement converge."
  },
  {
    id: "1996-election-and-enlargement-management",
    label: "1996 election and enlargement management",
    dateStart: "1996-01-01",
    dateEnd: "1996-12-31",
    narrativeUse:
      "Captures the Russian election year, Clinton support for Yeltsin, NATO timing, and post-election attempts to stabilize the relationship."
  },
  {
    id: "1997-helsinki-founding-act-and-denver",
    label: "1997 Helsinki, Founding Act, and Denver",
    dateStart: "1997-01-01",
    dateEnd: "1997-12-31",
    narrativeUse:
      "Centers on Helsinki, NATO-Russia Founding Act diplomacy, Denver, arms-control bargaining, and institutionalizing the post-Cold War settlement."
  },
  {
    id: "1998-crisis-and-succession-uncertainty",
    label: "1998 financial crisis and succession uncertainty",
    dateStart: "1998-01-01",
    dateEnd: "1998-12-31",
    narrativeUse:
      "Follows economic crisis, weakened Yeltsin authority, Iraq, Kosovo buildup, and the late-1990s erosion of the bilateral bargain."
  },
  {
    id: "1999-kosovo-arms-control-and-transfer",
    label: "1999 Kosovo, arms control, and transfer of power",
    dateStart: "1999-01-01",
    dateEnd: "1999-12-31",
    narrativeUse:
      "Documents the Kosovo war, NATO-Russia rupture and repair attempts, arms-control strain, economic issues, and Yeltsin's final calls as president."
  },
  {
    id: "2000-coda",
    label: "Post-presidential coda",
    dateStart: "2000-01-01",
    dateEnd: "2000-12-31",
    narrativeUse:
      "Keeps the located 2000 former-President Yeltsin lead visible as a follow-up source problem rather than a counted document."
  }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function siteUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\.\//, ""), SITE_BASE_URL).href;
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

function cleanIssue(issue) {
  return String(issue || "").replace(/\s+\(\d+\)$/, "");
}

function issueHitCount(issue) {
  const match = String(issue || "").match(/\((\d+)\)$/);
  return match ? Number(match[1]) : 1;
}

function phaseForDate(date) {
  return PHASES.find((phase) => date >= phase.dateStart && date <= phase.dateEnd) || PHASES[PHASES.length - 1];
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function medianByType(rows) {
  const counted = rows.filter((row) => row.status === "counted");
  const medians = {};
  for (const type of [...new Set(counted.map((row) => row.type))]) {
    medians[type] = median(counted.filter((row) => row.type === type).map((row) => Number(row.actualConversationPages)));
  }
  return medians;
}

function countIssues(rows) {
  const map = new Map();
  for (const row of rows) {
    for (const issue of row.dominantIssues || []) {
      const label = cleanIssue(issue);
      const entry = map.get(label) || { issue: label, documents: 0, hitScore: 0, pages: 0 };
      entry.documents += 1;
      entry.hitScore += issueHitCount(issue);
      entry.pages += Number(row.actualConversationPages || 0);
      map.set(label, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.hitScore - a.hitScore || b.documents - a.documents || b.pages - a.pages || a.issue.localeCompare(b.issue));
}

function tierCounts(rows) {
  return rows.reduce((acc, row) => {
    acc[row.selectionTier] = (acc[row.selectionTier] || 0) + 1;
    return acc;
  }, {});
}

function summarizePhase(phase, rows, medians) {
  const documents = rows.filter((row) => phaseForDate(row.date).id === phase.id);
  const counted = documents.filter((row) => row.status === "counted");
  const pending = documents.filter((row) => row.status === "pending");
  const issues = countIssues(counted);
  const anchors = counted
    .filter((row) => row.selectionTier === "Tier 1 - likely core" || row.selectionTier === "Tier 2 - strong candidate")
    .sort((a, b) => Number(b.selectionScore || 0) - Number(a.selectionScore || 0) || Number(b.actualConversationPages || 0) - Number(a.actualConversationPages || 0))
    .slice(0, 8);
  const estimatedGapPages = pending.reduce((sum, row) => sum + Math.round(medians[row.type] || 0), 0);
  return {
    ...phase,
    totalContacts: documents.length,
    countedDocuments: counted.length,
    pendingDocuments: pending.length,
    actualConversationPages: counted.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
    estimatedHardGapPages: estimatedGapPages,
    tierCounts: tierCounts(documents),
    topIssues: issues.slice(0, 6),
    selectionAnchors: anchors,
    hardGaps: pending.map((row) => ({
      sequence: row.sequence,
      date: row.date,
      type: row.type,
      title: row.title,
      sourcePdfPages: row.sourcePdfPages,
      sourcePacketUrl: row.sourcePacketUrl,
      estimatedPages: Math.round(medians[row.type] || 0),
      hardGapClass: row.hardGapClass
    })),
    documents: documents.map((row) => ({
      sequence: row.sequence,
      id: row.id,
      date: row.date,
      type: row.type,
      title: row.title,
      status: row.status,
      selectionTier: row.selectionTier,
      selectionScore: row.selectionScore,
      actualConversationPages: row.actualConversationPages,
      annotationTreatment: row.annotationTreatment,
      dominantIssues: row.dominantIssues || [],
      pdfUrl: row.pdfUrl,
      sourcePacketUrl: row.sourcePacketUrl
    }))
  };
}

function phaseMove(phase) {
  if (phase.pendingDocuments && !phase.countedDocuments) {
    return "Treat as source follow-up only until actual conversation text is located.";
  }
  if (phase.selectionAnchors.length >= 4) {
    return "Use anchors to build a compact section; test lower-tier rows only for chronology gaps or annotation support.";
  }
  if (phase.selectionAnchors.length >= 1) {
    return "Start with the listed anchors, then check whether a confirmatory telcon is needed for continuity.";
  }
  return "Review the counted set for whether this phase belongs in an editorial note rather than selected documents.";
}

function writeCsv(phases) {
  const fields = [
    "phase",
    "dateStart",
    "dateEnd",
    "totalContacts",
    "countedDocuments",
    "pendingDocuments",
    "actualConversationPages",
    "estimatedHardGapPages",
    "tier1Documents",
    "tier2Documents",
    "topIssues",
    "selectionAnchors",
    "hardGaps",
    "compilerMove",
    "narrativeUse"
  ];
  const body = phases.map((phase) => {
    const values = {
      phase: phase.label,
      dateStart: phase.dateStart,
      dateEnd: phase.dateEnd,
      totalContacts: phase.totalContacts,
      countedDocuments: phase.countedDocuments,
      pendingDocuments: phase.pendingDocuments,
      actualConversationPages: phase.actualConversationPages,
      estimatedHardGapPages: phase.estimatedHardGapPages,
      tier1Documents: phase.tierCounts["Tier 1 - likely core"] || 0,
      tier2Documents: phase.tierCounts["Tier 2 - strong candidate"] || 0,
      topIssues: phase.topIssues.map((issue) => `${issue.issue} (${issue.documents} docs, ${issue.pages} pages)`),
      selectionAnchors: phase.selectionAnchors.map((doc) => `#${doc.sequence} ${doc.date} ${doc.title}`),
      hardGaps: phase.hardGaps.map((doc) => `#${doc.sequence} ${doc.date} ${doc.title}`),
      compilerMove: phaseMove(phase),
      narrativeUse: phase.narrativeUse
    };
    return fields.map((field) => csvCell(values[field])).join(",");
  });
  fs.writeFileSync(path.join(REPORTS_DIR, "chronological-chapter-outline.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function compactIssues(issues) {
  if (!issues.length) return "No counted issue tags yet.";
  return issues
    .slice(0, 5)
    .map((issue) => `${htmlCell(issue.issue)} <span>${htmlCell(issue.documents)} docs, ${htmlCell(issue.pages)} pp.</span>`)
    .join("<br>");
}

function compactAnchors(docs) {
  if (!docs.length) return "No Tier 1/Tier 2 anchor yet.";
  return docs
    .slice(0, 5)
    .map((doc) => `${htmlLink(`#${doc.sequence} ${doc.date}`, doc.pdfUrl)} <span>${htmlCell(doc.selectionTier)}; ${htmlCell(doc.actualConversationPages)} pp.</span>`)
    .join("<br>");
}

function compactHardGaps(gaps) {
  if (!gaps.length) return "";
  return gaps
    .map((gap) => `${htmlLink(`#${gap.sequence} ${gap.date}`, gap.sourcePacketUrl)} <span>${htmlCell(gap.type)}; est. ${htmlCell(gap.estimatedPages)} pp.; ${htmlCell(gap.hardGapClass)}</span>`)
    .join("<br>");
}

function buildHtml(report) {
  const summaryRows = [
    ["Phases", report.summary.phases],
    ["Contacts", report.summary.totalContacts],
    ["Counted", report.summary.countedDocuments],
    ["Pending", report.summary.pendingDocuments],
    ["Actual Pages", report.summary.actualConversationPages],
    ["Est. Gap Pages", report.summary.estimatedHardGapPages],
    ["Tier 1", report.summary.tierOneDocuments],
    ["Tier 2", report.summary.tierTwoDocuments]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");

  const phaseRows = report.phases
    .map(
      (phase) => `<tr>
        <td>${htmlCell(phase.label)}<br><span>${htmlCell(phase.dateStart)} to ${htmlCell(phase.dateEnd)}</span></td>
        <td>${htmlCell(phase.totalContacts)}</td>
        <td>${htmlCell(phase.countedDocuments)}</td>
        <td>${htmlCell(phase.pendingDocuments)}</td>
        <td>${htmlCell(phase.actualConversationPages)}</td>
        <td>${htmlCell(phase.estimatedHardGapPages)}</td>
        <td>${htmlCell(phase.tierCounts["Tier 1 - likely core"] || 0)} / ${htmlCell(phase.tierCounts["Tier 2 - strong candidate"] || 0)}</td>
        <td>${compactIssues(phase.topIssues)}</td>
        <td>${compactAnchors(phase.selectionAnchors)}</td>
        <td>${htmlCell(phaseMove(phase))}</td>
      </tr>`
    )
    .join("\n");

  const phaseCards = report.phases
    .map(
      (phase) => `<section class="phase-card">
        <h3>${htmlCell(phase.label)}</h3>
        <p>${htmlCell(phase.narrativeUse)}</p>
        <dl>
          <div><dt>Documents</dt><dd>${htmlCell(phase.countedDocuments)} counted / ${htmlCell(phase.pendingDocuments)} pending</dd></div>
          <div><dt>Pages</dt><dd>${htmlCell(phase.actualConversationPages)} actual${phase.estimatedHardGapPages ? ` + ${htmlCell(phase.estimatedHardGapPages)} est.` : ""}</dd></div>
          <div><dt>Tier 1/2</dt><dd>${htmlCell(phase.tierCounts["Tier 1 - likely core"] || 0)} / ${htmlCell(phase.tierCounts["Tier 2 - strong candidate"] || 0)}</dd></div>
        </dl>
        <h4>Selection Anchors</h4>
        <p>${compactAnchors(phase.selectionAnchors)}</p>
        <h4>Dominant Issues</h4>
        <p>${compactIssues(phase.topIssues)}</p>
        ${phase.hardGaps.length ? `<h4>Hard Gaps</h4><p>${compactHardGaps(phase.hardGaps)}</p>` : ""}
      </section>`
    )
    .join("\n");

  const documentRows = report.phases
    .flatMap((phase) =>
      phase.documents.map(
        (doc) => `<tr>
          <td>${htmlCell(phase.label)}</td>
          <td>${htmlCell(doc.sequence)}</td>
          <td>${htmlCell(doc.date)}</td>
          <td>${htmlCell(doc.type)}</td>
          <td>${htmlCell(doc.selectionTier)}</td>
          <td>${htmlCell(doc.actualConversationPages)}</td>
          <td>${doc.pdfUrl ? htmlLink(doc.title, doc.pdfUrl) : htmlCell(doc.title)}</td>
          <td>${htmlCell(doc.dominantIssues.join("; "))}</td>
        </tr>`
      )
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Chronological Chapter Outline</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7f8; }
      main { width: min(1320px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2, h3, h4 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.65rem); }
      h2 { margin-top: 34px; font-size: clamp(1.4rem, 3vw, 2.05rem); }
      h3 { margin: 0 0 6px; font-size: 1.25rem; }
      h4 { margin: 14px 0 4px; font-size: 1rem; }
      a { color: #243d63; font-weight: 800; }
      .lede { max-width: 980px; color: #5b6470; font-size: 1.04rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #243d63; border-radius: 6px; }
      .actions a:nth-child(even) { color: #243d63; background: white; border: 1px solid #d7dedb; }
      dl.summary, .phase-card dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl.summary div, .phase-card dl div { padding: 13px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5b6470; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.25rem; font-weight: 800; }
      .note { max-width: 980px; padding: 12px 14px; background: #eef7f2; border: 1px solid #bdd6c9; border-radius: 8px; color: #335849; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #243d63; font-size: .76rem; text-transform: uppercase; white-space: nowrap; }
      td:nth-child(2), td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6), td:nth-child(7) { text-align: right; white-space: nowrap; }
      span { color: #687483; font-size: .9em; }
      .phase-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .phase-card { padding: 14px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      .phase-card p { margin: 0 0 8px; color: #4d5967; }
      .phase-card dl { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 12px 0; }
      .phase-card dl div { padding: 10px; background: #f8fafb; }
      @media (max-width: 900px) { dl.summary, .phase-card dl, .phase-grid { grid-template-columns: 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Chronological Chapter Outline</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This draft outline groups the Clinton-Yeltsin chronology into editable narrative phases, with page loads, Tier 1/Tier 2 anchors, issue pressure, and hard source gaps for each phase.</p>
      <div class="actions">
        <a href="chronological-chapter-outline.csv">Download outline CSV</a>
        <a href="chronological-chapter-outline.json">Open outline JSON</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
        <a href="draft-selection-spine.html">Open draft selection spine</a>
        <a href="compiler-next-actions.html">Open next-action queue</a>
        <a href="page-budget-scenarios.html">Open page budgets</a>
        <a href="thematic-selection-matrix.html">Open thematic matrix</a>
        <a href="selection-priority-workbench.html">Open selection priorities</a>
      </div>
      <p class="note">The phase labels are a draft editorial aid, not a final FRUS table of contents. Page counts are actual conversation pages; hard-gap estimates remain separate until released text is located.</p>
      <dl class="summary">${summaryRows}</dl>
      <h2>Phase Summary</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Phase</th><th>Total</th><th>Counted</th><th>Pending</th><th>Pages</th><th>Est.</th><th>Tier 1/2</th><th>Dominant issues</th><th>Anchors</th><th>Compiler move</th></tr></thead>
          <tbody>${phaseRows}</tbody>
        </table>
      </div>
      <h2>Phase Cards</h2>
      <div class="phase-grid">${phaseCards}</div>
      <h2>Chronology By Phase</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Phase</th><th>Seq</th><th>Date</th><th>Type</th><th>Tier</th><th>Pages</th><th>Document</th><th>Dominant issues</th></tr></thead>
          <tbody>${documentRows}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const selection = readJson(path.join(REPORTS_DIR, "selection-priority-workbench.json"));
  const medians = medianByType(selection.rows);
  const phases = PHASES.map((phase) => summarizePhase(phase, selection.rows, medians));
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Draft chronological chapter outline for direct Clinton-Yeltsin memcons/telcons in the FRUS 1993-2000, Volume XVIII compiler packet.",
    note:
      "Phase boundaries are editorial aids. They can be revised without changing the underlying chronological document inventory.",
    medians,
    summary: {
      phases: phases.length,
      totalContacts: phases.reduce((sum, phase) => sum + phase.totalContacts, 0),
      countedDocuments: phases.reduce((sum, phase) => sum + phase.countedDocuments, 0),
      pendingDocuments: phases.reduce((sum, phase) => sum + phase.pendingDocuments, 0),
      actualConversationPages: phases.reduce((sum, phase) => sum + phase.actualConversationPages, 0),
      estimatedHardGapPages: phases.reduce((sum, phase) => sum + phase.estimatedHardGapPages, 0),
      tierOneDocuments: phases.reduce((sum, phase) => sum + (phase.tierCounts["Tier 1 - likely core"] || 0), 0),
      tierTwoDocuments: phases.reduce((sum, phase) => sum + (phase.tierCounts["Tier 2 - strong candidate"] || 0), 0)
    },
    phases
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "chronological-chapter-outline.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.phases);
fs.writeFileSync(path.join(REPORTS_DIR, "chronological-chapter-outline.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
