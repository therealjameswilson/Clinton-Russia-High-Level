const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function siteUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\.\//, ""), SITE_BASE_URL).href;
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

function compact(value, maxLength = 180) {
  const text = clean(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function splitEvidence(value) {
  const text = clean(value);
  if (!text) return [];
  return text
    .split(/(?<=\.)\s+(?=(?:The|A|An|No|False|NARA|National|Clinton|CDL|Google|Page|Public|White|Source|Do not)\b)/)
    .map(clean)
    .filter(Boolean);
}

function pendingContacts(records) {
  return records
    .filter(
      (record) =>
        record.chapter?.name === "Clinton-Yeltsin Chronology" &&
        (record.type === "Memcon" || record.type === "Telcon") &&
        record.potentialFrusDocument !== false &&
        !Number.isInteger(record.pageCount)
    )
    .sort(chronologySort);
}

function extractControlNumbers(record) {
  const text = `${record.frusSourceNote || ""} ${record.source?.caseNumber || ""} ${record.naid || ""}`;
  const matches = [
    ...text.matchAll(/\b(?:NAID|naid)\s+(\d+)/g),
    ...text.matchAll(/\b(?:Document ID|Record ID|Folder Title\/Record ID)\s+([A-Z0-9-]+)/g),
    ...text.matchAll(/\b(?:Original OA\/ID|OA\/Box Number)\s+([A-Z0-9-]+)/g),
    ...text.matchAll(/\b(20\d{2}-\d{4}-M(?:-\d+|-[A-Z])?)\b/g)
  ].map((match) => match[1]);
  return [...new Set(matches)];
}

function gapClass(record) {
  const text = `${record.sourcePdfPages || ""} ${record.sourceNote || ""} ${record.extractionStatus || ""}`.toLowerCase();
  if (/marker|withdrawal/.test(text)) return "Marker/withdrawal only";
  if (/leader chronology/.test(text) || /release packet not assigned/.test(text)) return "Leader chronology lead only";
  if (/no released/.test(text)) return "No released conversation pages located";
  return "Extent pending";
}

function requestTarget(record) {
  const source = record.source?.caseNumber || record.source?.name || record.naid || "";
  if (/2015-0782-M-1/.test(source)) {
    return "William J. Clinton Presidential Library / NSC Records Management Office PRS Files, NAID 7585721, MDR 2015-0782-M-1";
  }
  if (/2015-0782-M-2/.test(source)) {
    return "William J. Clinton Presidential Library / NSC Records Management Office PRS Files, NAID 7585721, MDR 2015-0782-M-2";
  }
  return "William J. Clinton Presidential Library, Meetings and Telephone Calls with Foreign Leaders chronology and related NSC/RMO trip or leader-call files";
}

function requestLanguage(record, dossier) {
  const title = record.documentTitle || record.title;
  const pdd = (dossier?.pddReferences || [])
    .map((item) => `${item.time || item.date}, ${item.summary || item.title}, source PDF pages ${item.pages || "not stated"}`)
    .join("; ");
  const publicRows = [...(dossier?.publicSameDay || []), ...(dossier?.publicNearby || [])]
    .map((item) => `${item.date}, ${item.title}, ${item.pages || "pages not stated"}`)
    .join("; ");
  const corroboration = [pdd && `Daily Diary corroboration: ${pdd}.`, publicRows && `Public Papers/context corroboration: ${publicRows}.`]
    .filter(Boolean)
    .join(" ");
  const controls = extractControlNumbers(record);
  return clean(
    `Please search for and, if available and releasable, provide the actual ${record.type.toLowerCase()} text, memorandum of conversation, interpreter notes, telcon transcript, or comparable call/meeting record for: ${title}, dated ${record.date}. Likely source/control context: ${requestTarget(record)}${controls.length ? `; known control numbers/cases: ${controls.join(", ")}` : ""}. ${corroboration} The existing public compiler inventory has not located released conversation pages; please do not substitute briefing material, press statements, schedules, withdrawal sheets, or duplicate context copies for the actual conversation record.`
  );
}

function formatCompanions(items) {
  return (items || [])
    .map((item) => {
      const bits = [item.date, item.time, item.title || item.summary, item.pages && `pp. ${item.pages}`].filter(Boolean);
      return `${bits.join(" / ")}${item.pdfUrl || item.url || item.catalogUrl ? ` <${siteUrl(item.pdfUrl || item.url || item.catalogUrl)}>` : ""}`;
    })
    .join("; ");
}

function buildRows(records, dossierReport) {
  const dossierById = new Map((dossierReport.rows || []).map((row) => [row.id, row]));
  return pendingContacts(records).map((record, index) => {
    const dossier = dossierById.get(record.id) || {};
    const searchTrail = splitEvidence(record.sourceNote || record.extractionStatus);
    const falseLeads = searchTrail.filter((item) => /false|not the|not a|not actual|do not substitute|briefing|press statement|talking points|audio|toast|context/i.test(item));
    const corroboration = [
      ...(dossier.pddReferences || []).map((item) => ({
        kind: "Presidential Daily Diary",
        title: item.summary || item.title,
        date: item.date,
        time: item.time || "",
        pages: item.pages || "",
        url: item.pdfUrl || item.catalogUrl || ""
      })),
      ...(dossier.publicSameDay || []).map((item) => ({
        kind: "Public Papers same-day",
        title: item.title,
        date: item.date,
        time: "",
        pages: item.pages || "",
        url: item.url || item.catalogUrl || ""
      })),
      ...(dossier.publicNearby || []).map((item) => ({
        kind: "Public Papers nearby",
        title: item.title,
        date: item.date,
        time: item.dayOffset === 0 ? "same day" : `${item.dayOffset > 0 ? "+" : ""}${item.dayOffset} days`,
        pages: item.pages || "",
        url: item.url || item.catalogUrl || ""
      })),
      ...(dossier.naraSupport || []).map((item) => ({
        kind: "NARA support lead",
        title: item.title,
        date: item.date,
        time: item.dayOffset === 0 ? "same day" : `${item.dayOffset > 0 ? "+" : ""}${item.dayOffset} days`,
        pages: item.pages || "",
        url: item.url || item.catalogUrl || ""
      })),
      ...(dossier.strobeContext || []).map((item) => ({
        kind: "Strobe support lead",
        title: item.title,
        date: item.date,
        time: item.dayOffset === 0 ? "same day" : `${item.dayOffset > 0 ? "+" : ""}${item.dayOffset} days`,
        pages: item.pages || "",
        url: item.url || item.catalogUrl || ""
      }))
    ];
    return {
      sequence: dossier.sequence || index + 1,
      id: record.id,
      date: record.date,
      type: record.type,
      title: record.documentTitle || record.title,
      gapClass: gapClass(record),
      requestPriority: record.date === "1999-02-08" ? "Medium - confirm whether a formal memcon was created" : "High - direct Clinton-Yeltsin contact",
      requestTarget: requestTarget(record),
      sourcePdfPages: record.sourcePdfPages || "",
      sourcePacketUrl: siteUrl(record.sourcePdfUrl || record.source?.pdfUrl || record.catalogUrl || ""),
      catalogUrl: siteUrl(record.catalogUrl || record.source?.url || ""),
      frusSourceNote: record.frusSourceNote || "",
      currentFinding: record.extractionStatus || "",
      searchTrail,
      falseLeads,
      corroboration,
      draftRequest: requestLanguage(record, dossier),
      nextAction:
        "Submit targeted archival/MDR follow-up; keep uncounted and do not create a derivative PDF until actual conversation pages are located."
    };
  });
}

function writeCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "requestPriority",
    "gapClass",
    "title",
    "requestTarget",
    "sourcePdfPages",
    "sourcePacketUrl",
    "catalogUrl",
    "corroboration",
    "falseLeadsOrNonSubstitutes",
    "currentFinding",
    "draftRequestLanguage",
    "nextAction",
    "frusSourceNote"
  ];
  const body = rows.map((row) =>
    [
      row.sequence,
      row.date,
      row.type,
      row.requestPriority,
      row.gapClass,
      row.title,
      row.requestTarget,
      row.sourcePdfPages,
      row.sourcePacketUrl,
      row.catalogUrl,
      row.corroboration.map((item) => `${item.kind}: ${item.date} ${item.time} ${item.title} ${item.pages ? `pp. ${item.pages}` : ""} ${item.url ? `<${siteUrl(item.url)}>` : ""}`).join("; "),
      row.falseLeads.join(" "),
      row.currentFinding,
      row.draftRequest,
      row.nextAction,
      row.frusSourceNote
    ]
      .map(csvCell)
      .join(",")
  );
  return `${fields.join(",")}\n${body.join("\n")}\n`;
}

