const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORKSPACE = path.resolve(ROOT, "..");
const CLINTON_TEXT =
  process.env.CLINTON_FOREIGN_MEETINGS_TXT || "/private/tmp/clinton-foreign-meetings.txt";
const STROBE_MANIFEST =
  process.env.STROBE_MANIFEST ||
  path.join(WORKSPACE, "strobe-talbott-foia", "data", "manifest.json");
const STROBE_LIVE_YELTSIN_PDF_LEADS =
  process.env.STROBE_LIVE_YELTSIN_PDF_LEADS ||
  path.join(ROOT, "data", "strobe-live-yeltsin-pdf-leads.json");
const RESEARCH_PLAN_ONLINE_SEARCH =
  process.env.RESEARCH_PLAN_ONLINE_SEARCH ||
  path.join(ROOT, "data", "research-plan-online-search.json");

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
  googleDrive: {
    name: "Google Drive Clinton-Yeltsin candidate files",
    url: "https://drive.google.com/"
  },
  stateFoiaDrive: {
    name: "Department of State FOIA / Google Drive candidate copy",
    caseNumber: "F-2017-13804",
    url: "https://drive.google.com/"
  },
  naraScout: {
    name: "NARA Scout",
    url: "https://therealjameswilson.github.io/nara-scout/"
  },
  sharmCable: {
    name: "Clinton Digital Library item 118876 / MDR release 2016-0118-M-4 Google Drive cable copy",
    caseNumber: "2016-0118-M-4",
    url: "https://clinton.presidentiallibraries.us/items/show/118876",
    pdfUrl: "https://drive.google.com/file/d/1kqpS-sURsWvTfRqKhA-09YXKX5fVVh7c/view"
  },
  clinton20160620: {
    name: "Clinton Digital Library item 100503, MDR release 2016-0620-M",
    caseNumber: "2016-0620-M",
    url: "https://clinton.presidentiallibraries.us/items/show/100503",
    pdfUrl: "https://clinton.presidentiallibraries.us/files/original/dac856cd6bbd10b93c2eb815862bce44.pdf"
  },
  clintonIraq19981230: {
    name: "Clinton Digital Library item 119190, Telcons - Memoranda of Telephone Conversation",
    caseNumber: "clinton-item-119190",
    url: "https://clinton.presidentiallibraries.us/items/show/119190",
    pdfUrl: "https://clinton.presidentiallibraries.us/files/original/1ec29c3214c0ccb6c6ed30fd7e5b06af.pdf"
  },
  clintonItem101363: {
    name: "Clinton Digital Library item 101363, Memcons - Memoranda of Conversation",
    caseNumber: "clinton-item-101363",
    url: "https://clinton.presidentiallibraries.us/items/show/101363",
    pdfUrl: "https://clinton.presidentiallibraries.us/files/original/19662f645b0b622a95717322e238c1ec.pdf"
  },
  clintonItem101364: {
    name: "Clinton Digital Library item 101364, Memcons - Memoranda of Conversation",
    caseNumber: "clinton-item-101364",
    url: "https://clinton.presidentiallibraries.us/items/show/101364",
    pdfUrl: "https://clinton.presidentiallibraries.us/files/original/67bc3e4fc7cc0ed1ba4f438e510624d8.pdf"
  },
  clintonItem101370: {
    name: "Clinton Digital Library item 101370, Memcons - Memoranda of Conversation",
    caseNumber: "clinton-item-101370",
    url: "https://clinton.presidentiallibraries.us/items/show/101370",
    pdfUrl: "https://clinton.presidentiallibraries.us/files/original/c016beef71be071cd9c96fcf0972fd57.pdf"
  },
  clintonItem101758: {
    name: "Clinton Digital Library item 101758, Declassified Documents",
    caseNumber: "clinton-item-101758",
    url: "https://clinton.presidentiallibraries.us/items/show/101758",
    pdfUrl: "https://clinton.presidentiallibraries.us/files/original/2509827ca57f98e07eec584b3d69250f.pdf"
  },
  clintonDigitalLibrarySolr: {
    name: "Clinton Digital Library Solr search: Yeltsin",
    url: "https://clinton.presidentiallibraries.us/solr-search?q=yeltsin"
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

const CLINTON_PRS_COLLECTION =
  "Records of the National Security Council Records Management Office (Clinton Administration)";
const CLINTON_PRS_COLLECTION_NAID = "7388808";
const CLINTON_PRS_SERIES = "Presidential Records Series (PRS) Files";
const CLINTON_PRS_SERIES_NAID = "7585721";

const MDR_CASE_DETAILS = {
  "2015-0782-M-1": {
    title: "Declassified documents concerning Russian President Boris Yeltsin",
    type: "Mandatory Declassification Review",
    url: SOURCES.m1.url,
    scope:
      "Clinton-Yeltsin memcons and telcons, January 23, 1993 through April 21, 1996"
  },
  "2015-0782-M-2": {
    title: "Declassified documents concerning Russian President Boris Yeltsin",
    type: "Mandatory Declassification Review",
    url: SOURCES.m2.url,
    scope:
      "Clinton-Yeltsin memcons and telcons, April 21, 1996 through December 31, 1999"
  },
  "2014-0901-M": {
    title: "Memcons between President William Jefferson Clinton and President Boris Yeltsin",
    type: "National Archives Catalog item",
    url: SOURCES.vancouverMemcons.url,
    naid: "163545404"
  },
  "2014-0948-M": {
    title: "Memcon between President William Jefferson Clinton and President Boris Yeltsin",
    type: "National Archives Catalog item",
    url: SOURCES.hydeParkMemcons.url,
    naid: "163545436"
  },
  "2014-0996-M": {
    title: "Declassified documents concerning Russian President Boris Yeltsin",
    type: "Mandatory Declassification Review",
    url: SOURCES.tokyo.url
  },
  "2014-0546-M": {
    title: "Declassified documents concerning Russian President Boris Yeltsin and Kosovo",
    type: "Mandatory Declassification Review",
    url: SOURCES.kosovoLetter.url
  },
  "2014-0546-M-Release-A": {
    title: "Declassified documents concerning Russian President Boris Yeltsin and Kosovo",
    type: "Mandatory Declassification Review",
    url: SOURCES.kosovoLetter.url
  },
  "2014-0904-M": {
    title: "Declassified documents concerning Russia",
    type: "Mandatory Declassification Review"
  },
  "2014-0904-M-Release-A": {
    title: "Declassified documents concerning Russia",
    type: "Mandatory Declassification Review"
  },
  "2014-0974-M": {
    title: "Declassified documents concerning Russian President Boris Yeltsin",
    type: "Mandatory Declassification Review"
  },
  "2014-0999-M": {
    title: "Declassified documents concerning Russian President Boris Yeltsin",
    type: "Mandatory Declassification Review"
  },
  "2016-0118-M": {
    title: "Meetings between President Clinton and Russian President Boris Yeltsin",
    type: "Clinton Digital Library item",
    url: "https://clinton.presidentiallibraries.us/items/show/118876",
    provenance: "Clinton Presidential Records: NSC Cable, Email, and Records Management System"
  },
  "2016-0118-M-4": {
    title: "Meetings between President Clinton and Russian President Boris Yeltsin",
    type: "Clinton Digital Library item",
    url: "https://clinton.presidentiallibraries.us/items/show/118876",
    provenance: "Clinton Presidential Records: NSC Cable, Email, and Records Management System"
  },
  "2016-0620-M": {
    title: "Declassified Documents Concerning Russian President Boris Yeltsin",
    type: "Clinton Digital Library item",
    url: SOURCES.clinton20160620.url,
    provenance: "Clinton Presidential Records: NSC Cable, Email, and Records Management System"
  },
  "clinton-item-119190": {
    title: "Memorandum of Telephone Conversation with Russian President Yeltsin",
    type: "Clinton Digital Library item",
    url: SOURCES.clintonIraq19981230.url,
    provenance: "Telcons - Memoranda of Telephone Conversation"
  },
  "clinton-item-101363": {
    title: "Memorandum of Conversation - President Boris Yeltsin of Russia",
    type: "Clinton Digital Library item",
    url: SOURCES.clintonItem101363.url,
    provenance: "2016-0117-M; Memcons - Memoranda of Conversation"
  },
  "clinton-item-101364": {
    title: "Memorandum of Conversation - President Boris Yeltsin of Russia",
    type: "Clinton Digital Library item",
    url: SOURCES.clintonItem101364.url,
    provenance: "2016-0117-M; Memcons - Memoranda of Conversation"
  },
  "clinton-item-101370": {
    title: "Memorandum of Conversation - President Boris Yeltsin of Russia",
    type: "Clinton Digital Library item",
    url: SOURCES.clintonItem101370.url,
    provenance: "2016-0117-M; Memcons - Memoranda of Conversation; item description says the memcon was received as an NSC cable"
  },
  "clinton-item-101758": {
    title:
      "Declassified documents concerning telcon between the President and Boris Yeltsin on September 28, 1994",
    type: "Clinton Digital Library item",
    url: SOURCES.clintonItem101758.url,
    provenance:
      "2018-1215-M; Clinton Presidential Records: White House Staff and Office Files; National Security Council, NSC European Affairs Office, Alexander Vershbow; Declassified Documents collection; related National Archives Catalog Description NAID 7585499"
  },
  "2006-1185-F": {
    title:
      "Records on Telephone Calls between William J. Clinton and Boris Yeltsin, June 13 and 14, 1999",
    type: "Freedom of Information Act request",
    provenance: "Clinton Presidential Records, NSC Records Management, [Yeltsin]"
  }
};

const MARKER_CASE_OVERRIDES_BY_DOCUMENT_ID = {
  "9302226": "2014-0901-M",
  "9305178": "2014-0996-M",
  "9503774": "2014-0904-M-Release-A",
  "9507853": "2014-0948-M",
  "9507991": "2014-0948-M",
  "9803752": "2014-0999-M",
  "9902107": "2014-0546-M",
  "9903106": "2014-0546-M",
  "9903364": "2014-0546-M",
  "9904397": "2014-0546-M",
  "9904501": "2014-0546-M",
  "9905128": "2006-1185-F",
  "9905271": "2006-1185-F",
  "9908997": "2014-0974-M"
};

const DERIVED_PDFS = {
  vancouverDinner: "public/documents/1993-04-03-clinton-yeltsin-vancouver-working-dinner.pdf",
  vancouverSecurity:
    "public/documents/1993-04-04-clinton-yeltsin-vancouver-security-issues.pdf",
  hydeParkOneOnOne: "public/documents/1995-10-23-clinton-yeltsin-hyde-park-one-on-one.pdf",
  hydeParkLunch: "public/documents/1995-10-23-clinton-yeltsin-hyde-park-lunch.pdf",
  iraqTelcon19941010: "public/documents/1994-10-10-clinton-yeltsin-iraq-telcon.pdf",
  sep1994OneOnOne: "public/documents/1994-09-27-clinton-yeltsin-white-house-one-on-one.pdf",
  sep1994ExpandedSecurity:
    "public/documents/1994-09-27-clinton-yeltsin-expanded-security-session.pdf",
  sharmMemconCable: "public/documents/1996-03-13-clinton-yeltsin-sharm-el-sheikh-memcon-cable.pdf",
  oct1998Telcon: "public/documents/1998-10-05-clinton-yeltsin-telcon-actual-pages.pdf",
  dec1998Telcon: "public/documents/1998-12-30-clinton-yeltsin-telcon-actual-pages.pdf"
};

const SOURCE_PDF_PAGE_COUNTS = {
  [SOURCES.m1.caseNumber]: 397,
  [SOURCES.m2.caseNumber]: 591,
  [SOURCES.sharmCable.caseNumber]: 6,
  [SOURCES.clinton20160620.caseNumber]: 6,
  [SOURCES.clintonIraq19981230.caseNumber]: 5,
  [SOURCES.clintonItem101363.caseNumber]: 6,
  [SOURCES.clintonItem101364.caseNumber]: 2,
  [SOURCES.clintonItem101370.caseNumber]: 11,
  [SOURCES.clintonItem101758.caseNumber]: 9
};

const EXTRACTED_PDF_MANIFEST =
  process.env.EXTRACTED_PDF_MANIFEST ||
  path.join(ROOT, "reports", "extracted-pdf-manifest.json");
const EXTRACTED_PDFS_BY_RECORD_ID = new Map(
  (readJsonOptional(EXTRACTED_PDF_MANIFEST).documents || []).map((item) => [item.recordId, item])
);

function readJsonOptional(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function driveFileUrl(id) {
  return `https://drive.google.com/file/d/${id}/view`;
}

const DRIVE_CANDIDATES = {
  telcon19930123: {
    id: "1NxhemfjqE_hcdqHtQKlLDBumnl1Mbz7K",
    title: "930123 Clinton Yeltsin telconpdf.pdf"
  },
  telcon19930210: {
    id: "15AYs4fgvbYNfhuAAJ96QewfB7HktZ2gb",
    title: "930210 Clinton Yeltsin telconpdf.pdf"
  },
  telcon19930426: {
    id: "1EgHtw2tYu5lakv8QZX3dd519uhZZ_7kF",
    title: "930426 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19930502: {
    id: "1I6JITyg6F8GGaL-udA_mJywVtIwZ4fIU",
    title: "930502 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19930628: {
    id: "1fonmBkzM0qhOUmDP74PVYmQYEBrQGpq2",
    title: "930628 Clinton and Yeltsin telconpdf.pdf"
  },
  memcon19930710: {
    id: "1oLH4zCmIub-kgvXXs0wZDGELWehL9Pqh",
    title: "930710 Clinton and Yeltsin in Tokyo memconpdf.pdf"
  },
  telcon19930907: {
    id: "15VrM1_b_ytYNKHKn78ZKANgfJBVY72fn",
    title: "930907 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19930921: {
    id: "17KnXzjPdKqJGPUWyC4ge5PVBSyOJ03QO",
    title: "930921 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19931005: {
    id: "1jf6_8GhGV5MGQN3G4OxgrCthB5FHhfaT",
    title: "931005 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19931010: {
    id: "1fClpMfna1KtDo3cWvis5vnkYWBjNRPwD",
    title: "931010 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19931222: {
    id: "1u1uO_zeA0GNNX8nPkvsTHJ3rALOOn6pZ",
    title: "931222 Clinton and Yeltsin telconpdf.pdf"
  },
  memcon19940114Bilateral: {
    id: "1pr42yhINujL_px_Y5aXD_MmChhc5sy9v",
    title: "940114 Clinton and Yeltsin Memcon.pdf"
  },
  memcon19940114BilateralDuplicate: {
    id: "1bhiipjnmQh_WU-WC9XUGKIrzW93q4r38",
    title: "940114 Clinton and Yeltsin Morning Session memcon.pdf"
  },
  memcon19940114Trilateral: {
    id: "1mA2m1fonXTwvzmbdVLzjWV7iGpBWAC1r",
    title: "940114 Clinton and Yeltsin and Kravchuk memcon.pdf"
  },
  telcon19940220: {
    id: "1-Czdq2907N9Zq6Rt7civTm-xPwkK9h6y",
    title: "940220 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19940410: {
    id: "1qihIq6mo51EnA3ufb089tvkxIRp4kVnN",
    title: "940410 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19940420: {
    id: "1ak-28O0E3npmQFlhnktlHR9h7Jze_RQq",
    title: "940420 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19940613: {
    id: "1FTGT_4HHEl4j1Z7nG2n8Oo36AMCY9rUX",
    title: "940611 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19940705: {
    id: "1EMCFtfaOX3jrb7Pcncsjcij86vCVFqHx",
    title: "940705 Clinto and Yeltsin telconpdf.pdf"
  },
  memcon19940927: {
    id: "13ojhHQejsL_uYgVxz_GHe8u_ponQ_FFj",
    title: "940927 Clinton and Yeltsin in DC memconpdf.pdf"
  },
  telcon19940927: {
    id: "15MpCXy-fCB8_KdvadCV1ypsw12ejYX3Z",
    title: "940927 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19950213: {
    id: "1EgGoQhfX4a7Fq8fEWtIhjUISe6hko4ai",
    title: "950213 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19950728: {
    id: "1-VyJatd2iE4fjlYtr3YM6930R3dRVHVU",
    title: "950728 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19950927: {
    id: "13wiC3-DXoaYOXFvnwFGZ2EoaL39Z6oCh",
    title: "950927 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19960126: {
    id: "1yNha4AfK3kD6rPBPbSwA7RXGD_RLjz_e",
    title: "960126 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19960221: {
    id: "1tsAEajB4pmA2K-uxgCE3uIGe3Ek-PSMl",
    title: "960221 Clinton and Yeltsin telconpdf.pdf"
  },
  memcon19960313Cable: {
    id: "1kqpS-sURsWvTfRqKhA-09YXKX5fVVh7c",
    title: "960313 Cable Memcon with Yeltsin Sharm el-Sheikh Egypt.pdf"
  },
  memcon19960313CableDuplicate: {
    id: "1Qr896gBJeiMDZ1hO5PNnmI2OtyAaBMU2",
    title: "960313 Clinton and Yeltsin memcon cable.pdf"
  },
  telcon19960409: {
    id: "1lGJCeA3FFPSqmmsNnXNA64B6koOy56ZB",
    title: "960409 Clinton and Yeltsin telconpdf.pdf"
  },
  memcon19960421OneOnOne: {
    id: "14NhGIMpynoxRlqbrA48-tTTGziPFz-B_",
    title: "960421 Clinton and Yeltsin in the Kremlin memconpdf.pdf"
  },
  memcon19960421Lunch: {
    id: "1jOjVAVkV8IeRD0SJmY4krQCH_Jr1oJQl",
    title: "960421 Clinton and Yeltsin lunch meeting memconpdf.pdf"
  },
  telcon19960507: {
    id: "1C9TLIGhTQ1RQQ6CuX9UG0eQsksrFHvO5",
    title: "960507 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19960618: {
    id: "1WFu5nHDo4uSM89CiS2CvB-vhCG76XUy3",
    title: "960618 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19960705: {
    id: "17IU8SnZtm4swpzXILw5JnpUXQ3PEx1ql",
    title: "960705 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19970227: {
    id: "1HVoBqp-n_57yMZlA7nWh-mMXEdBUum5Q",
    title: "970227 Clinton and Yeltsin telconpdf.pdf"
  },
  memcon19970321Morning: {
    id: "1sBvI46_5rIq0yKZ1b7nf67To2f5foPmf",
    title: "970321 950am to 1155am Clinton and Yeltsin in Helsinki memconpdf.pdf"
  },
  memcon19970321Lunch: {
    id: "1FvtlBsBnOZu4uFuqxfjLe9Fdj9iaT8dY",
    title: "970321 Working Lunch Clinton and Yeltsin in Helsinki memconpdf.pdf"
  },
  memcon19970321Afternoon: {
    id: "1zmToE2EEbOlex2gl6Nv1ULdECLF8PDWM",
    title: "970321 Afternoon Meeting Clinton and Yeltsin in Helsinki memconpdf.pdf"
  },
  memcon19970321Dinner: {
    id: "1KLOMwJsMKTaMp-3fsDHGk24zWvqLh6ou",
    title: "970321 815pm to 930pm Clinton and Yeltsin in Helsinki memconpdf.pdf"
  },
  memcon19970527: {
    id: "1VNFoDJYteyNDoWqrRuAWT8iLIAiHpFzh",
    title: "970527 Clinton and Yeltsin in Paris memconpdf.pdf"
  },
  memcon19970620: {
    id: "1068D97hQCXClJSz5sIQkmPDuuW_yCf5K",
    title: "970620 Clinton and Yeltsin in Denver memconpdf.pdf"
  },
  telcon19971030: {
    id: "1fT5AgUtzJunIagUVKSoKio6YudL2rLEx",
    title: "971030 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19971116: {
    id: "1c64v-q0n_DF-5kg16qrNjXxT6o4O7iEZ",
    title: "971116 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19971122: {
    id: "1PgRJZpQqXva-Kp6ogOhraQElJZl0GXdk",
    title: "971122 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980202: {
    id: "1mGa3d3xnEIbCrsJNqsQPjAWifdli0Xar",
    title: "980202 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980223: {
    id: "1j7AvpVjmjdRTEhJ4Al4KvPD0ZMiqDVwj",
    title: "980223 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980406: {
    id: "1BCpDN6EIDJyq188YS46cjJgYs2kyzNui",
    title: "980406 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980512: {
    id: "1j3wB3sjgDr43yH8nbu9W4eX35XNb5vTo",
    title: "980512 Clinton and Yeltsin telconpdf.pdf"
  },
  memcon19980517: {
    id: "1IkQrGGfVtGl1fkXMaHmkwjSnmcpTyA7S",
    title: "980517 Clinton and Yeltsin in Birmingham memconpdf.pdf"
  },
  telcon19980521: {
    id: "1_cus2DmP8sCA7HtsHoGspBGaKG5MvjMI",
    title: "980521 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980528: {
    id: "1F2aVY9zTrKysoGW-6-bn5tGdsTGDQ4y5",
    title: "980528 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980615: {
    id: "1hhBx6lIoQXXnyXsHoZxDo7oYNvYHbKsw",
    title: "980615 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980710: {
    id: "1rfsHmNUqd_CG69JwlpHp3gb91PiFko5A",
    title: "980710 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980814: {
    id: "1_Dekfu38Q_Gk1IwYiEJqitsrnsvSX9Qh",
    title: "980814 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980825: {
    id: "1HMmaeeYPmG7x8ueyovnZXgGBpb55xkRz",
    title: "980825 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19980912: {
    id: "1zL_1vQEJbvq4SWhIAqKpjAa3J2VR_AxW",
    title: "980912 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19990425: {
    id: "1YBmo26tprmItE4dS_dXX5Ic6QShZpn4h",
    title: "990425 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19990502: {
    id: "1ix1Ii-rAWelKeQi7jC6_PI4qRZlMinle",
    title: "990502 Clinton Yeltsin telconpdf.pdf"
  },
  telcon19990613: {
    id: "1wt8YvzsjTSpf3H4JMgUXJMU-hMk0bA74",
    title: "990613 Clinton and Yeltsin telconpdf.pdf"
  },
  telcon19990614: {
    id: "17_TAwdKBILpcBjzOK6fFzttzMxXLHc5P",
    title: "990614 Clinton and Yeltsin telconpdf.pdf"
  },
  memcon19990620: {
    id: "1sQzV-Sy-8geFSdknDtdp9xlzQCBI3QhN",
    title: "990620 Clinton and Yeltsin in Colognepdf.pdf"
  },
  telcon19990908: {
    id: "1wxPSyI3jA335DIh43d6VJ4BLULbLKIPR",
    title: "990908 Clinton and Yeltsin telconpdf.pdf"
  },
  memcon19991119: {
    id: "1MgSg0Iph1k9aGeSZqpsXiYJd0eJP9crE",
    title: "991119 Clinton and Yeltsin in Istanbul memconpdf.pdf"
  },
  telcon19991231: {
    id: "1ruK9pfEPeuBWuqAJD8TLhrQUEqIirk1v",
    title: "991231 Clinton and Yeltsin telconpdf.pdf"
  }
};

const STROBE_CONVERSATION_FILES = {
  memcon19930710TokyoCable: {
    id: "C09000001",
    date: "1993-07-16",
    title: "Memon with President Boris Yeltsin of Russia w/Attached Cover Sheet",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Oct2023/FL-2017-13804/DOC_0C09000001/C09000001.pdf",
    status: "Strobe FOIA cable copy of the July 10, 1993 Clinton-Yeltsin Tokyo memcon; cover sheet excluded."
  },
  telcon19941005: {
    id: "C06694711",
    date: "1994-10-05",
    title: "Telephone Conversation with Russian President Yeltsin",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_Jun2019_2020/F-2017-13804/DOC_0C06694711/C06694711.pdf",
    status: "Strobe FOIA copy of the actual October 5, 1994 telcon; duplicate source copy, not counted again."
  },
  memcon19950617Halifax: {
    id: "C06835181",
    date: "1995-06-17",
    title: "Clinton-Yeltsin Meeting",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Jan2021_C/F-2017-13804/DOC_0C06835181/C06835181.pdf",
    status: "Strobe FOIA copy with the actual Halifax Clinton-Yeltsin meeting pages 1-8."
  },
  memcon19951023HydePark: {
    id: "C06835137",
    date: "1995-10-23",
    title: "Clinton-Yeltsin One-on-One",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Jan2021_C/F-2017-13804/DOC_0C06835137/C06835137.pdf",
    status: "Strobe FOIA copy of the October 23, 1995 Hyde Park one-on-one; duplicate source copy, not counted again."
  },
  memcon19960421OneOnOne: {
    id: "C06697699",
    date: "1996-04-21",
    title: "POTUS-Yeltsin One-on-One",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_Jun2019_2020/F-2017-13804/DOC_0C06697699/C06697699.pdf",
    status: "Strobe FOIA copy of the April 21, 1996 Moscow one-on-one pages 1-13; duplicate source copy, not counted again."
  },
  telcon19960618Transmittal: {
    id: "C09000056",
    date: "1996-06-18",
    title: "Transmittal Memorandum of Telephone Conversation with Russian Boris Yeltsin w/Attachment(s)",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Mar2025/FL-2017-13804/DOC_0C09000056/C09000056.pdf",
    status: "Strobe FOIA packet; actual June 18, 1996 telcon is pages 3-4, with transmittal and unrelated attachments excluded."
  },
  telcon19960618Cable: {
    id: "C09000028",
    date: "1996-06-20",
    title: "Memorandum of Conversation between President Clinton and President Yeltsin on 6/18/96",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Oct2024/FL-2017-13804/DOC_0C09000028/C09000028.pdf",
    status: "Strobe FOIA cable copy of the June 18, 1996 call; duplicate source copy, not counted again."
  },
  telcon19961205: {
    id: "C06699017",
    date: "1996-12-05",
    title: "Conversation with President Boris Yeltsin of Russia",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_Aug2019_2020/F-2017-13804/DOC_0C06699017/C06699017.pdf",
    status: "Strobe FOIA copy of the December 5, 1996 telcon pages 1-3; duplicate source copy, not counted again."
  },
  telcon19971030: {
    id: "C09000014",
    date: "1997-10-30",
    title: "Memorandum of Telephone Conversation",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Apr2024/FL-2017-13804/DOC_0C09000014/C09000014.pdf",
    status: "Strobe FOIA copy of the October 30, 1997 telcon; duplicate source copy, not counted again."
  },
  telcon19980406Attachment: {
    id: "C09000007",
    date: "1998-05-17",
    title: "POTUS-Yeltsin Memcon w/Attachment(s)",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Mar2023/FL-2017-13804/DOC_0C09000007/C09000007.pdf",
    status: "Strobe FOIA packet includes an attached copy of the April 6, 1998 telcon after the May 17 memcon; duplicate source copy, not counted again."
  },
  telcon19980512: {
    id: "C09000006",
    date: "1998-05-20",
    title:
      "Memorandum of Conversation between President Clinton and the President of Russia Boris Yeltsin on 5/12/1998",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Mar2023/FL-2017-13804/DOC_0C09000006/C09000006.pdf",
    status: "Strobe FOIA cable copy of the May 12, 1998 Clinton-Yeltsin call; duplicate source copy, not counted again."
  },
  memcon19980517Birmingham: {
    id: "C09000007",
    date: "1998-05-17",
    title: "POTUS-Yeltsin Memcon w/Attachment(s)",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Mar2023/FL-2017-13804/DOC_0C09000007/C09000007.pdf",
    status: "Strobe FOIA informal copy of the May 17, 1998 Birmingham memcon on pages 1-13; duplicate source copy, not counted again."
  },
  telcon19980528: {
    id: "C09000028",
    date: "1998-06-02",
    title: "Transmittal Memorandum of Telephone Conversation with Russian President Boris Yeltsin w/Attachment(s)",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Mar2025/FL-2017-13804/DOC_0C09000028/C09000028.pdf",
    status: "Strobe FOIA packet; actual May 28, 1998 telcon is pages 2-5, with transmittal excluded."
  },
  telcon19980710: {
    id: "C09000004",
    date: "1998-07-10",
    title: "Telephone Conversation with Russian President Boris Yeltsin w/Attachment(s)",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Mar2023/FL-2017-13804/DOC_0C09000004/C09000004.pdf",
    status: "Strobe FOIA packet; actual July 10, 1998 telcon is pages 1-4, with tasking/transmittal pages excluded."
  }
};

const STROBE_REVIEWED_NON_CONVERSATION_FILES = [
  {
    id: "C06694708",
    date: "1994-10-07",
    title: "Transmittal of Presidential Telcon with President Boris Yeltsin of Russia",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_Jun2019_2020/F-2017-13804/DOC_0C06694708/C06694708.pdf",
    status: "Transmittal only; no actual Clinton-Yeltsin telcon pages counted."
  },
  {
    id: "C09000003",
    date: null,
    title: "POTUS-Yeltsin Bilat and Next Steps",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Mar2023/FL-2017-13804/DOC_0C09000003/C09000003.pdf",
    status: "Talbott-Mamedov debrief/context note, not a Clinton-Yeltsin memcon or telcon."
  },
  {
    id: "C09000076",
    date: null,
    title: "The Moscow Script The Presidential One-on-One",
    url:
      "https://foia.state.gov/DOCUMENTS/FOIA_L_Apr2023/FL-2017-13804/DOC_0C09000076/C09000076.pdf",
    status: "Script/planning document, not an actual Clinton-Yeltsin memcon or telcon."
  }
];

const STROBE_YELTSIN_TITLE_RE =
  /\bYELTSIN\b|\bYELSTIN\b|POTUS-YELTSIN|CLINTON-YELTSIN|PRESIDENT BORIS YELTSIN|PRESIDENT OF RUSSIA BORIS YELTSIN/i;
const STROBE_LIVE_YELTSIN_PDF_LEADS_SNAPSHOT = readJsonOptional(
  STROBE_LIVE_YELTSIN_PDF_LEADS
);
const RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT = readJsonOptional(RESEARCH_PLAN_ONLINE_SEARCH);

const STROBE_SUPPRESSED_CONTEXT_IDS = new Set([
  ...Object.values(STROBE_CONVERSATION_FILES).map((file) => file.id),
  ...STROBE_REVIEWED_NON_CONVERSATION_FILES.map((file) => file.id)
]);

const NARA_SCOUT_COLLECTION_SEARCH = {
  searchedAt: "2026-05-20T09:24:00-04:00",
  tool: SOURCES.naraScout.url,
  broadCollectionPass: {
    query: "Yeltsin",
    scope: "All 132 Clinton administration collections in the NARA Scout default Clinton scope",
    catalogDateRange: "1993-2001",
    collectionsSearched: 132,
    collectionsWithHits: 60,
    totalCatalogMatches: 4260,
    relevantCollections: [
      {
        naid: "7388808",
        totalMatches: 337,
        collection: "Records of the National Security Council Records Management Office (Clinton Administration)",
        strongestSeries: "Presidential Records Series (PRS) Files",
        compilerUse:
          "Core collection for item-level Clinton-Yeltsin memcon records and PRS/RMS withdrawal or locator leads."
      },
      {
        naid: "7386505",
        totalMatches: 99,
        collection: "Records of the National Security Council European Affairs Office (Clinton Administration)",
        strongestSeries: "Alexander Vershbow's Files; Donald Kerrick's Files; Jane Holl's Files",
        compilerUse:
          "High-value regional NSC collection; includes the Telcons and Memcons file unit and Bosnia/Russia context."
      },
      {
        naid: "101784492",
        totalMatches: 40,
        collection: "Presidential Daily Diary (Clinton Administration)",
        strongestSeries: "Ellen McCathran's Files",
        compilerUse:
          "Chronology and schedule control source for leader meetings and calls, especially pending contacts."
      },
      {
        naid: "2525024",
        totalMatches: 415,
        collection: "Records of the National Security Council (Clinton Administration)",
        strongestSeries: "Emails",
        compilerUse:
          "Heavy Kosovo/Russia context; useful for policy reconstruction, not a primary conversation-text source."
      },
      {
        naid: "7388842",
        totalMatches: 291,
        collection: "Records of the National Security Council Speechwriting Office (Clinton Administration)",
        strongestSeries: "Robert Boorstin's Files and Antony Blinken's Files",
        compilerUse:
          "Public-statement, toast, and press-event material around Yeltsin visits; not a memcon/telcon source."
      },
      {
        naid: "7386739",
        totalMatches: 10,
        collection: "Records of the National Security Council Executive Secretary (Clinton Administration)",
        strongestSeries: "Executive Secretary's Subject Files",
        compilerUse:
          "Cross-cutting NSC subject-file lead for summit and CSCE/NATO material."
      },
      {
        naid: "7388773",
        totalMatches: 5,
        collection: "Records of the National Security Council Nonproliferation and Export Controls Office",
        strongestSeries: "Steven Aoki's Files",
        compilerUse:
          "Nonproliferation and export-control context for Clinton-Yeltsin security discussions."
      },
      {
        naid: "7386504",
        totalMatches: 76,
        collection: "Records of the National Security Council Defense Policy and Arms Control Office",
        strongestSeries: "Robert Bell's Files",
        compilerUse:
          "Arms-control and NATO/Russia context; searched for companion material."
      },
      {
        naid: "7385964",
        totalMatches: 33,
        collection: "Records of the National Security Council Central and Eastern European Affairs Office",
        strongestSeries: "Stephen Flanagan's Files",
        compilerUse:
          "NATO enlargement and Eastern Europe context for Yeltsin discussions."
      }
    ]
  },
  narrowedMemconTelconPass: {
    scope:
      "18 high-relevance Clinton collections selected from the broad Scout pass, including NSC Records Management, NSC European Affairs, Presidential Daily Diary, Executive Secretary, Nonproliferation, Defense Policy and Arms Control, Central/Eastern Europe, Press/Communications, speechwriting, trip, audio, and video collections.",
    queries: [
      "Clinton Yeltsin",
      "Yeltsin memcon",
      "Yeltsin telcon",
      "Yeltsin telephone conversation",
      "memorandum conversation Yeltsin",
      "President Yeltsin",
      "Boris Yeltsin",
      "Yeltsin Kosovo",
      "Yeltsin NATO"
    ],
    queryCollectionPairsWithHits: 137,
    uniqueMergedRecords: 1262,
    prsAndRmsCandidatePdfsAudited: 57,
    confirmedActualConversationRecords: [
      {
        naid: "163545404",
        title: "Memcons between President William Jefferson Clinton and President Boris Yeltsin",
        status:
          "Already included; Vancouver actual memcons extracted with marker-page provenance."
      },
      {
        naid: "163545436",
        title: "Memcon between President William Jefferson Clinton and President Boris Yeltsin",
        status:
          "Already included; Hyde Park actual memcons extracted with marker-page provenance."
      }
    ],
    noNewActualConversationPages:
      "The candidate PDFs did not add new actual Clinton-Yeltsin memcon/telcon pages. They were withdrawal/locator sheets, talking points, schedule proposals, public-statement files, press guidance, or actual conversation records with non-Yeltsin leaders."
  },
  pendingExtentRecheck: {
    searchedAt: "2026-05-21T19:45:00-04:00",
    purpose:
      "Second-pass verification for the six Clinton-Yeltsin chronology contacts that still lack released actual conversation pages.",
    sourcesRechecked: [
      "Fresh download of the Clinton Library foreign-leader chronology PDF",
      "Clinton Digital Library Solr Yeltsin corpus: 1,440 unique items and 92 Yeltsin memorandum/telcon item records",
      "Google Drive exact-date and place/title searches for the six pending contacts",
      "NARA Scout/NARA Catalog exact-date searches across high-value Clinton NSC, Daily Diary, WHCA audio, speechwriting, trip, and press collections",
      "National Security Archive targeted Clinton-Yeltsin postings and exact-date searches"
    ],
    outcome:
      "No additional released actual Clinton-Yeltsin memcon or telcon pages were located. The six rows remain chronology-documented contacts, not countable document extents.",
    pendingContacts: [
      {
        date: "1993-04-01",
        type: "Telcon",
        status:
          "Chronology contact only. Drive surfaced a 930401 Moscow-to-DC Vancouver preview cable; Clinton Digital Library surfaced photo/press context; no April 1 telcon transcript was found."
      },
      {
        date: "1994-06-03",
        type: "Telcon",
        status:
          "MDR packet pages 187-190 are marker/withdrawal/profile pages for Document ID 9404692. NARA false lead 9404405/NAID 23901993 is a July 1994 trip briefing-material packet, not the telcon."
      },
      {
        date: "1994-07-10",
        type: "Memcon",
        status:
          "NARA/CDL leads are Naples trip materials and WHCA news-conference audio, including NAID 192122252/CDL item 115036; no Naples memcon text was found."
      },
      {
        date: "1998-09-01",
        type: "Memcon",
        status:
          "Drive and Clinton Digital Library item 101277 are the 2016-0143-M trip briefing book. CDL also has a Yeltsin toast file and WHCA press-conference audio, not meeting memcons."
      },
      {
        date: "1999-02-08",
        type: "Memcon",
        status:
          "Chronology and public reporting document a brief Amman funeral interaction; Drive, CDL, NARA Scout, and NSA searches found no released memcon."
      },
      {
        date: "2000-06-05",
        type: "Memcon",
        status:
          "Clinton Digital Library item 118907 is the Russia/Ukraine trip release with Putin/Kuchma material and June 4 Clinton-Putin memcon; it has no former-President Yeltsin memcon."
      }
    ]
  },
  auditedCandidateExamples: [
    {
      naid: "40482516",
      title: "Telcons and Memcons",
      catalogUrl: "https://catalog.archives.gov/id/40482516",
      status:
        "Important file-unit lead, already on the page. Rechecked as part of the collection pass; visible pages are markers, talking points, COCOM background, cable, and letter material, not the actual Yeltsin telcon transcript."
    },
    {
      naid: "441675758",
      title: "9804329",
      catalogUrl: "https://catalog.archives.gov/id/441675758",
      status:
        "Contains memorandum and talking points for the June 15, 1998 POTUS-Yeltsin Kosovo call; no actual telcon transcript. Existing June 15, 1998 telcon remains counted from MDR packet 2015-0782-M-2 pages 342-346."
    },
    {
      naid: "23901998",
      title: "9405332",
      catalogUrl: "https://catalog.archives.gov/id/23901998",
      status:
        "Schedule proposal and Burns memo for the July 5, 1994 telephone call to Yeltsin; not the call transcript. Existing July 5, 1994 telcon remains counted from MDR packet 2015-0782-M-1 pages 202-204."
    },
    {
      naid: "236750778",
      title: "[05/07/1996 - 05/08/1996]",
      catalogUrl: "https://catalog.archives.gov/id/236750778",
      status:
        "Press/current-items guidance summarizing the May 7, 1996 POTUS-Yeltsin call; not an actual telcon transcript. Existing May 7, 1996 telcon remains counted from MDR packet 2015-0782-M-2 pages 25-28."
    },
    {
      naid: "23901979",
      title: "9400448",
      catalogUrl: "https://catalog.archives.gov/id/23901979",
      status:
        "Actual memorandum of telephone conversation, but with President Ulmanis of Latvia; Yeltsin appears only as the topic of discussion. Excluded from Clinton-Yeltsin page counts."
    },
    {
      naid: "158702744",
      title: "[07/01/1997-08/24/2000]",
      catalogUrl: "https://catalog.archives.gov/id/158702744",
      status:
        "False-positive memcon shell for President Obasanjo of Nigeria, not Yeltsin. Excluded."
    },
    {
      naid: "404512727",
      title: "9602199",
      catalogUrl: "https://catalog.archives.gov/id/404512727",
      status:
        "Actual memorandum of conversation with President Demirel of Turkey; not a Clinton-Yeltsin conversation. Excluded."
    },
    {
      naid: "23901993",
      title: "9404405",
      catalogUrl: "https://catalog.archives.gov/id/23901993",
      status:
        "False June 3, 1994 lead. The downloaded 21-page PDF is FOIA 2011-1037-F briefing materials for Clinton's July 1994 Latvia/Poland/Italy/Germany trip, not a Yeltsin telcon."
    },
    {
      naid: "192122252",
      title:
        "Audio Recording of President Clinton's News Conference with President Boris Yeltsin of Russia in Naples",
      catalogUrl: "https://catalog.archives.gov/id/192122252",
      status:
        "Confirms the July 10, 1994 Naples public event/audio context, but it is WHCA news-conference audio, not a memorandum of conversation."
    },
    {
      naid: "17368189",
      title: "Daily Diary hardcopy for September 1998 travel",
      catalogUrl: "https://catalog.archives.gov/id/17368189",
      status:
        "Chronology/schedule support for the Moscow trip; no actual September 1-2, 1998 Clinton-Yeltsin memcon pages."
    }
  ]
};

const CLINTON_DIGITAL_LIBRARY_SOLR_AUDIT = {
  searchedAt: "2026-05-21T18:06:31-04:00",
  source: SOURCES.clintonDigitalLibrarySolr.url,
  uniqueItems: 1440,
  facets: [
    { label: "all-yeltsin", results: 1440, pages: 72 },
    { label: "collection-memcons", results: 36, pages: 2 },
    { label: "collection-telcons", results: 57, pages: 3 },
    { label: "tag-memcon", results: 15, pages: 1 },
    { label: "tag-telcon", results: 7, pages: 1 },
    { label: "declassified", results: 74, pages: 4 }
  ],
  yeltsinMemorandumAndTelconItemRecordsReviewed: 92,
  downloadedPdfCandidates: 94,
  downloadedSourcePages: 534,
  pendingExtentDateRecheck: [
    {
      date: "1993-04-01",
      status:
        "No Clinton Digital Library memorandum/telcon item for the Portland call. Visible hits are photograph contact sheets and press/news context, not conversation text."
    },
    {
      date: "1994-06-03",
      status:
        "No CDL memorandum/telcon item for the Rome/North Korea call. Exact-date search surfaced North Korea background/statement files and photo/finding-aid context, not a telcon."
    },
    {
      date: "1994-07-10",
      status:
        "No Naples memcon item found. CDL item 115036 is WHCA audio of the joint news conference; Naples trip binders are briefing/speech/travel material."
    },
    {
      date: "1998-09-01",
      status:
        "No Moscow meeting memcon found. CDL item 101277 is a trip briefing book; item 11555 is a Yeltsin toast; item 117090 is WHCA news-conference audio."
    },
    {
      date: "1999-02-08",
      status:
        "No Amman memcon found in CDL Yeltsin, memcon, telcon, or declassified facets."
    },
    {
      date: "2000-06-05",
      status:
        "No former-President Yeltsin memcon found. CDL item 118907 is the Russia/Ukraine trip release and includes Putin/Kuchma material, including the June 4 Clinton-Putin memcon, but no Yeltsin courtesy-call memcon."
    }
  ],
  newlyCountedStandaloneDocuments: [
    {
      itemId: "101363",
      date: "1994-01-13",
      pages: 6,
      status: "Added as standalone Moscow one-on-one memcon."
    },
    {
      itemId: "101370",
      date: "1994-01-13",
      pages: 11,
      status: "Added as standalone NSC cable/memcon report for the Yeltsin dinner discussion."
    },
    {
      itemId: "101364",
      date: "1994-01-15",
      pages: 2,
      status: "Added as standalone Moscow one-on-one memcon."
    },
    {
      itemId: "101758",
      date: "1994-09-28",
      pages: 6,
      status:
        "Added as the complete Second Clinton/Yeltsin One-on-One text; duplicate tail pages 1-2 and blank page 8 excluded."
    }
  ],
  duplicateOrNoNewConversationExamples: [
    {
      itemId: "101345",
      status: "Duplicate of the already-counted October 10, 1994 Iraq-crisis telcon."
    },
    {
      itemId: "101387",
      status: "Duplicate source copy for the already-counted June 13, 1994 telcon."
    },
    {
      itemId: "101432",
      status: "Duplicate/cross-reference for the already-counted June 17, 1995 Halifax memcon."
    },
    {
      itemId: "101536",
      status: "Duplicate/source copy for the already-counted March 24, 1999 Kosovo telcon."
    },
    {
      itemId: "101582/101610",
      status:
        "Duplicate/source copies for the Istanbul memcon; the counted chronology record is corrected to November 19, 1999."
    }
  ]
};

const CONVERSATION_PAGE_AUDITS = {
  "1993-01-23|Telcon": { source: SOURCES.m1, sourcePdfPages: "9-11", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19930123] },
  "1993-02-10|Telcon": { source: SOURCES.m1, sourcePdfPages: "19-21", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19930210] },
  "1993-04-01|Telcon": {
    source: SOURCES.m1,
    pageCount: null,
    sourcePdfPages: "No released April 1 telcon pages located in 2015-0782-M-1",
    note:
      "Page audit: the April 1, 1993 Portland telcon remains a leader-chronology/NARA Scout lead; no released conversation pages were found in MDR packet 2015-0782-M-1. The May 21, 2026 recheck reviewed the fresh Clinton Library chronology PDF, the 1,440-item CDL Yeltsin Solr corpus and 92 memorandum/telcon item records, Google Drive exact-date results, NARA Scout exact-date searches, and NSA postings. False/context hits were a 930401 Moscow-to-DC Vancouver preview cable in Drive, CDL photograph/press context, and nearby NSA Vancouver/April 26 releases; none is the April 1 telcon.",
    extractionStatus:
      "Pending source problem: no derivative PDF generated because no released April 1, 1993 telcon pages were located after rechecking the Clinton Library chronology and digital collection, Google Drive, NARA Scout/Catalog, and National Security Archive. Do not substitute the nearby Vancouver summit memcons, 930401 preview cable, or April 26 telcon."
  },
  "1993-04-26|Telcon": { source: SOURCES.m1, sourcePdfPages: "51-52", pageCount: 2, driveFiles: [DRIVE_CANDIDATES.telcon19930426] },
  "1993-05-02|Telcon": { source: SOURCES.m1, sourcePdfPages: "60-61", pageCount: 2, driveFiles: [DRIVE_CANDIDATES.telcon19930502] },
  "1993-05-10|Telcon": { source: SOURCES.m1, sourcePdfPages: "68-69", pageCount: 2 },
  "1993-06-28|Telcon": { source: SOURCES.m1, sourcePdfPages: "76-79", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.telcon19930628] },
  "1993-07-10|Memcon": {
    source: SOURCES.m1,
    sourcePdfPages: "81-89",
    pageCount: 9,
    driveFiles: [DRIVE_CANDIDATES.memcon19930710],
    strobeFiles: [STROBE_CONVERSATION_FILES.memcon19930710TokyoCable]
  },
  "1993-09-07|Telcon": { source: SOURCES.m1, sourcePdfPages: "95-98", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.telcon19930907] },
  "1993-09-21|Telcon": { source: SOURCES.m1, sourcePdfPages: "107-109", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19930921] },
  "1993-10-05|Telcon": {
    source: SOURCES.m1,
    sourcePdfPages: "119-121",
    pageCount: 3,
    driveFiles: [DRIVE_CANDIDATES.telcon19931005],
    excluded: "Duplicate attachment pages 132-134 in the Lake clarification packet were excluded."
  },
  "1993-12-22|Telcon": { source: SOURCES.m1, sourcePdfPages: "142-145", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.telcon19931222] },
  "1994-01-14-bilateral": {
    source: SOURCES.stateFoiaDrive,
    pageCount: 8,
    driveFiles: [
      DRIVE_CANDIDATES.memcon19940114Bilateral,
      DRIVE_CANDIDATES.memcon19940114BilateralDuplicate
    ],
    sourcePdfPages: "State FOIA document C06694502, conversation pages 1-8",
    excluded: "The duplicate Drive title for the same State FOIA document was deduplicated."
  },
  "1994-01-14-trilateral": {
    source: SOURCES.stateFoiaDrive,
    pageCount: 3,
    driveFiles: [DRIVE_CANDIDATES.memcon19940114Trilateral],
    sourcePdfPages: "State FOIA document C06694499, conversation pages 1-3"
  },
  "1994-02-20|Telcon": { source: SOURCES.m1, sourcePdfPages: "155-157", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19940220] },
  "1994-04-10|Telcon": { source: SOURCES.m1, sourcePdfPages: "164-166", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19940410] },
  "1994-04-20|Telcon": { source: SOURCES.m1, sourcePdfPages: "181-184", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.telcon19940420] },
  "1994-06-03|Telcon": {
    source: SOURCES.m1,
    pageCount: null,
    sourcePdfPages: "Marker/withdrawal packet pages 187-190 only; no released telcon pages",
    markerPage: 187,
    note:
      "Page audit: packet pages 187-190 contain marker/withdrawal/profile material for Document ID 9404692; the actual June 3, 1994 telcon was not released in the reviewed packet. A Public Papers/GovInfo item confirms the call occurred and identifies North Korea as the topic, but it is a press statement, not the telcon text. The May 21, 2026 recheck found no CDL, Drive, NSA, or NARA Scout transcript. NARA Catalog false lead 9404405/NAID 23901993 is a July 1994 trip briefing-material packet, not the Rome telcon.",
    extractionStatus:
      "Pending source problem: no derivative PDF generated because the source packet contains marker/withdrawal/profile pages only, not released June 3, 1994 telcon text; later Clinton Library, Google Drive, NARA Scout/Catalog, and NSA searches found confirmation/context only."
  },
  "1994-06-13|Telcon": {
    source: SOURCES.m1,
    sourcePdfPages: "191-194",
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.telcon19940613],
    note: "The Drive hit is titled 940611; the Clinton Library chronology and packet text identify the contact as June 13, 1994."
  },
  "1994-07-05|Telcon": { source: SOURCES.m1, sourcePdfPages: "202-204", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19940705] },
  "1994-07-10|Memcon": {
    source: SOURCES.m1,
    pageCount: null,
    sourcePdfPages: "No released July 10, 1994 Naples memcon pages located in 2015-0782-M-1",
    note:
      "Page audit correction: the previous 213-219 range is the September 27, 1994 White House one-on-one memcon, not the July 10, 1994 Naples meeting. The May 21, 2026 recheck found Naples trip binders, public-event material, CDL item 115036/NARA NAID 192122252 WHCA news-conference audio, and NSA Budapest/NATO context using the Naples meeting as background while publishing the July 5 telcon and September 28 memcon. No July 10 Naples memcon text was found in Clinton Library, Drive, NARA Scout/Catalog, or NSA sources.",
    extractionStatus:
      "Pending source problem: no derivative PDF generated because no released July 10, 1994 Naples memcon pages were located in the reviewed Clinton Library packet, Clinton Digital Library/public-record searches, Google Drive, NARA Scout/Catalog, or National Security Archive postings; pages 213-219 have been reassigned to the September 27, 1994 one-on-one memcon."
  },
  "1994-09-27|Memcon": {
    source: SOURCES.m1,
    sourcePdfPages: "251-260",
    markerPage: 244,
    pageCount: 10,
    pdfUrl: DERIVED_PDFS.sep1994ExpandedSecurity,
    driveFiles: [DRIVE_CANDIDATES.memcon19940927],
    note:
      "Counted as the September 27, 1994 4:35-5:35 p.m. expanded security session. The separate 11:00 a.m.-1:00 p.m. one-on-one memcon is retained as its own counted Drive/MDR candidate.",
    extractionStatus:
      "Potential FRUS document: extracted actual expanded-session memcon pages 251-260 from 2015-0782-M-1 and appended original marker page 244. Transmittal/profile/action pages were excluded."
  },
  "1994-10-05|Telcon": {
    source: SOURCES.m1,
    sourcePdfPages: "227-230",
    pageCount: 4,
    strobeFiles: [STROBE_CONVERSATION_FILES.telcon19941005]
  },
  "1994-10-10|Telcon": {
    source: SOURCES.m1,
    sourcePdfPages: "238-241",
    markerPage: 232,
    pageCount: 4,
    pdfUrl: DERIVED_PDFS.iraqTelcon19941010,
    driveFiles: [DRIVE_CANDIDATES.telcon19931010],
    note:
      "The source date line reads October 10, 1993, but the leader chronology, October 1994 Iraq crisis subject matter, and surrounding Document ID 9408229 packet context identify this as the October 10, 1994 telcon. The Google Drive file titled 931010 is treated as a misdated duplicate source copy.",
    extractionStatus:
      "Potential FRUS document: extracted actual October 10, 1994 telcon pages 238-241 from 2015-0782-M-1 and appended original marker page 232. Transmittal/action/receipt pages were excluded."
  },
  "1995-02-13|Telcon": { source: SOURCES.m1, sourcePdfPages: "268-271", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.telcon19950213] },
  "1995-04-27|Telcon": { source: SOURCES.m1, sourcePdfPages: "280-283", pageCount: 4 },
  "1995-05-10|Memcon": {
    source: SOURCES.m1,
    sourcePdfPages: "285-300",
    markerPage: 301,
    pageCount: 16,
    note: "The packet item is a summary report of the one-on-one meeting and is counted as the actual meeting record."
  },
  "1995-06-17|Memcon": {
    source: SOURCES.strobe,
    catalogUrl: SOURCES.strobe.url,
    pdfUrl: STROBE_CONVERSATION_FILES.memcon19950617Halifax.url,
    sourcePdfPages: "Strobe FOIA document C06835181, conversation pages 1-8",
    sourcePdfPageCount: 8,
    pageCount: 8,
    strobeFiles: [STROBE_CONVERSATION_FILES.memcon19950617Halifax],
    note:
      "Strobe FOIA document C06835181 supplies the actual Halifax Clinton-Yeltsin meeting record; counted pages 1-8 only.",
    extractionStatus:
      "Potential FRUS document: counted only the actual Halifax memcon pages 1-8 in Strobe FOIA document C06835181. No separate marker/provenance page was present in the reviewed Strobe PDF."
  },
  "1995-07-28|Telcon": { source: SOURCES.m1, sourcePdfPages: "309-313", pageCount: 5, driveFiles: [DRIVE_CANDIDATES.telcon19950728] },
  "1995-09-27|Telcon": { source: SOURCES.m1, sourcePdfPages: "324-326", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19950927] },
  "1996-01-26|Telcon": { source: SOURCES.m1, sourcePdfPages: "342-346", pageCount: 5, driveFiles: [DRIVE_CANDIDATES.telcon19960126] },
  "1996-02-21|Telcon": { source: SOURCES.m1, sourcePdfPages: "354-357", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.telcon19960221] },
  "1996-03-13|Memcon": {
    source: SOURCES.sharmCable,
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.memcon19960313Cable, DRIVE_CANDIDATES.memcon19960313CableDuplicate],
    sourcePdfPages: "Google Drive file 1kqpS-sURsWvTfRqKhA-09YXKX5fVVh7c, pages 2-5",
    sourcePdfPageCount: 6,
    markerPage: 1,
    pdfUrl: DERIVED_PDFS.sharmMemconCable,
    excluded:
      "The second Drive title is the same State cable text without a separate provenance sheet; counted once from the 2016-0118-M-4 copy.",
    extractionStatus:
      "Potential FRUS document: extracted actual cable memcon pages 2-5 from the 2016-0118-M-4 Drive copy and appended source page 1, the Clinton Library withdrawal/provenance sheet. Page 6 is cable distribution metadata and was excluded."
  },
  "1996-04-09|Telcon": { source: SOURCES.m1, sourcePdfPages: "369-373", pageCount: 5, driveFiles: [DRIVE_CANDIDATES.telcon19960409] },
  "1996-04-21-one-on-one": {
    source: SOURCES.m1,
    sourcePdfPages: "381-393",
    pageCount: 13,
    driveFiles: [DRIVE_CANDIDATES.memcon19960421OneOnOne],
    strobeFiles: [STROBE_CONVERSATION_FILES.memcon19960421OneOnOne]
  },
  "1996-04-21-luncheon": { source: SOURCES.m2, sourcePdfPages: "7-13", pageCount: 7, driveFiles: [DRIVE_CANDIDATES.memcon19960421Lunch] },
  "1996-05-07|Telcon": { source: SOURCES.m2, sourcePdfPages: "25-28", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.telcon19960507] },
  "1996-06-18|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "39-40",
    pageCount: 2,
    driveFiles: [DRIVE_CANDIDATES.telcon19960618],
    strobeFiles: [
      STROBE_CONVERSATION_FILES.telcon19960618Transmittal,
      STROBE_CONVERSATION_FILES.telcon19960618Cable
    ]
  },
  "1996-07-05|Telcon": { source: SOURCES.m2, sourcePdfPages: "49-51", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19960705] },
  "1996-09-15|Telcon": { source: SOURCES.m2, sourcePdfPages: "64-65", pageCount: 2 },
  "1996-12-05|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "77-79",
    pageCount: 3,
    strobeFiles: [STROBE_CONVERSATION_FILES.telcon19961205]
  },
  "1997-02-27|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "87-89",
    pageCount: 3,
    driveFiles: [DRIVE_CANDIDATES.telcon19970227],
    excluded: "Duplicate packet pages 93-95 were excluded."
  },
  "1997-03-21-morning": { source: SOURCES.m2, sourcePdfPages: "105-115", pageCount: 11, driveFiles: [DRIVE_CANDIDATES.memcon19970321Morning] },
  "1997-03-21-lunch": { source: SOURCES.m2, sourcePdfPages: "116-123", pageCount: 8, driveFiles: [DRIVE_CANDIDATES.memcon19970321Lunch] },
  "1997-03-21-afternoon": { source: SOURCES.m2, sourcePdfPages: "124-127", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.memcon19970321Afternoon] },
  "1997-03-21-dinner": { source: SOURCES.m2, sourcePdfPages: "128-133", pageCount: 6, driveFiles: [DRIVE_CANDIDATES.memcon19970321Dinner] },
  "1997-05-27|Memcon": { source: SOURCES.m2, sourcePdfPages: "143-150", pageCount: 8, driveFiles: [DRIVE_CANDIDATES.memcon19970527] },
  "1997-06-20|Memcon": { source: SOURCES.m2, sourcePdfPages: "165-172", pageCount: 8, driveFiles: [DRIVE_CANDIDATES.memcon19970620] },
  "1997-10-30|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "183-188",
    pageCount: 6,
    driveFiles: [DRIVE_CANDIDATES.telcon19971030],
    strobeFiles: [STROBE_CONVERSATION_FILES.telcon19971030],
    excluded: "Duplicate packet pages 193-198 were excluded."
  },
  "1997-11-16|Telcon": { source: SOURCES.m2, sourcePdfPages: "206-208", pageCount: 3, driveFiles: [DRIVE_CANDIDATES.telcon19971116] },
  "1997-11-22|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "218-223",
    pageCount: 6,
    driveFiles: [DRIVE_CANDIDATES.telcon19971122],
    excluded: "Partial duplicate packet pages 227-228 were excluded."
  },
  "1998-02-02|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "236-239",
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.telcon19980202],
    excluded: "Duplicate packet pages 240-243 were excluded."
  },
  "1998-02-23|Telcon": { source: SOURCES.m2, sourcePdfPages: "253-256", pageCount: 4, driveFiles: [DRIVE_CANDIDATES.telcon19980223] },
  "1998-04-06|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "274-278",
    pageCount: 5,
    driveFiles: [DRIVE_CANDIDATES.telcon19980406],
    strobeFiles: [STROBE_CONVERSATION_FILES.telcon19980406Attachment],
    excluded: "Earlier duplicate packet pages 267-270 were excluded in favor of the complete copy."
  },
  "1998-05-12|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "286-290",
    pageCount: 5,
    driveFiles: [DRIVE_CANDIDATES.telcon19980512],
    strobeFiles: [STROBE_CONVERSATION_FILES.telcon19980512]
  },
  "1998-05-17|Memcon": {
    source: SOURCES.m2,
    sourcePdfPages: "312-319",
    pageCount: 8,
    driveFiles: [DRIVE_CANDIDATES.memcon19980517],
    strobeFiles: [STROBE_CONVERSATION_FILES.memcon19980517Birmingham],
    excluded:
      "The Strobe FOIA packet's informal copy runs pages 1-13 and also carries an April 6, 1998 telcon attachment; the canonical count remains the released MDR packet pages 312-319."
  },
  "1998-05-21|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "301-303",
    pageCount: 3,
    driveFiles: [DRIVE_CANDIDATES.telcon19980521],
    excluded: "Duplicate packet pages 308-310 were excluded."
  },
  "1998-05-28|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "329-332",
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.telcon19980528],
    strobeFiles: [STROBE_CONVERSATION_FILES.telcon19980528],
    excluded: "Duplicate first-page copy on packet page 334 was excluded."
  },
  "1998-06-15|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "342-346",
    pageCount: 5,
    driveFiles: [DRIVE_CANDIDATES.telcon19980615],
    excluded: "Later duplicate copy in the packet was excluded; duplicate chronology row was suppressed."
  },
  "1998-06-16|Telcon": { source: SOURCES.m2, sourcePdfPages: "359-360", pageCount: 2 },
  "1998-07-10|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "371-374",
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.telcon19980710],
    strobeFiles: [STROBE_CONVERSATION_FILES.telcon19980710]
  },
  "1998-08-14|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "384-389",
    pageCount: 6,
    driveFiles: [DRIVE_CANDIDATES.telcon19980814],
    excluded: "Duplicate packet copy beginning at page 393 was excluded."
  },
  "1998-08-25|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "405-408",
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.telcon19980825],
    excluded: "Duplicate packet pages 411-412 were excluded."
  },
  "1998-09-01|Memcon": {
    source: SOURCES.m2,
    pageCount: null,
    sourcePdfPages: "No released September 1-2, 1998 Moscow memcon pages located in 2015-0782-M-2",
    note:
      "Page audit: the September 1-2, 1998 Moscow meetings remain a leader-chronology/NARA Scout lead; the reviewed MDR packet jumps from August 25/September 12 telephone material to later records. The May 21, 2026 recheck found Google Drive's 980901 briefing book copy and Clinton Digital Library item 101277 (2016-0143-M), a 77-page trip briefing book with scenesetters, schedules, and talking points, not actual memcons. CDL item 11555 is a Yeltsin toast and item 117090 is WHCA news-conference audio. National Security Archive publishes the August 14 preparatory telcon and September 12 follow-up telcon, but not the September 1-2 Moscow meeting memcons.",
    extractionStatus:
      "Pending source problem: no derivative PDF generated because no released September 1-2, 1998 Moscow memcon pages were located in the reviewed MDR packet, Google Drive search, Clinton Digital Library trip-book/audio/toast releases, NARA Scout/Catalog searches, or National Security Archive postings."
  },
  "1998-09-12|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "422-425",
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.telcon19980912],
    excluded: "Duplicate/continued packet pages 426-431 were excluded."
  },
  "1998-10-05|Telcon": {
    source: SOURCES.clinton20160620,
    sourcePdfPages: "3-5",
    sourcePdfPageCount: 6,
    pageCount: 3,
    pdfUrl: DERIVED_PDFS.oct1998Telcon,
    note:
      "Counted from Clinton Digital Library item 100503, MDR release 2016-0620-M. Source PDF pages 1-2 are an August 24 briefing memorandum and page 6 is a separate Berger memorandum; only telcon pages 3-5 were counted.",
    extractionStatus:
      "Potential FRUS document: extracted actual October 5, 1998 telcon pages 3-5 from the 2016-0620-M source PDF. The source PDF has no marker/provenance sheet, so the local PDF is actual pages only and no marker-appended derivative was possible."
  },
  "1998-12-30|Telcon": {
    source: SOURCES.clintonIraq19981230,
    sourcePdfPages: "1-5",
    sourcePdfPageCount: 5,
    pageCount: 5,
    pdfUrl: DERIVED_PDFS.dec1998Telcon,
    note:
      "Counted from Clinton Digital Library item 119190. The source PDF appears to consist only of the December 30, 1998 Clinton-Yeltsin telcon.",
    extractionStatus:
      "Potential FRUS document: retained actual December 30, 1998 telcon pages 1-5 from Clinton Digital Library item 119190. The source PDF has no marker/provenance sheet, so the local PDF is actual pages only and no marker-appended derivative was possible."
  },
  "1999-02-08|Memcon": {
    source: SOURCES.m2,
    pageCount: null,
    sourcePdfPages: "No released February 8, 1999 Amman memcon pages located in 2015-0782-M-2",
    note:
      "Page audit: the February 8, 1999 Amman meeting remains a leader-chronology lead; no released memcon pages were found in the reviewed MDR packet, Google Drive exact-date/place searches, Clinton Digital Library Yeltsin/memcon/telcon/declassified searches, NARA Scout/Catalog searches, or National Security Archive search. A White House press briefing from Amman confirms Clinton and Yeltsin spoke briefly at King Hussein's funeral, but describes it as brief/personal chatter rather than a released memcon.",
    extractionStatus:
      "Pending source problem: no derivative PDF generated because no released February 8, 1999 Amman memcon pages were located; public White House reporting confirms only a brief interaction, not an available conversation record."
  },
  "1999-03-24|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "432-436",
    pageCount: 5,
    note: "The packet header has a date typo, but the marker, document ID, and leader chronology identify this as March 24, 1999."
  },
  "1999-04-19|Telcon": { source: SOURCES.m2, sourcePdfPages: "438-443", pageCount: 6 },
  "1999-04-25|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "445-456",
    pageCount: 12,
    driveFiles: [DRIVE_CANDIDATES.telcon19990425],
    excluded: "Duplicate packet pages 457-468 were excluded."
  },
  "1999-05-02|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "470-473",
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.telcon19990502],
    excluded: "Duplicate packet pages 474-477 were excluded."
  },
  "1999-06-07|Telcon": { source: SOURCES.m2, sourcePdfPages: "479-480", pageCount: 2, markerPage: 481 },
  "1999-06-08|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "482-484",
    pageCount: 3,
    excluded: "Duplicate packet pages 485-486 were excluded."
  },
  "1999-06-10|Telcon": { source: SOURCES.m2, sourcePdfPages: "488-489", pageCount: 2 },
  "1999-06-13|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "531-537",
    pageCount: 7,
    driveFiles: [DRIVE_CANDIDATES.telcon19990613],
    excluded: "Duplicate continuation page 539 was excluded."
  },
  "1999-06-14|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "521-524",
    pageCount: 4,
    driveFiles: [DRIVE_CANDIDATES.telcon19990614],
    excluded: "Duplicate packet pages 525-528 were excluded."
  },
  "1999-06-20|Memcon": {
    source: SOURCES.m2,
    sourcePdfPages: "497-505",
    pageCount: 9,
    driveFiles: [DRIVE_CANDIDATES.memcon19990620],
    excluded: "Duplicate packet pages 508-516 were excluded."
  },
  "1999-09-08|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "548-552",
    pageCount: 5,
    driveFiles: [DRIVE_CANDIDATES.telcon19990908],
    excluded: "Duplicate packet pages 554-558 were excluded."
  },
  "1999-11-18|Memcon": {
    source: SOURCES.m2,
    date: "1999-11-19",
    sortDate: "1999-11-19",
    dateLine: "November 19, 1999, Istanbul, Turkey",
    title: "Meeting with President Boris Yeltsin of Russia, November 19, 1999, Istanbul, Turkey",
    documentTitle: "Meeting with President Boris Yeltsin of Russia, November 19, 1999, Istanbul, Turkey",
    sourcePdfPages: "560-566",
    pageCount: 7,
    driveFiles: [DRIVE_CANDIDATES.memcon19991119],
    excluded: "Duplicate packet pages 568-574 were excluded.",
    note:
      "The foreign-leader chronology dates the meeting November 18; the packet text, standalone Clinton Library copies, and Drive title identify the Istanbul memcon as November 19, 1999."
  },
  "1999-12-31|Telcon": {
    source: SOURCES.m2,
    sourcePdfPages: "582-584",
    pageCount: 3,
    driveFiles: [DRIVE_CANDIDATES.telcon19991231],
    excluded: "Duplicate packet pages 589-591 were excluded."
  },
  "2000-06-05|Memcon": {
    source: SOURCES.leaderList,
    pageCount: null,
    sourcePdfPages: "Leader chronology lead only; no released memcon PDF located",
    note:
      "Page audit: the June 5, 2000 meeting with former President Yeltsin is documented in the leader chronology and contemporary public/narrative sources, but no released memcon PDF was located. The May 21, 2026 recheck found no Drive, CDL, NARA Scout/Catalog, or NSA Yeltsin memcon. Clinton Digital Library item 118907 (2016-0114-M) contains a Yeltsin courtesy-call briefing section and talking points, plus Putin/Kuchma material and the June 4 Clinton-Putin memcon, but no actual Clinton-Yeltsin memcon. National Security Archive's June 2000 posting focuses on Clinton-Putin notes and states the official Putin memcon was still classified; no Yeltsin courtesy-call memcon was found.",
    extractionStatus:
      "Pending source problem: no derivative PDF generated because no released June 5, 2000 former President Yeltsin memcon pages were located in the leader chronology follow-up, Google Drive, Clinton Digital Library trip release, NARA Scout/Catalog, or National Security Archive searches."
  }
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

