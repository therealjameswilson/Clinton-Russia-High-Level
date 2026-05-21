#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "memcons.json");
const MANIFEST_PATH = path.join(ROOT, "reports", "extracted-pdf-manifest.json");

const SOURCE_FILES = {
  "2015-0782-M-1": process.env.M1_PDF || "/private/tmp/2015-0782-M-1.pdf",
  "2015-0782-M-2": process.env.M2_PDF || "/private/tmp/2015-0782-M-2.pdf",
  "2014-0996-M": process.env.TOKYO_PDF || "/private/tmp/2014-0996-M.pdf",
  "2014-0901-M": process.env.VANCOUVER_PDF || "/private/tmp/6-YeltsinVancouver.pdf",
  "2014-0948-M": process.env.HYDE_PARK_PDF || "/private/tmp/7-YeltsinHydePark.pdf",
  "2016-0620-M": process.env.OCT1998_PDF || "/private/tmp/2016-0620-M-item100503.pdf",
  "clinton-item-119190": process.env.DEC1998_PDF || "/private/tmp/item119190-dec1998.pdf"
};

const SPECIAL_SOURCE_FILES = {
  C06694502: process.env.C06694502_PDF || "/private/tmp/C06694502.pdf",
  C06694499: process.env.C06694499_PDF || "/private/tmp/C06694499.pdf",
  C06835181: process.env.C06835181_PDF || "/private/tmp/C06835181.pdf",
  "2016-0118-M-4": process.env.SHARM_PDF || "/private/tmp/2016-0118-M-4.pdf"
};

const SPECIAL_PAGE_RANGES = {
  "contact-1994-01-14-memcon-second-expanded-bilateral-session": "2-9",
  "contact-1994-01-14-memcon-trilateral-yeltsin-kravchuk": "2-4"
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
  return result.stdout || "";
}

function parsePageRanges(value) {
  const text = String(value || "").trim();
  if (!/^\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*$/.test(text)) return null;

  return text.split(",").flatMap((part) => {
    const [start, end = start] = part.trim().split("-").map(Number);
    if (!start || end < start) throw new Error(`Invalid page range: ${value}`);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });
}

function pageNumbers(start, end = start) {
  const first = Number(start);
  const last = Number(end);
  if (!first || !last || last < first) return null;
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function pagesForRecord(record) {
  const override = SPECIAL_PAGE_RANGES[record.id];
  if (override) return parsePageRanges(override);

  const direct = parsePageRanges(record.sourcePdfPages);
  if (direct) return direct;

  const text = String(record.sourcePdfPages || "");
  const conversationMatch = text.match(/conversation pages?\s+(\d+)(?:-(\d+))?/i);
  if (conversationMatch) return pageNumbers(conversationMatch[1], conversationMatch[2]);

  const pagesMatch = text.match(/\bpages?\s+(\d+)(?:-(\d+))?/i);
  if (pagesMatch) return pageNumbers(pagesMatch[1], pagesMatch[2]);

  return null;
}

function sourcePathForRecord(record) {
  const text = `${record.naid || ""} ${record.sourcePdfPages || ""} ${record.source?.caseNumber || ""}`;

  for (const [key, sourcePath] of Object.entries(SPECIAL_SOURCE_FILES)) {
    if (text.includes(key)) return sourcePath;
  }

  const sourceCase = record.source?.caseNumber || record.naid || "";
  return SOURCE_FILES[sourceCase];
}

function splitPdfText(sourcePath) {
  const text = run("pdftotext", ["-layout", sourcePath, "-"]);
  return text.split("\f").map((page) => page.trim());
}

function firstNonEmptyLineAfter(text, label) {
  const lines = text.split(/\r?\n/);
  const labelPattern = new RegExp(`^\\s*${label}\\s*:?\\s*(.*)$`, "i");

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(labelPattern);
    if (!match) continue;

    const inline = cleanMarkerField(match[1]);
    if (inline) return inline;

    for (let next = index + 1; next < lines.length; next += 1) {
      if (isMarkerFieldBoundary(lines[next])) break;
      const value = cleanMarkerField(lines[next]);
      if (value) return value;
    }
  }

  return "";
}

