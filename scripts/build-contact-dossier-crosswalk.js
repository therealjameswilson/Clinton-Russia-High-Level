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

function compact(value, maxLength = 140) {
  const text = clean(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
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

function candidateConversationRecords(records) {
  return records.filter(
    (record) =>
      record.chapter?.name === "Clinton-Yeltsin Chronology" &&
      (record.type === "Memcon" || record.type === "Telcon") &&
      record.potentialFrusDocument !== false
  );
}

function dateValue(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

function dayDiff(a, b) {
  const av = dateValue(a);
  const bv = dateValue(b);
  if (av === null || bv === null) return null;
  return Math.round((bv - av) / 86400000);
}

function themes(record) {
  const text = clean(
    [
      record.title,
      record.documentTitle,
      record.subjectLine,
      record.sourceNote,
      record.extractionStatus,
      ...(record.frusTopics || []),
      ...(record.topics || [])
    ].join(" ")
  ).toLowerCase();
  const map = [
    ["nato", /nato|partnership for peace|european security/],
    ["kosovo", /kosovo|serbia|milosevic|balkans/],
    ["bosnia", /bosnia|contact group/],
    ["ukraine", /ukraine|kravchuk/],
    ["nuclear", /nuclear|start|abm|missile|arms control|nunn-lugar/],
    ["chechnya", /chechnya|caucasus/],
    ["iraq", /iraq|saddam/],
    ["economics", /economic|aid|assistance|imf|loan|market|reform/],
    ["elections", /election|zyuganov|communist|democracy/],
    ["baltics", /baltic|estonia|latvia|lithuania/],
    ["summit", /summit|vancouver|tokyo|moscow|helsinki|halifax|hyde park|denver|naples|budapest|istanbul|auckland|oslo|birmingham|cologne|sharm/]
  ];
  return map.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function relevance(contact, record, diff) {
  const haystack = clean(
    [
      record.title,
      record.documentTitle,
      record.subjectLine,
      record.sourceNote,
      record.govinfoNotes,
      ...(record.frusTopics || []),
      ...(record.topics || []),
      ...(record.publicStatementTopicHeadings || []),
      ...(record.strobeManifestDescriptions || [])
    ].join(" ")
  ).toLowerCase();
  let score = diff === 0 ? 80 : 45 - Math.abs(diff || 0) * 8;
  if (/yeltsin|president of russia|russian president/.test(haystack)) score += 50;
  if (/clinton-yeltsin|clinton and yeltsin|clinton\/yeltsin/.test(haystack)) score += 35;
  const contactThemes = new Set(themes(contact));
  for (const theme of themes(record)) {
    if (contactThemes.has(theme)) score += 18;
  }
  return score;
}

function hasUsableDate(record) {
  return /^\d{4}-\d{2}-\d{2}$/.test(record.date || "") && record.dateDisplay !== "n.d.";
}

function pickCompanions(records, contact, options) {
  const { windowDays = 3, exactOnly = false, minimumScore = 70, limit = 8 } = options;
  return records
    .filter(hasUsableDate)
    .map((record) => {
      const diff = dayDiff(contact.date, record.date);
      return { record, diff, score: relevance(contact, record, diff) };
    })
    .filter((item) => item.diff !== null)
    .filter((item) => (exactOnly ? item.diff === 0 : Math.abs(item.diff) <= windowDays))
    .filter((item) => item.diff === 0 || item.score >= minimumScore)
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff) || b.score - a.score || a.record.title.localeCompare(b.record.title))
    .slice(0, limit)
    .map(({ record, diff, score }) => ({
      id: record.id || record.naid || "",
      date: record.date,
      dayOffset: diff,
      score,
      type: record.type || "",
      title: record.documentTitle || record.title || "",
      source: record.source?.name || record.releaseStatus || "",
      pages: record.sourcePdfPages || (record.publicPapersPageCount ? `${record.publicPapersPageCount} Public Papers pages` : ""),
      url: record.pdfUrl || record.catalogUrl || record.publicPapersHtmlUrl || "",
      catalogUrl: record.catalogUrl || record.publicPapersHtmlUrl || "",
      sourceNote: record.frusSourceNote || record.sourceNote || "",
      note: record.extractionStatus || record.subjectLine || record.govinfoNotes || ""
    }));
}

function formatCompanionList(items, kind) {
  if (!items.length) return "";
  return items
    .map((item) => {
      const offset = item.dayOffset === 0 ? "same day" : `${item.dayOffset > 0 ? "+" : ""}${item.dayOffset} days`;
      const label = `${item.date} (${offset}) ${item.title}`;
      const pages = item.pages ? ` [${item.pages}]` : "";
      return `${label}${pages}${item.url ? ` <${siteUrl(item.url)}>` : ""}`;
    })
    .join("; ");
}

function fileList(files) {
  return (files || []).map((file) => ({
    id: file.id || "",
    date: file.date || "",
    title: file.title || file.id || "",
    url: file.url || "",
    status: file.status || ""
  }));
}

function formatFileList(files) {
  return files
    .map((file) => `${file.id ? `${file.id}: ` : ""}${file.title}${file.status ? ` (${file.status})` : ""}${file.url ? ` <${siteUrl(file.url)}>` : ""}`)
    .join("; ");
}

function compilerAction(row) {
  const actions = [];
  if (row.status === "pending extent") {
    actions.push("Hard source gap: locate released actual conversation text before counting or extracting a derivative PDF.");
  } else {
    actions.push("Use the canonical extracted PDF and page range as the document candidate.");
  }
  if (row.pddReferences.length) actions.push("Use the Daily Diary reference to confirm timing and call/meeting occurrence.");
  if (row.publicSameDay.length || row.publicNearby.length) actions.push("Review linked Public Papers rows for editorial-note framing around the contact.");
  if (row.sourceCopies.length) actions.push("Treat linked Drive/Strobe files as source-copy or duplicate controls unless the compiler chooses a different authoritative source.");
  if (row.naraSupport.length || row.strobeContext.length) actions.push("Review nearby support/context records only after final document selection.");
  return actions.join(" ");
}

function buildRows(records, pddReferences, packetManifest) {
  const packetById = new Map(packetManifest.rows.map((row) => [row.id, row]));
  const core = candidateConversationRecords(records).sort(chronologySort);
  const publicStatements = records.filter((record) => record.chapter?.name === "Clinton Public Statements");
  const strobeRecords = records.filter((record) => record.chapter?.name === "Talbott FOIA Context");
  const naraRecords = records.filter(
    (record) =>
      record.chapter?.name === "NARA Scout Leads" &&
      record.releaseStatus !== "Daily Diary Reference" &&
      !/presidential daily diary/i.test(`${record.title || ""} ${record.documentTitle || ""}`)
  );
  const pddByDate = new Map();
  for (const item of pddReferences || []) {
    if (!pddByDate.has(item.date)) pddByDate.set(item.date, []);
    pddByDate.get(item.date).push(item);
  }

  return core.map((record, index) => {
    const packet = packetById.get(record.id) || {};
    const pddMatches = (pddByDate.get(record.date) || []).filter((item) => item.leader === "Yeltsin");
    const pddRows = pddMatches.map((item) => ({
      id: item.id,
      date: item.date,
      time: item.time,
      eventType: item.eventType,
      leader: item.leader,
      title: item.sourceTitle,
      pages: item.sourcePdfPages,
      catalogUrl: item.catalogUrl,
      pdfUrl: item.pdfUrl,
      summary: item.summary
    }));
    const publicSameDay = pickCompanions(publicStatements, record, {
      exactOnly: true,
      limit: 10
    });
    const publicNearby = pickCompanions(publicStatements, record, {
      windowDays: 3,
      minimumScore: 95,
      limit: 6
    }).filter((item) => item.dayOffset !== 0);
    const strobeContext = pickCompanions(strobeRecords, record, {
      windowDays: 7,
      minimumScore: 90,
      limit: 6
    }).filter((item) => item.id !== record.id);
    const naraSupport = pickCompanions(naraRecords, record, {
      windowDays: 7,
      minimumScore: 85,
      limit: 6
    });
    const sourceCopies = [...fileList(record.googleDriveFiles), ...fileList(record.strobeFiles)];
    const status = Number.isInteger(record.pageCount) ? "counted" : "pending extent";
    const row = {
      sequence: packet.sequence || index + 1,
      id: record.id,
      date: record.date,
      type: record.type,
      status,
      pages: Number.isInteger(record.pageCount) ? record.pageCount : "",
      title: record.documentTitle || record.title,
      corePdfUrl: /^public\/documents\//.test(record.pdfUrl || "") ? siteUrl(record.pdfUrl) : "",
      sourcePacketUrl: siteUrl(record.sourcePdfUrl || record.source?.pdfUrl || record.catalogUrl || ""),
      sourcePdfPages: record.sourcePdfPages || "",
      packetPages: packet.packetPageStart ? `${packet.packetPageStart}-${packet.packetPageEnd}` : "",
      actualConversationPacketPages: packet.actualConversationPacketPageStart
        ? `${packet.actualConversationPacketPageStart}-${packet.actualConversationPacketPageEnd}`
        : "",
      markerPage: record.markerPage || "",
      frusSourceNote: record.frusSourceNote || "",
      extractionStatus: record.extractionStatus || "",
      pddReferences: pddRows,
      publicSameDay,
      publicNearby,
      sourceCopies,
      strobeContext,
      naraSupport
    };
    row.compilerAction = compilerAction(row);
    row.companionCounts = {
      pddReferences: row.pddReferences.length,
      publicSameDay: row.publicSameDay.length,
      publicNearby: row.publicNearby.length,
      sourceCopies: row.sourceCopies.length,
      strobeContext: row.strobeContext.length,
      naraSupport: row.naraSupport.length
    };
    return row;
  });
}

function buildCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "status",
    "actualConversationPages",
    "title",
    "corePdfUrl",
    "sourcePacketUrl",
    "sourcePdfPages",
    "readingPacketPages",
    "actualConversationPacketPages",
    "markerPage",
    "pddReferences",
    "publicStatementsSameDay",
    "publicStatementsNearby",
    "sourceCopies",
    "strobeContext",
    "naraSupport",
    "frusSourceNote",
    "compilerAction"
  ];
  const body = rows.map((row) =>
    [
      row.sequence,
      row.date,
      row.type,
      row.status,
      row.pages,
      row.title,
      row.corePdfUrl,
      row.sourcePacketUrl,
      row.sourcePdfPages,
      row.packetPages,
      row.actualConversationPacketPages,
      row.markerPage,
      row.pddReferences
        .map((item) => `${item.time || ""} ${item.summary || item.title} pp. ${item.pages || ""} <${siteUrl(item.pdfUrl || item.catalogUrl)}>`).join("; "),
      formatCompanionList(row.publicSameDay),
      formatCompanionList(row.publicNearby),
      formatFileList(row.sourceCopies),
      formatCompanionList(row.strobeContext),
      formatCompanionList(row.naraSupport),
      row.frusSourceNote,
      row.compilerAction
    ]
      .map(csvCell)
      .join(",")
  );
  return `${fields.join(",")}\n${body.join("\n")}\n`;
}

