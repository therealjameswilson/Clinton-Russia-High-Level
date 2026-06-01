const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PDFTOTEXT = process.env.PDFTOTEXT || "pdftotext";
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

const TOPICS = [
  {
    id: "nato-european-security",
    label: "NATO / European Security",
    terms: ["nato", "partnership for peace", "pfp", "european security", "helsinki", "paris", "denver"]
  },
  {
    id: "kosovo-balkans",
    label: "Kosovo / Balkans",
    terms: ["kosovo", "yugoslavia", "serbia", "milosevic", "balkans", "cernomyrdin", "kfor", "contact group"]
  },
  {
    id: "ukraine-nuclear-security",
    label: "Ukraine / Nuclear Security",
    terms: ["ukraine", "kravchuk", "trilateral", "nuclear weapons", "nuclear", "budapest"]
  },
  {
    id: "arms-control-nonproliferation",
    label: "Arms Control / Nonproliferation",
    terms: ["abm", "start", "missile", "cfe", "nonproliferation", "chemical weapons", "biological weapons"]
  },
  {
    id: "economic-reform-assistance",
    label: "Economic Reform / Assistance",
    terms: ["economic", "reform", "imf", "loan", "assistance", "aid", "ruble", "privatization", "g-7", "g7"]
  },
  {
    id: "russian-politics-elections",
    label: "Russian Politics / Elections",
    terms: ["election", "duma", "zyuganov", "communist", "democracy", "opposition", "constitution"]
  },
  {
    id: "chechnya-caucasus",
    label: "Chechnya / Caucasus",
    terms: ["chechnya", "chechen", "caucasus", "dudayev"]
  },
  {
    id: "iraq-middle-east",
    label: "Iraq / Middle East",
    terms: ["iraq", "saddam", "sanctions", "jordan", "middle east", "iran"]
  }
];

const PEOPLE_AND_ORGS = [
  "Albright",
  "Berger",
  "Christopher",
  "Chernomyrdin",
  "Gore",
  "Ivanov",
  "Kohl",
  "Kozyrev",
  "Kravchuk",
  "Milosevic",
  "Primakov",
  "Talbott",
  "Tudjman",
  "Yeltsin",
  "Zyuganov",
  "IMF",
  "NATO",
  "UN",
  "G-7"
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

function extractText(pdfPath) {
  return execFileSync(PDFTOTEXT, ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 25 * 1024 * 1024
  });
}

function countTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = term.includes(" ")
    ? new RegExp(escaped.replace(/\s+/g, "\\s+"), "gi")
    : new RegExp(`\\b${escaped}\\b`, "gi");
  return (text.match(pattern) || []).length;
}

function analyzeDocument(record, packetRowsById) {
  const pdfPath = path.join(ROOT, record.pdfUrl);
  const text = extractText(pdfPath);
  const normalized = text.replace(/\s+/g, " ").trim();
  const topicHits = TOPICS.map((topic) => {
    const termHits = topic.terms
      .map((term) => ({ term, hits: countTerm(text, term) }))
      .filter((item) => item.hits > 0);
    return {
      id: topic.id,
      label: topic.label,
      hits: termHits.reduce((sum, item) => sum + item.hits, 0),
      terms: termHits
    };
  }).filter((topic) => topic.hits > 0);
  const nameHits = PEOPLE_AND_ORGS.map((term) => ({ term, hits: countTerm(text, term) })).filter(
    (item) => item.hits > 0
  );
  const packet = packetRowsById.get(record.id) || {};

  return {
    id: record.id,
    sequence: packet.sequence || null,
    date: record.date,
    type: record.type,
    title: record.documentTitle || record.title,
    actualConversationPages: record.pageCount,
    packetPageStart: packet.packetPageStart || null,
    packetPageEnd: packet.packetPageEnd || null,
    actualConversationPacketPages: packet.actualConversationPacketPageStart
      ? `${packet.actualConversationPacketPageStart}-${packet.actualConversationPacketPageEnd}`
      : "",
    provenanceSheetPacketPage: packet.provenanceSheetPacketPage || null,
    derivativePdfUrl: siteUrl(record.pdfUrl),
    wordCount: normalized ? normalized.split(/\s+/).length : 0,
    topics: topicHits,
    peopleAndOrgs: nameHits
  };
}

