const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORKSPACE = path.resolve(ROOT, "..");
const CLINTON_TEXT =
  process.env.CLINTON_FOREIGN_MEETINGS_TXT || "/private/tmp/clinton-foreign-meetings.txt";
const STROBE_MANIFEST =
  process.env.STROBE_MANIFEST ||
  path.join(WORKSPACE, "strobe-talbott-foia", "data", "manifest.json");

const FRUS_VOLUME = {
  id: "frus1993-00v18",
  title: "Foreign Relations of the United States, 1993-2000, Volume XVIII, Russia",
  url: "https://history.state.gov/historicaldocuments/frus1993-00v18",
  status: "Planned; not yet compiled or scheduled"
};

const EXTRACTION_RULE = {
  rule:
    "Derivative PDFs must contain only the pages of the actual memcon or telcon, followed by the original source marker page as a provenance sheet.",
  exclude:
    "Do not include surrounding talking points, briefing memos, correspondence, finding-aid pages, or withdrawal sheets as document pages.",
  markerPosition: "append-last"
};

const CHAPTERS = {
  chronology: { number: 1, name: "Clinton-Yeltsin Chronology" },
  packets: { number: 2, name: "Released Clinton Library Packets" },
  strobe: { number: 3, name: "Talbott FOIA Context" },
  scout: { number: 4, name: "NARA Scout Leads" }
};

const SOURCES = {
  leaderList: {
    name: "Clinton Library, Meetings and Telephone Calls with Foreign Leaders",
    url: "https://www.clintonlibrary.gov/research/meetings-and-telephone-calls-foreign-leaders",
    pdfUrl:
      "https://www.clintonlibrary.gov/sites/default/files/documents/clinton-foreign-meetings.pdf"
  },
  memconsTelcons: {
    name: "Clinton Library, Memcons and Telcons",
    url: "https://www.clintonlibrary.gov/research/memcons-and-telcons"
  },
  m1: {
    name: "Clinton Library MDR release 2015-0782-M-1",
    caseNumber: "2015-0782-M-1",
    url:
      "https://www.clintonlibrary.gov/research/archives/finding-aids/declassified-documents-concerning-russian-president-boris-yeltsin",
    pdfUrl: "https://www.clintonlibrary.gov/sites/default/files/finding_aids_a_z/2026-05/2015-0782-M-1.pdf"
  },
  m2: {
    name: "Clinton Library MDR release 2015-0782-M-2",
    caseNumber: "2015-0782-M-2",
    url:
      "https://www.clintonlibrary.gov/research/archives/finding-aids/declassified-documents-concerning-russian-president-boris-yeltsin-0",
    pdfUrl: "https://www.clintonlibrary.gov/sites/default/files/finding_aids_a_z/2026-01/2015-0782-M-2.pdf"
  },
  tokyo: {
    name: "Clinton Library MDR release 2014-0996-M",
    caseNumber: "2014-0996-M",
    url:
      "https://www.clintonlibrary.gov/research/archives/finding-aids/declassified-documents-concerning-russian-president-boris-yeltsin-4",
    pdfUrl: "https://www.clintonlibrary.gov/sites/default/files/finding_aids_a_z/2026-04/2014-0996-M.pdf"
  },
  kosovoLetter: {
    name: "Clinton Library MDR release 2014-0546-M-Release-A",
    caseNumber: "2014-0546-M-Release-A",
    url:
      "https://www.clintonlibrary.gov/research/archives/finding-aids/declassified-documents-concerning-russian-president-boris-yeltsin-11",
    pdfUrl: "https://www.clintonlibrary.gov/sites/default/files/finding_aids_a_z/2026-04/2014-0546-M-A.pdf"
  },
  strobe: {
    name: "Strobe Talbott FOIA manifest",
    caseNumber: "F-2017-13804",
    url: "https://therealjameswilson.github.io/strobe-talbott-foia/manifest.html"
  },
  naraScout: {
    name: "NARA Scout",
    url: "https://therealjameswilson.github.io/nara-scout/"
  },
  kerrickTelconsMemcons: {
    name: "National Archives Catalog, Telcons and Memcons, Donald Kerrick's Files",
    caseNumber: "2008-0994-F",
    url: "https://catalog.archives.gov/id/40482516",
    pdfUrl:
      "https://s3.amazonaws.com/NARAprodstorage/opastorage/live/16/4825/40482516/content/presidential-libraries/clinton/foia/2008/2008-0994-F/2008-0994-F-Bosnia-PDF/Box_26/42-t-7585486-20080994F-026-004-2016.pdf"
  },
  vancouverMemcons: {
    name: "National Archives Catalog, Memcons between President William Jefferson Clinton and President Boris Yeltsin",
    caseNumber: "2014-0901-M",
    url: "https://catalog.archives.gov/id/163545404",
    pdfUrl:
      "https://s3.amazonaws.com/NARAprodstorage/lz/presidential-libraries/clinton/wjc-nscrm/7585721/6-YeltsinVancouver.pdf"
  },
  hydeParkMemcons: {
    name: "National Archives Catalog, Memcon between President William Jefferson Clinton and President Boris Yeltsin",
    caseNumber: "2014-0948-M",
    url: "https://catalog.archives.gov/id/163545436",
    pdfUrl:
      "https://s3.amazonaws.com/NARAprodstorage/lz/presidential-libraries/clinton/wjc-nscrm/7585721/7-YeltsinHydePark.pdf"
  }
};