function normalizeDriveFiles(files = []) {
  return files
    .filter(Boolean)
    .map((file) => ({
      id: file.id,
      title: file.title,
      url: driveFileUrl(file.id),
      status: file.status || "Google Drive search match"
    }));
}

function normalizeStrobeFiles(files = []) {
  return files
    .filter(Boolean)
    .map((file) => ({
      id: file.id,
      date: file.date || null,
      title: file.title,
      url: file.url,
      status: file.status || "Strobe Talbott FOIA match"
    }));
}

function auditSourcePageCount(source) {
  return source?.caseNumber ? SOURCE_PDF_PAGE_COUNTS[source.caseNumber] || null : null;
}

function appendNote(base, note) {
  if (!note) return base || "";
  return base ? `${base} ${note}` : note;
}

function extractStateFoiaDocumentId(record) {
  const text = [
    record.naid,
    record.sourcePdfPages,
    record.sourceNote,
    record.extractionStatus,
    record.id
  ]
    .filter(Boolean)
    .join(" ");
  const match = text.match(/\bC\d{8}\b/i);
  return match ? match[0].toUpperCase() : "";
}

function extractMarkerDocumentId(record) {
  const text = [record.sourceNote, record.extractionStatus].filter(Boolean).join(" ");
  const match = text.match(/\bDocument ID\s+([A-Z0-9-]+)/i);
  return match ? match[1] : "";
}

