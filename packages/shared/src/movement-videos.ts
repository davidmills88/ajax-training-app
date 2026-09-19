/** Public YouTube form demos (oembed-confirmed). Placeholders until Ajax uploads its own clips. */
export const FALLBACK_FORM_VIDEO = "https://www.youtube.com/watch?v=MeIiIdhvXT4";

const YT = {
  goblet: "https://www.youtube.com/watch?v=MeIiIdhvXT4",
  rdl: "https://www.youtube.com/watch?v=jEy_czb3RKA",
  hinge: "https://www.youtube.com/watch?v=jEy_czb3RKA",
  calf: "https://www.youtube.com/watch?v=gwLzBJYoWlI",
  splitSquat: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
  frontSquat: "https://www.youtube.com/watch?v=MeIiIdhvXT4",
  cossack: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
  stepUp: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
  broadJump: "https://www.youtube.com/watch?v=Tgi5SNDbBZQ",
  bridge: "https://www.youtube.com/watch?v=WCGV5XWewFY",
  bandWalk: "https://www.youtube.com/watch?v=WCGV5XWewFY",
  medball: "https://www.youtube.com/watch?v=0G2_XV7slIg",
  dbBench: "https://www.youtube.com/watch?v=0G2_XV7slIg",
  floorPress: "https://www.youtube.com/watch?v=uUGDRwge4F8",
  elevatedPushup: "https://www.youtube.com/watch?v=uUGDRwge4F8",
  bandPress: "https://www.youtube.com/watch?v=M2rwvNhTOu0",
  landmine: "https://www.youtube.com/watch?v=M2rwvNhTOu0",
  dbPress: "https://www.youtube.com/watch?v=M2rwvNhTOu0",
  halfKneeling: "https://www.youtube.com/watch?v=M2rwvNhTOu0",
  chestRow: "https://www.youtube.com/watch?v=pYcpY20QaE8",
  saRow: "https://www.youtube.com/watch?v=pYcpY20QaE8",
  facePull: "https://www.youtube.com/watch?v=rep-qVOkqgk",
  farmer: "https://www.youtube.com/watch?v=Tgi5SNDbBZQ",
  suitcase: "https://www.youtube.com/watch?v=Tgi5SNDbBZQ",
  zone2: "https://www.youtube.com/watch?v=L_xrDAtykMI",
  hip9090: "https://www.youtube.com/watch?v=MH919hRvrVE",
  couch: "https://www.youtube.com/watch?v=ulgAOykAgV4",
  wgs: "https://www.youtube.com/watch?v=-rK5otzYmt4",
  ankle: "https://www.youtube.com/watch?v=-rK5otzYmt4",
  breathing: "https://www.youtube.com/watch?v=tybOi4hjZFQ",
  mobility: "https://www.youtube.com/watch?v=L_xrDAtykMI",
  catCow: "https://www.youtube.com/watch?v=y39PrKY_4JM",
  pullApart: "https://www.youtube.com/watch?v=rep-qVOkqgk",
  deadBug: "https://www.youtube.com/watch?v=UBa7wBucN-4",
  sidePlank: "https://www.youtube.com/watch?v=K2VljzCC16g",
  pallof: "https://www.youtube.com/watch?v=K2VljzCC16g",
  birdDog: "https://www.youtube.com/watch?v=wiFNA3sqjCA",
  sitToStand: "https://www.youtube.com/watch?v=MeIiIdhvXT4",
  childsPose: "https://www.youtube.com/watch?v=y39PrKY_4JM",
} as const;

/**
 * Normalized movement name → public YouTube watch URL.
 * Keys are lowercase words only (see `normalizeMovement`).
 */
export const MOVEMENT_VIDEOS: Record<string, string> = {
  "goblet squat": YT.goblet,
  "front loaded squat": YT.frontSquat,
  "front squat": YT.frontSquat,
  "squat pattern": YT.goblet,
  "sit to stand squat": YT.sitToStand,
  "sit to stand to a high box": YT.sitToStand,
  "goblet squat to a box": YT.goblet,
  "romanian deadlift": YT.rdl,
  "hip hinge": YT.hinge,
  hinge: YT.hinge,
  "backpack hip hinge": YT.rdl,
  "supported hip hinge": YT.hinge,
  "calf raise": YT.calf,
  "split squat": YT.splitSquat,
  "cossack squat": YT.cossack,
  "box step up": YT.stepUp,
  "broad jump soft": YT.broadJump,
  "broad jump": YT.broadJump,
  "glute bridge": YT.bridge,
  "lateral band walk": YT.bandWalk,
  "med ball chest pass": YT.medball,
  "dumbbell bench press": YT.dbBench,
  press: YT.dbBench,
  "floor press": YT.floorPress,
  "elevated push up": YT.elevatedPushup,
  "band or backpack press": YT.bandPress,
  "landmine or chest height band press": YT.landmine,
  "seated or standing press": YT.dbPress,
  "half kneeling press": YT.halfKneeling,
  "chest supported row": YT.chestRow,
  "single arm row": YT.saRow,
  row: YT.saRow,
  "backpack or band row": YT.saRow,
  "face pull": YT.facePull,
  "farmer carry": YT.farmer,
  carry: YT.farmer,
  "suitcase carry": YT.suitcase,
  "suitcase walk": YT.suitcase,
  "zone 2": YT.zone2,
  "zone 2 walk": YT.zone2,
  "easy bike or walk": YT.zone2,
  "easy walk in": YT.zone2,
  "easy walk out": YT.zone2,
  "hip 90 90": YT.hip9090,
  "couch stretch": YT.couch,
  "world s greatest stretch": YT.wgs,
  "ankle rocks": YT.ankle,
  "breathing reset": YT.breathing,
  "full body mobility": YT.mobility,
  "cat cow": YT.catCow,
  "cat cow child s pose": YT.catCow,
  "child s pose": YT.childsPose,
  "band pull apart": YT.pullApart,
  "dead bug": YT.deadBug,
  "side plank": YT.sidePlank,
  "pallof press": YT.pallof,
  "bird dog": YT.birdDog,
};

export function normalizeMovement(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isHttpVideoUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

/** Look up a public form video for a movement name. Exact key first, then longest catalog key contained in the name. */
export function videoForMovement(name: string): string | null {
  const key = normalizeMovement(name);
  if (!key) return null;
  if (MOVEMENT_VIDEOS[key]) return MOVEMENT_VIDEOS[key];
  const contained = Object.keys(MOVEMENT_VIDEOS)
    .filter((catalog) => catalog.length > 0 && key.includes(catalog))
    .sort((a, b) => b.length - a.length);
  return contained[0] ? MOVEMENT_VIDEOS[contained[0]] : null;
}

export function videoForMovementOrFallback(name: string, fallback?: string | null): string {
  return videoForMovement(name) ?? (isHttpVideoUrl(fallback) ? fallback.trim() : FALLBACK_FORM_VIDEO);
}

export function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || null;
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2] || null;
      if (parsed.pathname.startsWith("/live/")) return parsed.pathname.split("/")[2] || null;
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

/** Map watch / youtu.be / shorts URLs to an embeddable player URL. Non-YouTube http(s) URLs pass through. */
export function youtubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!isHttpVideoUrl(trimmed)) return null;
  const id = youtubeVideoId(trimmed);
  if (id) return `https://www.youtube.com/embed/${id}`;
  return trimmed;
}