function itemList(items, emptyText) {
  if (!items.length) return `<p class="muted">${htmlCell(emptyText)}</p>`;
  return `<ul>${items.map((item) => `<li>${htmlCell(item)}</li>`).join("\n")}</ul>`;
}

function corroborationList(items) {
  if (!items.length) return `<p class="muted">No same-day corroborating reference currently attached.</p>`;
  return `<ul>${items
    .map(
      (item) =>
        `<li><strong>${htmlCell(item.kind)}</strong>: ${htmlCell([item.date, item.time, item.title, item.pages && `pp. ${item.pages}`].filter(Boolean).join(" / "))}${item.url ? ` ${htmlLink("open", item.url)}` : ""}</li>`
    )
    .join("\n")}</ul>`;
}

function buildHtml(report) {
  const cards = report.rows
    .map(
      (row) => `<article class="gap-card">
        <header>
          <p>#${htmlCell(row.sequence)} / ${htmlCell(row.date)} / ${htmlCell(row.type)} / ${htmlCell(row.gapClass)}</p>
          <h2>${htmlCell(row.title)}</h2>
        </header>
        <dl>
          <div><dt>Priority</dt><dd>${htmlCell(row.requestPriority)}</dd></div>
          <div><dt>Target</dt><dd>${htmlCell(row.requestTarget)}</dd></div>
          <div><dt>Known source pages</dt><dd>${htmlCell(row.sourcePdfPages || "None")}</dd></div>
        </dl>
        <section>
          <h3>Draft Request Language</h3>
          <pre>${htmlCell(row.draftRequest)}</pre>
        </section>
        <section>
          <h3>Current Finding</h3>
          <p>${htmlCell(row.currentFinding)}</p>
        </section>
        <div class="gap-grid">
          <section>
            <h3>Corroborating Hooks</h3>
            ${corroborationList(row.corroboration)}
          </section>
          <section>
            <h3>False Leads / Non-Substitutes</h3>
            ${itemList(row.falseLeads, "No specific false lead was parsed; use the search trail below.")}
          </section>
        </div>
        <section>
          <h3>Search Trail</h3>
          ${itemList(row.searchTrail, "No search trail text available.")}
        </section>
        <p class="action">${htmlCell(row.nextAction)}</p>
      </article>`
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Hard Source Gap Packet</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f6; }
      main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); }
      h2 { margin: 0; font-size: clamp(1.35rem, 3vw, 2rem); }
      h3 { margin: 0 0 10px; color: #25364f; font-size: .84rem; letter-spacing: .08em; text-transform: uppercase; }
      a { color: #25364f; font-weight: 800; }
      .lede { max-width: 900px; color: #5f6874; font-size: 1.05rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #25364f; border-radius: 6px; }
      .actions a:nth-child(even) { color: #25364f; background: white; border: 1px solid #d7dedb; }
      .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      .stats div, .gap-card { background: white; border: 1px solid #d7dedb; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      .stats div { padding: 14px; }
      dt { color: #5f6874; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.2rem; font-weight: 800; }
      .gap-card { margin: 14px 0; padding: 18px; }
      .gap-card header p { margin: 0 0 6px; color: #8c3b3f; font-size: .78rem; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
      .gap-card dl { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 8px; margin: 16px 0; }
      .gap-card dl div, .gap-card section { padding: 12px; background: #fbfcfc; border: 1px solid #d7dedb; border-radius: 6px; }
      .gap-card section + section, .gap-grid + section { margin-top: 12px; }
      pre { white-space: pre-wrap; margin: 0; color: #18212d; font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .gap-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
      ul { margin: 0; padding-left: 18px; }
      li + li { margin-top: 7px; }
      .action { margin: 14px 0 0; padding: 12px; background: #f9f3e6; border-left: 4px solid #b98e36; border-radius: 4px; }
      .muted { margin: 0; color: #5f6874; }
      @media (max-width: 850px) { .stats, .gap-card dl, .gap-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Hard Source Gap Packet</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This packet isolates the six direct Clinton-Yeltsin contacts that remain uncounted because the actual conversation text has not been located. Each row supplies a request target, corroborating hooks, false leads, and draft language for archival, MDR, or FOIA follow-up.</p>
      <div class="actions">
        <a href="hard-source-gap-packet.csv">Download gap CSV</a>
        <a href="hard-source-gap-packet.json">Open gap JSON</a>
        <a href="contact-dossier-crosswalk.html">Open dossier crosswalk</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
      </div>
      <dl class="stats">
        <div><dt>Hard gaps</dt><dd>${htmlCell(report.summary.hardGaps)}</dd></div>
        <div><dt>With PDD hooks</dt><dd>${htmlCell(report.summary.rowsWithPdd)}</dd></div>
        <div><dt>With Public Papers hooks</dt><dd>${htmlCell(report.summary.rowsWithPublicPapers)}</dd></div>
        <div><dt>Request-ready rows</dt><dd>${htmlCell(report.summary.requestReadyRows)}</dd></div>
      </dl>
      ${cards}
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const records = readJson(path.join(ROOT, "data", "memcons.json"));
  const dossier = readJson(path.join(ROOT, "reports", "contact-dossier-crosswalk.json"));
  const rows = buildRows(records, dossier);
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Direct Clinton-Yeltsin memcon/telcon rows with pending page extents; intended as an archival/MDR/FOIA follow-up packet, not a substitute for released conversation text.",
    summary: {
      hardGaps: rows.length,
      rowsWithPdd: rows.filter((row) => row.corroboration.some((item) => item.kind === "Presidential Daily Diary")).length,
      rowsWithPublicPapers: rows.filter((row) => row.corroboration.some((item) => /Public Papers/.test(item.kind))).length,
      requestReadyRows: rows.filter((row) => row.draftRequest && row.requestTarget).length,
      markerOrWithdrawalOnly: rows.filter((row) => row.gapClass === "Marker/withdrawal only").length,
      leaderChronologyOnly: rows.filter((row) => row.gapClass === "Leader chronology lead only").length
    },
    rows
  };
}

const report = buildReport();
const reportsDir = path.join(ROOT, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "hard-source-gap-packet.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "hard-source-gap-packet.csv"), writeCsv(report.rows));
fs.writeFileSync(path.join(reportsDir, "hard-source-gap-packet.html"), buildHtml(report));
console.log(
  JSON.stringify(
    {
      summary: report.summary,
      outputs: [
        "reports/hard-source-gap-packet.html",
        "reports/hard-source-gap-packet.json",
        "reports/hard-source-gap-packet.csv"
      ]
    },
    null,
    2
  )
);