function stripCatalogPrefix(name = "") {
  return name.replace(/^National Archives Catalog,\s*/i, "").trim();
}

function cleanMarkerValue(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || /^2015-0782-M$/i.test(text)) return "";
  return text;
}

function extractedPdfForRecord(record) {
  return EXTRACTED_PDFS_BY_RECORD_ID.get(record.id) || {};
}

function markerControlId(record) {
  const extractedPdf = extractedPdfForRecord(record);
  return (
    cleanMarkerValue(extractedPdf.markerExplicitDocumentId) ||
    cleanMarkerValue(extractedPdf.markerDocumentId) ||
    cleanMarkerValue(extractedPdf.markerFolderTitle) ||
    cleanMarkerValue(extractedPdf.markerRecordId) ||
    cleanMarkerValue(extractMarkerDocumentId(record))
  );
}

function sourceCaseForMarker(record, sourceCase) {
  const extractedPdf = extractedPdfForRecord(record);
  const controlId = markerControlId(record);
  const overrideCase = MARKER_CASE_OVERRIDES_BY_DOCUMENT_ID[controlId];
  if (overrideCase) return overrideCase;

  const markerCase = cleanMarkerValue(extractedPdf.markerCaseNumber);
  if (markerCase === "2015-0782-M" && /^2015-0782-M-[12]$/.test(sourceCase)) {
    return sourceCase;
  }

  if (markerCase) return markerCase;
  return sourceCase;
}

