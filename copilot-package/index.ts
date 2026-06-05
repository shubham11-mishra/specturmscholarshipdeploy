import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { Readable } from "stream";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// --- Geographic suburb clusters ---
const SUBURB_CLUSTERS: string[][] = [
  ["melbourne","southbank","docklands","west melbourne","north melbourne","parkville","carlton","carlton north","fitzroy","fitzroy north","collingwood","abbotsford","richmond","cremorne"],
  ["spotswood","newport","williamstown","altona north","yarraville","seddon","footscray","west footscray","brooklyn","kingsville","maidstone"],
  ["sunshine","sunshine west","sunshine north","st albans","albanvale","deer park","cairnlea","keilor east","keilor downs","taylors lakes"],
  ["tarneit","hoppers crossing","wyndham vale","werribee","truganina","williams landing","point cook","sanctuary lakes","manor lakes","laverton","altona","altona meadows"],
  ["melton","melton south","melton west","bacchus marsh","rockbank","caroline springs","keilor"],
  ["broadmeadows","dallas","jacana","campbellfield","somerton","meadow heights","fawkner","coburg","glenroy","hadfield","oak park","pascoe vale"],
  ["craigieburn","roxburgh park","greenvale","tullamarine","airport west"],
  ["essendon","essendon north","essendon west","moonee ponds","ascot vale","flemington","kensington"],
  ["brunswick","brunswick east","brunswick west","coburg","fitzroy","fitzroy north"],
  ["hawthorn","hawthorn east","camberwell","surrey hills","ashwood","burwood","burwood east","glen iris","malvern","malvern east"],
  ["box hill","box hill north","box hill south","blackburn","blackburn north","blackburn south","mitcham","nunawading","ringwood","ringwood east","ringwood north"],
  ["doncaster","doncaster east","templestowe","templestowe lower","warrandyte","lilydale","kilsyth","croydon","croydon north","croydon hills"],
  ["glen waverley","mount waverley","mulgrave","wheelers hill","rowville","oakleigh","oakleigh east","oakleigh south","huntingdale","chadstone","clayton","clayton south"],
  ["dandenong","dandenong north","noble park","noble park north","springvale","springvale south","keysborough","doveton","endeavour hills","hallam","narre warren","berwick","cranbourne"],
  ["bentleigh","bentleigh east","moorabbin","cheltenham","highett","sandringham","black rock","beaumaris","mentone","mordialloc","parkdale","braeside"],
  ["aspendale","edithvale","chelsea","bonbeach","carrum","seaford","frankston","frankston north","frankston south"],
  ["st kilda","st kilda east","st kilda west","prahran","windsor","south yarra","toorak","armadale","caulfield","caulfield north","caulfield south","carnegie","murrumbeena"],
  ["mornington","mount martha","rosebud","frankston south"],
  ["geelong","geelong west","newtown","south geelong","belmont","highton","waurn ponds","corio","norlane","lara","drysdale","ocean grove"],
  ["ballarat","ballarat east","ballarat central","sebastopol","wendouree"],
  ["bendigo","flora hill","white hills"],
  ["shepparton","wodonga","warrnambool","horsham","sale","mildura"],
  ["sydney","haymarket","pyrmont","ultimo","glebe","newtown","stanmore","enmore","marrickville","dulwich hill","petersham","leichhardt","annandale","balmain","rozelle","surry hills","darlinghurst","kings cross","woolloomooloo","potts point","elizabeth bay"],
  ["paddington","woollahra","double bay","rose bay","bondi","bondi beach","bondi junction","randwick","kensington","kingsford","maroubra"],
  ["parramatta","westmead","merrylands","granville","auburn","lidcombe","berala","regents park","guildford","pemulwuy"],
  ["bankstown","yagoona","birrong","chester hill"],
  ["liverpool","cabramatta","fairfield","bossley park","wetherill park","campbelltown","leumeah","macquarie fields"],
  ["penrith","st marys","mount druitt","blacktown","seven hills","kings langley","kellyville"],
  ["north sydney","st leonards","crows nest","artarmon","chatswood","lane cove","pymble","turramurra","wahroonga","hornsby","epping","ryde","meadowbank","dundas","carlingford"],
  ["newcastle","hamilton","mayfield","wallsend","maitland","cessnock"],
  ["wollongong","figtree","unanderra"],
  ["orange","bathurst","dubbo","wagga wagga","albury","tamworth","lismore","coffs harbour","port macquarie"],
  ["brisbane","spring hill","paddington","red hill","kelvin grove","herston","bowen hills","fortitude valley","new farm","newstead","teneriffe","woolloongabba","south brisbane","west end","highgate hill"],
  ["annerley","tarragindi","sunnybank","macgregor","coopers plains","eight mile plains","upper mount gravatt","carindale"],
  ["logan central","woodridge","browns plains","beenleigh","slacks creek","loganholme","inala","richlands","oxley","darra"],
  ["ipswich","springfield","redbank plains"],
  ["chermside","aspley","zillmere"],
  ["gold coast","surfers paradise","southport","robina","varsity lakes","coomera"],
  ["sunshine coast","maroochydore","caloundra"],
  ["toowoomba","townsville","cairns","rockhampton","mackay","bundaberg","hervey bay"],
  ["perth","west perth","east perth","northbridge","subiaco","claremont","cottesloe","fremantle","victoria park","belmont","burswood","carlisle"],
  ["joondalup","wanneroo","midland","kalamunda"],
  ["rockingham","mandurah","baldivis","armadale","canning vale"],
  ["adelaide","north adelaide","gilberton","norwood","kent town","payneham","unley","mitcham","colonel light gardens"],
  ["glenelg","brighton","christies beach"],
  ["elizabeth","parafield","salisbury"],
  ["modbury","tea tree gully","golden grove","mount barker","victor harbor"],
  ["canberra","civic","braddon","turner","watson","ainslie","downer"],
  ["belconnen","bruce","charnwood","florey"],
  ["gungahlin","harrison","forde","amaroo"],
  ["tuggeranong","greenway","isabella plains"],
  ["woden","phillip","garran"],
  ["hobart","sandy bay","battery point","glenorchy","moonah","new town"],
  ["launceston","devonport","burnie"],
  ["darwin","parap","fannie bay","nightcliff","casuarina","palmerston","alice springs"],
];

