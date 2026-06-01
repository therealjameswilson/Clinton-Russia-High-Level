const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PDFTOTEXT = process.env.PDFTOTEXT || "pdftotext";
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

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
  return `"${String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function clean(value) {
  return String(value || "")
    .replace(/\f/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
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

function extractFirstPageText(pdfPath) {
  return execFileSync(PDFTOTEXT, ["-f", "1", "-l", "1", "-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
  });
}

function meaningfulLines(text) {
  return text
    .replace(/\f/g, "\n")
    .split(/\r?\n/)
    .map((line) => clean(line))
    .filter(Boolean);
}

function lineIndex(lines, pattern, start = 0) {
  for (let index = start; index < lines.length; index += 1) {
    if (pattern.test(lines[index])) return index;
  }
  return -1;
}

function firstMatch(lines, pattern) {
  const line = lines.find((item) => pattern.test(item));
  if (!line) return "";
  const match = line.match(pattern);
  return clean(match?.[1] || line);
}

function collectBlock(lines, startPattern, stopPatterns) {
  const start = lineIndex(lines, startPattern);
  if (start < 0) return "";
  const block = [];
  for (let index = start; index < lines.length; index += 1) {
    if (index > start && stopPatterns.some((pattern) => pattern.test(lines[index]))) break;
    block.push(lines[index]);
  }
  return clean(block.join(" "));
}

function stripBlockLabel(value, labels) {
  let result = clean(value);
  for (const label of labels) result = result.replace(label, "").trim();
  return result.replace(/^[:;]\s*/, "").trim();
}

function parseSubject(lines, record) {
  const block = collectBlock(lines, /^SUBJECT[:\s]/i, [
    /^PARTICIPANTS?[:;\s]/i,
    /^DATE,\s*TIME/i,
    /^The President:/i,
    /^President Yeltsin:/i
  ]);
  if (block) return stripBlockLabel(block, [/^SUBJECT[:\s]*/i]);
  const summaryTitle = lines.slice(0, 8).find((line) => /meeting|telephone|conversation|telcon|memcon/i.test(line));
  return summaryTitle || record.documentTitle || record.title;
}

function parseParticipantsBlock(lines) {
  const block = collectBlock(lines, /^PARTICIPANTS?[:;\s]/i, [
    /^DATE,\s*TIME/i,
    /^DATE\s+AND\s+PLACE/i,
    /^The President:/i,
    /^President Yeltsin:/i
  ]);
  return stripBlockLabel(block, [/^PARTICIPANTS?[:;\s]*/i]);
}

function parseDateTimePlace(lines, record) {
  const block = collectBlock(lines, /^DATE,\s*TIME/i, [
    /^The President:/i,
    /^President Yeltsin:/i,
    /^BNY:/i,
    /^WJC:/i,
    /^SECRET/i,
    /^CONFIDENTIAL/i,
    /^CLINTON LIBRARY/i
  ]);
  if (block) {
    return stripBlockLabel(block, [/^DATE,\s*TIME\s*/i, /^AND PLACE:?\s*/i]).replace(/\bAND PLACE:?\s*/i, "");
  }
  const summaryLine = lines.find((line) => /\b\d{1,2}:\d{2}\s*(a\.m\.|p\.m\.)/i.test(line));
  return summaryLine || record.dateLine || record.date;
}

function parseRole(block, label) {
  if (!block) return "";
  const joined = clean(block);
  const labelPattern = label === "notetaker" ? /\bNotetakers?\s*[:;]/i : /\bInterpreters?\s*[:;]/i;
  const match = joined.match(labelPattern);
  if (match) {
    const rest = joined.slice(match.index + match[0].length);
    const next = rest.search(
      label === "notetaker"
        ? /\bInterpreters?\s*[:;]|\bDATE,\s*TIME\b|\bAND PLACE\b/i
        : /\bNotetakers?\s*[:;]|\bDATE,\s*TIME\b|\bAND PLACE\b/i
    );
    return clean(next >= 0 ? rest.slice(0, next) : rest);
  }
  if (label === "notetaker") {
    const parenthetical = joined.match(/([A-Z][A-Za-z.\s-]+(?:,\s*[^,;()]+){0,2})\s*\(Notetaker\)/i);
    if (parenthetical) return clean(parenthetical[1]);
  }
  return "";
}

function parseClassification(lines) {
  const markingPattern = /\b(TOP SECRET|SECRET|CONFIDENTIAL|UNCLASSIFIED|SENSITIVE)\b|5ECR|SEGR|COMF/i;
  const candidates = lines.filter((line) =>
    markingPattern.test(line) || /DECLASSIFIED|Declassify On|Classified by|Reason:/i.test(line)
  );
  const marking = candidates.find((line) => markingPattern.test(line)) || "";
  return {
    marking,
    candidates: candidates.slice(0, 8),
    classifiedBy: firstMatch(lines, /Classified by:\s*(.+)/i),
    reason: firstMatch(lines, /Reason:\s*(.+)/i),
    declassifyOn: firstMatch(lines, /Declassify On:\s*(.+)/i),
    declassifiedBy: lines.filter((line) => /DECLASSIFIED|PER E\.?O\.?13526|E\.0\.13526|Declass/i.test(line)).slice(0, 6)
  };
}

function missingFields(row) {
  const missing = [];
  if (!row.subject) missing.push("subject");
  if (!row.participantsBlock) missing.push("participants");
  if (!row.dateTimePlace) missing.push("date/time/place");
  if (!row.classification.marking) missing.push("classification marking");
  if (!row.notetaker && row.type === "Telcon") missing.push("notetaker");
  if (!row.interpreter && row.type === "Telcon") missing.push("interpreter");
  return missing;
}

function analyze(record, packetRowsById) {
  const text = extractFirstPageText(path.join(ROOT, record.pdfUrl));
  const lines = meaningfulLines(text);
  const participantsBlock = parseParticipantsBlock(lines);
  const classification = parseClassification(lines);
  const packet = packetRowsById.get(record.id) || {};
  const row = {
    id: record.id,
    sequence: packet.sequence || null,
    date: record.date,
    type: record.type,
    title: record.documentTitle || record.title,
    packetPages: packet.packetPageStart ? `${packet.packetPageStart}-${packet.packetPageEnd}` : "",
    actualConversationPacketPages: packet.actualConversationPacketPageStart
      ? `${packet.actualConversationPacketPageStart}-${packet.actualConversationPacketPageEnd}`
      : "",
    sourcePdfPages: record.sourcePdfPages || "",
    pdfUrl: siteUrl(record.pdfUrl),
    sourcePacketUrl: siteUrl(record.sourcePdfUrl || record.source?.pdfUrl || record.catalogUrl || ""),
    subject: parseSubject(lines, record),
    participantsBlock,
    notetaker: parseRole(participantsBlock, "notetaker"),
    interpreter: parseRole(participantsBlock, "interpreter"),
    dateTimePlace: parseDateTimePlace(lines, record),
    classification,
    firstPageSnippet: lines.slice(0, 34).join("\n")
  };
  row.missingFields = missingFields(row);
  row.reviewStatus = row.missingFields.length ? "Review fields" : "Parsed";
  return row;
}

function writeCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "reviewStatus",
    "missingFields",
    "title",
    "subject",
    "participantsBlock",
    "notetaker",
    "interpreter",
    "dateTimePlace",
    "classificationMarking",
    "classifiedBy",
    "reason",
    "declassifyOn",
    "declassifiedBy",
    "packetPages",
    "sourcePdfPages",
    "pdfUrl",
    "sourcePacketUrl"
  ];
  const body = rows.map((row) =>
    [
      row.sequence,
      row.date,
      row.type,
      row.reviewStatus,
      row.missingFields.join("; "),
      row.title,
      row.subject,
      row.participantsBlock,
      row.notetaker,
      row.interpreter,
      row.dateTimePlace,
      row.classification.marking,
      row.classification.classifiedBy,
      row.classification.reason,
      row.classification.declassifyOn,
      row.classification.declassifiedBy.join(" | "),
      row.packetPages,
      row.sourcePdfPages,
      row.pdfUrl,
      row.sourcePacketUrl
    ]
      .map(csvCell)
      .join(",")
  );
  fs.writeFileSync(
    path.join(ROOT, "reports/face-page-metadata.csv"),
    `${fields.join(",")}\n${body.join("\n")}\n`
  );
}

function writeHtml(report) {
  const rows = report.rows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.reviewStatus)}</td>
        <td>${htmlCell(row.missingFields.join(", "))}</td>
        <td><a href="${htmlCell(row.pdfUrl)}">${htmlCell(row.title)}</a></td>
        <td>${htmlCell(row.subject)}</td>
        <td>${htmlCell(row.dateTimePlace)}</td>
        <td>${htmlCell(row.classification.marking)}</td>
        <td>${htmlCell(row.notetaker || row.interpreter)}</td>
      </tr>`
    )
    .join("\n");
  const issueRows = report.rows
    .filter((row) => row.missingFields.length)
    .map(
      (row) => `<article>
        <h3>#${htmlCell(row.sequence)} ${htmlCell(row.date)} ${htmlCell(row.title)}</h3>
        <p><strong>Missing/review:</strong> ${htmlCell(row.missingFields.join(", "))}</p>
        <pre>${htmlCell(row.firstPageSnippet)}</pre>
      </article>`
    )
    .join("\n");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Face-Page Metadata Audit</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f6; }
      main { width: min(1220px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); }
      h2 { margin-top: 34px; font-size: clamp(1.45rem, 3vw, 2.15rem); }
      h3 { margin: 0 0 8px; font-size: 1.05rem; }
      a { color: #25364f; font-weight: 800; }
      .lede { max-width: 900px; color: #5f6874; font-size: 1.05rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #25364f; border-radius: 6px; }
      .actions a:nth-child(even) { color: #25364f; background: white; border: 1px solid #d7dedb; }
      .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      .summary div, article { padding: 14px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      .summary dt { color: #5f6874; font-size: .78rem; font-weight: 900; text-transform: uppercase; }
      .summary dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.55rem; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #25364f; font-size: .78rem; text-transform: uppercase; }
      td:nth-child(1) { text-align: right; white-space: nowrap; }
      pre { max-height: 260px; overflow: auto; white-space: pre-wrap; background: #f4f7f6; padding: 10px; border-radius: 6px; }
      .issue-grid { display: grid; gap: 10px; }
      @media (max-width: 760px) { .summary { grid-template-columns: 1fr 1fr; } table { font-size: .84rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Face-Page Metadata Audit</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)} from the first page of each extracted Clinton-Yeltsin memcon/telcon PDF. Parsed fields are triage aids for source-note drafting; rows marked for review retain the first-page snippet below.</p>
      <div class="actions">
        <a href="face-page-metadata.csv">Download face-page CSV</a>
        <a href="face-page-metadata.json">Open JSON</a>
        <a href="../public/documents/clinton-yeltsin-core-reading-packet.pdf">Open reading packet PDF</a>
      </div>
      <dl class="summary">
        <div><dt>Documents Audited</dt><dd>${htmlCell(report.summary.documentsAudited)}</dd></div>
        <div><dt>Parsed Rows</dt><dd>${htmlCell(report.summary.parsedRows)}</dd></div>
        <div><dt>Rows For Review</dt><dd>${htmlCell(report.summary.rowsForReview)}</dd></div>
        <div><dt>Classification Marks</dt><dd>${htmlCell(report.summary.classificationMarkingsFound)}</dd></div>
      </dl>
      <h2>Metadata Table</h2>
      <table>
        <thead><tr><th>Seq</th><th>Date</th><th>Type</th><th>Status</th><th>Review Fields</th><th>Document</th><th>Subject</th><th>Date / Time / Place</th><th>Marking</th><th>Notetaker / Interpreter</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h2>Rows Needing Review</h2>
      <div class="issue-grid">${issueRows || "<p>No review rows.</p>"}</div>
    </main>
  </body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, "reports/face-page-metadata.html"), html);
}

const records = readJson(path.join(ROOT, "data", "memcons.json"));
const packetManifest = readJson(path.join(ROOT, "reports", "reading-packet-manifest.json"));
const packetRowsById = new Map(packetManifest.rows.map((row) => [row.id, row]));
const rows = candidateDocuments(records).map((record) => analyze(record, packetRowsById));
const report = {
  generatedAt: new Date().toISOString(),
  scope:
    "Face-page metadata audit for the 85 page-counted Clinton-Yeltsin memcons and telcons. Extracted with pdftotext from page 1 of each derivative PDF; use as a source-note drafting aid and verify against the PDF image.",
  summary: {
    documentsAudited: rows.length,
    parsedRows: rows.filter((row) => !row.missingFields.length).length,
    rowsForReview: rows.filter((row) => row.missingFields.length).length,
    subjectsFound: rows.filter((row) => row.subject).length,
    participantsBlocksFound: rows.filter((row) => row.participantsBlock).length,
    dateTimePlaceFound: rows.filter((row) => row.dateTimePlace).length,
    classificationMarkingsFound: rows.filter((row) => row.classification.marking).length,
    notetakersFound: rows.filter((row) => row.notetaker).length,
    interpretersFound: rows.filter((row) => row.interpreter).length
  },
  rows
};

fs.writeFileSync(path.join(ROOT, "reports/face-page-metadata.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(rows);
writeHtml(report);
console.log(JSON.stringify(report.summary, null, 2));