function caseDescription(caseNumber) {
  const detail = MDR_CASE_DETAILS[caseNumber] || {};
  const pieces = [caseNumber];

  if (detail.title) pieces.push(detail.title);
  if (detail.naid) pieces.push(`NAID ${detail.naid}`);
  if (detail.scope) pieces.push(detail.scope);

  return pieces.join(", ");
}

function markerCollectionPath(record) {
  const extractedPdf = extractedPdfForRecord(record);
  const collection = String(extractedPdf.markerCollection || "");
  if (!/NSC Records Management/i.test(collection)) return "";

  if (/Yeltsin/i.test(collection) && /Tel/i.test(collection)) {
    return "Clinton Presidential Records, NSC Records Management, [Yeltsin and Telcons]";
  }

  if (/Yeltsin/i.test(collection)) {
    return "Clinton Presidential Records, NSC Records Management, [Yeltsin]";
  }

  return "Clinton Presidential Records, NSC Records Management";
}

function buildMdrProvenanceSourceNote(record, sourceCase) {
  const extractedPdf = extractedPdfForRecord(record);
  const markerPage = extractedPdf.markerPage || record.markerPage || null;
  const markerCase = sourceCaseForMarker(record, sourceCase);
  const caseInfo = MDR_CASE_DETAILS[markerCase] || MDR_CASE_DETAILS[sourceCase] || {};
  const controlId = markerControlId(record);
  const explicitDocumentId = cleanMarkerValue(extractedPdf.markerExplicitDocumentId);
  const folderTitle = cleanMarkerValue(extractedPdf.markerFolderTitle);
  const recordId = cleanMarkerValue(extractedPdf.markerRecordId);
  const originalOaId = cleanMarkerValue(extractedPdf.markerOriginalOaId);
  const oaBoxNumber = cleanMarkerValue(extractedPdf.markerOaBoxNumber);
  const collectionPath = markerCollectionPath(record);
  const controlLabel = explicitDocumentId
    ? `Document ID ${explicitDocumentId}`
    : controlId
      ? `Folder Title/Record ID ${controlId}`
      : "";

  const base = [
    "Source: William J. Clinton Presidential Library",
    `${CLINTON_PRS_COLLECTION}, NAID ${CLINTON_PRS_COLLECTION_NAID}`,
    `${CLINTON_PRS_SERIES}, NAID ${CLINTON_PRS_SERIES_NAID}`
  ];
  const controls = [
    collectionPath,
    oaBoxNumber ? `OA/Box Number ${oaBoxNumber}` : "",
    folderTitle && folderTitle !== controlId ? `Folder Title ${folderTitle}` : "",
    recordId && recordId !== controlId ? `Record ID ${recordId}` : "",
    controlLabel,
    originalOaId ? `Original OA/ID ${originalOaId}` : "",
    `${caseInfo.type || "MDR/FOIA case"} ${caseDescription(markerCase || sourceCase)}`
  ].filter(Boolean);
  const marker = markerPage
    ? extractedPdf.markerPage
      ? `Provenance sheet: source PDF page ${markerPage} appended.`
      : `Marker/provenance page located at source PDF page ${markerPage}; no derivative PDF generated until actual conversation pages are located.`
    : "";

  return `${base.join(", ")}. ${controls.join("; ")}.${marker ? ` ${marker}` : ""}`;
}

function buildFrusSourceNote(record) {
  if (record.frusSourceNote) return record.frusSourceNote;

  const source = record.source || {};
  const sourceName = source.name || "";
  const sourceCase = source.caseNumber || "";
  const foiaDocumentId = extractStateFoiaDocumentId(record);

  if (sourceCase === SOURCES.vancouverMemcons.caseNumber) {
    return buildMdrProvenanceSourceNote(record, sourceCase);
  }

  if (sourceCase === SOURCES.hydeParkMemcons.caseNumber) {
    return buildMdrProvenanceSourceNote(record, sourceCase);
  }

  if (sourceCase === SOURCES.kerrickTelconsMemcons.caseNumber) {
    return `Source: William J. Clinton Presidential Library, National Security Council European Affairs Office, Donald Kerrick's Files, Telcons and Memcons, Box 26/OA 368, FOIA case ${sourceCase}, NAID ${record.naid}.`;
  }

  if (sourceCase === SOURCES.m1.caseNumber || sourceCase === SOURCES.m2.caseNumber) {
    return buildMdrProvenanceSourceNote(record, sourceCase);
  }

  if (sourceCase === SOURCES.tokyo.caseNumber) {
    return buildMdrProvenanceSourceNote(record, sourceCase);
  }

  if (sourceCase === SOURCES.kosovoLetter.caseNumber) {
    return buildMdrProvenanceSourceNote(record, sourceCase);
  }

  if (sourceCase === SOURCES.sharmCable.caseNumber) {
    const markerPage = extractedPdfForRecord(record).markerPage || record.markerPage || null;
    return `Source: William J. Clinton Presidential Library, Clinton Digital Library item 118876, ${caseDescription("2016-0118-M")}. Provenance: ${MDR_CASE_DETAILS["2016-0118-M"].provenance}. Source copy reviewed from Google Drive segment ${sourceCase}.${markerPage ? ` Provenance sheet: source PDF page ${markerPage} appended.` : ""}`;
  }

  if (sourceCase === SOURCES.clinton20160620.caseNumber) {
    return `Source: William J. Clinton Presidential Library, Clinton Digital Library item 100503, ${caseDescription(sourceCase)}. Provenance: ${MDR_CASE_DETAILS[sourceCase].provenance}.`;
  }

  if (sourceCase === SOURCES.clintonIraq19981230.caseNumber) {
    return `Source: William J. Clinton Presidential Library, Clinton Digital Library item 119190, ${caseDescription(sourceCase)}. Provenance: ${MDR_CASE_DETAILS[sourceCase].provenance}.`;
  }

  if (sourceCase === SOURCES.strobe.caseNumber || /Strobe Talbott/i.test(sourceName)) {
    return `Source: Department of State, FOIA Virtual Reading Room, Strobe Talbott FOIA release, case ${sourceCase || SOURCES.strobe.caseNumber}${foiaDocumentId ? `, document ${foiaDocumentId}` : ""}.`;
  }

  if (/Google Drive/i.test(sourceName)) {
    return `Source: Google Drive candidate copy${foiaDocumentId ? ` of Department of State FOIA document ${foiaDocumentId}` : ""}. Repository citation pending verification against the original release.`;
  }

  if (/Meetings and Telephone Calls with Foreign Leaders/i.test(sourceName)) {
    return "Source: William J. Clinton Presidential Library, Meetings and Telephone Calls with Foreign Leaders, master chronology.";
  }

  if (/Presidential Daily Diary/i.test(sourceName)) {
    return `Source: National Archives Catalog, Presidential Daily Diary (Clinton Administration), Ellen McCathran's Files, NAID ${record.naid}.`;
  }

  if (/Advance Office Trip Books/i.test(sourceName)) {
    return `Source: National Archives Catalog, Records of the Advance Office (Clinton Administration), Trip Books, NAID ${record.naid}.`;
  }

  if (/Records of the NSC European Affairs Office/i.test(sourceName)) {
    return `Source: National Archives Catalog, Records of the National Security Council European Affairs Office (Clinton Administration), Donald Kerrick's Files, NAID ${record.naid}.`;
  }

  if (/Donald Kerrick/i.test(sourceName)) {
    return `Source: National Archives Catalog, Records of the National Security Council European Affairs Office (Clinton Administration), Donald Kerrick's Files, NAID ${record.naid}.`;
  }

  if (sourceName === SOURCES.naraScout.name || /NARA Scout/i.test(sourceName)) {
    return `Source: NARA Scout search trail, ${record.dateLine || "search run date pending"}.`;
  }

  if (/^https:\/\/catalog\.archives\.gov/i.test(record.catalogUrl || "") && record.naid) {
    return `Source: National Archives Catalog, ${stripCatalogPrefix(sourceName) || record.documentTitle}, NAID ${record.naid}.`;
  }

  return `Source: ${sourceName || "Provenance pending"}.`;
}

function addFrusSourceNotes(records) {
  return records.map((record) => ({
    ...record,
    frusSourceNote: buildFrusSourceNote(record)
  }));
}

function auditExtractionStatus(record, audit, extractedPdf) {
  if (audit.extractionStatus) return audit.extractionStatus;

  const sourceLabel = audit.source?.caseNumber || audit.source?.name || record.source?.caseNumber || "source";
  if (audit.pageCount && extractedPdf) {
    const markerText = extractedPdf.markerPage
      ? ` and appended original marker page ${extractedPdf.markerPage} as the provenance sheet`
      : "; no original marker/provenance page was identified in the source PDF";
    return `Potential FRUS document: extracted actual ${record.type.toLowerCase()} pages ${audit.sourcePdfPages} from ${sourceLabel}${markerText}. Surrounding administrative material and duplicate copies excluded.`;
  }

  if (audit.pageCount) {
    const markerText = audit.markerPage
      ? ` Marker page ${audit.markerPage} should be appended as the provenance sheet if a derivative PDF is generated.`
      : " The original source marker page still needs to be appended as the provenance sheet if a derivative PDF is generated.";
    return `Potential FRUS document: counted only actual ${record.type.toLowerCase()} pages ${audit.sourcePdfPages} in ${sourceLabel}; surrounding administrative material and duplicate copies excluded.${markerText}`;
  }

  return `Potential FRUS document: Google Drive search surfaced a matching ${record.type.toLowerCase()}, but the actual conversation-page extent still needs verification against the original PDF.`;
}

function manifestExtractionStatus(record, extractedPdf) {
  const sourceLabel = record.source?.caseNumber || record.source?.name || record.source?.url || "source";
  const markerText = extractedPdf.markerPage
    ? ` and appended original marker page ${extractedPdf.markerPage} as the provenance sheet`
    : "; no original marker/provenance page was identified in the source PDF";
  const base = `Potential FRUS document: extracted actual ${record.type.toLowerCase()} pages ${
    record.sourcePdfPages || extractedPdf.extractedPages
  } from ${sourceLabel}${markerText}. Surrounding administrative material and duplicate copies excluded.`;
  return appendNote(base, record.extractionNote);
}

function applyConversationAudit(record, auditKey = `${record.date}|${record.type}`) {
  const audit = CONVERSATION_PAGE_AUDITS[auditKey];
  const potentialTopics = [...new Set([...(record.frusTopics || []), "Potential FRUS document"])];

  if (!audit) {
    return {
      ...record,
      potentialFrusDocument: true,
      countStatus: "Extent pending",
      frusTopics: potentialTopics,
      topics: [...new Set([...(record.topics || []), "Potential FRUS document"])]
    };
  }

  const source = audit.source || record.source;
  const driveFiles = normalizeDriveFiles(audit.driveFiles);
  const strobeFiles = normalizeStrobeFiles([...(record.strobeFiles || []), ...(audit.strobeFiles || [])]);
  const extractedPdf = EXTRACTED_PDFS_BY_RECORD_ID.get(record.id);
  const countStatus = audit.pageCount ? "Counted actual conversation pages only" : "Extent pending";
  const auditNote =
    audit.note ||
    (audit.pageCount
      ? `Page count audit: ${audit.pageCount} actual conversation pages${
          audit.sourcePdfPages ? ` from ${audit.sourcePdfPages}` : ""
        }; non-conversation pages and duplicate copies excluded.`
      : "Page count audit: extent pending; Drive candidate retained for compiler review.");
  const duplicateNote = audit.excluded ? `Dedup/exclusion note: ${audit.excluded}` : "";
  const strobeNote =
    audit.strobeNote ||
    (strobeFiles.length
      ? `Strobe FOIA review: ${strobeFiles
          .map((file) => `${file.id} (${file.status})`)
          .join(" ")}`
      : "");

  return {
    ...record,
    date: audit.date || record.date,
    sortDate: audit.sortDate || audit.date || record.sortDate || record.date,
    title: audit.title || record.title,
    documentTitle: audit.documentTitle || record.documentTitle,
    source,
    catalogUrl: audit.catalogUrl || record.catalogUrl,
    pdfUrl: extractedPdf?.output || audit.pdfUrl || record.pdfUrl,
    pageCount: Object.prototype.hasOwnProperty.call(audit, "pageCount")
      ? audit.pageCount
      : record.pageCount,
    sourcePdfPages: audit.sourcePdfPages || record.sourcePdfPages,
    sourcePdfPageCount: audit.sourcePdfPageCount || auditSourcePageCount(source) || undefined,
    localPdfPageCount: extractedPdf?.localPdfPageCount || audit.localPdfPageCount || record.localPdfPageCount,
    dateLine: audit.dateLine || record.dateLine,
    markerPage:
      extractedPdf?.markerPage ||
      (Object.prototype.hasOwnProperty.call(audit, "markerPage") ? audit.markerPage : record.markerPage),
    googleDriveFiles: driveFiles.length ? driveFiles : undefined,
    strobeFiles: strobeFiles.length ? strobeFiles : undefined,
    potentialFrusDocument: true,
    countStatus,
    extractionStatus: auditExtractionStatus(record, audit, extractedPdf),
    sourceNote: appendNote(appendNote(appendNote(record.sourceNote, auditNote), duplicateNote), strobeNote),
    frusTopics: [...new Set([...potentialTopics, ...(audit.topics || [])])],
    topics: [...new Set([...(record.topics || []), "Potential FRUS document", ...(audit.topics || [])])]
  };
}