function getNearbySuburbs(suburb: string): string[] {
  const key = suburb.toLowerCase().trim();
  for (const cluster of SUBURB_CLUSTERS) {
    if (cluster.some(s => s === key || key.includes(s) || s.includes(key))) return cluster;
  }
  return [key];
}

// --- RAG helpers ---

const STOP_WORDS = new Set([
  "what","which","where","when","how","are","the","for","and","can","you","me",
  "my","is","in","of","to","a","i","do","have","has","any","some","there","show",
  "find","tell","about","with","from","that","this","will","would","could","should",
  "give","get","list","help","need","want","like","look","know","make","been","were",
  "they","them","than","also","just","more","their","our","your","its","all","but",
  "not","yes","does","did","was","had","his","her","him","who","why","yes","no",
  "please","okay","sure","great","good","best","top","many","much","very","really",
  "scholarships","scholarship","school","schools","student","students","apply",
  "near","around","close","nearby",
]);

const RAW_INTEREST_TO_CATEGORY: Record<string, string> = {
  academic: "Academic", stem: "STEM", arts_creative: "Arts",
  sports_fitness: "Sports", leadership: "Leadership", music: "Music",
  boarding: "Boarding", indigenous: "Indigenous", rural: "Rural",
  financial: "Financial", drama: "Arts", dance: "Arts",
  science: "STEM", technology: "STEM", engineering: "STEM",
  maths: "STEM", mathematics: "STEM", "all-rounder": "All-Rounder",
};

const RAG_SELECT = [
  "id","school_name","program_name","program_type","category","sub_type",
  "state","suburb","postcode","sector","school_sector","school_type","gender",
  "year_levels","gender_eligibility","number_awarded",
  "value_aud","value_num","value_type",
  "scholarship_url","website_url",
  "application_open_date","application_close_date","closing_label","days_left",
  "test_month","test_provider","application_fee",
  "contact_email","contact_phone",
].join(",");

function extractKeywords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w)).slice(0, 6);
}