function buildTopicSections(documents) {
  return TOPICS.map((topic) => {
    const docs = documents
      .map((document) => {
        const hit = document.topics.find((item) => item.id === topic.id);
        if (!hit) return null;
        return {
          id: document.id,
          sequence: document.sequence,
          date: document.date,
          type: document.type,
          title: document.title,
          packetPageStart: document.packetPageStart,
          packetPageEnd: document.packetPageEnd,
          actualConversationPacketPages: document.actualConversationPacketPages,
          derivativePdfUrl: document.derivativePdfUrl,
          hits: hit.hits,
          terms: hit.terms
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.hits - a.hits || a.date.localeCompare(b.date) || a.sequence - b.sequence);
    return {
      id: topic.id,
      label: topic.label,
      documentCount: docs.length,
      totalHits: docs.reduce((sum, doc) => sum + doc.hits, 0),
      documents: docs
    };
  });
}

function buildNameIndex(documents) {
  return PEOPLE_AND_ORGS.map((term) => {
    const docs = documents
      .map((document) => {
        const hit = document.peopleAndOrgs.find((item) => item.term === term);
        if (!hit) return null;
        return {
          id: document.id,
          sequence: document.sequence,
          date: document.date,
          type: document.type,
          title: document.title,
          packetPageStart: document.packetPageStart,
          packetPageEnd: document.packetPageEnd,
          hits: hit.hits,
          derivativePdfUrl: document.derivativePdfUrl
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.hits - a.hits || a.date.localeCompare(b.date) || a.sequence - b.sequence);
    return {
      term,
      documentCount: docs.length,
      totalHits: docs.reduce((sum, doc) => sum + doc.hits, 0),
      documents: docs
    };
  }).filter((item) => item.documentCount > 0);
}

function writeCsv(topicSections) {
  const fields = [
    "topic",
    "sequence",
    "date",
    "type",
    "packetPages",
    "actualConversationPacketPages",
    "hits",
    "terms",
    "title",
    "pdf"
  ];
  const rows = [];
  for (const section of topicSections) {
    for (const doc of section.documents) {
      rows.push([
        section.label,
        doc.sequence,
        doc.date,
        doc.type,
        `${doc.packetPageStart}-${doc.packetPageEnd}`,
        doc.actualConversationPacketPages,
        doc.hits,
        doc.terms.map((term) => `${term.term}:${term.hits}`).join("; "),
        doc.title,
        doc.derivativePdfUrl
      ]);
    }
  }
  fs.writeFileSync(
    path.join(ROOT, "reports/topic-index.csv"),
    `${fields.join(",")}\n${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`
  );
}

function writeHtml(report) {
  const topicSections = report.topicSections
    .map(
      (section) => `<section>
        <h2>${htmlCell(section.label)}</h2>
        <p>${section.documentCount} documents / ${section.totalHits} keyword hits</p>
        <table>
          <thead><tr><th>Seq</th><th>Date</th><th>Type</th><th>Packet Pages</th><th>Hits</th><th>Matched Terms</th><th>Document</th></tr></thead>
          <tbody>${section.documents
            .map(
              (doc) => `<tr>
                <td>${htmlCell(doc.sequence)}</td>
                <td>${htmlCell(doc.date)}</td>
                <td>${htmlCell(doc.type)}</td>
                <td>${htmlCell(`${doc.packetPageStart}-${doc.packetPageEnd}`)}</td>
                <td>${htmlCell(doc.hits)}</td>
                <td>${htmlCell(doc.terms.map((term) => `${term.term} (${term.hits})`).join(", "))}</td>
                <td><a href="${htmlCell(doc.derivativePdfUrl)}">${htmlCell(doc.title)}</a></td>
              </tr>`
            )
            .join("\n")}</tbody>
        </table>
      </section>`
    )
    .join("\n");
  const nameRows = report.nameIndex
    .map(
      (item) => `<tr>
        <td>${htmlCell(item.term)}</td>
        <td>${htmlCell(item.documentCount)}</td>
        <td>${htmlCell(item.totalHits)}</td>
        <td>${htmlCell(item.documents.slice(0, 8).map((doc) => `#${doc.sequence} ${doc.date}`).join("; "))}</td>
      </tr>`
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Compiler Topic Index</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f6; }
      main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); }
      h2 { margin-top: 34px; font-size: clamp(1.45rem, 3vw, 2.15rem); }
      a { color: #25364f; font-weight: 800; }
      .lede { max-width: 880px; color: #5f6874; font-size: 1.05rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #25364f; border-radius: 6px; }
      .actions a:nth-child(even) { color: #25364f; background: white; border: 1px solid #d7dedb; }
      .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      .summary div { padding: 14px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      .summary dt { color: #5f6874; font-size: .78rem; font-weight: 900; text-transform: uppercase; }
      .summary dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.55rem; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #25364f; font-size: .78rem; text-transform: uppercase; }
      td:nth-child(1), td:nth-child(4), td:nth-child(5) { text-align: right; white-space: nowrap; }
      @media (max-width: 760px) { .summary { grid-template-columns: 1fr 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Compiler Topic Index</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)} from OCR/text extraction of the 85 page-counted Clinton-Yeltsin memcons and telcons. Counts are keyword aids for triage, not final editorial subject headings.</p>
      <div class="actions">
        <a href="topic-index.csv">Download topic index CSV</a>
        <a href="topic-index.json">Open topic index JSON</a>
        <a href="../public/documents/clinton-yeltsin-core-reading-packet.pdf">Open reading packet PDF</a>
        <a href="reading-packet-manifest.json">Open packet manifest</a>
      </div>
      <dl class="summary">
        <div><dt>Documents Indexed</dt><dd>${htmlCell(report.summary.documentsIndexed)}</dd></div>
        <div><dt>Total Words</dt><dd>${htmlCell(report.summary.totalWords.toLocaleString("en-US"))}</dd></div>
        <div><dt>Topic Sections</dt><dd>${htmlCell(report.summary.topicSections)}</dd></div>
        <div><dt>Name Entries</dt><dd>${htmlCell(report.summary.nameIndexEntries)}</dd></div>
      </dl>
      <h2>Name / Organization Index</h2>
      <table>
        <thead><tr><th>Term</th><th>Documents</th><th>Hits</th><th>Top Documents</th></tr></thead>
        <tbody>${nameRows}</tbody>
      </table>
      ${topicSections}
    </main>
  </body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, "reports/topic-index.html"), html);
}

const records = readJson(path.join(ROOT, "data", "memcons.json"));
const packetManifest = readJson(path.join(ROOT, "reports", "reading-packet-manifest.json"));
const packetRowsById = new Map(packetManifest.rows.map((row) => [row.id, row]));
const documents = candidateDocuments(records).map((record) => analyzeDocument(record, packetRowsById));
const topicSections = buildTopicSections(documents);
const nameIndex = buildNameIndex(documents);
const report = {
  generatedAt: new Date().toISOString(),
  scope:
    "Keyword and name index for the 85 page-counted Clinton-Yeltsin memcons and telcons. Generated with pdftotext from the extracted derivative PDFs; use as a compiler triage aid, not as final FRUS indexing.",
  totalTopicsDefined: TOPICS.length,
  summary: {
    documentsIndexed: documents.length,
    totalWords: documents.reduce((sum, doc) => sum + doc.wordCount, 0),
    topicSections: topicSections.length,
    nameIndexEntries: nameIndex.length,
    documentsWithoutTopicHits: documents.filter((doc) => !doc.topics.length).length
  },
  topicDefinitions: TOPICS,
  topicSections,
  nameIndex,
  documents
};

fs.writeFileSync(path.join(ROOT, "reports/topic-index.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(topicSections);
writeHtml(report);
console.log(JSON.stringify(report.summary, null, 2));