function applyExtractedPdfManifest(records) {
  return records.map((record) => {
    const extractedPdf = EXTRACTED_PDFS_BY_RECORD_ID.get(record.id);
    if (!extractedPdf) return record;

    return {
      ...record,
      pdfUrl: extractedPdf.output,
      localPdfPageCount: extractedPdf.localPdfPageCount,
      markerPage: extractedPdf.markerPage || null,
      extractionStatus: manifestExtractionStatus(record, extractedPdf)
    };
  });
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
    const supportingSourceNotes = [];
    if (date.iso === "1994-07-05") {
      supportingSourceNotes.push(
        "Clinton Digital Library item 48591, Russia [1] (2011-0516-S), includes July 5, 1994 press contingency points stating that Clinton called Yeltsin from the Oval Office for about 20 minutes; the surrounding Lake memo, Yeltsin-call talking points, and June 28 Yeltsin letter are withdrawal markers, not a telcon transcript."
      );
    }
    if (date.iso === "1996-04-09") {
      supportingSourceNotes.push(
        "Clinton Digital Library item 48591, Russia [1] (2011-0516-S), includes withdrawal markers for April 8, 1996 briefing paper and talking points prepared for Clinton's April 9 Yeltsin call; it does not include the telcon transcript."
      );
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
      }${related.length ? `; related packet(s): ${related.join(", ")}` : ""}.${
        supportingSourceNotes.length ? ` Supporting source: ${supportingSourceNotes.join(" ")}` : ""
      }`,
      extractionRule: EXTRACTION_RULE,
      frusVolume: FRUS_VOLUME,
      frusTopics: contactTopics(entry, date.iso, type),
      topics: contactTopics(entry, date.iso, type),
      relatedReleaseIds: related
    };

    if (date.iso === "1994-01-13" && /January 13-15, 1994/i.test(entry)) {
      const lead = {
        ...record,
        id: "contact-1994-01-13-memcon-moscow-summit-lead",
        title:
          "Chronology lead: Clinton-Yeltsin Moscow summit meetings, January 13-15, 1994",
        documentTitle:
          "Chronology lead: Clinton-Yeltsin Moscow summit meetings, January 13-15, 1994",
        pageCount: null,
        candidateStatus: "Chronology lead; individual actual memcons counted separately",
        countStatus: "Not counted as a document extent",
        potentialFrusDocument: false,
        subjectLine:
          "Broad foreign-leader chronology entry retained as a summit lead; actual Jan. 14 memcons identified in Google Drive are listed separately.",
        extractionStatus:
          "Chronology lead only: no pages counted here. Use the separate Jan. 14 bilateral and trilateral memcon records for actual document-page totals.",
        frusTopics: [...new Set([...record.frusTopics, "Moscow summit", "Chronology lead"])],
        topics: [...new Set([...record.topics, "Moscow summit", "Chronology lead"])]
      };

      const bilateral = applyConversationAudit(
        {
          ...record,
          id: "contact-1994-01-14-memcon-second-expanded-bilateral-session",
          date: "1994-01-14",
          sortDate: "1994-01-14",
          sortOrder: 2,
          type: "Memcon",
          title:
            "Memorandum of conversation: Second Expanded Bilateral Session with President Boris Yeltsin of Russia",
          documentTitle:
            "Second Expanded Bilateral Session with President Boris Yeltsin of Russia",
          participants: [
            "Bill Clinton",
            "Boris Yeltsin",
            "Warren Christopher",
            "Anthony Lake",
            "Strobe Talbott",
            "Andrei Kozyrev"
          ],
          countries: ["United States", "Russia"],
          releaseStatus: "Full",
          naid: "C06694502",
          catalogUrl: driveFileUrl(DRIVE_CANDIDATES.memcon19940114Bilateral.id),
          pdfUrl: driveFileUrl(DRIVE_CANDIDATES.memcon19940114Bilateral.id),
          dateLine:
            "January 14, 1994, 9:35-11:15 a.m., St. Catherine's Hall, The Kremlin, Moscow",
          subjectLine:
            "State FOIA / Drive candidate memcon for the second expanded Clinton-Yeltsin bilateral session in Moscow.",
          source: SOURCES.stateFoiaDrive,
          sourceNote:
            "Source: Google Drive search result for Department of State FOIA document C06694502, surfaced as a Clinton-Yeltsin memcon candidate.",
          relatedReleaseIds: ["Google Drive", "C06694502", "F-2017-13804"]
        },
        "1994-01-14-bilateral"
      );

      return [lead, bilateral];
    }

    if (date.iso === "1994-01-14" && /Kravchuk/i.test(entry)) {
      return [
        applyConversationAudit(
          {
            ...record,
            id: "contact-1994-01-14-memcon-trilateral-yeltsin-kravchuk",
            sortOrder: 1,
            title:
              "Memorandum of conversation: Trilateral Meeting with President Boris Yeltsin of Russia on Security Issues",
            documentTitle:
              "Trilateral Meeting with President Boris Yeltsin of Russia on Security Issues",
            participants: [
              "Bill Clinton",
              "Boris Yeltsin",
              "Leonid Kravchuk",
              "Warren Christopher",
              "Anthony Lake",
              "Strobe Talbott",
              "Andrei Kozyrev"
            ],
            countries: ["United States", "Russia", "Ukraine"],
            releaseStatus: "Full",
            naid: "C06694499",
            catalogUrl: driveFileUrl(DRIVE_CANDIDATES.memcon19940114Trilateral.id),
            pdfUrl: driveFileUrl(DRIVE_CANDIDATES.memcon19940114Trilateral.id),
            dateLine:
              "January 14, 1994, 8:35-8:55 a.m., St. Catherine's Hall, The Kremlin, Moscow",
            subjectLine:
              "State FOIA / Drive candidate trilateral Clinton-Yeltsin-Kravchuk security memcon.",
            source: SOURCES.stateFoiaDrive,
            sourceNote:
              "Source: Google Drive search result for Department of State FOIA document C06694499, surfaced as a Clinton-Yeltsin-Kravchuk memcon candidate.",
            relatedReleaseIds: ["Google Drive", "C06694499", "F-2017-13804"]
          },
          "1994-01-14-trilateral"
        )
      ];
    }

    if (date.iso === "1996-04-21" && /Moscow, Russia/i.test(entry)) {
      return [
        applyConversationAudit(
          {
            ...record,
            id: "contact-1996-04-21-memcon-moscow-one-on-one",
            sortOrder: 1,
            title: "Memorandum of conversation: POTUS-Yeltsin One-on-One",
            documentTitle: "POTUS-Yeltsin One-on-One",
            dateLine: "April 21, 1996, 10:00-11:45 a.m., Moscow, Russia",
            subjectLine:
              "Moscow summit one-on-one memcon between Clinton and Yeltsin before the expanded luncheon.",
            source: SOURCES.m1,
            catalogUrl: SOURCES.m1.url,
            pdfUrl: SOURCES.m1.pdfUrl,
            relatedReleaseIds: ["2015-0782-M-1"]
          },
          "1996-04-21-one-on-one"
        ),
        applyConversationAudit(
          {
            ...record,
            id: "contact-1996-04-21-memcon-moscow-luncheon",
            sortOrder: 2,
            title: "Memorandum of conversation: Luncheon Meeting with Russian President Boris Yeltsin",
            documentTitle: "Luncheon Meeting with Russian President Boris Yeltsin",
            dateLine: "April 21, 1996, 12:50-2:15 p.m., Moscow, Russia",
            subjectLine:
              "Moscow summit luncheon memcon with expanded U.S. and Russian delegations.",
            source: SOURCES.m2,
            catalogUrl: SOURCES.m2.url,
            pdfUrl: SOURCES.m2.pdfUrl,
            relatedReleaseIds: ["2015-0782-M-2"]
          },
          "1996-04-21-luncheon"
        )
      ];
    }

    if (date.iso === "1997-03-21" && /Helsinki/i.test(entry)) {
      const helsinkiShared = {
        ...record,
        source: SOURCES.m2,
        catalogUrl: SOURCES.m2.url,
        pdfUrl: SOURCES.m2.pdfUrl,
        relatedReleaseIds: ["2015-0782-M-2"]
      };

      return [
        applyConversationAudit(
          {
            ...helsinkiShared,
            id: "contact-1997-03-21-memcon-helsinki-morning",
            sortOrder: 1,
            title: "Memorandum of conversation: Helsinki Morning Meeting with President Boris Yeltsin",
            documentTitle: "Helsinki Morning Meeting with President Boris Yeltsin",
            dateLine: "March 21, 1997, 9:50-11:55 a.m., Helsinki, Finland",
            subjectLine:
              "Helsinki summit morning memcon covering NATO/Russia, arms control, and summit issues."
          },
          "1997-03-21-morning"
        ),
        applyConversationAudit(
          {
            ...helsinkiShared,
            id: "contact-1997-03-21-memcon-helsinki-working-lunch",
            sortOrder: 2,
            title: "Memorandum of conversation: Helsinki Working Lunch with President Boris Yeltsin",
            documentTitle: "Helsinki Working Lunch with President Boris Yeltsin",
            dateLine: "March 21, 1997, 1:00-2:00 p.m., Helsinki, Finland",
            subjectLine:
              "Helsinki summit working-lunch memcon continuing the NATO/Russia and European security discussion."
          },
          "1997-03-21-lunch"
        ),
        applyConversationAudit(
          {
            ...helsinkiShared,
            id: "contact-1997-03-21-memcon-helsinki-afternoon",
            sortOrder: 3,
            title: "Memorandum of conversation: Helsinki Afternoon Meeting with President Boris Yeltsin",
            documentTitle: "Helsinki Afternoon Meeting with President Boris Yeltsin",
            dateLine: "March 21, 1997, 4:00-4:50 p.m., Helsinki, Finland",
            subjectLine:
              "Helsinki summit afternoon memcon following the main morning and lunch sessions."
          },
          "1997-03-21-afternoon"
        ),
        applyConversationAudit(
          {
            ...helsinkiShared,
            id: "contact-1997-03-21-memcon-helsinki-private-dinner",
            sortOrder: 4,
            title: "Memorandum of conversation: Helsinki Private Dinner with President Boris Yeltsin",
            documentTitle: "Helsinki Private Dinner with President Boris Yeltsin",
            dateLine: "March 21, 1997, 8:15-9:30 p.m., Helsinki, Finland",
            subjectLine:
              "Helsinki summit private-dinner memcon closing the March 21 Clinton-Yeltsin sequence."
          },
          "1997-03-21-dinner"
        )
      ];
    }

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
        relatedReleaseIds: ["2014-0901-M", "NARA NAID 163545404"],
        potentialFrusDocument: true,
        countStatus: "Counted actual conversation pages only"
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
            "Source: National Archives Catalog item 163545404, Clinton Library case 2014-0901-M, NSC Records Management PRS Files, Document ID 9302226. Derivative PDF extracts source pages 9-17 and appends source marker page 2 as provenance sheet.",
          extractionStatus:
            "Extracted actual memcon pages 9-17 from the source PDF; appended original marker page 2 as the final provenance sheet.",
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
            "Source: National Archives Catalog item 163545404, Clinton Library case 2014-0901-M, NSC Records Management PRS Files, Document ID 9302226. Derivative PDF extracts source pages 19-30 and appends source marker page 2 as provenance sheet.",
          extractionStatus:
            "Extracted actual memcon pages 19-30 from the source PDF; appended original marker page 2 as the final provenance sheet.",
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
        relatedReleaseIds: ["2014-0948-M", "NARA NAID 163545436"],
        potentialFrusDocument: true,
        countStatus: "Counted actual conversation pages only"
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
          strobeFiles: normalizeStrobeFiles([STROBE_CONVERSATION_FILES.memcon19951023HydePark]),
          dateLine: "October 23, 1995, 11:30 a.m.-1:35 p.m., Hyde Park, New York",
          subjectLine:
            "Hyde Park one-on-one memcon covering Bosnia, NATO command arrangements, CFE, nuclear issues, Russia policy, and the Clinton-Yeltsin partnership.",
          sourceNote:
            "Source: National Archives Catalog item 163545436, Clinton Library case 2014-0948-M, NSC Records Management PRS Files, Document ID 9507853. Derivative PDF extracts source pages 5-16 and appends source marker page 2 as provenance sheet. Strobe FOIA document C06835137 is a duplicate source copy of the same one-on-one and is not counted again.",
          extractionStatus:
            "Extracted actual memcon pages 5-16 from the source PDF; appended original marker page 2 as the final provenance sheet.",
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
          sortDate: "1995-10-23",
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
            "Source: National Archives Catalog item 163545436, Clinton Library case 2014-0948-M, NSC Records Management PRS Files, Document ID 9507991. Derivative PDF extracts the complete lunch memcon from source pages 31-35 and appends source marker page 19 as provenance sheet; earlier pages 24-27 are a duplicate copy and were not included.",
          extractionStatus:
            "Extracted complete lunch memcon pages 31-35 from the source PDF; appended original marker page 19 as the final provenance sheet. Duplicate lunch pages 24-27 were excluded.",
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

    return [applyConversationAudit(record)];
  });
}

function makeDriveOnlyCandidate({
  id,
  date,
  type,
  title,
  documentTitle,
  file,
  subjectLine,
  source = SOURCES.googleDrive,
  catalogUrl,
  pdfUrl,
  pageCount = null,
  sourcePdfPages,
  sourcePdfPageCount,
  markerPage,
  sourceNote,
  extractionStatus,
  countStatus,
  topics: extraTopics = []
}) {
  const topics = contactTopics(title, date, type);
  const candidateTopics = [...new Set([...topics, "Potential FRUS document", "Google Drive candidate", ...extraTopics])];
  return {
    id,
    date,
    sortDate: date,
    type,
    title,
    documentTitle: documentTitle || title,
    participants: ["Bill Clinton", "Boris Yeltsin"],
    countries: ["United States", "Russia"],
    chapter: CHAPTERS.chronology,
    releaseStatus: "Unknown",
    naid: file.id,
    catalogUrl: catalogUrl || driveFileUrl(file.id),
    pdfUrl: pdfUrl || driveFileUrl(file.id),
    pageCount,
    dateLine: date,
    subjectLine,
    source,
    sourceNote:
      sourceNote ||
      "Source: Google Drive Clinton-Yeltsin search result. This exact-title hit is retained as a potential FRUS document because it was not represented as a separate counted record in the current Clinton Library foreign-leader chronology extract.",
    extractionRule: EXTRACTION_RULE,
    extractionStatus:
      extractionStatus ||
      "Potential FRUS document: Drive hit retained for compiler review; actual conversation pages and provenance marker page have not yet been verified.",
    frusVolume: FRUS_VOLUME,
    frusTopics: candidateTopics,
    topics: candidateTopics,
    googleDriveFiles: normalizeDriveFiles([file]),
    potentialFrusDocument: true,
    sourcePdfPages,
    sourcePdfPageCount: sourcePdfPageCount || auditSourcePageCount(source) || undefined,
    markerPage,
    countStatus: countStatus || (pageCount ? "Counted actual conversation pages only" : "Extent pending")
  };
}

function buildDriveOnlyCandidateRecords() {
  return [
    makeDriveOnlyCandidate({
      id: "drive-candidate-1994-09-27-memcon-one-on-one",
      date: "1994-09-27",
      type: "Memcon",
      title: "Google Drive candidate: Clinton-Yeltsin one-on-one memcon, September 27, 1994",
      documentTitle: "Clinton-Yeltsin one-on-one memcon, September 27, 1994",
      file: DRIVE_CANDIDATES.telcon19940927,
      source: SOURCES.m1,
      catalogUrl: SOURCES.m1.url,
      pdfUrl: DERIVED_PDFS.sep1994OneOnOne,
      pageCount: 7,
      sourcePdfPages: "213-219",
      markerPage: 208,
      subjectLine:
        "The Drive file title says telcon, but the file text is the September 27, 1994 11:00 a.m.-1:00 p.m. White House one-on-one memcon.",
      sourceNote:
        "Source: Google Drive file title flagged this as a telcon candidate; direct review shows it is the September 27, 1994 one-on-one memcon from Clinton Library MDR packet 2015-0782-M-1, Document ID 9408090. It is retained separately from the 4:35-5:35 p.m. expanded-session memcon.",
      extractionStatus:
        "Potential FRUS document: extracted actual one-on-one memcon pages 213-219 from 2015-0782-M-1 and appended original marker page 208. The Drive title mislabels this as a telcon; no separate September 27, 1994 telcon was found.",
      topics: ["Corrected Drive title"]
    })
  ];
}

function makeClintonStandaloneCandidate({
  id,
  date,
  sortOrder,
  title,
  documentTitle,
  source,
  itemId,
  pageCount,
  sourcePdfPages,
  dateLine,
  subjectLine,
  participants = ["Bill Clinton", "Boris Yeltsin"],
  topics: extraTopics = [],
  sourceNote,
  extractionNote
}) {
  const topics = [
    ...contactTopics(title, date, "Memcon"),
    "Potential FRUS document",
    "Clinton Digital Library",
    "Standalone source item",
    ...extraTopics
  ];
  const cleanTopics = [...new Set(topics)];
  const sourcePdfPageCount = auditSourcePageCount(source);
  return {
    id,
    date,
    sortDate: date,
    sortOrder,
    type: "Memcon",
    title,
    documentTitle: documentTitle || title,
    participants,
    countries: ["United States", "Russia"],
    chapter: CHAPTERS.chronology,
    releaseStatus: "Unknown",
    naid: `Clinton Digital Library item ${itemId}`,
    catalogUrl: source.url,
    pdfUrl: source.pdfUrl,
    pageCount,
    dateLine,
    subjectLine,
    source,
    sourceNote,
    frusSourceNote: sourceNote,
    extractionRule: EXTRACTION_RULE,
    extractionNote,
    extractionStatus:
      `Potential FRUS document: counted actual conversation/report pages ${sourcePdfPages} from Clinton Digital Library item ${itemId}.` +
      " A derivative PDF should include only those pages; no marker/provenance page was identified in the source PDF.",
    frusVolume: FRUS_VOLUME,
    frusTopics: cleanTopics,
    topics: cleanTopics,
    potentialFrusDocument: true,
    sourcePdfPages,
    sourcePdfPageCount,
    markerPage: null,
    countStatus: "Counted actual conversation pages only",
    relatedReleaseIds: [source.caseNumber, itemId]
  };
}

function buildClintonStandaloneCandidateRecords() {
  return [
    makeClintonStandaloneCandidate({
      id: "clinton-standalone-1994-01-13-memcon-one-on-one",
      date: "1994-01-13",
      sortOrder: 1,
      title:
        "Memorandum of conversation: One-on-One Meeting with President Boris Yeltsin of Russia",
      documentTitle: "One-on-One Meeting with President Boris Yeltsin of Russia",
      source: SOURCES.clintonItem101363,
      itemId: "101363",
      pageCount: 6,
      sourcePdfPages: "1-6",
      dateLine: "January 13, 1994, 9:00-9:45 a.m., The Kremlin, Moscow",
      subjectLine:
        "Standalone Clinton Digital Library copy of the Moscow summit one-on-one memcon before the expanded January 14 sessions.",
      sourceNote:
        "Source: William J. Clinton Presidential Library, Clinton Digital Library item 101363, \"Memorandum of Conversation - President Boris Yeltsin of Russia,\" January 13, 1994, part of 2016-0117-M, Memcons - Memoranda of Conversation. Source PDF label: \"62 Memcon President Boris Yeltsin of Russia Jan 13 1994.pdf.\"",
      topics: ["Moscow summit", "Russian reform", "Duma"]
    }),
    makeClintonStandaloneCandidate({
      id: "clinton-standalone-1994-01-13-yeltsin-dinner-cable",
      date: "1994-01-13",
      sortOrder: 2,
      title:
        "NSC cable/memcon report: President's dinner with President Yeltsin, January 13/14, 1994",
      documentTitle: "President's dinner with President Yeltsin, January 13/14, 1994",
      source: SOURCES.clintonItem101370,
      itemId: "101370",
      pageCount: 11,
      sourcePdfPages: "1-11",
      dateLine:
        "January 13/14, 1994, Nova Ogareva, outside Moscow (source item date January 13; cable subject says January 14)",
      subjectLine:
        "Standalone NSC cable/memcon report of the Yeltsin dinner discussion on Ukraine, Russian politics, arms trade, Iraq, Bosnia, and Partnership for Peace.",
      participants: [
        "Bill Clinton",
        "Boris Yeltsin",
        "Warren Christopher",
        "Lloyd Bentsen",
        "Anthony Lake",
        "Strobe Talbott",
        "Thomas Pickering",
        "Viktor Chernomyrdin",
        "Andrei Kozyrev",
        "Pavel Grachev"
      ],
      sourceNote:
        "Source: William J. Clinton Presidential Library, Clinton Digital Library item 101370, \"Memorandum of Conversation - President Boris Yeltsin of Russia,\" January 13, 1994, part of 2016-0117-M, Memcons - Memoranda of Conversation. Item description: \"This Memcon was received as a NSC Cable.\" Source PDF label: \"69 Memcon Cable President Boris Yeltsin of Russia (not really a memcon) Jan 13 1994.pdf.\"",
      extractionNote:
        "The item is retained as a high-level interaction report even though the source label cautions that it is an NSC cable rather than a formal White House memcon.",
      topics: ["Moscow summit", "Ukraine", "Bosnia", "Partnership for Peace", "Iraq"]
    }),
    makeClintonStandaloneCandidate({
      id: "clinton-standalone-1994-01-15-memcon-one-on-one",
      date: "1994-01-15",
      sortOrder: 1,
      title:
        "Memorandum of conversation: One-on-One Meeting with President Boris Yeltsin of Russia",
      documentTitle: "One-on-One Meeting with President Boris Yeltsin of Russia",
      source: SOURCES.clintonItem101364,
      itemId: "101364",
      pageCount: 2,
      sourcePdfPages: "1-2",
      dateLine: "January 15, 1994, 9:00-9:20 a.m., The Kremlin, Moscow",
      subjectLine:
        "Standalone Clinton Digital Library copy of Clinton's private economic-reform conversation with Yeltsin at the end of the Moscow summit.",
      sourceNote:
        "Source: William J. Clinton Presidential Library, Clinton Digital Library item 101364, \"Memorandum of Conversation - President Boris Yeltsin of Russia,\" January 15, 1994, part of 2016-0117-M, Memcons - Memoranda of Conversation. Source PDF label: \"63 Memcon President Boris Yeltsin of Russia Jan 15 1994.pdf.\"",
      topics: ["Moscow summit", "Russian reform", "G-7"]
    }),
    makeClintonStandaloneCandidate({
      id: "clinton-standalone-1994-09-28-second-one-on-one",
      date: "1994-09-28",
      sortOrder: 1,
      title: "Informal record: Second Clinton/Yeltsin One-on-One",
      documentTitle: "Second Clinton/Yeltsin One-on-One",
      source: SOURCES.clintonItem101758,
      itemId: "101758",
      pageCount: 6,
      sourcePdfPages: "3-7,9",
      dateLine: "September 28, 1994, 1:00-2:30 p.m.",
      subjectLine:
        "Standalone Clinton Digital Library item for the September 28 second one-on-one on CW/BW, Ukraine, Nagorno-Karabakh, CoCom, NATO, and European security.",
      sourceNote:
        "Source: William J. Clinton Presidential Library, Clinton Digital Library item 101758, \"Declassified documents concerning telcon between the President and Boris Yeltsin on September 28, 1994,\" identifier 2018-1215-M; creators National Security Council, NSC European Affairs Office, and Alexander Vershbow; part of National Archives Catalog Description, NAID 7585499; Clinton Presidential Records: White House Staff and Office Files; Declassified Documents collection. Direct review shows the extracted pages are the complete \"Second Clinton/Yeltsin One-on-One\" meeting text.",
      extractionNote:
        "Source pages 1-2 are a duplicate tail fragment and source page 8 is blank; only pages 3-7 and 9 are included in the local derivative PDF.",
      topics: ["NATO/Russia", "CoCom", "Ukraine", "Nagorno-Karabakh", "Chemical weapons"]
    })
  ];
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

function isStrobeYeltsinTitleRecord(record) {
  return STROBE_YELTSIN_TITLE_RE.test(ascii(record.title));
}

const STROBE_STANDALONE_FORM_RE =
  /\b(MEMORANDUM OF CONVERSATION|MEMORANDUM OF MEETING|MEMCON|TELCON|TELEPHONE CONVERSATION|CONVERSATION WITH|MEETING WITH|ONE-ON-ONE|ONE-ON-ONES|BILAT|BILATERAL|READ[- ]?OUT|PLENARY MEETING|LUNCH MEETING|PRIVATE CONVERSATION|ATTACHED REPORT FROM .* MEETING)\b/i;
const STROBE_STANDALONE_RUSSIA_RE =
  /\b(RUSSIA|RUSSIAN|MOSCOW|YELTSIN|CHERNOMYRDIN|CHERNOMYRIDN|CHERNOMYRID|PRIMAKOV|KOZYREV|MAMEDOV|MAMEDON|USHAKOV|AVDEYEV|ABDEYEV|IVANOV|CHUBAIS|RYURIKOV|MATVIENKO|MASLYUKOV|TRUBNIKOV|GRACHEV|LUZHKOV|YAVLINSKIY|DUMA|KOSOVO|CHECHNYA|NATO\/RUSSIA|NATO-RUSSIA|CTBT|CFE|ABM|START)\b/i;
const STROBE_STANDALONE_ACTOR_RE =
  /\b(PRESIDENT|CLINTON|VICE PRESIDENT|GORE|SECRETARY|ALBRIGHT|CHRISTOPHER|ACTING SECRETARY|DEPUTY SECRETARY|TALBOTT|FUERTH|PICKERING|COLLINS|AMBASSADOR)\b/i;
const STROBE_STANDALONE_EXCLUDE_RE =
  /\b(SCHEDULE|BACKGROUND|TALKING POINT|TALKING POINTS|PRESS GUIDANCE|PRESS STATEMENT|PRESS CONFERENCE|POOL SPRAY|REMARKS|LETTER|MESSAGE TO|DRAFT|OPTIONS PAPER|SCENESETTER|BIOGRAPH|TRAVEL|ITINERARY|PAPER FOR|YOUR MEETING|PREPARATORY|PREP|AGENDA|DECLARATION|STATEMENT BY|QUESTION|INVITATION|MISCELLANEOUS|MATERIAL FOR|PROSPECTIVE MEETING)\b/i;

function strobeStandaloneTitle(record) {
  return ascii(record.title).replace(/[?`]+/g, "'");
}