function extractLocationName(text: string): string | null {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, " ");
  const patterns = [
    /near\s+([a-z]{3,}(?:\s+[a-z]{3,})?)/,
    /around\s+([a-z]{3,}(?:\s+[a-z]{3,})?)/,
    /close\s+to\s+([a-z]{3,}(?:\s+[a-z]{3,})?)/,
    /schools?\s+in\s+([a-z]{3,}(?:\s+[a-z]{3,})?)/,
    /in\s+([a-z]{3,}(?:\s+[a-z]{3,})?)\s+(?:area|suburb|region)/,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function isDeadlineQuery(msg: string): boolean {
  return ["deadline","deadlines","upcoming","close soon","closing soon","apply soon","days left","urgent","time left","when do"]
    .some(k => msg.toLowerCase().includes(k));
}

function extractRequestedCount(msg: string): number {
  const lower = msg.toLowerCase();
  const m1 = lower.match(/(?:top|give\s+me|show(?:\s+me)?|list|find|provide|need|want|get)\s+(\d+)/);
  if (m1) return Math.min(parseInt(m1[1], 10), 30);
  const m2 = lower.match(/(\d+)\s+(?:scholarships?|schools?|matches?|results?|options?|opportunities?)/);
  if (m2) return Math.min(parseInt(m2[1], 10), 30);
  return 15;
}

function extractCategory(msg: string): string | null {
  const lower = msg.toLowerCase();
  const map: Record<string, string> = {
    "stem":"STEM","science":"STEM","technology":"STEM","engineering":"STEM","maths":"STEM","math":"STEM",
    "sport":"Sports","sports":"Sports","athletic":"Sports","football":"Sports","cricket":"Sports","swimming":"Sports","tennis":"Sports","basketball":"Sports",
    "music":"Music","musical":"Music","singing":"Music","instrument":"Music","piano":"Music","violin":"Music",
    "art":"Arts","arts":"Arts","creative":"Arts","drama":"Arts","dance":"Arts","performance":"Arts",
    "academic":"Academic","merit":"Academic","gifted":"Academic","scholastic":"Academic",
    "leadership":"Leadership","service":"Leadership","community":"Leadership","volunteer":"Leadership",
    "indigenous":"Indigenous","aboriginal":"Indigenous","first nations":"Indigenous","torres strait":"Indigenous",
    "rural":"Rural","regional":"Rural","country":"Rural",
    "financial":"Financial","bursary":"Financial","means-tested":"Financial","need-based":"Financial",
    "all-rounder":"All-Rounder","all rounder":"All-Rounder",
    "boarding":"Boarding",
  };
  for (const [kw, cat] of Object.entries(map)) {
    if (lower.includes(kw)) return cat;
  }
  return null;
}

function extractGenderFilter(msg: string): string | null {
  const lower = msg.toLowerCase();
  if (lower.includes("girls") || lower.includes("female") || lower.includes("women") || lower.includes("daughter")) return "Female";
  if (lower.includes("boys") || lower.includes("male") || lower.includes("men") || lower.includes("son")) return "Male";
  return null;
}

function extractSector(msg: string): string | null {
  const lower = msg.toLowerCase();
  if (lower.includes("boarding")) return "Boarding";
  if (lower.includes("catholic")) return "Catholic";
  if (lower.includes("independent") || lower.includes("private")) return "Independent";
  if (lower.includes("government") || lower.includes("public")) return "Government";
  return null;
}

function extractYearLevel(msg: string): number | null {
  const m = msg.match(/year\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractSchoolName(msg: string): string | null {
  const lower = msg.toLowerCase();
  const patterns = [
    /(?:about|for|at|from)\s+([a-z][a-z\s]{3,35}?(?:college|school|grammar|academy|institute|ladies|girls|boys))/i,
    /([a-z][a-z\s]{2,30}?(?:college|school|grammar|academy))\s+(?:scholarship|program|award)/i,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m && m[1] && m[1].trim().length > 4) return m[1].trim();
  }
  return null;
}

function applyGenderFilter(results: Record<string, unknown>[], gender: string | null): Record<string, unknown>[] {
  if (!gender) return results;
  const g = gender.toLowerCase();
  const isMale   = g.includes("male") || g === "m" || g === "boy";
  const isFemale = g.includes("female") || g === "f" || g === "girl";
  return results.filter(s => {
    const ge = ((s.gender_eligibility as string) || "").toLowerCase();
    const st = ((s.school_type as string) || "").toLowerCase();
    const isGirlsOnly = (ge.includes("female") && !ge.includes("male")) || st === "girls";
    const isBoysOnly  = (ge.includes("male") && !ge.includes("female")) || st === "boys";
    if (isGirlsOnly && isMale) return false;
    if (isBoysOnly && isFemale) return false;
    return true;
  });
}

async function profileSearch(
  studentData: Record<string, unknown>,
  profileIds: Set<string>,
  supabase: any,
): Promise<Record<string, unknown>[]> {
  const state = studentData.state as string | null;
  const rawInterests = Array.isArray(studentData.raw_interests) ? studentData.raw_interests as string[] : [];
  const fn = ((studentData.financial_need as string) || "").toLowerCase();
  const hasFinancialNeed = ["yes","true","high","some need","significant need"].some(v => fn.includes(v));
  const wheelScores = studentData.wheel_scores as Record<string, number> | null;
  const yearLevelStr = studentData.year_level as string | null;
  const targetYearStr = studentData.target_year as string | null;

  const results: Record<string, unknown>[] = [];
  const seenIds = new Set<string>();

  const addRows = (rows: Record<string, unknown>[] | null) => {
    for (const s of (rows ?? [])) {
      const id = s.id as string;
      if (!profileIds.has(id) && !seenIds.has(id)) { results.push(s); seenIds.add(id); }
    }
  };

  const base = () => supabase.from("scholarships").select(RAG_SELECT)
    .neq("scholarship_confidence", "not_found").eq("is_active", "True");
  const withState = (q: any) => state ? q.or(`state.eq.${state},state.is.null`) : q;

  const yearNum = yearLevelStr ? parseInt(yearLevelStr.replace(/\D/g, ""), 10) : null;
  const targetNum = targetYearStr ? parseInt(targetYearStr.replace(/\D/g, ""), 10) : null;

  if (yearNum && !isNaN(yearNum)) {
    const { data } = await withState(base().ilike("year_levels", `%${yearNum}%`)).limit(25);
    addRows(data);
  }
  if (targetNum && !isNaN(targetNum) && targetNum !== yearNum) {
    const { data } = await withState(base().ilike("year_levels", `%${targetNum}%`)).limit(25);
    addRows(data);
  }

  for (const ri of rawInterests.slice(0, 6)) {
    const cat = RAW_INTEREST_TO_CATEGORY[ri.toLowerCase()];
    if (!cat) continue;
    const { data } = await withState(base().ilike("category", `%${cat}%`)).limit(30);
    addRows(data);
  }

  if (hasFinancialNeed) {
    const { data } = await withState(
      base().or("category.ilike.%bursary%,category.ilike.%financial%,category.ilike.%means%,category.ilike.%need%,sub_type.ilike.%bursary%")
    ).limit(20);
    addRows(data);
  }

  if (wheelScores) {
    const dimToCategory: Record<string, string> = {
      academic: "Academic", stem: "STEM", arts_creative: "Arts", sports_fitness: "Sports", leadership: "Leadership",
    };
    const topDims = Object.entries(wheelScores)
      .filter(([k]) => dimToCategory[k])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => dimToCategory[k]);
    for (const cat of topDims) {
      const { data } = await withState(base().ilike("category", `%${cat}%`)).limit(20);
      addRows(data);
    }
  }

  const profileSuburb = studentData.suburb as string | null;
  const profilePostcode = studentData.postcode as string | null;
  if (profileSuburb) {
    const nearbySuburbs = getNearbySuburbs(profileSuburb);
    const orParts = nearbySuburbs.map(s => `suburb.ilike.%${s}%`).join(",");
    const { data } = await base().or(orParts).limit(30);
    addRows(data);
  } else if (profilePostcode) {
    const pc = parseInt(profilePostcode, 10);
    if (Number.isFinite(pc)) {
      const minP = String(pc - 20).padStart(4, "0");
      const maxP = String(pc + 20).padStart(4, "0");
      const { data } = await base().gte("postcode", minP).lte("postcode", maxP).limit(20);
      addRows(data);
    }
  }

  if (state) {
    const { data } = await base().or(`state.eq.${state},state.is.null`).limit(30);
    addRows(data);
  } else {
    const { data } = await base().is("state", null).limit(30);
    addRows(data);
  }

  return applyGenderFilter(results, studentData.gender as string | null);
}

async function ragSearch(
  lastMessage: string,
  profileState: string | null,
  profileIds: Set<string>,
  profileGender: string | null,
  supabase: any,
): Promise<Record<string, unknown>[]> {
  const keywords    = extractKeywords(lastMessage);
  const locationName = extractLocationName(lastMessage);
  const deadlineQuery = isDeadlineQuery(lastMessage);
  const category    = extractCategory(lastMessage);
  const genderFilter = extractGenderFilter(lastMessage);
  const sector      = extractSector(lastMessage);
  const yearLevel   = extractYearLevel(lastMessage);
  const schoolName  = extractSchoolName(lastMessage);

  const hasAnySignal = keywords.length > 0 || locationName || deadlineQuery || category || genderFilter || sector || yearLevel || schoolName;
  if (!hasAnySignal) return [];

  const results: Record<string, unknown>[] = [];
  const seenIds = new Set<string>();

  const addResults = (rows: Record<string, unknown>[] | null) => {
    for (const s of (rows ?? [])) {
      if (!profileIds.has(s.id as string) && !seenIds.has(s.id as string)) {
        results.push(s); seenIds.add(s.id as string);
      }
    }
  };

  const baseQuery = () => supabase.from("scholarships").select(RAG_SELECT)
    .neq("scholarship_confidence", "not_found").eq("is_active", "True");
  const withState = (q: any) => profileState ? q.or(`state.eq.${profileState},state.is.null`) : q;

  if (schoolName) { const { data } = await baseQuery().ilike("school_name", `%${schoolName}%`).limit(25); addResults(data); }
  if (category) {
    const { data } = await withState(baseQuery().ilike("category", `%${category}%`)).limit(30); addResults(data);
    const { data: data2 } = await withState(baseQuery().ilike("sub_type", `%${category}%`)).limit(15); addResults(data2);
  }
  if (genderFilter) {
    const genderVal = genderFilter === "Female" ? "Female" : "Male";
    const schoolTypeVal = genderFilter === "Female" ? "Girls" : "Boys";
    const { data } = await withState(baseQuery().or(`gender_eligibility.ilike.%${genderVal}%,school_type.ilike.%${schoolTypeVal}%`)).limit(25);
    addResults(data);
  }
  if (sector && sector !== "Boarding") {
    const { data } = await withState(baseQuery().or(`sector.ilike.%${sector}%,school_sector.ilike.%${sector}%`)).limit(25);
    addResults(data);
  }
  if (sector === "Boarding") {
    const { data } = await withState(baseQuery().or(`sector.ilike.%Boarding%,school_sector.ilike.%Boarding%,sub_type.ilike.%Boarding%,program_type.ilike.%Boarding%`)).limit(25);
    addResults(data);
  }
  if (yearLevel) {
    const { data } = await withState(baseQuery().ilike("year_levels", `%${yearLevel}%`)).limit(25);
    addResults(data);
  }
  if (keywords.length > 0) {
    const orParts = keywords.flatMap(kw => [
      `program_name.ilike.%${kw}%`, `category.ilike.%${kw}%`, `sub_type.ilike.%${kw}%`,
      `suburb.ilike.%${kw}%`, `school_name.ilike.%${kw}%`, `program_type.ilike.%${kw}%`,
    ]).join(",");
    const { data } = await withState(baseQuery().or(orParts)).limit(20);
    addResults(data);
  }
  if (locationName) {
    const nearbySuburbs = getNearbySuburbs(locationName);
    if (nearbySuburbs.length > 0) {
      const orParts = nearbySuburbs.map(s => `suburb.ilike.%${s}%`).join(",");
      const { data } = await baseQuery().or(orParts).limit(30);
      addResults(data);
    }
  }
  if (deadlineQuery) {
    const today = new Date().toISOString().split("T")[0];
    let dq = baseQuery().not("application_close_date", "is", null)
      .gte("application_close_date", today).order("application_close_date", { ascending: true });
    if (profileState) dq = dq.or(`state.eq.${profileState},state.is.null`);
    const { data } = await dq.limit(30);
    addResults(data);
  }

  return applyGenderFilter(results, profileGender);
}

// --- Formatters ---

function fmtProfile(d: Record<string, unknown>): string {
  const arr: string[] = [];
  const push = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== "") arr.push(`${k}:${v}`); };
  push("Name", d.name);
  push("Gender", d.gender);
  push("Year", d.year_level);
  push("TargetYear", d.target_year);
  push("State", d.state);
  push("Suburb", d.suburb);
  push("Postcode", d.postcode);
  push("SchoolType", d.school_type);
  if (Array.isArray(d.target_schools) && (d.target_schools as unknown[]).length) push("TargetSchools", (d.target_schools as string[]).join(", "));
  else if (d.target_schools) push("TargetSchools", d.target_schools);
  push("FinancialNeed", d.financial_need);
  if (Array.isArray(d.interests) && (d.interests as unknown[]).length) push("Interests", (d.interests as string[]).join(", "));
  if (d.extracurriculars) push("Extracurriculars", d.extracurriculars);
  push("ReadinessBand", d.readiness_band);
  push("ReadinessXP", d.readiness_xp);
  if (d.wheel_scores && typeof d.wheel_scores === "object") {
    const ws = d.wheel_scores as Record<string, number>;
    push("WheelScores", Object.entries(ws).map(([k, v]) => `${k}=${v}`).join(","));
  }
  push("Shortlisted", d.shortlisted_count);
  if (Array.isArray(d.recent_activities) && (d.recent_activities as unknown[]).length) {
    push("RecentActivities", (d.recent_activities as string[]).slice(0, 3).join(", "));
  }
  if (Array.isArray(d.gap_recommendations) && (d.gap_recommendations as unknown[]).length) {
    push("GapRecs", (d.gap_recommendations as string[]).slice(0, 2).join(" | "));
  }
  return arr.join(" | ");
}

