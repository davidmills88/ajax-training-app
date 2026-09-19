import {
  asTrimmed,
  optionalUrl,
  resolveIntakeSummary,
  resolveIntakeVideos,
  validateIntake,
  type DaveIntake,
  type IntakeSlot,
  type IntakeVideos,
} from "./intake-core.js";
import { validateCreateBlock, type CreateBlockInput, type CreateWorkoutInput, type WorkoutSegment } from "./training.js";
import type { ClientSummary } from "./types.js";

/** Written onto every generated program so a coach can see this is not a locked engine output. */
export const M2_FIRST_PASS_MARK = "M2 first pass — coach may swap";

export const FOUNDATION_DURATION_WEEKS = 6;
export const FOUNDATION_SESSION_DAYS = [1, 3, 5] as const;
export const FOUNDATION_WEEK_THEMES = [
  "settle",
  "load",
  "density",
  "strength",
  "power-ish",
  "settle",
] as const;

export type LimitationKind = "knee" | "shoulder" | "back";
export type EquipmentKind = "ajax" | "home" | "limited" | "mixed";
export type DurationBand = "short" | "default" | "long";
export type WeekId = 1 | 2 | 3 | 4 | 5 | 6;

export type LimitationFlags = Record<LimitationKind, boolean>;

const PLACEHOLDER_VIDEOS: Record<IntakeSlot, string> = {
  lower: "https://www.youtube.com/watch?v=MxsSz_VZ4p4",
  upper: "https://www.youtube.com/watch?v=0G2_XV7slIg",
  aerobic: "https://www.youtube.com/watch?v=L_xrDAtykMI",
};

const WEEK_TITLES: Record<IntakeSlot, Record<WeekId, string>> = {
  lower: {
    1: "Lower body — settle the pattern",
    2: "Lower body — add a little load",
    3: "Lower body — density",
    4: "Lower body — strength emphasis",
    5: "Lower body — power without chaos",
    6: "Lower body — settle and note",
  },
  upper: {
    1: "Upper body — press and pull",
    2: "Upper body — clean positions",
    3: "Upper body — denser sets",
    4: "Upper body — strength emphasis",
    5: "Upper body — press, pull, carry",
    6: "Upper body — settle and note",
  },
  aerobic: {
    1: "Easy aerobic + mobility",
    2: "Easy aerobic + walk-out",
    3: "Aerobic — slightly longer",
    4: "Easy aerobic — keep the week honest",
    5: "Aerobic — steady",
    6: "Easy finish",
  },
};

const WEEK_NOTES: Record<IntakeSlot, Record<WeekId, string>> = {
  lower: {
    1: "Find depth and a still torso before you chase load. Leave two reps in reserve.",
    2: "Same patterns as week 1. A small jump in weight is enough.",
    3: "Shorter rests if the last set still looks like the first.",
    4: "Top sets at a true 7/10 effort. No grinding.",
    5: "Crisp reps. Stop before the landing gets loud.",
    6: "Repeat a week-4 load if it still feels quiet. Write down what moved well.",
  },
  upper: {
    1: "Even tempo. Stop the set when the shoulder shrug starts to take over.",
    2: "Keep the ribs stacked. Do not chase a pump.",
    3: "One extra working set. Form still wins.",
    4: "Pause the last rep of each set on the chest or at the hang.",
    5: "A little more snap, same control.",
    6: "Same idea as Tuesday. This is a checkpoint, not a test day.",
  },
  aerobic: {
    1: "Conversational pace. This is recovery you can still feel proud of.",
    2: "Same zone 2 as week 1. Finish with unhurried breathing.",
    3: "Stay conversational. If you cannot speak a sentence, ease off.",
    4: "Do not turn this into intervals.",
    5: "Same easy pace. This week is about arriving recovered.",
    6: "Walk, breathe, write a short note for your coach. The next block starts from here.",
  },
};

type SegmentOverride = {
  name: string;
  prescription?: string;
  notes: string;
};

type TemplateSegment = {
  name: string;
  prescription: string;
  notes?: string;
  /** Needs external load; limited-equipment members get a bodyweight / bag swap. */
  load?: boolean;
  avoid?: Partial<Record<LimitationKind, SegmentOverride>>;
};

export function detectLimitations(text: string): LimitationFlags {
  const hay = text.toLowerCase();
  return {
    knee: /\bknees?\b|patella|\bacl\b|\bmcl\b|meniscus|lunge/.test(hay),
    shoulder: /\bshoulders?\b|rotator|impingement/.test(hay),
    back: /\b(low(?:er)?\s+)?back\b|\blumbar\b|\bspine\b|\bdiscs?\b|herniat/.test(hay),
  };
}