function isMarkerFieldBoundary(value = "") {
  return /^\s*(?:COLLECTION|OA\/Box Number|FOLDER TITLE|RESTRICTION CODES|Document ID|Original OA\/ID Number|RECORD ID|DOCUMENT NO\.|SUBJECT\/TITLE|DATE|RESTRICTION|AND TYPE)\s*:?\s*$/i.test(value);
}

function cleanMarkerField(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || /^[;:.,|/\\-]+$/.test(text) || /^FOLDER TITLE:?$/i.test(text)) return "";
  return text;
}

function markerCaseNumber(text) {
  const explicit = text.match(/Case Number:[^\n]*?\b(20\d{2}-\d{4}-[MF](?:-Release-[A-Z])?(?:-\d+)?)\b/i);
  if (explicit) return explicit[1].trim();

  const matches = [...text.matchAll(/\b(20\d{2}-\d{4}-[MF](?:-Release-[A-Z])?(?:-\d+)?)\b/gi)];
  return matches.length ? matches[matches.length - 1][1].trim() : "";
}

function markerCollection(text) {
  const match = text.match(/COLLECTION:\s*([\s\S]*?)(?:\n\s*OA\/Box Number:|\n\s*FOLDER TITLE:|\n\s*RESTRICTION CODES)/i);
  if (!match) return "";

  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ");
}

function markerOaBoxNumber(text) {
  const looseMatch = text.match(/[O0][A\/\\]?[V\/\\]?[ \t]*B[o0][.,\\]?x[ \t]+Number[:;]?[ \t]*([0-9]+)/i);
  if (looseMatch) return cleanMarkerField(looseMatch[1]);

  const match = text.match(/OA\/Box Number:[ \t]*([0-9A-Z-]+)/i);
  if (match && !/^folder$/i.test(cleanMarkerField(match[1]))) return cleanMarkerField(match[1]);

  const value = firstNonEmptyLineAfter(text, "OA\\/Box Number");
  return /^\d/.test(value) ? value : "";
}

function markerMetadata(text) {
  const documentId = firstNonEmptyLineAfter(text, "Document ID");
  const folderTitle = firstNonEmptyLineAfter(text, "FOLDER TITLE");
  const recordMatch = text.match(/\bRECORD ID:\s*([A-Z0-9-]+)/i);
  const originalOaId = firstNonEmptyLineAfter(text, "Original OA\\/ID Number");

  return {
    markerCaseNumber: markerCaseNumber(text),
    markerOriginalOaId: originalOaId,
    markerDocumentId: documentId || folderTitle || recordMatch?.[1]?.trim() || "",
    markerExplicitDocumentId: documentId,
    markerFolderTitle: folderTitle,
    markerRecordId: recordMatch?.[1]?.trim() || "",
    markerOaBoxNumber: markerOaBoxNumber(text),
    markerCollection: markerCollection(text)
  };
}

function markerPages(pageTexts) {
  return pageTexts
    .map((text, index) => ({ page: index + 1, text }))
    .filter(
      ({ text }) =>
        (/\bMARKER\b/i.test(text) && /Document\s*ID/i.test(text)) ||
        (/Withdrawal\/Redaction Sheet/i.test(text) && /DOCUMENT NO\./i.test(text))
    )
    .map(({ page, text }) => {
      return {
        page,
        ...markerMetadata(text)
      };
    });
}