function fmtScholarship(s: Record<string, unknown>, rank?: number, includeText = false): string {
  const url = (s.scholarship_url || s.website_url || "#") as string;
  const deadline = (s.closing_label || s.application_close_date || "TBA") as string;
  const parts: string[] = [];
  if (rank !== undefined) parts.push(`#${rank}`);
  if (s.match_score) parts.push(`Match:${s.match_score}`);
  if (s.match_tier) parts.push(`Tier:${s.match_tier}`);
  parts.push(`School:${s.school_name}`);
  parts.push(`Program:${s.program_name}`);
  parts.push(`URL:${url}`);
  if (s.state) parts.push(`State:${s.state}`);
  if (s.suburb) parts.push(`Suburb:${s.suburb}`);
  if (s.sector) parts.push(`Sector:${s.sector}`);
  if (s.school_type) parts.push(`SchoolType:${s.school_type}`);
  if (s.gender) parts.push(`Gender:${s.gender}`);
  if (s.year_levels) parts.push(`Years:${s.year_levels}`);
  if (s.gender_eligibility) parts.push(`GenderElig:${s.gender_eligibility}`);
  if (s.value_aud) parts.push(`Value:${s.value_aud}`);
  parts.push(`Deadline:${deadline}`);
  if (s.days_left) parts.push(`DaysLeft:${s.days_left}`);
  if (s.category) parts.push(`Category:${s.category}`);
  if (s.program_type) parts.push(`Type:${s.program_type}`);
  if (s.number_awarded) parts.push(`Awards:${s.number_awarded}`);
  if (s.test_month) parts.push(`TestMonth:${s.test_month}`);
  if (s.application_fee) parts.push(`Fee:${s.application_fee}`);
  if (s.contact_email) parts.push(`Email:${s.contact_email}`);
  if (s.contact_phone) parts.push(`Phone:${s.contact_phone}`);
  if (s.match_reasons) parts.push(`WhyFits:${s.match_reasons}`);
  if (includeText) {
    if (s.overview) parts.push(`Overview:${String(s.overview).slice(0, 150)}`);
    if (s.eligibility_criteria) parts.push(`Eligibility:${String(s.eligibility_criteria).slice(0, 150)}`);
  }
  return parts.join(" | ");
}