export function detectEquipment(text: string): EquipmentKind {
  const hay = text.toLowerCase();
  if (hay.includes("limited")) return "limited";
  if (hay.includes("home")) return "home";
  if (hay.includes("mix") || hay.includes("travel")) return "mixed";
  return "ajax";
}

export function detectDurationBand(availability: string): DurationBand {
  const hay = availability.toLowerCase();
  if (/\b30\b|about 30/.test(hay)) return "short";
  if (/\b75\b|75 minutes/.test(hay)) return "long";
  return "default";
}

export function activeLimitationKinds(flags: LimitationFlags): LimitationKind[] {
  return (Object.keys(flags) as LimitationKind[]).filter((key) => flags[key]);
}

function slotForDay(day: number): IntakeSlot {
  if (day === 1) return "lower";
  if (day === 3) return "upper";
  return "aerobic";
}

function videoForSlot(slot: IntakeSlot, videos: IntakeVideos): string | null {
  return optionalUrl(videos[slot]) ?? optionalUrl(videos.default) ?? PLACEHOLDER_VIDEOS[slot];
}

function defaultTitle(summary: ClientSummary, intake: DaveIntake): string {
  if (asTrimmed(intake.title)) return asTrimmed(intake.title);
  if (summary.name) return `${summary.name} — 6 weeks`;
  const goal = summary.goals.split(/[·.—]/)[0]?.trim();
  if (goal) return `${goal} — 6 weeks`;
  return "Dave intake — 6 weeks";
}

function scalePrescription(rx: string, band: DurationBand): string {
  if (band === "default") return rx;
  const setMatch = rx.match(/^(\d+)\s*×\s*(.+)$/);
  if (setMatch) {
    const sets = Number(setMatch[1]);
    const rest = setMatch[2];
    if (band === "short") return `${Math.max(2, sets - 1)} × ${rest}`;
    return `${sets + 1} × ${rest}`;
  }
  const rangeMatch = rx.match(/(\d+)–(\d+)\s*min/);
  if (rangeMatch) {
    const lo = Number(rangeMatch[1]);
    const hi = Number(rangeMatch[2]);
    if (band === "short") return rx.replace(rangeMatch[0], `${Math.max(20, lo - 10)}–${Math.max(25, hi - 10)} min`);
    return rx.replace(rangeMatch[0], `${lo + 5}–${hi + 10} min`);
  }
  const singleMin = rx.match(/^(\d+)\s*min/);
  if (singleMin) {
    const n = Number(singleMin[1]);
    if (band === "short") return rx.replace(singleMin[0], `${Math.max(20, n - 10)} min`);
    return rx.replace(singleMin[0], `${n + 10} min`);
  }
  return rx;
}

function limitedName(name: string): { name: string; notes: string } | null {
  const key = name.toLowerCase();
  if (key.includes("goblet") || key.includes("front-loaded") || key.includes("squat pattern") || key === "squat pattern") {
    return { name: "Sit-to-stand squat", notes: "Limited kit: chair or box. Slow sit, stand tall." };
  }
  if (key.includes("romanian") || key.includes("hip hinge") || key === "hinge") {
    return { name: "Backpack hip hinge", notes: "Limited kit: load a backpack. Soft knees, long spine." };
  }
  if (key.includes("dumbbell bench") || key === "press") {
    return { name: "Elevated push-up", notes: "Limited kit: hands on a counter if the floor press is too hard." };
  }
  if (key.includes("row")) {
    return { name: "Backpack or band row", notes: "Limited kit: row a bag or band. Pause at the ribs." };
  }
  if (key.includes("press") && !key.includes("push")) {
    return { name: "Band or backpack press", notes: "Limited kit: press at chest height. No overhead chase." };
  }
  if (key.includes("carry") || key.includes("farmer")) {
    return { name: "Suitcase walk", notes: "Limited kit: a grocery bag in each hand is enough." };
  }
  if (key.includes("zone 2")) {
    return { name: "Zone 2 walk", notes: "Limited kit: brisk outdoor walk. Conversational pace." };
  }
  return null;
}

