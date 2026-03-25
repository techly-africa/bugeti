import type { Category } from "./types";

// Keyword groups → category name hint (matches Category.name loosely)
// Each entry: [keywords[], categoryNameHint]
const KEYWORD_MAP: [string[], string][] = [
  [
    ["inyange", "bralirwa", "skol", "primus", "restaurant", "canteen", "supermarket",
     "market", "marche", "ibiryo", "tomato", "rice", "beans", "sukari", "amata",
     "ifu", "fanta", "coca", "juice", "kimironko", "nyabugogo", "grocery"],
    "food",
  ],
  [
    ["tap&go", "tapango", "moto", "bus", "taxi", "fuel", "petrol", "total",
     "rubis", "oilibya", "kobil", "transport", "gutwara", "bisi", "kigali bus"],
    "transport",
  ],
  [
    ["reco", "wasac", "electricity", "water", "amazi", "amashanyarazi", "utilities",
     "gas", "internet fibre", "mtn fiber", "starlink"],
    "utilities",
  ],
  [
    ["pharmacy", "pharmacie", "hospital", "chuk", "clinic", "doctor",
     "ubuzima", "health", "dawa", "indwara", "masque"],
    "health",
  ],
  [
    ["school", "ecole", "college", "university", "nursery", "amashuri",
     "books", "copybook", "uniform", "fees", "karo", "tuition"],
    "school",
  ],
  [
    ["nakumatt", "simba supermarket", "carrefour", "uchumi", "shoprite",
     "boutique", "mall", "store", "shopping"],
    "shopping",
  ],
  [
    ["mtn airtime", "airtel airtime", "airtime", "data bundle", "internet bundle",
     "megabytes", "prepaid", "recharge"],
    "airtime",
  ],
  [
    ["rent", "kodesha", "loyer", "house rent", "inzu y'akazi"],
    "rent",
  ],
  [
    ["sacco", "copedu", "equity bank", "kcb", "access bank", "bk",
     "bank of kigali", "savings deposit", "izigama"],
    "savings",
  ],
  [
    ["cinema", "concert", "netflix", "sport", "bar", "club",
     "entertainment", "ibikinisho", "enjoy", "fun"],
    "entertainment",
  ],
  [
    ["clothes", "imyenda", "dress", "shoes", "chaussures", "fabric",
     "kitenge", "tailor", "tailoring", "clothing"],
    "clothing",
  ],
  [
    ["househelp", "umukozi", "nanny", "gardener", "cleaner",
     "cleaning", "domestic"],
    "househelp",
  ],
];

const LEARN_KEY = "bugeti_cat_mappings";

function getLearnedMappings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LEARN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Suggest a category based on a transaction note/description.
 * Returns the best matching top-level category, or null if no match.
 * Precedence: learned user mappings → keyword map.
 */
export function suggestCategory(
  note: string,
  categories: Category[]
): Category | null {
  if (!note.trim()) return null;
  const normalized = normalize(note);
  const rootCats = categories.filter((c) => !c.parent_id);

  // 1. User-learned mappings take priority
  const learned = getLearnedMappings();
  for (const [pattern, catId] of Object.entries(learned)) {
    if (normalized.includes(pattern)) {
      const cat = rootCats.find((c) => c.id === catId);
      if (cat) return cat;
    }
  }

  // 2. Keyword map → fuzzy match against category names
  for (const [keywords, hint] of KEYWORD_MAP) {
    if (!keywords.some((kw) => normalized.includes(kw))) continue;

    const matched = rootCats.find((c) => {
      const name = c.name.toLowerCase();
      const nameRw = c.name_rw?.toLowerCase() ?? "";
      // Direct hint match OR category name contains the hint word
      return (
        name === hint ||
        name.startsWith(hint) ||
        hint.startsWith(name) ||
        nameRw.includes(hint)
      );
    });
    if (matched) return matched;
  }

  return null;
}

/**
 * Store a user-confirmed note→category mapping so future suggestions improve.
 * Call this when the user accepts a suggestion or manually picks a category
 * after typing a note.
 */
export function learnMapping(note: string, categoryId: string): void {
  if (typeof window === "undefined" || !note.trim()) return;
  const pattern = normalize(note).split(/\s+/).slice(0, 3).join(" ");
  if (pattern.length < 3) return;
  const mappings = getLearnedMappings();
  mappings[pattern] = categoryId;
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(mappings));
  } catch {
    // storage full — silently ignore
  }
}