// --- System prompt ---

const SYSTEM_PROMPT = `You are Spectrum Copilot — an intelligent scholarship and school-readiness coach for Australian students.

You have been given two things:
1. The student's FULL PROFILE from the database (everything they filled in during signup)
2. SCHOLARSHIP DATA fetched from the database relevant to their profile and question

Your job: use this data to answer the student's question accurately, helpfully, and completely — exactly like a knowledgeable human coach would.

===== CORE RULES =====

RULE 1 — ALL FACTS FROM DATABASE ONLY
Every school name, scholarship name, value, deadline, eligibility detail, URL, contact — must come ONLY from the data provided to you. Never use your training knowledge for any factual claim. If something is not in the provided data, say "not available in the database" — never guess or invent.

RULE 2 — ANSWER EXACTLY WHAT WAS ASKED
- If asked for top 10 → give 10 (or all available if fewer than 10 exist in the data)
- If asked for top 20 → give 20 (or all available)
- If asked about STEM scholarships → give all STEM scholarships from the data
- If asked about a specific school → give only that school's data
- Never cut the answer short. Never pad with unrequested information.

RULE 3 — ALWAYS USE THE STUDENT'S PROFILE TO PERSONALISE
Every answer must be connected to the student's profile. Use their:
- State, suburb, postcode → location relevance
- Gender → only recommend eligible schools (Boys/Girls/Co-ed)
- Year level → only show scholarships they can apply for
- Interests, wheel scores → highlight why a scholarship fits them
- Indigenous/Rural/Financial need → highlight relevant special eligibility
- Dream schools, preferred sectors → prioritise aligned results

RULE 4 — LINKS FOR EVERY SCHOOL/SCHOLARSHIP
Every school or scholarship name must be a markdown link:
- Has URL → [School Name - Program](URL)
- No URL → [School Name - Program](#)
Never bold a school name. Never write it as plain text.

RULE 5 — DEADLINES ARE EXACT
Use exactly what is in the Deadline field. "TBA" stays "TBA". "Closed" stays "Closed". Never invent or estimate a date.

RULE 6 — NO DISCLAIMERS
Never write "this may not be complete", "I recommend verifying", "approximately", or any hedge. Just answer from the data directly.

===== WHAT YOU CAN ANSWER =====

SCHOLARSHIPS & MATCHES
- "Give me my top 10/20 matches" → list from TOP PROFILE MATCHES + PROFILE-AWARE RESULTS, as many as asked, ranked by match score.
- "Show me STEM/sports/music scholarships" → list from QUERY-RELEVANT SCHOLARSHIPS filtered by that category
- "Scholarships near [suburb]" → list from QUERY-RELEVANT SCHOLARSHIPS for that location
- "Girls/boys scholarships" → filter by gender eligibility from the data
- "Boarding school scholarships" → filter by sector from the data
- "Which close soon?" → sort by DaysLeft ascending from the data

PROFILE & READINESS
- "What is my wheel score?" → read from WheelScores in the student profile
- "What are my strengths?" → identify wheel dimensions scored 7+
- "What should I improve?" → identify wheel dimensions scored below 5, reference GapRecs
- "What band am I?" → read ReadinessBand from profile
- "What have I shortlisted?" → read Shortlisted count from profile

COMPARISON & ADVICE
- "Compare X and Y" → side-by-side from the data: value, deadline, year levels, match score, why it fits
- "Which is better for me?" → recommend based on the student's profile fields vs scholarship fields
- "How do I improve my chances?" → use GapRecs + wheel scores from the data

ESSAYS & INTERVIEWS
- "Write an essay for [scholarship]" → 250-350 words using student's WheelScores, Interests, and the scholarship Overview/Eligibility from the data
- "Mock interview" → one question at a time, give feedback after each answer, 4-5 questions, end with summary

===== STYLE =====
- Intelligent, warm, specific — like a knowledgeable coach, not a robot
- Address the student by their name
- Use bullet points for lists, bold for key facts
- Length matches the question: brief for simple queries, comprehensive for lists and essays
- Never be generic. Every answer must reference the student's actual profile data.`;