const DERIVED_PDFS = {
  vancouverDinner: "public/documents/1993-04-03-clinton-yeltsin-vancouver-working-dinner.pdf",
  vancouverSecurity:
    "public/documents/1993-04-04-clinton-yeltsin-vancouver-security-issues.pdf",
  hydeParkOneOnOne: "public/documents/1995-10-23-clinton-yeltsin-hyde-park-one-on-one.pdf",
  hydeParkLunch: "public/documents/1995-10-23-clinton-yeltsin-hyde-park-lunch.pdf"
};

const MONTHS = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12"
};
const MONTH_RE = Object.keys(MONTHS).join("|");

function ascii(value) {
  return String(value || "")
    .replace(/\f/g, "")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return ascii(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDatePhrase(value) {
  const match = ascii(value).match(
    new RegExp(`(${MONTH_RE})\\s+(\\d{1,2})(?:-\\d{1,2})?,\\s+(\\d{4})`)
  );
  if (!match) return null;
  const [, month, day, year] = match;
  return {
    phrase: match[0],
    iso: `${year}-${MONTHS[month]}-${String(day).padStart(2, "0")}`
  };
}

function formatDateLine(datePhrase, location) {
  return location ? `${datePhrase}, ${location}` : datePhrase;
}

function releaseStatus(value) {
  if (/declassified in full/i.test(value)) return "Full";
  if (/declassified in part/i.test(value)) return "Partial";
  if (/FOIA RESTRICTED|withdrawal|MDR/i.test(value)) return "FOIA/MDR Lead";
  if (/RELEASE IN FULL/i.test(value)) return "Full";
  if (/RELEASE IN PART/i.test(value)) return "Partial";
  return "Unknown";
}

function packetForDate(iso) {
  if (iso <= "1996-04-21") return SOURCES.m1;
  if (iso <= "1999-12-31") return SOURCES.m2;
  return SOURCES.leaderList;
}

function contactTopics(entry, iso, type) {
  const topics = ["Clinton-Yeltsin", "Russia high-level contacts", type];
  if (/Kravchuk|Ukraine/i.test(entry)) topics.push("Ukraine");
  if (iso >= "1997-01-01" && iso <= "1998-12-31") topics.push("NATO/Russia");
  if (iso >= "1999-03-24" && iso <= "1999-06-20") topics.push("Kosovo");
  if (iso === "1994-04-10") topics.push("Bosnia", "COCOM", "Export controls");
  if (/Helsinki|Denver|Paris|Cologne|Istanbul/i.test(entry)) topics.push("Summit diplomacy");
  return [...new Set(topics)];
}

function extractClintonYeltsinEntries(text) {
  const entries = [];
  let current = "";

  for (const rawLine of text.split(/\r?\n/)) {
    const clean = ascii(rawLine);
    if (!clean || /^\d+$/.test(clean)) continue;

    const startsContact = /^(Telephone call|Telephone Call|Meeting|Meetings)\b/.test(clean);
    if (startsContact) {
      if (/Yeltsin/i.test(current)) entries.push(current);
      current = clean;
      continue;
    }

    if (current && /^\s+/.test(rawLine)) {
      current = `${current} ${clean}`;
    }
  }

  if (/Yeltsin/i.test(current)) entries.push(current);
  return entries;
}

function buildChronologyRecords() {
  const text = fs.readFileSync(CLINTON_TEXT, "utf8");
  const entries = extractClintonYeltsinEntries(text);

  return entries.flatMap((entry, index) => {
    const date = parseDatePhrase(entry);
    if (!date) throw new Error(`Could not parse date from Clinton entry: ${entry}`);
    const type = /^Telephone/i.test(entry) ? "Telcon" : "Memcon";
    const afterDate = ascii(entry.slice(entry.indexOf(date.phrase) + date.phrase.length))
      .replace(/^,\s*/, "")
      .replace(/\s*declassified in (full|part)\b/i, "")
      .trim();
    const location = afterDate || "Location not stated";
    const source = packetForDate(date.iso);
    const related = [];
    if (date.iso === "1993-07-10" || /Tokyo/i.test(entry)) related.push(SOURCES.tokyo.caseNumber);
    if (date.iso === "1994-04-10") related.push("NARA NAID 40482516");
    if (date.iso >= "1999-03-24" && date.iso <= "1999-06-20") {
      related.push(SOURCES.kosovoLetter.caseNumber);
    }

    const record = {
      id: `contact-${date.iso}-${slug(type)}-${String(index + 1).padStart(2, "0")}`,
      date: date.iso,
      sortDate: date.iso,
      type,
      title: entry,
      documentTitle: entry.replace(/\s*declassified in (full|part)\b/i, ""),
      participants: [
        "Bill Clinton",
        "Boris Yeltsin",
        ...(entry.includes("Kravchuk") ? ["Leonid Kravchuk"] : [])
      ],
      countries: ["United States", "Russia", ...(entry.includes("Kravchuk") ? ["Ukraine"] : [])],
      chapter: CHAPTERS.chronology,
      releaseStatus: releaseStatus(entry),
      naid: source.caseNumber || "clinton-foreign-leaders-list",
      catalogUrl: source.url,
      pdfUrl: source.pdfUrl || SOURCES.leaderList.pdfUrl,
      pageCount: null,
      dateLine: formatDateLine(date.phrase, location),
      subjectLine:
        type === "Telcon"
          ? "Leader telephone conversation in the Clinton-Yeltsin channel."
          : "Leader meeting or memorandum of conversation in the Clinton-Yeltsin channel.",
      source,
      sourceNote: `Source: ${SOURCES.leaderList.name}, master chronology; release packet ${
        source.caseNumber || "not assigned"
      }${related.length ? `; related packet(s): ${related.join(", ")}` : ""}.`,
      extractionRule: EXTRACTION_RULE,
      frusVolume: FRUS_VOLUME,
      frusTopics: contactTopics(entry, date.iso, type),
      topics: contactTopics(entry, date.iso, type),
      relatedReleaseIds: related
    };

    if (date.iso === "1993-04-03" && /April 3-4, 1993, Vancouver/i.test(entry)) {
      const shared = {
        participants: [
          "Bill Clinton",
          "Boris Yeltsin",
          "Warren Christopher",
          "Lloyd Bentsen",
          "Anthony Lake",
          "Andrei Kozyrev",
          "Boris Fedorov",
          "Alexander Shokhin"
        ],
        countries: ["United States", "Russia"],
        chapter: CHAPTERS.chronology,
        releaseStatus: "Full",
        naid: "163545404",
        catalogUrl: SOURCES.vancouverMemcons.url,
        source: SOURCES.vancouverMemcons,
        extractionRule: EXTRACTION_RULE,
        relatedReleaseIds: ["2014-0901-M", "NARA NAID 163545404"]
      };

      return [
        {
          ...record,
          ...shared,
          id: "contact-1993-04-03-memcon-vancouver-working-dinner",
          date: "1993-04-03",
          sortDate: "1993-04-03",
          title: "Memorandum of conversation: Working Dinner with President Boris Yeltsin",
          documentTitle: "Working Dinner with President Boris Yeltsin",
          pdfUrl: DERIVED_PDFS.vancouverDinner,
          pageCount: 9,
          localPdfPageCount: 10,
          sourcePdfPages: "9-17",
          markerPage: 1,
          dateLine: "April 3, 1993, 6:30-8:30 p.m., Vancouver, Canada",
          subjectLine:
            "Vancouver summit working-dinner memcon covering Russian reform, economic support, energy, space cooperation, nuclear issues, and Bosnia.",
          sourceNote:
            "Source: National Archives Catalog item 163545404, Clinton Library case 2014-0901-M, NSC Records Management PRS Files, Document ID 9302226. Derivative PDF extracts source pages 9-17 and appends source marker page 1 as provenance sheet.",
          extractionStatus:
            "Extracted actual memcon pages 9-17 from the source PDF; appended original marker page 1 as the final provenance sheet.",
          frusTopics: [
            "Clinton-Yeltsin",
            "Russia high-level contacts",
            "Memcon",
            "Vancouver summit",
            "Russian reform",
            "G-7",
            "Energy",
            "Space cooperation",
            "Bosnia"
          ],
          topics: [
            "Clinton-Yeltsin",
            "Russia high-level contacts",
            "Memcon",
            "Vancouver summit",
            "Russian reform",
            "G-7",
            "Energy",
            "Space cooperation",
            "Bosnia"
          ]
        },
        {
          ...record,
          ...shared,
          id: "contact-1993-04-04-memcon-vancouver-security-issues",
          date: "1993-04-04",
          sortDate: "1993-04-04",
          title: "Memorandum of conversation: Meeting with Russian President Boris Yeltsin on Security Issues",
          documentTitle: "Meeting with Russian President Boris Yeltsin on Security Issues",
          pdfUrl: DERIVED_PDFS.vancouverSecurity,
          pageCount: 12,
          localPdfPageCount: 13,
          sourcePdfPages: "19-30",
          markerPage: 1,
          dateLine: "April 4, 1993, 10:00 a.m.-1:00 p.m., Pan Pacific Hotel, Vancouver, Canada",
          subjectLine:
            "Vancouver summit security-issues memcon covering HEU, Jackson-Vanik, COCOM, arms sales, nuclear testing, Ukraine, START, regional conflicts, and the G-7 package.",
          sourceNote:
            "Source: National Archives Catalog item 163545404, Clinton Library case 2014-0901-M, NSC Records Management PRS Files, Document ID 9302226. Derivative PDF extracts source pages 19-30 and appends source marker page 1 as provenance sheet.",
          extractionStatus:
            "Extracted actual memcon pages 19-30 from the source PDF; appended original marker page 1 as the final provenance sheet.",
          frusTopics: [
            "Clinton-Yeltsin",
            "Russia high-level contacts",
            "Memcon",
            "Vancouver summit",
            "HEU",
            "COCOM",
            "Jackson-Vanik",
            "Nuclear testing",
            "Ukraine",
            "START",
            "Bosnia"
          ],
          topics: [
            "Clinton-Yeltsin",
            "Russia high-level contacts",
            "Memcon",
            "Vancouver summit",
            "HEU",
            "COCOM",
            "Jackson-Vanik",
            "Nuclear testing",
            "Ukraine",
            "START",
            "Bosnia"
          ]
        }
      ];
    }

    if (date.iso === "1995-10-23" && /Hyde Park/i.test(entry)) {
      const shared = {
        participants: [
          "Bill Clinton",
          "Boris Yeltsin",
          "Strobe Talbott",
          "Dmitri Ryurikov",
          "Warren Christopher",
          "Anthony Lake",
          "Thomas Pickering",
          "Andrei Kozyrev",
          "Georgy Mamedov"
        ],
        countries: ["United States", "Russia", "Bosnia and Herzegovina"],
        chapter: CHAPTERS.chronology,
        releaseStatus: "Full",
        naid: "163545436",
        catalogUrl: SOURCES.hydeParkMemcons.url,
        source: SOURCES.hydeParkMemcons,
        extractionRule: EXTRACTION_RULE,
        relatedReleaseIds: ["2014-0948-M", "NARA NAID 163545436"]
      };

      return [
        {
          ...record,
          ...shared,
          id: "contact-1995-10-23-memcon-hyde-park-one-on-one",
          date: "1995-10-23",
          sortDate: "1995-10-23",
          title: "Memorandum of conversation: Clinton-Yeltsin One-on-One",
          documentTitle: "Clinton-Yeltsin One-on-One",
          pdfUrl: DERIVED_PDFS.hydeParkOneOnOne,
          pageCount: 12,
          localPdfPageCount: 13,
          sourcePdfPages: "5-16",
          markerPage: 1,
          dateLine: "October 23, 1995, 11:30 a.m.-1:35 p.m., Hyde Park, New York",
          subjectLine:
            "Hyde Park one-on-one memcon covering Bosnia, NATO command arrangements, CFE, nuclear issues, Russia policy, and the Clinton-Yeltsin partnership.",
          sourceNote:
            "Source: National Archives Catalog item 163545436, Clinton Library case 2014-0948-M, NSC Records Management PRS Files, Document ID 9507853. Derivative PDF extracts source pages 5-16 and appends source marker page 1 as provenance sheet.",
          extractionStatus:
            "Extracted actual memcon pages 5-16 from the source PDF; appended original marker page 1 as the final provenance sheet.",
          frusTopics: [
            "Clinton-Yeltsin",
            "Russia high-level contacts",
            "Memcon",
            "Hyde Park",
            "Bosnia",
            "NATO",
            "CFE",
            "Nuclear issues"
          ],
          topics: [
            "Clinton-Yeltsin",
            "Russia high-level contacts",
            "Memcon",
            "Hyde Park",
            "Bosnia",
            "NATO",
            "CFE",
            "Nuclear issues"
          ]
        },
        {
          ...record,
          ...shared,
          id: "contact-1995-10-23-memcon-hyde-park-lunch",
          date: "1995-10-23",
          sortDate: "1995-10-23-lunch",
          title: "Memorandum of conversation: Lunch with Boris Yeltsin, President of Russian Federation",
          documentTitle: "Lunch with Boris Yeltsin, President of Russian Federation",
          pdfUrl: DERIVED_PDFS.hydeParkLunch,
          pageCount: 5,
          localPdfPageCount: 6,
          sourcePdfPages: "31-35",
          markerPage: 18,
          dateLine: "October 23, 1995, Hyde Park, New York",
          subjectLine:
            "Hyde Park lunch memcon continuing the Clinton-Yeltsin discussion of Bosnia implementation, NATO/Russia arrangements, China, and relationship management.",
          sourceNote:
            "Source: National Archives Catalog item 163545436, Clinton Library case 2014-0948-M, NSC Records Management PRS Files, Document ID 9507991. Derivative PDF extracts the complete lunch memcon from source pages 31-35 and appends source marker page 18 as provenance sheet; earlier pages 24-27 are a duplicate copy and were not included.",
          extractionStatus:
            "Extracted complete lunch memcon pages 31-35 from the source PDF; appended original marker page 18 as the final provenance sheet. Duplicate lunch pages 24-27 were excluded.",
          frusTopics: [
            "Clinton-Yeltsin",
            "Russia high-level contacts",
            "Memcon",
            "Hyde Park",
            "Bosnia",
            "NATO/Russia",
            "China"
          ],
          topics: [
            "Clinton-Yeltsin",
            "Russia high-level contacts",
            "Memcon",
            "Hyde Park",
            "Bosnia",
            "NATO/Russia",
            "China"
          ]
        }
      ];
    }

    return [record];
  });
}

function buildReleasePackets() {
  return [
    {
      id: "release-2015-0782-m-1",
      date: "1993-01-23",
      sortDate: "1993-01-23",
      type: "Release Packet",
      title: "(2015-0782-M-1) Declassified documents concerning Russian President Boris Yeltsin",
      documentTitle:
        "MDR packet 2015-0782-M-1: Clinton-Yeltsin memcons and telcons, Jan. 23, 1993-Apr. 21, 1996",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.packets,
      releaseStatus: "Mixed",
      naid: SOURCES.m1.caseNumber,
      catalogUrl: SOURCES.m1.url,
      pdfUrl: SOURCES.m1.pdfUrl,
      pageCount: null,
      dateLine: "Coverage begins January 23, 1993",
      subjectLine:
        "Finding-aid packet for Clinton-Yeltsin memoranda of conversation and telephone calls through April 21, 1996.",
      source: SOURCES.m1,
      sourceNote:
        "Source: Clinton Presidential Library MDR release 2015-0782-M-1; summary identifies memcons and telcons between President Clinton and President Boris Yeltsin.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["Clinton-Yeltsin", "MDR release", "Russia high-level contacts"],
      topics: ["MDR release", "Clinton Library"]
    },
    {
      id: "release-2015-0782-m-2",
      date: "1996-04-21",
      sortDate: "1996-04-21",
      type: "Release Packet",
      title: "(2015-0782-M-2) Declassified documents concerning Russian President Boris Yeltsin",
      documentTitle:
        "MDR packet 2015-0782-M-2: Clinton-Yeltsin memcons and telcons, Apr. 21, 1996-Dec. 31, 1999",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.packets,
      releaseStatus: "Mixed",
      naid: SOURCES.m2.caseNumber,
      catalogUrl: SOURCES.m2.url,
      pdfUrl: SOURCES.m2.pdfUrl,
      pageCount: null,
      dateLine: "Coverage begins April 21, 1996",
      subjectLine:
        "Finding-aid packet for Clinton-Yeltsin memoranda of conversation and telephone calls through December 31, 1999.",
      source: SOURCES.m2,
      sourceNote:
        "Source: Clinton Presidential Library MDR release 2015-0782-M-2; summary identifies Clinton-Yeltsin memcons and telcons.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["Clinton-Yeltsin", "MDR release", "Russia high-level contacts"],
      topics: ["MDR release", "Clinton Library"]
    },
    {
      id: "release-2014-0996-m",
      date: "1993-07-14",
      sortDate: "1993-07-14",
      type: "Release Packet",
      title: "(2014-0996-M) Declassified documents concerning Russian President Boris Yeltsin",
      documentTitle: "MDR packet 2014-0996-M: Clinton-Yeltsin G7 Summit memcon, Tokyo, July 14, 1993",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.packets,
      releaseStatus: "Unknown",
      naid: SOURCES.tokyo.caseNumber,
      catalogUrl: SOURCES.tokyo.url,
      pdfUrl: SOURCES.tokyo.pdfUrl,
      pageCount: null,
      dateLine: "July 14, 1993, Tokyo",
      subjectLine: "Single-release packet for a Clinton-Yeltsin G7 Summit memorandum of conversation.",
      source: SOURCES.tokyo,
      sourceNote:
        "Source: Clinton Presidential Library MDR release 2014-0996-M; finding-aid summary identifies a G7 Summit memcon in Tokyo.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["Clinton-Yeltsin", "Summit diplomacy", "MDR release"],
      topics: ["MDR release", "Tokyo G7"]
    },
    {
      id: "release-2014-0546-m-a",
      date: "1999-06-04",
      sortDate: "1999-06-04",
      type: "Release Packet",
      title: "(2014-0546-M-Release-A) Declassified documents concerning Russian President Boris Yeltsin and Kosovo",
      documentTitle: "MDR packet 2014-0546-M-Release-A: Clinton letter to Yeltsin on Kosovo, June 4, 1999",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.packets,
      releaseStatus: "Unknown",
      naid: SOURCES.kosovoLetter.caseNumber,
      catalogUrl: SOURCES.kosovoLetter.url,
      pdfUrl: SOURCES.kosovoLetter.pdfUrl,
      pageCount: null,
      dateLine: "June 4, 1999",
      subjectLine: "Release packet for Clinton correspondence to Yeltsin on Kosovo.",
      source: SOURCES.kosovoLetter,
      sourceNote:
        "Source: Clinton Presidential Library MDR release 2014-0546-M-Release-A; finding-aid summary identifies multiple copies of a Clinton letter to Yeltsin concerning Kosovo.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["Kosovo", "Clinton-Yeltsin", "MDR release"],
      topics: ["Kosovo", "MDR release"]
    }
  ];
}

function strobeScore(record) {
  const title = ascii(record.title);
  let score = 0;
  if (/CLINTON.*YELTSIN|YELTSIN.*CLINTON|POTUS-YELTSIN|PRESIDENT.*YELTSIN|YELTSIN-TALBOTT|PRESIDENTIAL TELCON|RUSSIAN PRESIDENT YEL/i.test(title)) {
    score += 120;
  }
  if (/NATO\/RUSSIA|NATO-RUSSIA|RUSSIA-NATO|FOUNDING ACT/i.test(title)) score += 80;
  if (/PRIMAKOV|CHERNOMYRDIN|CHUBAIS|KOZYREV|MAMEDOV|RYURIKOV|KIRIYENKO|STEPASHIN/i.test(title)) {
    score += 70;
  }
  if (/KOSOVO/i.test(title)) score += 60;
  if (/START|CFE|ABM|ARMS CONTROL|NONPROLIFERATION/i.test(title)) score += 45;
  if (/MOSCOW|RUSSIA|RUSSIAN|BELARUS|UKRAINE/i.test(title)) score += 30;
  return score;
}

function buildStrobeRecords() {
  const manifest = JSON.parse(fs.readFileSync(STROBE_MANIFEST, "utf8"));
  const seen = new Set();
  const ranked = manifest
    .filter((record) => record.date && record.date >= "1993-01-01" && record.date <= "2000-12-31")
    .map((record) => ({ record, score: strobeScore(record) }))
    .filter(({ score }) => score >= 70)
    .sort((a, b) => b.score - a.score || a.record.date.localeCompare(b.record.date));

  const selected = [];
  for (const { record, score } of ranked) {
    const key = `${record.date}-${slug(record.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push({ ...record, score });
    if (selected.length >= 45) break;
  }

  return selected.map((record) => {
    const title = ascii(record.title);
    const topics = ["Talbott FOIA", "Russia policy context"];
    if (/YELTSIN/i.test(title)) topics.push("Yeltsin");
    if (/NATO/i.test(title)) topics.push("NATO/Russia");
    if (/KOSOVO/i.test(title)) topics.push("Kosovo");
    if (/PRIMAKOV/i.test(title)) topics.push("Primakov");
    if (/CHERNOMYRDIN/i.test(title)) topics.push("Chernomyrdin");
    if (/CHUBAIS/i.test(title)) topics.push("Chubais");

    return {
      id: `strobe-${record.id.toLowerCase()}`,
      date: record.date,
      sortDate: record.date,
      type: "Context",
      title,
      documentTitle: title,
      participants: [],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.strobe,
      releaseStatus: releaseStatus(record.release_status),
      naid: record.id,
      catalogUrl: SOURCES.strobe.url,
      pdfUrl: record.source_pdf_url,
      pageCount: null,
      dateLine: record.date,
      subjectLine:
        "Talbott FOIA record selected as policy context for the Clinton-Russia high-level channel.",
      source: SOURCES.strobe,
      sourceNote: `Source: Department of State FOIA Library, Strobe Talbott FOIA case ${record.case_number}, document ${record.id}; release status ${record.release_status}.`,
      frusVolume: FRUS_VOLUME,
      frusTopics: topics,
      topics,
      relevanceScore: record.score
    };
  });
}

function buildNaraScoutRecords() {
  const queryUrl =
    "https://therealjameswilson.github.io/nara-scout/#q=Yeltsin&sort=relevance&perColl=25&perPage=50&scope=clinton";
  return [
    {
      id: "nara-scout-40482516",
      date: "1993-01-01",
      sortDate: "1993-01-01",
      type: "Scout Lead",
      title: "Telcons and Memcons",
      documentTitle: "National Archives Catalog: Telcons and Memcons, Donald Kerrick's Files",
      participants: ["Bill Clinton", "Boris Yeltsin", "Anthony Lake", "Donald Kerrick"],
      countries: ["United States", "Russia", "Bosnia and Herzegovina"],
      chapter: CHAPTERS.scout,
      releaseStatus: "FOIA/MDR Lead",
      naid: "40482516",
      catalogUrl: SOURCES.kerrickTelconsMemcons.url,
      pdfUrl: SOURCES.kerrickTelconsMemcons.pdfUrl,
      pageCount: 72,
      digitalObjects: 73,
      dateLine: "April 10, 1994 Yeltsin call materials in a ca. 1994-1995 file unit",
      subjectLine:
        "Donald Kerrick file unit that includes withdrawn talking points for Clinton's April 10, 1994 call with Yeltsin on Bosnia and related COCOM/Yeltsin letter materials.",
      source: SOURCES.kerrickTelconsMemcons,
      sourceNote:
        "Source: National Archives Catalog, Records of the National Security Council European Affairs Office (Clinton Administration), Donald Kerrick's Files, Box 26/OA 368, NAID 40482516. Catalog exposes a 72-page OCR PDF plus page images; FOIA case 2008-0994-F is Bosnia-focused, but documents 011a-011d are Yeltsin/Russia materials and are withheld under P1/b(1).",
      extractionRule: EXTRACTION_RULE,
      extractionStatus:
        "Lead only: do not create a derivative document from this PDF unless releasable pages containing the actual Yeltsin telcon or memcon are identified. The visible Yeltsin pages are markers, talking points, COCOM background, cable, and letter material rather than the telcon transcript itself.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Clinton NSC", "Memcons and telcons", "Bosnia", "COCOM"],
      topics: ["NARA Scout", "FOIA lead", "Donald Kerrick", "Bosnia", "COCOM", "Yeltsin"]
    },
    {
      id: "nara-scout-40482510",
      date: "1993-01-01",
      sortDate: "1993-01-01",
      type: "Scout Lead",
      title: "Contact Group/Ministerials",
      documentTitle: "NARA Scout lead: Contact Group/Ministerials, Donald Kerrick's Files",
      participants: [],
      countries: ["United States", "Russia", "Bosnia and Herzegovina"],
      chapter: CHAPTERS.scout,
      releaseStatus: "FOIA/MDR Lead",
      naid: "40482510",
      catalogUrl: "https://catalog.archives.gov/id/40482510",
      pdfUrl: "",
      pageCount: 55,
      digitalObjects: 55,
      dateLine: "Clinton Administration file unit; date span pending catalog inspection",
      subjectLine:
        "Potential Contact Group and ministerial context for Russia diplomacy around Bosnia and later Kosovo-related high-level contacts.",
      source: {
        name: "National Archives Catalog, Donald Kerrick's Files",
        url: "https://catalog.archives.gov/id/40482510"
      },
      sourceNote:
        "Source: National Archives Catalog, Records of the National Security Council European Affairs Office (Clinton Administration), Donald Kerrick's Files, NAID 40482510; surfaced in the Scout Clinton/Yeltsin pass.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Contact Group", "Russia policy context"],
      topics: ["NARA Scout", "FOIA lead", "Bosnia"]
    },
    {
      id: "nara-scout-7585486",
      date: "1993-01-01",
      sortDate: "1993-01-01",
      type: "Scout Lead",
      title: "Donald Kerrick's Files",
      documentTitle: "NARA Scout lead: Donald Kerrick's Files series",
      participants: ["Donald Kerrick"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "Catalog Lead",
      naid: "7585486",
      catalogUrl: "https://catalog.archives.gov/id/7585486",
      pdfUrl: "",
      pageCount: null,
      digitalObjects: null,
      dateLine: "Clinton NSC European Affairs Office series",
      subjectLine:
        "Parent series for the Telcons and Memcons and Contact Group/Ministerials file units found by Scout.",
      source: {
        name: "National Archives Catalog, Records of the NSC European Affairs Office",
        url: "https://catalog.archives.gov/id/7585486"
      },
      sourceNote:
        "Source: National Archives Catalog series record for Donald Kerrick's Files, NAID 7585486.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Clinton NSC", "European Affairs"],
      topics: ["NARA Scout", "Series lead"]
    },
    {
      id: "nara-scout-257664339",
      date: "1998-08-31",
      sortDate: "1998-08-31",
      type: "Scout Lead",
      title: "Trip of the President to Russia, Northern Ireland, and Ireland August 31 - September 5, 1998 [binder] [1]",
      documentTitle:
        "NARA Scout lead: Trip of the President to Russia, Northern Ireland, and Ireland, Aug. 31-Sept. 5, 1998",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia", "Ireland"],
      chapter: CHAPTERS.scout,
      releaseStatus: "FOIA/MDR Lead",
      naid: "257664339",
      catalogUrl: "https://catalog.archives.gov/id/257664339",
      pdfUrl: "",
      pageCount: 1,
      digitalObjects: 1,
      dateLine: "August 31-September 5, 1998",
      subjectLine:
        "Advance Office trip book lead for the September 1998 Moscow meetings with Yeltsin.",
      source: {
        name: "National Archives Catalog, Advance Office Trip Books",
        url: "https://catalog.archives.gov/id/257664339"
      },
      sourceNote:
        "Source: National Archives Catalog, Records of the Advance Office (Clinton Administration), Trip Books, NAID 257664339; surfaced in the broad NARA Scout Yeltsin sweep.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Moscow summit", "Trip book"],
      topics: ["NARA Scout", "FOIA lead", "Trip book"]
    },
    {
      id: "nara-scout-147870741",
      date: "1993-01-20",
      sortDate: "1993-01-20",
      type: "Scout Lead",
      title: "[01/20/1993-01/31/1993]",
      documentTitle: "NARA Scout lead: Presidential Daily Diary, Jan. 20-31, 1993",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "FOIA/MDR Lead",
      naid: "147870741",
      catalogUrl: "https://catalog.archives.gov/id/147870741",
      pdfUrl: "",
      pageCount: 1,
      digitalObjects: 1,
      dateLine: "January 20-31, 1993",
      subjectLine:
        "Presidential Daily Diary file covering the first Clinton-Yeltsin telephone call on January 23, 1993.",
      source: {
        name: "National Archives Catalog, Presidential Daily Diary",
        url: "https://catalog.archives.gov/id/147870741"
      },
      sourceNote:
        "Source: National Archives Catalog, Presidential Daily Diary (Clinton Administration), Ellen McCathran's Files, NAID 147870741; surfaced in the broad NARA Scout Yeltsin sweep.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Presidential Daily Diary", "Clinton-Yeltsin"],
      topics: ["NARA Scout", "FOIA lead", "Daily diary"]
    },
    {
      id: "nara-scout-147870751",
      date: "1993-04-01",
      sortDate: "1993-04-01",
      type: "Scout Lead",
      title: "[04/01/1993-04/16/1993]",
      documentTitle: "NARA Scout lead: Presidential Daily Diary, Apr. 1-16, 1993",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "FOIA/MDR Lead",
      naid: "147870751",
      catalogUrl: "https://catalog.archives.gov/id/147870751",
      pdfUrl: "",
      pageCount: 1,
      digitalObjects: 1,
      dateLine: "April 1-16, 1993",
      subjectLine:
        "Presidential Daily Diary file covering the April 1 telcon and April 3-4 Vancouver meetings.",
      source: {
        name: "National Archives Catalog, Presidential Daily Diary",
        url: "https://catalog.archives.gov/id/147870751"
      },
      sourceNote:
        "Source: National Archives Catalog, Presidential Daily Diary (Clinton Administration), Ellen McCathran's Files, NAID 147870751; surfaced in the broad NARA Scout Yeltsin sweep.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Presidential Daily Diary", "Vancouver summit"],
      topics: ["NARA Scout", "FOIA lead", "Daily diary"]
    },
    {
      id: "nara-scout-147870931",
      date: "1998-09-01",
      sortDate: "1998-09-01",
      type: "Scout Lead",
      title: "[09/01/1998-09/13/1998]",
      documentTitle: "NARA Scout lead: Presidential Daily Diary, Sept. 1-13, 1998",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "FOIA/MDR Lead",
      naid: "147870931",
      catalogUrl: "https://catalog.archives.gov/id/147870931",
      pdfUrl: "",
      pageCount: 1,
      digitalObjects: 1,
      dateLine: "September 1-13, 1998",
      subjectLine:
        "Presidential Daily Diary file covering the September 1-2 Moscow meetings and September 12 Yeltsin call.",
      source: {
        name: "National Archives Catalog, Presidential Daily Diary",
        url: "https://catalog.archives.gov/id/147870931"
      },
      sourceNote:
        "Source: National Archives Catalog, Presidential Daily Diary (Clinton Administration), Ellen McCathran's Files, NAID 147870931; surfaced in the broad NARA Scout Yeltsin sweep.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Presidential Daily Diary", "Moscow summit"],
      topics: ["NARA Scout", "FOIA lead", "Daily diary"]
    },
    {
      id: "nara-scout-147870967",
      date: "1999-06-01",
      sortDate: "1999-06-01",
      type: "Scout Lead",
      title: "[06/01/1999-06/15/1999]",
      documentTitle: "NARA Scout lead: Presidential Daily Diary, June 1-15, 1999",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "FOIA/MDR Lead",
      naid: "147870967",
      catalogUrl: "https://catalog.archives.gov/id/147870967",
      pdfUrl: "",
      pageCount: 1,
      digitalObjects: 1,
      dateLine: "June 1-15, 1999",
      subjectLine:
        "Presidential Daily Diary file covering the dense June 1999 Kosovo sequence of Clinton-Yeltsin calls.",
      source: {
        name: "National Archives Catalog, Presidential Daily Diary",
        url: "https://catalog.archives.gov/id/147870967"
      },
      sourceNote:
        "Source: National Archives Catalog, Presidential Daily Diary (Clinton Administration), Ellen McCathran's Files, NAID 147870967; surfaced in the broad NARA Scout Yeltsin sweep.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Presidential Daily Diary", "Kosovo"],
      topics: ["NARA Scout", "FOIA lead", "Daily diary", "Kosovo"]
    },
    {
      id: "nara-scout-147870995",
      date: "1999-12-21",
      sortDate: "1999-12-21",
      type: "Scout Lead",
      title: "[12/21/1999-12/31/1999]",
      documentTitle: "NARA Scout lead: Presidential Daily Diary, Dec. 21-31, 1999",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "FOIA/MDR Lead",
      naid: "147870995",
      catalogUrl: "https://catalog.archives.gov/id/147870995",
      pdfUrl: "",
      pageCount: 1,
      digitalObjects: 1,
      dateLine: "December 21-31, 1999",
      subjectLine:
        "Presidential Daily Diary file covering Yeltsin's resignation-day call with Clinton on December 31, 1999.",
      source: {
        name: "National Archives Catalog, Presidential Daily Diary",
        url: "https://catalog.archives.gov/id/147870995"
      },
      sourceNote:
        "Source: National Archives Catalog, Presidential Daily Diary (Clinton Administration), Ellen McCathran's Files, NAID 147870995; surfaced in the broad NARA Scout Yeltsin sweep.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Presidential Daily Diary", "Yeltsin resignation"],
      topics: ["NARA Scout", "FOIA lead", "Daily diary"]
    },
    {
      id: "nara-scout-query-yeltsin",
      date: "2026-05-19",
      sortDate: "2026-05-19",
      type: "Scout Lead",
      title: "NARA Scout query: Yeltsin across Clinton collections",
      documentTitle: "NARA Scout query: Yeltsin across all Clinton administration collections",
      participants: [],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "Search Lead",
      naid: "query-yeltsin-clinton",
      catalogUrl: queryUrl,
      pdfUrl: "",
      pageCount: null,
      digitalObjects: null,
      dateLine: "Search run May 19, 2026",
      subjectLine:
        "Broad Scout sweep over Clinton collections for additional Yeltsin file units, including declassified and FOIA/MDR candidates.",
      source: SOURCES.naraScout,
      sourceNote:
        "Source: NARA Scout browser search, query 'Yeltsin', Clinton administration scope, record-type filters for declassified, FOIA/MDR candidates, and unprocessed records. Search returned 4,260 total matches, 811 unique merged records, and 96 declassified online records on May 19, 2026.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Search trail"],
      topics: ["NARA Scout", "Search trail"]
    }
  ];
}

function writeOutputs(records) {
  records.sort(
    (a, b) =>
      a.chapter.number - b.chapter.number ||
      a.sortDate.localeCompare(b.sortDate) ||
      a.title.localeCompare(b.title)
  );

  const dataDir = path.join(ROOT, "data");
  const reportsDir = path.join(ROOT, "reports");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, "memcons.json"), `${JSON.stringify(records, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "memcons.js"), `window.MEMCONS = ${JSON.stringify(records, null, 2)};\n`);

  const summary = {
    generatedAt: new Date().toISOString(),
    totalRecords: records.length,
    byChapter: Object.fromEntries(
      Object.values(CHAPTERS).map((chapter) => [
        chapter.name,
        records.filter((record) => record.chapter.name === chapter.name).length
      ])
    ),
    byType: records.reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {}),
    sources: {
      clintonText: CLINTON_TEXT,
      strobeManifest: STROBE_MANIFEST,
      naraScout: SOURCES.naraScout.url
    }
  };
  fs.writeFileSync(path.join(reportsDir, "source-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

const records = [
  ...buildChronologyRecords(),
  ...buildReleasePackets(),
  ...buildStrobeRecords(),
  ...buildNaraScoutRecords()
];

writeOutputs(records);