function nearestPrecedingMarker(markers, startPage) {
  const candidates = markers.filter((marker) => marker.page < startPage);
  return candidates.length ? candidates[candidates.length - 1] : null;
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function outputPath(record) {
  if (/^public\/documents\//.test(record.pdfUrl || "")) return path.join(ROOT, record.pdfUrl);
  const base = record.id.startsWith("contact-") ? record.id.slice("contact-".length) : record.id;
  return path.join(ROOT, "public", "documents", `${slug(base)}.pdf`);
}

function extractPdf({ sourcePath, pages, markerPage, outPath }) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const qpdfArgs = ["--empty", "--pages", sourcePath, pages.join(",")];
  if (markerPage) qpdfArgs.push(sourcePath, String(markerPage));
  qpdfArgs.push("--", outPath);
  run("qpdf", qpdfArgs);
}

function pageTextLooksLikeConversation(pageTexts, pages) {
  const text = pages.map((page) => pageTexts[page - 1] || "").join("\n");
  return (
    (/MEM[O0]R.{0,6}NDUM OF (TELEPHONE )?CONVERSATION/i.test(text) ||
      /MEM[O0]R.{0,6}NDUM OF GONVERSATION/i.test(text) ||
      /Cl.?inton-Yeltsin Meeting/i.test(text) ||
      /(?:Clinton|POTUS)[-\s]Yeltsin.*One[-\s]On[-\s]One/i.test(text) ||
      /One[-\s]On[-\s]One Meeting\s+Between Presidents Clinton and Yeltsin/i.test(text)) &&
    /Yeltsin/i.test(text) &&
    /(President|Clinton|The President|WJC|BNY)/i.test(text)
  );
}

function main() {
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const textCache = new Map();
  const markerCache = new Map();
  const documents = [];
  const skipped = [];

  for (const record of records) {
    if (record.chapter?.name !== "Clinton-Yeltsin Chronology") continue;
    if (record.type !== "Memcon" && record.type !== "Telcon") continue;
    if (record.potentialFrusDocument === false) continue;
    if (!Number.isInteger(record.pageCount)) continue;

    const sourceCase = record.source?.caseNumber || record.naid || "";
    const sourcePath = sourcePathForRecord(record);
    const pages = pagesForRecord(record);

    if (!sourcePath || !pages) {
      skipped.push({
        recordId: record.id,
        title: record.documentTitle || record.title,
        sourceCase,
        sourcePdfPages: record.sourcePdfPages || "",
        reason: sourcePath ? "non-numeric source page map" : "source PDF not mapped locally"
      });
      continue;
    }

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source PDF for ${sourceCase} does not exist: ${sourcePath}`);
    }

    if (!textCache.has(sourcePath)) {
      const pageTexts = splitPdfText(sourcePath);
      textCache.set(sourcePath, pageTexts);
      markerCache.set(sourcePath, markerPages(pageTexts));
    }

    const pageTexts = textCache.get(sourcePath);
    const markers = markerCache.get(sourcePath);
    const firstPage = Math.min(...pages);
    const marker = nearestPrecedingMarker(markers, firstPage);
    const markerPage = marker?.page || null;
    const outPath = outputPath(record);
    const relativeOutput = path.relative(ROOT, outPath).replaceAll(path.sep, "/");

    extractPdf({ sourcePath, pages, markerPage, outPath });

    documents.push({
      recordId: record.id,
      date: record.date,
      type: record.type,
      title: record.documentTitle || record.title,
      sourceCase,
      sourcePdfPages: record.sourcePdfPages,
      extractedPages: pages.join(","),
      markerPage,
      markerDocumentId: marker?.markerDocumentId || "",
      markerExplicitDocumentId: marker?.markerExplicitDocumentId || "",
      markerCaseNumber: marker?.markerCaseNumber || "",
      markerOriginalOaId: marker?.markerOriginalOaId || "",
      markerFolderTitle: marker?.markerFolderTitle || "",
      markerRecordId: marker?.markerRecordId || "",
      markerOaBoxNumber: marker?.markerOaBoxNumber || "",
      markerCollection: marker?.markerCollection || "",
      output: relativeOutput,
      pageCount: record.pageCount,
      localPdfPageCount: record.pageCount + (markerPage ? 1 : 0),
      conversationTextCheck: pageTextLooksLikeConversation(pageTexts, pages) ? "pass" : "review"
    });
  }

  documents.sort((a, b) => a.date.localeCompare(b.date) || a.recordId.localeCompare(b.recordId));
  skipped.sort((a, b) => a.recordId.localeCompare(b.recordId));

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        rule:
          "Each output PDF contains only the actual memcon/telcon pages identified in sourcePdfPages, followed by the nearest preceding original PDF marker page when present.",
        totalExtracted: documents.length,
        totalSkipped: skipped.length,
        documents,
        skipped
      },
      null,
      2
    )}\n`
  );

  console.log(`Extracted ${documents.length} PDFs`);
  console.log(`Skipped ${skipped.length} records`);
  console.log(`Wrote ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main();