// --- Main route ---

app.post("/copilot-chat", async (req, res) => {
  try {
    const { messages, context } = req.body;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const allMessages = (messages as { role: string; content: string }[]).filter(m => m.content);
    const recentMessages = allMessages.slice(-10);
    const lastUserMessage = recentMessages.filter(m => m.role === "user").pop()?.content ?? "";
    const requestedCount = extractRequestedCount(lastUserMessage);

    let systemWithContext = SYSTEM_PROMPT;

    if (context) {
      const { matching_scholarships, profile, ...studentData } = context as Record<string, unknown>;

      systemWithContext += `\n\n--- STUDENT PROFILE ---\n${fmtProfile(studentData)}`;

      const flags: string[] = [];
      const profileGenderRaw = ((studentData.gender as string) || "").toLowerCase();
      if (profileGenderRaw) {
        const isMale   = profileGenderRaw.includes("male") || profileGenderRaw === "m" || profileGenderRaw === "boy";
        const isFemale = profileGenderRaw.includes("female") || profileGenderRaw === "f" || profileGenderRaw === "girl";
        if (isMale)   flags.push("GENDER: Student is male. Only recommend scholarships open to males or co-ed. Never recommend girls-only schools.");
        if (isFemale) flags.push("GENDER: Student is female. Only recommend scholarships open to females or co-ed. Never recommend boys-only schools.");
      }
      const fn = ((studentData.financial_need as string) || "").toLowerCase();
      if (["yes","true","high","some need","significant need"].some(v => fn.includes(v))) {
        flags.push("FINANCIAL NEED: Prioritise bursary, means-tested, and fee-reduction scholarships.");
      }
      if (studentData.is_indigenous === true || studentData.is_indigenous === "true") {
        flags.push("INDIGENOUS: Prioritise indigenous, First Nations, and Aboriginal scholarships.");
      }
      if (studentData.is_rural === true || studentData.is_rural === "true") {
        flags.push("RURAL: Prioritise rural, regional, and boarding scholarships.");
      }
      if (flags.length > 0) systemWithContext += `\n\n--- PRIORITY FLAGS ---\n${flags.join("\n")}`;

      const hasMatches = Array.isArray(matching_scholarships) && matching_scholarships.length > 0;
      const profileIds = new Set<string>();

      if (hasMatches) {
        const toShow = (matching_scholarships as Record<string, unknown>[]).slice(0, Math.max(requestedCount, 30));
        const lines = toShow.map((s, i) => { profileIds.add(s.id as string); return fmtScholarship(s, i + 1, true); });
        systemWithContext += `\n\n--- PROFILE-MATCHED SCHOLARSHIPS (${lines.length} available, ranked by match score) ---\nNote: User asked for ${requestedCount}. Show that many if available.\n${lines.join("\n")}`;
      } else {
        systemWithContext += `\n\n--- NO PROFILE MATCHES ---\nProfile may be incomplete. Do not invent scholarships. Ask the student to complete their profile (state, year level, interests).`;
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        try {
          const profileRAG = await profileSearch(studentData, profileIds, supabase);
          const profileRAGIds = new Set(profileRAG.map(s => s.id as string));
          const questionRAG  = await ragSearch(
            lastUserMessage,
            studentData.state as string | null,
            new Set([...profileIds, ...profileRAGIds]),
            studentData.gender as string | null,
            supabase,
          );
          const allRAG = [...profileRAG, ...questionRAG];
          if (allRAG.length > 0) {
            systemWithContext += `\n\n--- ADDITIONAL DATABASE RESULTS (profile-aware + question-specific) ---\n${allRAG.map(s => fmtScholarship(s, undefined, false)).join("\n")}`;
          }
        } catch { /* search errors are non-fatal */ }
      }
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        stream: true,
        max_tokens: 4096,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemWithContext },
          ...recentMessages,
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      const status = openaiRes.status === 429 ? 429 : openaiRes.status === 402 ? 402 : 500;
      return res.status(status).json({ error: errText });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const nodeStream = Readable.fromWeb(openaiRes.body as any);
    nodeStream.pipe(res);

  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Spectrum Copilot server running on port ${PORT}`);
});