function statRows(summary) {
  return [
    ["Core contacts", summary.coreContacts],
    ["Counted documents", summary.countedDocuments],
    ["Pending extents", summary.pendingDocuments],
    ["With Daily Diary", summary.rowsWithPdd],
    ["With same-day Public Papers", summary.rowsWithSameDayPublicPapers],
    ["With source-copy controls", summary.rowsWithSourceCopies]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");
}

function companionHtml(items, emptyLabel) {
  if (!items.length) return `<p class="muted">${htmlCell(emptyLabel)}</p>`;
  return `<ul>${items
    .map((item) => {
      const offset = item.dayOffset === undefined ? "" : item.dayOffset === 0 ? "same day" : `${item.dayOffset > 0 ? "+" : ""}${item.dayOffset} days`;
      const meta = [item.date, offset, item.pages || item.time].filter(Boolean).join(" / ");
      return `<li>${htmlLink(compact(item.title || item.summary, 120), item.url || item.pdfUrl || item.catalogUrl)}${meta ? ` <span>${htmlCell(meta)}</span>` : ""}${item.note || item.summary ? `<p>${htmlCell(compact(item.note || item.summary, 220))}</p>` : ""}</li>`;
    })
    .join("\n")}</ul>`;
}

function sourceCopyHtml(files) {
  if (!files.length) return `<p class="muted">No known Drive/Strobe source-copy control.</p>`;
  return `<ul>${files
    .map(
      (file) =>
        `<li>${htmlLink(compact(file.title, 120), file.url)}${file.id ? ` <span>${htmlCell(file.id)}</span>` : ""}${file.status ? `<p>${htmlCell(compact(file.status, 180))}</p>` : ""}</li>`
    )
    .join("\n")}</ul>`;
}

function pddHtml(items) {
  if (!items.length) return `<p class="muted">No matching Yeltsin Daily Diary reference in the current PDD audit.</p>`;
  return `<ul>${items
    .map(
      (item) =>
        `<li>${htmlLink(`${item.time || item.date} - ${compact(item.summary, 120)}`, item.pdfUrl || item.catalogUrl)} <span>pp. ${htmlCell(item.pages || "review")}</span></li>`
    )
    .join("\n")}</ul>`;
}

function buildHtml(report) {
  const rows = report.rows
    .map(
      (row) => `<article class="dossier-card">
        <header>
          <p>#${htmlCell(row.sequence)} / ${htmlCell(row.date)} / ${htmlCell(row.type)} / ${htmlCell(row.status)}${row.pages ? ` / ${htmlCell(row.pages)} conversation pages` : ""}</p>
          <h2>${row.corePdfUrl ? htmlLink(row.title, row.corePdfUrl) : htmlCell(row.title)}</h2>
        </header>
        <dl>
          <div><dt>Source pages</dt><dd>${htmlCell(row.sourcePdfPages || "Pending")}</dd></div>
          <div><dt>Packet pages</dt><dd>${htmlCell(row.packetPages || "Not in packet")}</dd></div>
          <div><dt>PDD refs</dt><dd>${htmlCell(row.pddReferences.length)}</dd></div>
          <div><dt>Companions</dt><dd>${htmlCell(row.publicSameDay.length + row.publicNearby.length + row.sourceCopies.length + row.strobeContext.length + row.naraSupport.length)}</dd></div>
        </dl>
        <p class="action">${htmlCell(row.compilerAction)}</p>
        <div class="dossier-grid">
          <section>
            <h3>Daily Diary</h3>
            ${pddHtml(row.pddReferences)}
          </section>
          <section>
            <h3>Public Papers</h3>
            ${companionHtml([...row.publicSameDay, ...row.publicNearby], "No exact or high-relevance nearby Public Papers row in the current audit.")}
          </section>
          <section>
            <h3>Source Copies</h3>
            ${sourceCopyHtml(row.sourceCopies)}
          </section>
          <section>
            <h3>Support / Context</h3>
            ${companionHtml([...row.strobeContext, ...row.naraSupport], "No high-relevance nearby Strobe/NARA support row in the current audit.")}
          </section>
        </div>
      </article>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Contact Dossier Crosswalk</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f6; }
      main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); }
      h2 { margin: 0; font-size: clamp(1.35rem, 3vw, 2rem); }
      h3 { margin: 0 0 10px; color: #25364f; font-size: .84rem; letter-spacing: .08em; text-transform: uppercase; }
      a { color: #25364f; font-weight: 800; }
      .lede { max-width: 880px; color: #5f6874; font-size: 1.05rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #25364f; border-radius: 6px; }
      .actions a:nth-child(even) { color: #25364f; background: white; border: 1px solid #d7dedb; }
      .stats { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      .stats div, .dossier-card { background: white; border: 1px solid #d7dedb; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      .stats div { padding: 14px; }
      dt { color: #5f6874; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.45rem; font-weight: 800; }
      .dossier-card { margin: 14px 0; padding: 18px; }
      .dossier-card header p { margin: 0 0 6px; color: #8c3b3f; font-size: .78rem; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
      .dossier-card dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
      .dossier-card dl div { padding: 10px; background: #f4f7f6; border: 1px solid #d7dedb; border-radius: 6px; }
      .dossier-card dd { font-size: 1.05rem; }
      .action { margin: 0 0 16px; padding: 12px; background: #f9f3e6; border-left: 4px solid #b98e36; border-radius: 4px; }
      .dossier-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .dossier-grid section { padding: 12px; background: #fbfcfc; border: 1px solid #d7dedb; border-radius: 6px; }
      ul { margin: 0; padding-left: 18px; }
      li + li { margin-top: 8px; }
      li span { color: #5f6874; font-size: .86rem; }
      li p, .muted { margin: 3px 0 0; color: #5f6874; }
      @media (max-width: 900px) { .stats, .dossier-card dl, .dossier-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 640px) { .stats, .dossier-card dl, .dossier-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Contact Dossier Crosswalk</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. One row per Clinton-Yeltsin contact, joining the core extracted document to Presidential Daily Diary confirmations, same-day and nearby Public Papers context, Drive/Strobe source-copy controls, and nearby NARA/Strobe support leads.</p>
      <div class="actions">
        <a href="contact-dossier-crosswalk.csv">Download dossier CSV</a>
        <a href="contact-dossier-crosswalk.json">Open dossier JSON</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
        <a href="../public/documents/clinton-yeltsin-core-reading-packet.pdf">Open reading packet PDF</a>
      </div>
      <dl class="stats">${statRows(report.summary)}</dl>
      ${rows}
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const records = readJson(path.join(ROOT, "data", "memcons.json"));
  const pdd = readJson(path.join(ROOT, "reports", "presidential-daily-diary-search.json"));
  const packetManifest = readJson(path.join(ROOT, "reports", "reading-packet-manifest.json"));
  const rows = buildRows(records, pdd.references || [], packetManifest);
  const summary = {
    coreContacts: rows.length,
    countedDocuments: rows.filter((row) => row.status === "counted").length,
    pendingDocuments: rows.filter((row) => row.status !== "counted").length,
    actualConversationPages: rows.reduce((sum, row) => sum + Number(row.pages || 0), 0),
    rowsWithPdd: rows.filter((row) => row.pddReferences.length).length,
    rowsWithoutPdd: rows.filter((row) => !row.pddReferences.length).length,
    rowsWithSameDayPublicPapers: rows.filter((row) => row.publicSameDay.length).length,
    rowsWithNearbyPublicPapers: rows.filter((row) => row.publicNearby.length).length,
    rowsWithSourceCopies: rows.filter((row) => row.sourceCopies.length).length,
    rowsWithStrobeContext: rows.filter((row) => row.strobeContext.length).length,
    rowsWithNaraSupport: rows.filter((row) => row.naraSupport.length).length
  };
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "One-row-per-contact crosswalk for Clinton-Yeltsin memcons/telcons, built from data/memcons.json, Presidential Daily Diary search results, and reading-packet manifest data.",
    summary,
    rows
  };
}

const report = buildReport();
const reportsDir = path.join(ROOT, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "contact-dossier-crosswalk.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "contact-dossier-crosswalk.csv"), buildCsv(report.rows));
fs.writeFileSync(path.join(reportsDir, "contact-dossier-crosswalk.html"), buildHtml(report));
console.log(JSON.stringify({ summary: report.summary, outputs: [
  "reports/contact-dossier-crosswalk.html",
  "reports/contact-dossier-crosswalk.json",
  "reports/contact-dossier-crosswalk.csv"
] }, null, 2));