function isStrobeStandaloneCandidateRecord(record) {
  if (STROBE_SUPPRESSED_CONTEXT_IDS.has(record.id)) return false;
  if (isStrobeYeltsinTitleRecord(record)) return false;
  const title = strobeStandaloneTitle(record);
  if (STROBE_STANDALONE_EXCLUDE_RE.test(title)) return false;
  return STROBE_STANDALONE_FORM_RE.test(title) && STROBE_STANDALONE_RUSSIA_RE.test(title);
}

function strobeStandaloneScore(record) {
  const title = strobeStandaloneTitle(record);
  let score = 0;
  if (STROBE_STANDALONE_FORM_RE.test(title)) score += 70;
  if (/\b(MEMORANDUM OF CONVERSATION|MEMORANDUM OF MEETING|MEMCON|TELCON|TELEPHONE CONVERSATION)\b/i.test(title)) {
    score += 60;
  }
  if (STROBE_STANDALONE_RUSSIA_RE.test(title)) score += 45;
  if (STROBE_STANDALONE_ACTOR_RE.test(title)) score += 20;
  if (/\b(PRESIDENT|CLINTON|VICE PRESIDENT|GORE)\b/i.test(title)) score += 25;
  if (/\b(SECRETARY|ALBRIGHT|CHRISTOPHER|TALBOTT|DEPUTY SECRETARY|ACTING SECRETARY)\b/i.test(title)) {
    score += 15;
  }
  if (/\b(PRIMAKOV|CHERNOMYRDIN|CHERNOMYRIDN|CHERNOMYRID|IVANOV|CHUBAIS|KOZYREV|MAMEDOV|MAMEDON|USHAKOV|AVDEYEV|ABDEYEV|RYURIKOV)\b/i.test(title)) {
    score += 20;
  }
  return score;
}