function compileBlockNotes(
  intake: DaveIntake,
  summary: ClientSummary,
  flags: LimitationFlags,
  equipment: EquipmentKind,
): string {
  const applied = activeLimitationKinds(flags);
  const lines: string[] = [
    M2_FIRST_PASS_MARK,
    "6 weeks × 3 sessions (days 1 / 3 / 5). Progression: settle → load → density → strength → power-ish → settle. Not a full auto-programming engine.",
  ];
  if (applied.length) {
    lines.push(`Limitation swaps applied: ${applied.join(", ")}.`);
  }
  lines.push(`Equipment lens: ${equipmentLabel(equipment)}${summary.equipmentAccess ? ` (${summary.equipmentAccess})` : ""}.`);
  const pairs: [string, string][] = [
    ["Name", summary.name],
    ["Age / gender", summary.ageGender],
    ["Goals", summary.goals],
    ["Availability", summary.trainingAvailability],
    ["Equipment", summary.equipmentAccess],
    ["Limitations", summary.limitationsInjuries],
    ["Strengths / weak links", summary.strengthsWeaknesses],
    ["Recovery / nutrition", summary.recoveryNutritionNotes],
    ["Coaching prefs", summary.coachingPreferences],
  ];
  for (const [label, value] of pairs) {
    if (value) lines.push(`${label}: ${value}`);
  }
  const extra = asTrimmed(intake.notes);
  if (extra) lines.push(extra);
  return lines.join("\n");
}

function equipmentLabel(kind: EquipmentKind): string {
  if (kind === "ajax") return "Ajax gym";
  if (kind === "home") return "home gym";
  if (kind === "limited") return "limited kit";
  return "mixed / travel";
}

function overlayWorkoutNotes(
  slot: IntakeSlot,
  week: WeekId,
  summary: ClientSummary,
  flags: LimitationFlags,
  equipment: EquipmentKind,
  swaps: string[],
): string {
  const extras: string[] = [WEEK_NOTES[slot][week]];
  if (summary.goals) extras.push(`Goal thread: ${summary.goals}`);
  if (summary.limitationsInjuries && (slot === "lower" || flags.knee || flags.shoulder || flags.back)) {
    extras.push(`Watch: ${summary.limitationsInjuries}`);
  }
  if (slot === "upper" && summary.strengthsWeaknesses) {
    extras.push(`Build from: ${summary.strengthsWeaknesses}`);
  }
  if (slot === "aerobic" && summary.recoveryNutritionNotes) {
    extras.push(`Recovery context: ${summary.recoveryNutritionNotes}`);
  }
  if (summary.trainingAvailability) extras.push(`Availability: ${summary.trainingAvailability}`);
  extras.push(`Equipment: ${equipmentLabel(equipment)}.`);
  if (swaps.length) extras.push(`Swaps this session: ${swaps.join("; ")}.`);
  return extras.filter(Boolean).join(" ");
}

function applySegment(
  template: TemplateSegment,
  flags: LimitationFlags,
  equipment: EquipmentKind,
  band: DurationBand,
  videoUrl: string | null,
): { segment: WorkoutSegment; swap: string | null } {
  let name = template.name;
  let prescription = template.prescription;
  const notes: string[] = [];
  if (template.notes) notes.push(template.notes);
  let swap: string | null = null;

  for (const kind of activeLimitationKinds(flags)) {
    const replacement = template.avoid?.[kind];
    if (!replacement) continue;
    swap = `${template.name} → ${replacement.name} (${kind})`;
    name = replacement.name;
    if (replacement.prescription) prescription = replacement.prescription;
    notes.push(replacement.notes);
    break;
  }

  if (!swap && equipment === "limited" && template.load) {
    const limited = limitedName(name);
    if (limited) {
      swap = `${name} → ${limited.name} (limited kit)`;
      name = limited.name;
      notes.push(limited.notes);
    }
  } else if (equipment === "home" && template.load) {
    notes.push("Home gym: dumbbells or kettlebells are enough. Skip the barbell.");
  } else if (equipment === "mixed") {
    notes.push("Travel week: keep the pattern; a bag or hotel step is fine.");
  }

  prescription = scalePrescription(prescription, band);
  if (band === "short") notes.push("Short session: keep rests honest and skip the extra grind.");
  if (band === "long") notes.push("Longer session: one extra quality set, not junk volume.");

  return {
    segment: {
      name,
      prescription,
      notes: notes.filter(Boolean).join(" ") || undefined,
      videoUrl,
    },
    swap,
  };
}

