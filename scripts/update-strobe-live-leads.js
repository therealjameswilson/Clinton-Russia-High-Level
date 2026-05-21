const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_URL = "https://therealjameswilson.github.io/strobe-talbott-foia/manifest.html";
const ENRICHED_CSV_URL =
  "https://therealjameswilson.github.io/strobe-talbott-foia/data/manifest_enriched.csv";
const OUTPUT =
  process.env.STROBE_LIVE_YELTSIN_PDF_LEADS ||
  path.join(ROOT, "data", "strobe-live-yeltsin-pdf-leads.json");
const MATCH_RE =
  /\bYELTSIN\b|\bYELSTIN\b|POTUS-YELTSIN|CLINTON-YELTSIN|P0TUS-\s*YELTSIN|PRESIDENT BORIS YELTSIN|PRESIDENT OF RUSSIA BORIS YELTSIN/i;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...data] = rows;
  return data
    .filter((item) => item.length === header.length)
    .map((item) => Object.fromEntries(header.map((name, index) => [name, item[index]])));
}

function normalizeDate(value) {
  if (!value || /^n\/a$/i.test(value)) return null;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function main() {
  const response = await fetch(ENRICHED_CSV_URL);
  if (!response.ok) throw new Error(`Failed to fetch ${ENRICHED_CSV_URL}: ${response.status}`);

  const rows = parseCsv(await response.text());
  const documents = rows
    .filter((row) => MATCH_RE.test(`${row.title || ""} ${row.description || ""}`))
    .map((row) => ({
      id: row.document_id,
      date: normalizeDate(row.date),
      manifestDate: row.date || "",
      title: row.title,
      url: row.pdf_url,
      description: row.description,
      descriptionSource: row.description_source || ""
    }));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    manifestUrl: MANIFEST_URL,
    csvUrl: ENRICHED_CSV_URL,
    filter:
      "title or enriched description matches Yeltsin/Yelstin/POTUS-Yeltsin/Clinton-Yeltsin",
    entryCount: rows.length,
    leadCount: documents.length,
    documents
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify({ output: OUTPUT, entryCount: rows.length, leadCount: documents.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