function normalizedStrobeStandaloneTitle(record) {
  return strobeStandaloneTitle(record)
    .toUpperCase()
    .replace(/\bCHERNOMYRIDN?\b/g, "CHERNOMYRDIN")
    .replace(/\bYEVGINIY\b/g, "YEVGENIY")
    .replace(/\bMAMEDON\b/g, "MAMEDOV")
    .replace(/\bABDEYEV\b/g, "AVDEYEV")
    .replace(/\bSERETARY\b|\bSECRETART\b|\bSECRETARYVS\b/g, "SECRETARY")
    .replace(/\bF\.?M\.?\b/g, "FM")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function strobeStandaloneClusterKey(record) {
  const title = normalizedStrobeStandaloneTitle(record);
  if (/PRESIDENT CLINTON.*VICE PRESIDENT GORE.*CHERNOMYRDIN/.test(title)) return "strobe-standalone|clinton-gore-chernomyrdin-1997-02-13";
  if (/VICE PRESIDENT.*GORE.*CHERNOMYRDIN/.test(title)) return "strobe-standalone|gore-chernomyrdin-1997-01";
  if (/PRESIDENT.*RUSSIAN FOREIGN MINISTER.*PRIMAKOV/.test(title)) return "strobe-standalone|president-primakov-1997-03-17";
  if (/SECRETARY.*VICTOR CHERNOMYRDIN|SECRETARY.*CHERNOMYRDIN.*FEBRUARY 20/.test(title)) return "strobe-standalone|secretary-chernomyrdin-1997-02-20";
  if (/SECOND MEETING.*PRIMAKOV.*FEBRUARY 21/.test(title)) return "strobe-standalone|secretary-primakov-second-1997-02-21";
  if (/SECRETARY.*PRIMAKOV.*FEBRUARY 20/.test(title)) return "strobe-standalone|secretary-primakov-1997-02-20";
  if (/ALBRIGHT.*PRIMAKOV|MEMORANDUM OF CONVERSATION.*SECRETARY.*FM.*PRIMAKOV/.test(title)) return "strobe-standalone|albright-primakov-1997-03-15";
  if (/SECRETARY.*PRIMAKOV.*MARCH 20.*HELSINKI/.test(title)) return "strobe-standalone|secretary-primakov-helsinki-1997-03-20";
  if (/RYURIKOV/.test(title)) return "strobe-standalone|talbott-ryurikov-1997-03-07";
  if (/NATO RUSSIA.*MARCH 10.*POLDIRS/.test(title)) return "strobe-standalone|nato-russia-poldirs-1997-03-10";
  if (/MAMEDOV.*SEPTEMBER 6|DEPUTY RUSSIAN FM MAMEDOV|RUSSIAN DEPUTY FM MAMEDOV/.test(title)) return "strobe-standalone|talbott-mamedov-september-1996";
  if (/MAMEDOV/.test(title) && record.date === "1996-10-23") return "strobe-standalone|talbott-mamedov-1996-10-23";
  if (/AVDEYEV.*FIRST MEETING/.test(title)) return "strobe-standalone|talbott-avdeyev-first-1999-04-07";
  if (/AVDEYEV.*SECOND MEETING/.test(title)) return "strobe-standalone|talbott-avdeyev-second-1999-04-07";
  if (/USHAKOV.*FEBRUARY 19|FEBRUARY 19.*USHAKOV/.test(title) || (record.date > "2000-12-31" && /USHAKOV/.test(title))) return "strobe-standalone|talbott-ushakov-1999-02-19";
  if (/USHAKOV.*04 23|04 23.*USHAKOV|USHAKOV.*APRIL 23|APRIL 23.*USHAKOV/.test(title) || (record.date === "1999-04-23" && /USHAKOV/.test(title))) return "strobe-standalone|talbott-ushakov-1999-04-23";
  if (/APRIL 16.*AVDEYEV/.test(title)) return "strobe-standalone|talbott-avdeyev-1999-04-16";
  if (/MAY 6.*CHERNOMYRDIN|CONVERSATION WITH CHERNOMYRDIN/.test(title)) return "strobe-standalone|talbott-chernomyrdin-1999-05-06";
  return `strobe-standalone|${record.date || "n-d"}|${slug(title)}`;
}

function strobeStandaloneDuplicateSummary(record) {
  return {
    id: record.id,
    date: record.date || "",
    title: ascii(record.title),
    releaseStatus: record.release_status || "",
    pdfUrl: record.source_pdf_url || ""
  };
}

const STROBE_STANDALONE_MONTHS = {
  JANUARY: "01",
  FEBRUARY: "02",
  MARCH: "03",
  APRIL: "04",
  MAY: "05",
  JUNE: "06",
  JULY: "07",
  AUGUST: "08",
  SEPTEMBER: "09",
  OCTOBER: "10",
  NOVEMBER: "11",
  DECEMBER: "12"
};

function strobeDateFromParts(year, month, day) {
  const normalizedYear = year.length === 2 ? `${Number(year) <= 30 ? "20" : "19"}${year}` : year;
  if (normalizedYear < "1993" || normalizedYear > "2000") return null;
  return `${normalizedYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function inferStrobeStandaloneDocumentDate(record) {
  const rawTitle = strobeStandaloneTitle(record).toUpperCase();
  const title = normalizedStrobeStandaloneTitle(record);
  const fullMonthDate = title.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2}),?\s+(199[3-9]|2000)\b/);
  if (fullMonthDate) {
    return strobeDateFromParts(fullMonthDate[3], STROBE_STANDALONE_MONTHS[fullMonthDate[1]], fullMonthDate[2]);
  }

  const slashDate = rawTitle.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/);
  if (slashDate) {
    return strobeDateFromParts(slashDate[3], slashDate[1], slashDate[2]);
  }

  const year = record.date?.slice(0, 4) || "";
  if (year >= "1993" && year <= "2000") {
    const noYearMonthDate = title.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{1,2})\b/);
    if (noYearMonthDate) {
      return strobeDateFromParts(year, STROBE_STANDALONE_MONTHS[noYearMonthDate[1]], noYearMonthDate[2]);
    }

    const noYearSlashDate = rawTitle.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (noYearSlashDate) return strobeDateFromParts(year, noYearSlashDate[1], noYearSlashDate[2]);
  }

  if (record.id === "C06771181") return "1999-04-07";
  if (record.id === "C06698134") return "1996-09-06";
  return record.date;
}

function buildStrobeRecords() {
  const manifest = JSON.parse(fs.readFileSync(STROBE_MANIFEST, "utf8"));
  const seen = new Set();
  const seenBySource = new Map();
  const standaloneClusters = new Map();
  const ranked = manifest
    .filter((record) => record.date && record.date >= "1993-01-01" && record.date <= "2000-12-31")
    .filter((record) => !STROBE_SUPPRESSED_CONTEXT_IDS.has(record.id))
    .filter((record) => !isStrobeYeltsinTitleRecord(record))
    .map((record) => ({ record, score: strobeScore(record) }))
    .filter(({ score }) => score >= 70)
    .sort((a, b) => b.score - a.score || a.record.date.localeCompare(b.record.date));

  const selected = [];
  function sourceKey(record) {
    return record.source_pdf_url || record.id;
  }

  function addSelected(record, score, options = {}) {
    const standalone = Boolean(options.standalone);
    const selectionKey = `${record.date}-${slug(record.title)}`;
    const srcKey = sourceKey(record);

    if (standalone) {
      const clusterKey = strobeStandaloneClusterKey(record);
      const existingCluster = standaloneClusters.get(clusterKey);
      if (existingCluster) {
        if (sourceKey(existingCluster) !== srcKey) {
          existingCluster.strobeStandaloneDuplicateRecords = [
            ...(existingCluster.strobeStandaloneDuplicateRecords || []),
            strobeStandaloneDuplicateSummary(record)
          ];
        }
        return false;
      }

      const existingSource = seenBySource.get(srcKey);
      if (existingSource) {
        existingSource.strobeStandaloneCandidate = true;
        existingSource.strobeStandaloneScore = Math.max(existingSource.strobeStandaloneScore || 0, score);
        existingSource.strobeStandaloneClusterKey = clusterKey;
        standaloneClusters.set(clusterKey, existingSource);
        return false;
      }

      const copy = {
        ...record,
        score: Math.max(score, strobeScore(record)),
        strobeStandaloneCandidate: true,
        strobeStandaloneScore: score,
        strobeStandaloneClusterKey: clusterKey
      };
      selected.push(copy);
      seenBySource.set(srcKey, copy);
      standaloneClusters.set(clusterKey, copy);
      return true;
    }

    if (seen.has(selectionKey)) return false;
    seen.add(selectionKey);
    const copy = { ...record, score };
    selected.push(copy);
    seenBySource.set(srcKey, copy);
    return true;
  }

  for (const { record, score } of ranked) {
    addSelected(record, score);
    if (selected.length >= 45) break;
  }

  const standaloneCandidates = manifest
    .filter(isStrobeStandaloneCandidateRecord)
    .map((record) => ({ record, score: strobeStandaloneScore(record) }))
    .sort((a, b) => b.score - a.score || String(a.record.date).localeCompare(String(b.record.date)) || a.record.id.localeCompare(b.record.id));

  for (const { record, score } of standaloneCandidates) {
    addSelected(record, score, { standalone: true });
  }

  return selected.map((record) => {
    const title = ascii(record.title);
    const topics = ["Talbott FOIA", "Russia policy context"];
    const standalone = Boolean(record.strobeStandaloneCandidate);
    const duplicateRecords = record.strobeStandaloneDuplicateRecords || [];
    const documentDate = standalone ? inferStrobeStandaloneDocumentDate(record) : record.date;
    const manifestDate = record.date;
    if (/YELTSIN/i.test(title)) topics.push("Yeltsin");
    if (/NATO/i.test(title)) topics.push("NATO/Russia");
    if (/KOSOVO/i.test(title)) topics.push("Kosovo");
    if (/PRIMAKOV/i.test(title)) topics.push("Primakov");
    if (/CHERNOMYRDIN/i.test(title)) topics.push("Chernomyrdin");
    if (/CHUBAIS/i.test(title)) topics.push("Chubais");
    if (standalone) topics.push("Potential standalone FRUS document");

    const sourceNote = standalone
      ? [
          `Source: Department of State FOIA Library, Strobe Talbott FOIA case ${record.case_number}, document ${record.id}; release status ${record.release_status}.`,
          documentDate && manifestDate && documentDate !== manifestDate
            ? `Manifest/index date ${manifestDate}; displayed document date ${documentDate} inferred from the title or duplicate cluster.`
            : "",
          "Standalone-candidate audit: selected by the May 22, 2026 Strobe manifest pass because the title describes a Russia-policy memcon, telcon, meeting, conversation, one-on-one, bilateral, or read-out that could stand as a FRUS document or editorial note source.",
          duplicateRecords.length
            ? `Deduplication: ${duplicateRecords.length} additional Strobe source-copy candidate(s) were folded into this row: ${duplicateRecords.map((item) => item.id).join(", ")}.`
            : ""
        ]
          .filter(Boolean)
          .join(" ")
      : `Source: Department of State FOIA Library, Strobe Talbott FOIA case ${record.case_number}, document ${record.id}; release status ${record.release_status}.`;

    return {
      id: `strobe-${record.id.toLowerCase()}`,
      date: documentDate,
      sortDate: documentDate,
      strobeManifestDate: standalone && manifestDate !== documentDate ? manifestDate : undefined,
      type: "Context",
      title,
      documentTitle: title,
      participants: [],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.strobe,
      releaseStatus: standalone ? "Standalone Candidate" : releaseStatus(record.release_status),
      naid: record.id,
      catalogUrl: SOURCES.strobe.url,
      pdfUrl: record.source_pdf_url,
      pageCount: null,
      countStatus: standalone ? "Standalone extent pending" : null,
      potentialFrusDocument: standalone ? true : undefined,
      dateLine:
        standalone && manifestDate !== documentDate
          ? `${documentDate} (document date inferred; Strobe manifest/index date ${manifestDate})`
          : record.date,
      subjectLine:
        standalone
          ? "Potential standalone FRUS document from the Strobe Talbott FOIA manifest; verify actual pages and source-copy duplicates before counting."
          : "Talbott FOIA record selected as policy context for the Clinton-Russia high-level channel.",
      source: SOURCES.strobe,
      sourceNote,
      frusVolume: FRUS_VOLUME,
      frusTopics: topics,
      topics,
      relevanceScore: record.score,
      strobeStandaloneCandidate: standalone || undefined,
      strobeStandaloneScore: standalone ? record.strobeStandaloneScore : undefined,
      strobeStandaloneClusterKey: standalone ? record.strobeStandaloneClusterKey : undefined,
      strobeStandaloneDuplicateRecords: duplicateRecords.length ? duplicateRecords : undefined,
      extractionRule: standalone ? EXTRACTION_RULE : undefined,
      extractionStatus: standalone
        ? "Standalone lead only: source PDF needs page-level review. If adopted, extract only the actual standalone document pages and append the State FOIA marker/provenance page."
        : undefined
    };
  });
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function strobeLeadUrl(lead) {
  return lead.url || lead.pdf_url || lead.pdfUrl || lead.source_pdf_url || "";
}

function normalizeManifestDate(value) {
  const raw = ascii(value);
  if (!raw || /^n\/a$/i.test(raw)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, month, day, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return null;
}

function strobeLeadDocumentId(lead) {
  return lead.id || lead.document_id || lead.documentId || "";
}

function addStrobePdfLead(groups, rawLead, category) {
  const url = strobeLeadUrl(rawLead);
  if (!url) return;

  const title = ascii(rawLead.title);
  const date = normalizeManifestDate(rawLead.date);
  const key = url;
  const lead =
    groups.get(key) ||
    {
      id: strobeLeadDocumentId(rawLead),
      date,
      rawDates: new Set(),
      title,
      url,
      categories: new Set(),
      statuses: new Set(),
      descriptions: new Set(),
      releaseStatuses: new Set()
    };

  if (!lead.id) lead.id = strobeLeadDocumentId(rawLead);
  if (!lead.date && date) lead.date = date;
  if (!lead.title || title.length > lead.title.length) lead.title = title;
  if (rawLead.date) lead.rawDates.add(ascii(rawLead.date));
  if (category) lead.categories.add(category);
  if (rawLead.status) lead.statuses.add(ascii(rawLead.status));
  if (rawLead.description) lead.descriptions.add(ascii(rawLead.description));
  if (rawLead.release_status || rawLead.releaseStatus) {
    lead.releaseStatuses.add(ascii(rawLead.release_status || rawLead.releaseStatus));
  }

  groups.set(key, lead);
}

function buildLocalStrobeYeltsinPdfLeadRows() {
  const manifest = JSON.parse(fs.readFileSync(STROBE_MANIFEST, "utf8"));
  return manifest
    .filter((record) => isStrobeYeltsinTitleRecord(record))
    .map((record) => ({
      id: record.id,
      date: record.date,
      title: record.title,
      url: record.source_pdf_url,
      release_status: record.release_status,
      status: "Local Strobe manifest title hit for Yeltsin or the Clinton-Yeltsin channel."
    }));
}

function strobeLeadReleaseStatus(lead) {
  const rawRelease = [...lead.releaseStatuses].find(Boolean);
  const normalized = releaseStatus(rawRelease || "");
  if (normalized !== "Unknown") return normalized;
  if (lead.categories.has("Conversation source copy")) return "Source Copy";
  if (lead.categories.has("Reviewed non-conversation")) return "Reviewed Context";
  return "Manifest PDF";
}

function strobeLeadDateLine(lead, sortDate) {
  if (!lead.date) return "Date not stated in Strobe manifest";
  if (lead.date > "2000-12-31") {
    return `Manifest/index date ${lead.date}; document date requires PDF review`;
  }
  const rawDates = [...lead.rawDates].filter(Boolean);
  return rawDates.length ? `Manifest date ${rawDates[0]}` : lead.date || sortDate;
}

function strobeLeadSubject(lead) {
  const text = [lead.title, ...lead.descriptions, ...lead.statuses].join(" ");
  if (lead.categories.has("Conversation source copy")) {
    return "Visible Strobe FOIA source-copy PDF for deduplication and page-control review; canonical chronology rows carry any counted conversation pages.";
  }
  if (lead.categories.has("Reviewed non-conversation")) {
    return [...lead.statuses].join(" ") || "Reviewed Strobe PDF; context only, not a counted conversation record.";
  }
  if (/MEMORANDUM OF CONVERSATION|TELEPHONE CONVERSATION|TELCON|MEMCON|ONE-ON-ONE/i.test(text)) {
    return "Strobe manifest PDF surfaced as a high-level Clinton-Yeltsin conversation/source-copy lead; review against canonical chronology rows before counting pages.";
  }
  if (/LETTER|MESSAGE/i.test(text)) {
    return "Strobe manifest PDF surfaced as Clinton-Yeltsin leader correspondence or message context for compiler review.";
  }
  if (/SCRIPT|PREPARE|PREPARATION|TALKING POINTS|REMARKS|VENUE|SUMMIT|MEETING/i.test(text)) {
    return "Strobe manifest PDF surfaced as meeting preparation, summit planning, or policy context for the Clinton-Yeltsin channel.";
  }
  return "Strobe manifest PDF surfaced by the Yeltsin/POTUS-Yeltsin manifest pass; context only unless actual conversation pages are identified.";
}

function strobeLeadExtractionStatus(lead) {
  const statuses = [...lead.statuses].filter(Boolean);
  const prefix = lead.categories.has("Conversation source copy")
    ? "Duplicate source-copy control"
    : "Manifest lead control";
  return `${prefix}: not added to the consolidated memcon/telcon page total. ${statuses.join(" ")}`.trim();
}

function strobeLeadParticipants(lead) {
  const text = [lead.title, ...lead.descriptions].join(" ");
  const participants = [];
  if (/CLINTON|POTUS|WILLIAM|BILL/i.test(text)) participants.push("Bill Clinton");
  if (/YELTSIN|YELSTIN|BORIS/i.test(text)) participants.push("Boris Yeltsin");
  return [...new Set(participants)];
}

function strobeLeadTopics(lead) {
  const text = [lead.title, ...lead.descriptions].join(" ");
  const topics = ["Talbott FOIA", "Strobe manifest PDF", "Russia policy context"];
  if (/YELTSIN|YELSTIN|BORIS/i.test(text)) topics.push("Yeltsin");
  if (/CLINTON|POTUS|WILLIAM|BILL/i.test(text)) topics.push("Clinton-Yeltsin");
  if (/NATO/i.test(text)) topics.push("NATO/Russia");
  if (/KOSOVO/i.test(text)) topics.push("Kosovo");
  if (/IRAQ/i.test(text)) topics.push("Iraq");
  if (/SUMMIT|MOSCOW|LYON|BIRMINGHAM|DENVER|HALIFAX/i.test(text)) topics.push("Summit diplomacy");
  if (lead.categories.has("Conversation source copy")) topics.push("Source copy", "Deduplication");
  return [...new Set(topics)];
}

function makeStrobePdfLeadRecord(lead) {
  const sortDate = lead.date || "1993-01-01";
  const title = ascii(lead.title);
  const id = strobeLeadDocumentId(lead);
  const categories = [...lead.categories].sort();
  const sourceNote = `Source: Department of State, FOIA Virtual Reading Room, Strobe Talbott FOIA release, case ${SOURCES.strobe.caseNumber}, document ${id}; listed in the Strobe Talbott FOIA manifest. PDF URL is retained as the row-level locator because State FOIA document IDs repeat across monthly release folders.`;
  const topics = strobeLeadTopics(lead);

  return {
    id: `strobe-pdf-${id.toLowerCase()}-${stableHash(lead.url)}`,
    dedupeKey: `strobe-pdf-url|${lead.url}`,
    date: sortDate,
    sortDate,
    dateDisplay: lead.date ? "" : "n.d.",
    type: "Context",
    title,
    documentTitle: title,
    participants: strobeLeadParticipants(lead),
    countries: ["United States", "Russia"],
    chapter: CHAPTERS.strobe,
    releaseStatus: strobeLeadReleaseStatus(lead),
    naid: id,
    catalogUrl: SOURCES.strobe.url,
    pdfUrl: lead.url,
    pageCount: null,
    countStatus: "Context only",
    potentialFrusDocument: false,
    dateLine: strobeLeadDateLine(lead, sortDate),
    subjectLine: strobeLeadSubject(lead),
    source: SOURCES.strobe,
    sourceNote,
    frusSourceNote: sourceNote,
    extractionRule: EXTRACTION_RULE,
    extractionStatus: strobeLeadExtractionStatus(lead),
    frusVolume: FRUS_VOLUME,
    frusTopics: topics,
    topics,
    strobeManifestPdf: true,
    strobePdfCategory: categories.join("; "),
    strobePdfCategories: categories,
    strobeManifestDescriptions: [...lead.descriptions],
    strobeManifestStatuses: [...lead.statuses]
  };
}

function buildStrobeManifestPdfRecords() {
  const groups = new Map();
  for (const file of Object.values(STROBE_CONVERSATION_FILES)) {
    addStrobePdfLead(groups, file, "Conversation source copy");
  }
  for (const file of STROBE_REVIEWED_NON_CONVERSATION_FILES) {
    addStrobePdfLead(groups, file, "Reviewed non-conversation");
  }
  for (const file of STROBE_LIVE_YELTSIN_PDF_LEADS_SNAPSHOT.documents || []) {
    addStrobePdfLead(groups, file, "Live Strobe manifest Yeltsin/POTUS hit");
  }
  for (const file of buildLocalStrobeYeltsinPdfLeadRows()) {
    addStrobePdfLead(groups, file, "Local Strobe manifest Yeltsin title hit");
  }

  return [...groups.values()].map(makeStrobePdfLeadRecord);
}

function buildNaraScoutRecords() {
  const queryUrl =
    "https://therealjameswilson.github.io/nara-scout/#q=Yeltsin&sort=relevance&perColl=25&perPage=50&scope=clinton";
  const collectionPassUrl =
    "https://therealjameswilson.github.io/nara-scout/#q=Yeltsin&from=1993&to=2001&sort=relevance&perColl=25&perPage=50&scope=clinton";
  const narrowedPassUrl =
    "https://therealjameswilson.github.io/nara-scout/#q=Yeltsin%20telcon&from=1993&to=2001&sort=relevance&perColl=50&perPage=50&scope=7388808,7386505,101784492,2525029,2525024,7386739,7388773,7386504,7385964,7388842,7388805,2525014";
  return [
    {
      id: "clinton-digital-library-yeltsin-solr-2026-05-21",
      date: "2026-05-21",
      sortDate: "2026-05-21",
      type: "Scout Lead",
      title: "Clinton Digital Library Solr pass: Yeltsin standalone memcon/telcon items",
      documentTitle: "Clinton Digital Library Solr pass: Yeltsin standalone memcon/telcon items",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "Search Trail",
      naid: "clinton-digital-library-yeltsin-solr-2026-05-21",
      catalogUrl: SOURCES.clintonDigitalLibrarySolr.url,
      pdfUrl: "",
      pageCount: null,
      digitalObjects: CLINTON_DIGITAL_LIBRARY_SOLR_AUDIT.uniqueItems,
      dateLine: "Search run May 21, 2026",
      subjectLine:
        "Clinton Digital Library Solr pass harvested the full Yeltsin result set plus memcon, telcon, tag, and declassified facets, then audited standalone PDF hits for additional high-level Clinton-Yeltsin interaction records.",
      source: SOURCES.clintonDigitalLibrarySolr,
      sourceNote:
        "Source: Clinton Digital Library Solr search, query 'yeltsin', with collection/tag/declassified facets. The pass harvested 1,440 unique items and downloaded 94 high-signal PDF candidates from the Memcons, Telcons, tag, and Declassified Documents facets.",
      extractionRule: EXTRACTION_RULE,
      extractionStatus:
        "Search trail only: four newly counted standalone high-level interaction records were added; duplicate source copies and non-conversation search hits were excluded from page totals.",
      frusVolume: FRUS_VOLUME,
      frusTopics: [
        "Clinton Digital Library",
        "Search trail",
        "Memcon",
        "Telcon",
        "Deduplication"
      ],
      topics: ["Clinton Digital Library", "Search trail", "Memcon", "Telcon", "Deduplication"],
      scoutAudit: CLINTON_DIGITAL_LIBRARY_SOLR_AUDIT
    },
    {
      id: "nara-scout-collection-pass-yeltsin-2026-05-20",
      date: "2026-05-20",
      sortDate: "2026-05-20",
      type: "Scout Lead",
      title: "NARA Scout collection pass: Yeltsin across Clinton administration collections",
      documentTitle: "NARA Scout collection pass: Yeltsin across Clinton administration collections",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "Search Trail",
      naid: "nara-scout-yeltsin-collection-pass-2026-05-20",
      catalogUrl: collectionPassUrl,
      pdfUrl: "",
      pageCount: null,
      digitalObjects: null,
      dateLine: "Search run May 20, 2026",
      subjectLine:
        "Broad Scout pass over all 132 Clinton administration collection NAIDs found 4,260 Yeltsin matches across 60 collections; the high-yield collections were then searched with memcon/telcon-specific terms.",
      source: SOURCES.naraScout,
      sourceNote:
        "Source: NARA Scout browser/proxy search, query 'Yeltsin', Clinton administration scope, 1993-2001, 25 results per collection. Highest-value collections for this FRUS compiler are NSC Records Management Office, NSC European Affairs Office, Presidential Daily Diary, NSC Executive Secretary, Nonproliferation and Export Controls, Defense Policy and Arms Control, Central and Eastern European Affairs, and related speechwriting/press/trip collections.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Collection search", "Search trail", "Clinton-Yeltsin"],
      topics: ["NARA Scout", "Search trail", "Collection search", "Yeltsin"],
      scoutAudit: NARA_SCOUT_COLLECTION_SEARCH.broadCollectionPass
    },
    {
      id: "nara-scout-narrowed-memcon-telcon-pass-2026-05-20",
      date: "2026-05-20",
      sortDate: "2026-05-20",
      type: "Scout Lead",
      title: "NARA Scout narrowed pass: Clinton-Yeltsin memcon and telcon leads",
      documentTitle: "NARA Scout narrowed pass: Clinton-Yeltsin memcon and telcon leads",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "Search Trail",
      naid: "nara-scout-yeltsin-memcon-telcon-pass-2026-05-20",
      catalogUrl: narrowedPassUrl,
      pdfUrl: "",
      pageCount: null,
      digitalObjects: null,
      dateLine: "Search run May 20, 2026",
      subjectLine:
        "Narrowed Scout pass across 18 high-relevance collections used nine Clinton-Yeltsin memcon/telcon queries, merged 1,262 unique records, and audited 57 PRS/RMS candidate PDFs.",
      source: SOURCES.naraScout,
      sourceNote:
        "Search result: no new actual Clinton-Yeltsin memcon or telcon pages were found beyond the already-counted Vancouver and Hyde Park NARA item records and existing MDR packet extractions. Candidate PDFs were schedule proposals, talking points, current-items guidance, public-statement files, withdrawal/locator sheets, or actual conversations with other leaders.",
      extractionRule: EXTRACTION_RULE,
      extractionStatus:
        "Search trail only: do not create derivative PDFs from these candidate records unless an actual Clinton-Yeltsin conversation page is identified. The audited candidates did not contain new actual conversation pages.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Memcon", "Telcon", "Search trail", "Deduplication"],
      topics: ["NARA Scout", "Search trail", "Memcon", "Telcon", "Deduplication"],
      scoutAudit: NARA_SCOUT_COLLECTION_SEARCH.narrowedMemconTelconPass,
      reviewedCandidates: NARA_SCOUT_COLLECTION_SEARCH.auditedCandidateExamples
    },
    {
      id: "pending-extents-recheck-2026-05-21",
      date: "2026-05-21",
      sortDate: "2026-05-21",
      sortOrder: 1,
      type: "Scout Lead",
      title: "Pending extents recheck: six Clinton-Yeltsin chronology contacts",
      documentTitle: "Pending extents recheck: six Clinton-Yeltsin chronology contacts",
      participants: ["Bill Clinton", "Boris Yeltsin"],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "Negative Search Trail",
      naid: "pending-extents-recheck-2026-05-21",
      catalogUrl: narrowedPassUrl,
      pdfUrl: "",
      pageCount: null,
      digitalObjects: 6,
      dateLine: "Search run May 21, 2026",
      subjectLine:
        "Second-pass verification for the six chronology-documented Clinton-Yeltsin contacts that still lack released actual conversation pages.",
      source: SOURCES.naraScout,
      sourceNote:
        "Search result: no additional released actual Clinton-Yeltsin memcon or telcon pages were found for April 1, 1993; June 3, 1994; July 10, 1994; September 1-2, 1998; February 8, 1999; or June 5, 2000. Rechecked sources included the current Clinton Library foreign-leader chronology PDF, the Clinton Digital Library Yeltsin Solr corpus, Google Drive exact-date/place searches, NARA Scout/Catalog exact-date searches, and National Security Archive postings.",
      extractionRule: EXTRACTION_RULE,
      extractionStatus:
        "Search trail only: keep these as pending contacts. Do not generate a derivative PDF unless a released actual conversation page is located; false/context leads were briefing books, press/audio events, trip binders, schedule/context records, and nearby but distinct memcons/telcons.",
      frusVolume: FRUS_VOLUME,
      frusTopics: ["NARA Scout", "Pending extents", "Search trail", "Deduplication"],
      topics: ["NARA Scout", "Pending extents", "Search trail", "Deduplication"],
      scoutAudit: NARA_SCOUT_COLLECTION_SEARCH.pendingExtentRecheck,
      reviewedCandidates: NARA_SCOUT_COLLECTION_SEARCH.pendingExtentRecheck.pendingContacts
    },
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

function researchLeadTopics(lead) {
  const title = ascii(`${lead.title || ""} ${lead.researchUse || ""}`);
  const topics = ["Research plan", "Digitized lead"];
  if (/YELTSIN/i.test(title)) topics.push("Yeltsin");
  if (/GORE|CHERNOMYRDIN/i.test(title)) topics.push("Gore-Chernomyrdin");
  if (/NATO/i.test(title)) topics.push("NATO/Russia");
  if (/UKRAINE|KIEV|KYIV/i.test(title)) topics.push("Ukraine");
  if (/BALTIC|ESTONIA|LATVIA|LITHUANIA/i.test(title)) topics.push("Baltics");
  if (/BOSNIA|YUGOSLAVIA/i.test(title)) topics.push("Bosnia");
  if (/SUMMIT|TRIP|BRIEFING/i.test(title)) topics.push("Summit briefing");
  return topics;
}

function buildResearchPlanOnlineLeadRecords() {
  const search = RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT || {};
  const leadRecords = search.leadRecords || [];
  if (!leadRecords.length) return [];

  const searchRunDate = (search.generatedAt || "2026-05-22").slice(0, 10);
  const packetPageCountTotal = leadRecords.reduce(
    (sum, lead) => sum + (Number.isInteger(lead.packetPageCount) ? lead.packetPageCount : 0),
    0
  );
  const nonPdfDigitalObjectTotal = leadRecords
    .filter((lead) => !lead.pdfUrl)
    .reduce((sum, lead) => sum + (Number.isInteger(lead.digitalObjects) ? lead.digitalObjects : 0), 0);
  const collectionSummary = `${search.collections?.length || 0} collection families / ${search.queries?.length || 0} search terms / ${search.uniqueOnlineDigitizedHits || 0} unique online digitized hits / ${leadRecords.length} visible leads / ${packetPageCountTotal} PDF packet pages`;
  const collectionWideSummary = search.collectionWideOnlineScreen
    ? ` Collection-wide paginated screen: ${search.collectionWideOnlineScreen.uniqueOnlineDigitizedFileUnits || 0} digitized file units, ${search.collectionWideOnlineScreen.keywordMatches || 0} keyword hits, ${search.collectionWideOnlineScreen.selectedNewLeadRecords || 0} additional promoted leads.`
    : "";
  const searchSourceNote =
    `Source: FRUS research-plan online pass over National Archives Catalog API v2 through NARA Scout proxy and Clinton Digital Library item search, run May 22, 2026. The pass targeted the 2013-0185-M research-plan collection universe and related NSC collection NAIDs.${collectionWideSummary}`;

  const searchTrail = {
    id: "research-plan-online-search-2026-05-22",
    dedupeKey: "research-plan|online-search-2026-05-22",
    date: searchRunDate,
    sortDate: searchRunDate,
    type: "Scout Lead",
    title: "Research plan online pass: 2013-0185-M and related Clinton NSC collections",
    documentTitle: "Research plan online pass: 2013-0185-M and related Clinton NSC collections",
    participants: [],
    countries: ["United States", "Russia"],
    chapter: CHAPTERS.scout,
    releaseStatus: "Search Trail",
    naid: "research-plan-online-search-2026-05-22",
    catalogUrl: SOURCES.naraScout.url,
    pdfUrl: "",
    pageCount: null,
    digitalObjects: search.uniqueOnlineDigitizedHits || null,
    countStatus: "Search trail only",
    potentialFrusDocument: false,
    dateLine: "Search run May 22, 2026",
    subjectLine:
      "Targeted online search for declassified/digitized documents in the FRUS research-plan collection universe: RUE, European Affairs, Executive Secretary, Staff Director, and NSC Records Management.",
    source: SOURCES.naraScout,
    sourceNote: searchSourceNote,
    frusSourceNote: searchSourceNote,
    extractionStatus:
      "Search trail only: exact top-tier 2013-0185-M folders were mostly not digitized online; the visible Scout leads below capture online packets or file units that should be reviewed for possible FRUS context or source-note support.",
    frusVolume: FRUS_VOLUME,
    frusTopics: ["Research plan", "NARA Scout", "Clinton Digital Library", "Digitized leads"],
    topics: ["Research plan", "NARA Scout", "Clinton Digital Library", "Digitized leads"],
    scoutAudit: {
      generatedAt: search.generatedAt,
      source: search.source,
      collections: search.collections,
      queries: search.queries,
      uniqueOnlineDigitizedHits: search.uniqueOnlineDigitizedHits,
      collectionWideOnlineScreen: search.collectionWideOnlineScreen,
      alreadyIncludedHits: search.alreadyIncludedHits,
      visibleLeadRecords: leadRecords.length,
      packetPdfPages: packetPageCountTotal,
      nonPdfDigitalObjects: nonPdfDigitalObjectTotal
    },
    reviewedCandidates: leadRecords,
    subjectDigest: search.collectionWideOnlineScreen
      ? `${collectionSummary} / ${search.collectionWideOnlineScreen.uniqueOnlineDigitizedFileUnits || 0} collection-wide digitized file units screened`
      : collectionSummary
  };

  const records = leadRecords.map((lead) => {
    const catalogUrl = lead.catalogUrl || lead.itemUrl || "";
    const source =
      lead.sourceType === "Clinton Digital Library"
        ? {
            name: "Clinton Digital Library",
            url: lead.itemUrl || "https://clinton.presidentiallibraries.us/"
          }
        : {
            name: "National Archives Catalog",
            url: catalogUrl || "https://catalog.archives.gov/"
          };
    const sourceId = lead.naId || (lead.itemId ? `clinton-item-${lead.itemId}` : lead.id);
    const topics = researchLeadTopics(lead);
    const sourceNote =
      lead.sourceType === "Clinton Digital Library"
        ? `Source: Clinton Digital Library item ${lead.itemId}${lead.caseNumber ? `, ${lead.caseNumber}` : ""}; ${lead.collection || "collection not specified"}. Online research-plan lead surfaced May 22, 2026.${Number.isInteger(lead.packetPageCount) ? ` PDF packet: ${lead.packetPageCount} pages.` : ""}`
        : `Source: National Archives Catalog, NAID ${lead.naId}; ${lead.collection || "collection not specified"}. Online research-plan lead surfaced May 22, 2026.${Number.isInteger(lead.packetPageCount) ? ` PDF packet: ${lead.packetPageCount} pages.` : Number.isInteger(lead.digitalObjects) ? ` Catalog record exposes ${lead.digitalObjects} digital objects.` : ""}`;
    const extractionStatus = Number.isInteger(lead.packetPageCount)
      ? `Research lead only: online PDF packet has ${lead.packetPageCount} pages; review the packet/file unit for FRUS-relevant documents before extracting pages or counting any document extent.`
      : Number.isInteger(lead.digitalObjects)
        ? `Research lead only: catalog record exposes ${lead.digitalObjects} digital objects; review the file unit for FRUS-relevant documents before extracting pages or counting any document extent.`
        : "Research lead only: review the online packet/file unit for FRUS-relevant documents before extracting pages or counting any document extent.";

    return {
      id: `research-plan-${slug(lead.id || sourceId)}`,
      dedupeKey: `research-plan|${sourceId}`,
      date: lead.date || searchRunDate,
      sortDate: lead.date || searchRunDate,
      type: "Scout Lead",
      title: lead.title,
      documentTitle: lead.title,
      participants: [],
      countries: ["United States", "Russia"],
      chapter: CHAPTERS.scout,
      releaseStatus: "Digitized Research Lead",
      naid: sourceId,
      catalogUrl,
      pdfUrl: lead.pdfUrl || "",
      pageCount: null,
      packetPageCount: Number.isInteger(lead.packetPageCount) ? lead.packetPageCount : null,
      digitalObjects: lead.digitalObjects || null,
      countStatus: "Research lead only",
      potentialFrusDocument: false,
      dateLine: lead.date || "Date pending",
      subjectLine: lead.researchUse || "Digitized online lead from the FRUS research-plan collection pass.",
      source,
      sourceNote,
      frusSourceNote: sourceNote,
      extractionRule: EXTRACTION_RULE,
      extractionStatus,
      frusVolume: FRUS_VOLUME,
      frusTopics: topics,
      topics,
      researchPlanLead: true,
      relatedPlanTiers: lead.relatedPlanTiers || [],
      relatedQueries: lead.relatedQueries || [],
      scoutAudit: lead
    };
  });

  return [searchTrail, ...records];
}

function pageSum(records) {
  return records.reduce((sum, record) => sum + (Number.isInteger(record.pageCount) ? record.pageCount : 0), 0);
}

function countedStatus(records) {
  const counted = records.filter((record) => Number.isInteger(record.pageCount));
  return {
    documents: records.length,
    countedDocuments: counted.length,
    pendingDocuments: records.length - counted.length,
    pages: pageSum(records)
  };
}

function groupTallies(records, field) {
  return records.reduce((acc, record) => {
    const key =
      typeof field === "function"
        ? field(record)
        : record[field] || "Unknown";
    if (!acc[key]) acc[key] = { documents: 0, countedDocuments: 0, pendingDocuments: 0, pages: 0 };
    acc[key].documents += 1;
    if (Number.isInteger(record.pageCount)) {
      acc[key].countedDocuments += 1;
      acc[key].pages += record.pageCount;
    } else {
      acc[key].pendingDocuments += 1;
    }
    return acc;
  }, {});
}

function sourceFileKey(file) {
  return file?.url || file?.id || file?.title || JSON.stringify(file || {});
}

function collectSourceFiles(records, field) {
  const files = new Map();
  let rowReferences = 0;

  for (const record of records) {
    for (const file of record[field] || []) {
      rowReferences += 1;
      const key = sourceFileKey(file);
      const entry =
        files.get(key) ||
        {
          key,
          id: file.id || "",
          title: file.title || "",
          url: file.url || "",
          date: file.date || "",
          records: []
        };
      entry.records.push({
        id: record.id,
        date: record.date,
        type: record.type,
        title: record.documentTitle || record.title
      });
      files.set(key, entry);
    }
  }

  const fileList = [...files.values()].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  return {
    rowReferences,
    uniqueFiles: fileList.length,
    repeatedFiles: fileList.filter((file) => file.records.length > 1),
    files: fileList
  };
}

function collectDerivativeFiles(records) {
  const files = new Map();

  for (const record of records) {
    if (!/^public\/documents\//.test(record.pdfUrl || "")) continue;
    const entry =
      files.get(record.pdfUrl) ||
      {
        path: record.pdfUrl,
        records: []
      };
    entry.records.push({
      id: record.id,
      date: record.date,
      type: record.type,
      title: record.documentTitle || record.title,
      conversationPages: record.pageCount || null,
      localPdfPages: record.localPdfPageCount || null
    });
    files.set(record.pdfUrl, entry);
  }

  const fileList = [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
  return {
    rowReferences: fileList.reduce((sum, file) => sum + file.records.length, 0),
    uniqueFiles: fileList.length,
    repeatedFiles: fileList.filter((file) => file.records.length > 1),
    files: fileList
  };
}

function buildSourceFileInventory(records) {
  return {
    localDerivativePdfs: collectDerivativeFiles(records),
    googleDriveFiles: collectSourceFiles(records, "googleDriveFiles"),
    strobeFiles: collectSourceFiles(records, "strobeFiles")
  };
}

function summarizeSourceFileInventory(inventory) {
  return Object.fromEntries(
    Object.entries(inventory).map(([key, value]) => [
      key,
      {
        rowReferences: value.rowReferences,
        uniqueFiles: value.uniqueFiles,
        repeatedFiles: value.repeatedFiles.map((file) => ({
          key: file.key || file.path,
          id: file.id || "",
          title: file.title || "",
          url: file.url || file.path || "",
          recordIds: file.records.map((record) => record.id)
        }))
      }
    ])
  );
}

function candidateConversationRecords(records) {
  return records.filter(
    (record) =>
      record.chapter.name === CHAPTERS.chronology.name &&
      (record.type === "Memcon" || record.type === "Telcon") &&
      record.potentialFrusDocument !== false
  );
}

function buildDocumentPageTallies(records, sourceFileInventory = null) {
  const potentialDocuments = candidateConversationRecords(records);
  const countedDocuments = potentialDocuments.filter((record) => Number.isInteger(record.pageCount));
  const pendingDocuments = potentialDocuments.filter((record) => !Number.isInteger(record.pageCount));
  const inventory = sourceFileInventory || buildSourceFileInventory(potentialDocuments);

  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Potential Clinton-Yeltsin memcons and telcons for FRUS 1993-2000, Volume XVIII. Page counts include only actual conversation pages; administrative pages, duplicate packet copies, Strobe cross-reference copies, briefing material, and withdrawal sheets are excluded.",
    consolidated: {
      potentialDocuments: potentialDocuments.length,
      countedDocuments: countedDocuments.length,
      pendingDocuments: pendingDocuments.length,
      totalConversationPages: pageSum(potentialDocuments),
      totalMemconPages: pageSum(potentialDocuments.filter((record) => record.type === "Memcon")),
      totalTelconPages: pageSum(potentialDocuments.filter((record) => record.type === "Telcon"))
    },
    sourceFileInventory: summarizeSourceFileInventory(inventory),
    byType: groupTallies(potentialDocuments, "type"),
    byYear: groupTallies(potentialDocuments, (record) => record.date.slice(0, 4)),
    bySource: groupTallies(
      potentialDocuments,
      (record) => record.source?.caseNumber || record.source?.name || "Unknown"
    ),
    pending: pendingDocuments.map((record) => ({
      id: record.id,
      date: record.date,
      type: record.type,
      documentTitle: record.documentTitle,
      countStatus: record.countStatus || "Extent pending",
      source: record.source?.caseNumber || record.source?.name || "Unknown",
      frusSourceNote: record.frusSourceNote || "",
      sourcePdfPages: record.sourcePdfPages || "",
      extractionStatus: record.extractionStatus || "",
      googleDriveFiles: record.googleDriveFiles || [],
      strobeFiles: record.strobeFiles || []
    })),
    documents: potentialDocuments.map((record) => ({
      id: record.id,
      date: record.date,
      type: record.type,
      documentTitle: record.documentTitle,
      pageCount: record.pageCount,
      countStatus: record.countStatus || (record.pageCount ? "Counted" : "Extent pending"),
      source: record.source?.caseNumber || record.source?.name || "Unknown",
      frusSourceNote: record.frusSourceNote || "",
      sourcePdfPages: record.sourcePdfPages || null,
      sourcePdfPageCount: record.sourcePdfPageCount || null,
      markerPage: record.markerPage || null,
      googleDriveFiles: record.googleDriveFiles || [],
      strobeFiles: record.strobeFiles || [],
      extractionStatus: record.extractionStatus || null
    })),
    reviewedStrobeNonConversationFiles: STROBE_REVIEWED_NON_CONVERSATION_FILES
  };
}

function buildStrobeManifestPdfAudit(records) {
  const strobePdfRecords = records.filter((record) => record.strobeManifestPdf);
  const byCategory = {};
  for (const record of strobePdfRecords) {
    for (const category of record.strobePdfCategories || ["Uncategorized"]) {
      byCategory[category] = (byCategory[category] || 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Visible Strobe Talbott FOIA manifest PDFs added for compiler review. These records are context/source-copy rows and are excluded from consolidated Clinton-Yeltsin memcon/telcon page totals unless represented by a canonical chronology record.",
    liveManifest: {
      page: SOURCES.strobe.url,
      snapshotPath: path.relative(ROOT, STROBE_LIVE_YELTSIN_PDF_LEADS),
      generatedAt: STROBE_LIVE_YELTSIN_PDF_LEADS_SNAPSHOT.generatedAt || null,
      entryCount: STROBE_LIVE_YELTSIN_PDF_LEADS_SNAPSHOT.entryCount || null,
      leadCount: STROBE_LIVE_YELTSIN_PDF_LEADS_SNAPSHOT.leadCount || null,
      filter: STROBE_LIVE_YELTSIN_PDF_LEADS_SNAPSHOT.filter || null
    },
    localManifest: {
      path: STROBE_MANIFEST,
      titleHitCount: buildLocalStrobeYeltsinPdfLeadRows().length
    },
    visiblePdfRecords: strobePdfRecords.length,
    uniquePdfUrls: new Set(strobePdfRecords.map((record) => record.pdfUrl).filter(Boolean)).size,
    byCategory,
    records: strobePdfRecords.map((record) => ({
      id: record.id,
      documentId: record.naid,
      date: record.date,
      dateLine: record.dateLine,
      title: record.documentTitle,
      pdfUrl: record.pdfUrl,
      releaseStatus: record.releaseStatus,
      category: record.strobePdfCategory,
      extractionStatus: record.extractionStatus
    }))
  };
}

function buildStrobeStandaloneAudit(records) {
  const manifest = JSON.parse(fs.readFileSync(STROBE_MANIFEST, "utf8"));
  const rawCandidates = manifest
    .filter(isStrobeStandaloneCandidateRecord)
    .map((record) => ({
      id: record.id,
      date: record.date || "",
      title: ascii(record.title),
      releaseStatus: record.release_status || "",
      pdfUrl: record.source_pdf_url || "",
      score: strobeStandaloneScore(record),
      clusterKey: strobeStandaloneClusterKey(record)
    }))
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const rawClusters = rawCandidates.reduce((acc, record) => {
    const key = record.clusterKey;
    acc[key] = acc[key] || [];
    acc[key].push(record);
    return acc;
  }, {});
  const standaloneRecords = records
    .filter((record) => record.strobeStandaloneCandidate)
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));

  return {
    generatedAt: new Date().toISOString(),
    sourceManifest: STROBE_MANIFEST,
    liveManifest: SOURCES.strobe.url,
    rule:
      "A Strobe standalone lead must match a conversation/meeting/read-out title pattern and a Russia/Russia-policy title pattern, while excluding obvious planning, speech, press, background, agenda, and message records. Clinton-Yeltsin title hits are handled in the Strobe manifest PDF source-copy lane.",
    rawManifestCandidates: rawCandidates.length,
    visibleStandaloneRows: standaloneRecords.length,
    duplicateSourceCopyClusters: Object.values(rawClusters).filter((cluster) => cluster.length > 1).length,
    duplicateSourceCopyCandidatesFolded: standaloneRecords.reduce(
      (sum, record) => sum + (record.strobeStandaloneDuplicateRecords?.length || 0),
      0
    ),
    visibleRows: standaloneRecords.map((record) => ({
      id: record.id,
      documentId: record.naid,
      date: record.date,
      manifestDate: record.strobeManifestDate || record.date,
      title: record.documentTitle,
      pdfUrl: record.pdfUrl,
      releaseStatus: record.releaseStatus,
      clusterKey: record.strobeStandaloneClusterKey,
      duplicateSourceCopyIds: (record.strobeStandaloneDuplicateRecords || []).map((duplicate) => duplicate.id),
      extractionStatus: record.extractionStatus
    })),
    rawCandidates
  };
}

function dedupeCompilerRecords(records) {
  const seen = new Map();
  const deduped = [];

  for (const record of records) {
    const key =
      record.dedupeKey ||
      [
        record.chapter.name,
        record.date,
        record.type,
        record.sortOrder || "",
        ascii(record.documentTitle || record.title).toLowerCase(),
        record.sourcePdfPages || ""
      ].join("|");

    if (seen.has(key)) {
      const original = seen.get(key);
      original.deduplicatedRecordIds = [...(original.deduplicatedRecordIds || []), record.id];
      original.sourceNote = appendNote(
        original.sourceNote,
        `Deduplicated generated duplicate record ${record.id}.`
      );
      continue;
    }

    seen.set(key, record);
    deduped.push(record);
  }

  return deduped;
}

function writeOutputs(records) {
  records.sort(
    (a, b) =>
      a.chapter.number - b.chapter.number ||
      a.sortDate.localeCompare(b.sortDate) ||
      (a.sortOrder || 0) - (b.sortOrder || 0) ||
      a.title.localeCompare(b.title)
  );

  const dataDir = path.join(ROOT, "data");
  const reportsDir = path.join(ROOT, "reports");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, "memcons.json"), `${JSON.stringify(records, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "memcons.js"), `window.MEMCONS = ${JSON.stringify(records, null, 2)};\n`);

  const sourceFileInventory = buildSourceFileInventory(candidateConversationRecords(records));
  const pageTallies = buildDocumentPageTallies(records, sourceFileInventory);
  const strobeManifestPdfAudit = buildStrobeManifestPdfAudit(records);
  const strobeStandaloneAudit = buildStrobeStandaloneAudit(records);

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
    pageTallies: {
      allRecords: countedStatus(records),
      potentialClintonYeltsinDocuments: countedStatus(
        records.filter(
          (record) =>
            record.chapter.name === CHAPTERS.chronology.name &&
            (record.type === "Memcon" || record.type === "Telcon") &&
            record.potentialFrusDocument !== false
        )
      ),
      byChapter: Object.fromEntries(
        Object.values(CHAPTERS).map((chapter) => [
          chapter.name,
          countedStatus(records.filter((record) => record.chapter.name === chapter.name))
        ])
      )
    },
    strobeConversationFiles: {
      includedCrossReferences: Object.keys(STROBE_CONVERSATION_FILES).length,
      uniqueSourceFiles: new Set(Object.values(STROBE_CONVERSATION_FILES).map(sourceFileKey)).size,
      reviewedNonConversationFiles: STROBE_REVIEWED_NON_CONVERSATION_FILES.length,
      visibleManifestPdfRecords: strobeManifestPdfAudit.visiblePdfRecords,
      uniqueManifestPdfUrls: strobeManifestPdfAudit.uniquePdfUrls,
      standaloneCandidateRows: strobeStandaloneAudit.visibleStandaloneRows,
      standaloneRawManifestCandidates: strobeStandaloneAudit.rawManifestCandidates,
      standaloneDuplicateSourceCopyCandidatesFolded:
        strobeStandaloneAudit.duplicateSourceCopyCandidatesFolded
    },
    researchPlanOnlineSearch: {
      collectionsSearched: RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.collections?.length || 0,
      queries: RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.queries?.length || 0,
      uniqueOnlineDigitizedHits:
        RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.uniqueOnlineDigitizedHits || 0,
      visibleLeadRecords: RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.leadRecords?.length || 0,
      alreadyIncludedHits: RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.alreadyIncludedHits?.length || 0,
      collectionWideOnlineFileUnits:
        RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.collectionWideOnlineScreen?.uniqueOnlineDigitizedFileUnits || 0,
      collectionWideKeywordMatches:
        RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.collectionWideOnlineScreen?.keywordMatches || 0,
      collectionWidePromotedLeads:
        RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.collectionWideOnlineScreen?.selectedNewLeadRecords || 0,
      pdfLeadRecords: (RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.leadRecords || []).filter((lead) =>
        Number.isInteger(lead.packetPageCount)
      ).length,
      packetPdfPages: (RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.leadRecords || []).reduce(
        (sum, lead) => sum + (Number.isInteger(lead.packetPageCount) ? lead.packetPageCount : 0),
        0
      ),
      nonPdfDigitalObjects: (RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT.leadRecords || [])
        .filter((lead) => !lead.pdfUrl)
        .reduce((sum, lead) => sum + (Number.isInteger(lead.digitalObjects) ? lead.digitalObjects : 0), 0)
    },
    sources: {
      clintonText: CLINTON_TEXT,
      strobeManifest: STROBE_MANIFEST,
      strobeLiveManifestPdfLeads: STROBE_LIVE_YELTSIN_PDF_LEADS,
      strobeManifestPdfAudit: "reports/strobe-manifest-pdf-audit.json",
      strobeStandaloneAudit: "reports/strobe-standalone-candidate-audit.json",
      researchPlanOnlineSearch: "reports/research-plan-online-search.json",
      naraScout: SOURCES.naraScout.url,
      naraScoutCollectionSearch: "reports/nara-scout-collection-search.json",
      pendingExtentVerificationRecheck: "reports/pending-extent-verification-recheck.json",
      clintonDigitalLibrarySolrAudit: "reports/clinton-digital-library-solr-audit.json"
    }
  };
  fs.writeFileSync(
    path.join(reportsDir, "document-page-tallies.json"),
    `${JSON.stringify(pageTallies, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "source-file-inventory.json"),
    `${JSON.stringify(sourceFileInventory, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "nara-scout-collection-search.json"),
    `${JSON.stringify(NARA_SCOUT_COLLECTION_SEARCH, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "pending-extent-verification-recheck.json"),
    `${JSON.stringify(NARA_SCOUT_COLLECTION_SEARCH.pendingExtentRecheck, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "clinton-digital-library-solr-audit.json"),
    `${JSON.stringify(CLINTON_DIGITAL_LIBRARY_SOLR_AUDIT, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "strobe-manifest-pdf-audit.json"),
    `${JSON.stringify(strobeManifestPdfAudit, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "strobe-standalone-candidate-audit.json"),
    `${JSON.stringify(strobeStandaloneAudit, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(reportsDir, "research-plan-online-search.json"),
    `${JSON.stringify(RESEARCH_PLAN_ONLINE_SEARCH_SNAPSHOT, null, 2)}\n`
  );
  fs.writeFileSync(path.join(reportsDir, "source-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

const records = addFrusSourceNotes(
  applyExtractedPdfManifest(
    dedupeCompilerRecords([
      ...buildChronologyRecords(),
      ...buildDriveOnlyCandidateRecords(),
      ...buildClintonStandaloneCandidateRecords(),
      ...buildReleasePackets(),
      ...buildStrobeRecords(),
      ...buildStrobeManifestPdfRecords(),
      ...buildResearchPlanOnlineLeadRecords(),
      ...buildNaraScoutRecords()
    ])
  )
);

writeOutputs(records);