function lowerTemplates(week: WeekId): TemplateSegment[] {
  const squat: TemplateSegment = {
    name: week <= 2 ? "Goblet squat" : week === 3 ? "Front-loaded squat" : "Squat pattern",
    prescription: week === 1 || week === 2 ? "3 × 8" : week === 3 ? "4 × 6" : week === 4 ? "4 × 5" : "3 × 5",
    notes: week === 1 ? "Pause one breath at the bottom." : undefined,
    load: true,
    avoid: {
      knee: {
        name: "Sit-to-stand to a high box",
        notes: "Knee limitation: no deep loaded squat. Stop above the chatter point.",
      },
      back: {
        name: "Goblet squat to a box",
        notes: "Back limitation: stay tall. Box height keeps the hinge honest.",
      },
    },
  };

  const hinge: TemplateSegment = {
    name: week === 3 ? "Hip hinge" : week === 6 ? "Hinge" : "Romanian deadlift",
    prescription: week <= 3 ? "3 × 6" : "3 × 5",
    notes: "Soft knees, long spine.",
    load: true,
    avoid: {
      back: {
        name: "Supported hip hinge",
        notes: "Back limitation: hands on a bench or wall. Move the hips, not the spine.",
        prescription: "3 × 8",
      },
      knee: {
        name: "Romanian deadlift",
        notes: "Knee-friendly hinge: soft knees, no deep knee bend.",
      },
    },
  };

  if (week === 1 || week === 3 || week === 6) {
    return [
      squat,
      hinge,
      { name: "Calf raise", prescription: week === 3 ? "3 × 10" : "2 × 12" },
    ];
  }

  if (week === 2) {
    return [
      squat,
      hinge,
      {
        name: "Split squat",
        prescription: "2 × 8 / side",
        load: true,
        avoid: {
          knee: {
            name: "Glute bridge",
            notes: "Knee limitation: swapped deep loaded lunge / split squat for a bridge.",
            prescription: "3 × 10",
          },
        },
      },
    ];
  }

  if (week === 4) {
    return [
      squat,
      hinge,
      {
        name: "Cossack squat",
        prescription: "2 × 6 / side",
        avoid: {
          knee: {
            name: "Lateral band walk",
            notes: "Knee limitation: no Cossack / deep side lunge. Stay shallow.",
            prescription: "2 × 10 / side",
          },
        },
      },
    ];
  }

  return [
    squat,
    {
      name: "Box step-up",
      prescription: "3 × 5 / side",
      load: true,
      avoid: {
        knee: {
          name: "Glute bridge",
          notes: "Knee limitation: swapped loaded step-up for a bridge. No deep knee travel.",
          prescription: "3 × 8",
        },
      },
    },
    {
      name: "Broad jump (soft)",
      prescription: "3 × 3",
      avoid: {
        knee: {
          name: "Med-ball chest pass",
          notes: "Knee limitation: no jumping. Snap comes from the arms and a quiet hip.",
          prescription: "3 × 5",
        },
        back: {
          name: "Med-ball chest pass",
          notes: "Back limitation: no jumping. Keep the ribs stacked.",
          prescription: "3 × 5",
        },
      },
    },
  ];
}

function upperTemplates(week: WeekId): TemplateSegment[] {
  const press: TemplateSegment = {
    name: week <= 3 ? "Dumbbell bench press" : "Press",
    prescription: week <= 2 ? "3 × 8" : week === 3 ? "4 × 6" : week === 4 ? "4 × 5" : "3 × 5",
    load: true,
    avoid: {
      shoulder: {
        name: "Floor press",
        notes: "Shoulder limitation: floor press stops the deep stretch. Elbows ~45°.",
      },
    },
  };

  const row: TemplateSegment = {
    name: week === 1 ? "Chest-supported row" : week === 2 ? "Chest-supported row" : week === 3 ? "Single-arm row" : "Row",
    prescription:
      week === 1 ? "3 × 8" : week === 2 ? "3 × 10" : week === 3 ? "3 × 8 / side" : week === 4 ? "4 × 6" : "3 × 6",
    load: true,
    avoid: {
      back: {
        name: "Chest-supported row",
        notes: "Back limitation: stay supported. No yanking.",
        prescription: week >= 4 ? "3 × 8" : undefined,
      },
    },
  };

  if (week === 1 || week === 3) {
    return [
      press,
      row,
      {
        name: "Half-kneeling press",
        prescription: week === 1 ? "2 × 8 / side" : "3 × 6 / side",
        load: true,
        avoid: {
          shoulder: {
            name: "Landmine or chest-height band press",
            notes: "Shoulder limitation: no overhead. Press at chest height.",
          },
          knee: {
            name: "Seated or standing press",
            notes: "Knee limitation: skip the half-kneeling stance.",
          },
        },
      },
    ];
  }

  if (week === 2) {
    return [press, row, { name: "Face pull", prescription: "2 × 12" }];
  }

  return [
    press,
    row,
    {
      name: week === 5 ? "Farmer carry" : "Carry",
      prescription: week === 5 ? "3 × 30m" : "2 × 30m",
      load: true,
      avoid: {
        shoulder: {
          name: "Suitcase carry",
          notes: "Shoulder limitation: lighter suitcase carry, ribs stacked. Stop if the shrug takes over.",
        },
        back: {
          name: "Suitcase carry",
          notes: "Back limitation: one light bag. Walk tall, no lean.",
        },
      },
    },
  ];
}

function aerobicTemplates(week: WeekId): TemplateSegment[] {
  const zone2: TemplateSegment = {
    name: "Zone 2",
    prescription:
      week === 1 ? "30–40 min walk, bike, or ski-erg" : week === 2 ? "35–45 min" : week === 3 ? "40–50 min" : week === 4 ? "40 min" : week === 5 ? "40–45 min" : "30–40 min",
    notes: week === 6 ? "Easy finish. Write a short note for your coach." : undefined,
    load: true,
  };

  const mobility: TemplateSegment =
    week === 1
      ? { name: "Hip 90/90", prescription: "2 × 45s / side" }
      : week === 2
        ? { name: "Couch stretch", prescription: "2 × 40s / side" }
        : week === 3
          ? {
              name: "World's greatest stretch",
              prescription: "2 / side",
              avoid: {
                knee: {
                  name: "Hip 90/90",
                  notes: "Knee limitation: no deep lunge stretch. 90/90 stays friendly.",
                  prescription: "2 × 45s / side",
                },
                back: {
                  name: "Cat-cow + child's pose",
                  notes: "Back limitation: skip the loaded twist. Breathe into the ribs.",
                  prescription: "4 breaths each",
                },
              },
            }
          : week === 4
            ? { name: "Ankle rocks", prescription: "2 × 10 / side" }
            : week === 5
              ? { name: "Breathing reset", prescription: "5 min nasal, slow" }
              : { name: "Full-body mobility", prescription: "8–10 min" };

  return [zone2, mobility];
}

function templatesFor(slot: IntakeSlot, week: WeekId): TemplateSegment[] {
  if (slot === "lower") return lowerTemplates(week);
  if (slot === "upper") return upperTemplates(week);
  return aerobicTemplates(week);
}

/**
 * First-pass 6-week / 3× week Ajax Foundation block from Client Summary / Dave intake.
 * Coach-editable via the existing `POST /coach/blocks` body. Not a full engine.
 */
export function generateFoundationBlock(intake: DaveIntake): CreateBlockInput {
  const errors = validateIntake(intake);
  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  const summary = resolveIntakeSummary(intake);
  const videos = resolveIntakeVideos(intake);
  const flags = detectLimitations(summary.limitationsInjuries);
  const equipment = detectEquipment(summary.equipmentAccess);
  const band = detectDurationBand(summary.trainingAvailability);

  const workouts: CreateWorkoutInput[] = [];
  let sortOrder = 0;
  for (let week = 1; week <= FOUNDATION_DURATION_WEEKS; week += 1) {
    const weekId = week as WeekId;
    for (const day of FOUNDATION_SESSION_DAYS) {
      const slot = slotForDay(day);
      const videoUrl = videoForSlot(slot, videos);
      const swapNotes: string[] = [];
      const segments = templatesFor(slot, weekId).map((template) => {
        const applied = applySegment(template, flags, equipment, band, videoUrl);
        if (applied.swap) swapNotes.push(applied.swap);
        return applied.segment;
      });
      workouts.push({
        week: weekId,
        day,
        sortOrder,
        title: WEEK_TITLES[slot][weekId],
        notes: overlayWorkoutNotes(slot, weekId, summary, flags, equipment, swapNotes),
        videoUrl,
        segments,
      });
      sortOrder += 1;
    }
  }

  const block: CreateBlockInput = {
    title: defaultTitle(summary, intake),
    notes: compileBlockNotes(intake, summary, flags, equipment),
    durationWeeks: FOUNDATION_DURATION_WEEKS,
    workouts,
  };
  const blockErrors = validateCreateBlock(block);
  if (blockErrors.length) {
    throw new Error(blockErrors.join(" "));
  }
  return block;
}
