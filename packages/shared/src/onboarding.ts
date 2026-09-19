import type {
  ClientSummary,
  OnboardingAnswers,
  OnboardingSectionId,
} from "./types.js";

export type FieldType = "text" | "textarea" | "number" | "select" | "multiselect" | "scale";

export type OnboardingField = {
  key: string;
  label: string;
  prompt: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
};

export type OnboardingSectionDef = {
  id: OnboardingSectionId;
  title: string;
  blurb: string;
  fields: OnboardingField[];
};

export const ONBOARDING_SECTIONS: OnboardingSectionDef[] = [
  {
    id: 1,
    title: "Basic information",
    blurb: "Who you are and where you train. One section at a time — we will recap before moving on.",
    fields: [
      { key: "fullName", label: "Full name", prompt: "What's your full name?", type: "text", required: true },
      { key: "age", label: "Age", prompt: "How old are you?", type: "number", required: true, min: 18, max: 100 },
      {
        key: "gender",
        label: "Gender",
        prompt: "How do you describe your gender?",
        type: "select",
        required: true,
        options: [
          { value: "woman", label: "Woman" },
          { value: "man", label: "Man" },
          { value: "nonbinary", label: "Non-binary" },
          { value: "prefer_not", label: "Prefer not to say" },
        ],
      },
      { key: "height", label: "Height", prompt: "Height? (e.g. 5'10\" or 178 cm)", type: "text", required: true },
      { key: "weight", label: "Weight", prompt: "Weight? (e.g. 165 lb)", type: "text", required: true },
      { key: "occupation", label: "Occupation", prompt: "What do you do for work?", type: "text", required: true },
      {
        key: "dailyActivityLevel",
        label: "Daily activity",
        prompt: "General daily activity level outside training?",
        type: "select",
        required: true,
        options: [
          { value: "sedentary", label: "Sedentary" },
          { value: "lightly_active", label: "Lightly active" },
          { value: "active", label: "Active" },
          { value: "very_active", label: "Very active" },
        ],
      },
      {
        key: "trainingEnvironment",
        label: "Training environment",
        prompt: "Where do you usually train?",
        type: "select",
        required: true,
        options: [
          { value: "ajax_gym", label: "Ajax gym access" },
          { value: "home_gym", label: "Home gym" },
          { value: "limited", label: "Limited equipment" },
          { value: "mixed", label: "Mix of gym and travel" },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Goals & motivation",
    blurb: "What you want from this block, and why it matters now.",
    fields: [
      { key: "goal1", label: "Goal 1", prompt: "Top goal right now?", type: "text", required: true },
      { key: "goal2", label: "Goal 2", prompt: "Second goal?", type: "text" },
      { key: "goal3", label: "Goal 3", prompt: "Third goal?", type: "text" },
      {
        key: "whyImportant",
        label: "Why these matter",
        prompt: "Why are these goals important to you?",
        type: "textarea",
        required: true,
      },
      {
        key: "eventsTimelines",
        label: "Events or timelines",
        prompt: "Any specific events or timelines (ski season, wedding, race)?",
        type: "textarea",
      },
      {
        key: "commitment",
        label: "Commitment",
        prompt: "On a scale of 1–10, how committed are you to this goal?",
        type: "scale",
        required: true,
        min: 1,
        max: 10,
      },
    ],
  },
  {
    id: 3,
    title: "Training history",
    blurb: "What you have already done — so we do not repeat a stale pattern.",
    fields: [
      {
        key: "consistentTrainingDuration",
        label: "Consistency",
        prompt: "How long have you been training consistently?",
        type: "text",
        required: true,
      },
      {
        key: "trainingTypes",
        label: "Training types",
        prompt: "What types of training have you done before?",
        type: "multiselect",
        required: true,
        options: [
          { value: "strength", label: "Strength" },
          { value: "hiit", label: "HIIT" },
          { value: "crossfit", label: "CrossFit" },
          { value: "endurance", label: "Endurance" },
          { value: "ski", label: "Ski / snow" },
          { value: "yoga", label: "Yoga / mobility" },
          { value: "other", label: "Other" },
        ],
      },
      {
        key: "whatWorked",
        label: "What worked",
        prompt: "What has worked well for you in the past?",
        type: "textarea",
        required: true,
      },
      {
        key: "whatDidntWork",
        label: "What did not work",
        prompt: "What has not worked?",
        type: "textarea",
      },
      {
        key: "workedWithCoach",
        label: "Coaching history",
        prompt: "Have you worked with a coach or followed a structured program?",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: 4,
    title: "Current routine & schedule",
    blurb: "What a realistic week looks like. Ajax hours are 6am–9pm — not 24 hours.",
    fields: [
      {
        key: "daysPerWeek",
        label: "Days per week",
        prompt: "How many days per week can you realistically train?",
        type: "number",
        required: true,
        min: 1,
        max: 7,
      },
      {
        key: "sessionDuration",
        label: "Session length",
        prompt: "Preferred session duration?",
        type: "select",
        required: true,
        options: [
          { value: "30", label: "About 30 minutes" },
          { value: "45", label: "About 45 minutes" },
          { value: "60", label: "About 60 minutes" },
          { value: "75", label: "75 minutes or more" },
        ],
      },
      {
        key: "otherActivities",
        label: "Other activities",
        prompt: "Any cardio, classes, or other activities (running, skiing, biking, yoga)?",
        type: "textarea",
      },
      {
        key: "usualTrainTime",
        label: "Usual time",
        prompt: "When do you usually train?",
        type: "select",
        required: true,
        options: [
          { value: "morning", label: "Morning" },
          { value: "afternoon", label: "Afternoon" },
          { value: "evening", label: "Evening" },
          { value: "varies", label: "It varies" },
        ],
      },
    ],
  },
  {
    id: 5,
    title: "Injury & movement profile",
    blurb: "Limitations first. We would rather know now than guess later.",
    fields: [
      {
        key: "injuriesSurgeriesPain",
        label: "Injuries & pain",
        prompt: "Current or past injuries, surgeries, or chronic pain?",
        type: "textarea",
        required: true,
      },
      {
        key: "movementRestrictions",
        label: "Movement restrictions",
        prompt: "Any movement restrictions or mobility issues (hips, shoulders, knees)?",
        type: "textarea",
      },
      {
        key: "exercisesToAvoid",
        label: "Avoid or dislike",
        prompt: "Exercises you dislike or need to avoid?",
        type: "textarea",
      },
    ],
  },
  {
    id: 6,
    title: "Lifestyle & recovery",
    blurb: "Sleep, stress, and how you actually recover — not the ideal week.",
    fields: [
      {
        key: "sleepHours",
        label: "Sleep",
        prompt: "How many hours of sleep do you typically get?",
        type: "text",
        required: true,
      },
      {
        key: "stressLevel",
        label: "Stress",
        prompt: "How is your stress level on a typical week?",
        type: "select",
        required: true,
        options: [
          { value: "low", label: "Low" },
          { value: "moderate", label: "Moderate" },
          { value: "high", label: "High" },
          { value: "spiky", label: "Spiky — depends on the week" },
        ],
      },
      {
        key: "recoveryTools",
        label: "Recovery tools",
        prompt: "Do you use any recovery tools (massage, sauna, cold plunge, mobility)?",
        type: "textarea",
      },
      {
        key: "nutritionStyle",
        label: "Nutrition",
        prompt: "How is nutrition currently?",
        type: "select",
        required: true,
        options: [
          { value: "structured", label: "Structured" },
          { value: "intuitive", label: "Intuitive" },
          { value: "tracked", label: "Tracked" },
          { value: "inconsistent", label: "Inconsistent" },
        ],
      },
    ],
  },
  {
    id: 7,
    title: "Performance & assessment",
    blurb: "Numbers if you have them. Perceived weak links if you do not.",
    fields: [
      {
        key: "strengthLevels",
        label: "Strength levels",
        prompt: "Known max or estimated strength (squat, bench, deadlift)?",
        type: "textarea",
      },
      {
        key: "fitnessTestData",
        label: "Test data",
        prompt: "Any current fitness test data (VO₂max, body fat %)?",
        type: "textarea",
      },
      {
        key: "weakLinks",
        label: "Weak links",
        prompt: "Perceived weak links — strength, endurance, mobility, consistency?",
        type: "textarea",
        required: true,
      },
      {
        key: "includeCorrective",
        label: "Corrective work",
        prompt: "Include mobility, energy-system, or corrective work in the program?",
        type: "select",
        required: true,
        options: [
          { value: "yes_all", label: "Yes — mobility, ESD, and correctives" },
          { value: "mobility", label: "Mobility / correctives, keep ESD light" },
          { value: "esd", label: "Keep energy-system work, light mobility" },
          { value: "minimal", label: "Keep extras minimal" },
        ],
      },
    ],
  },
  {
    id: 8,
    title: "Preferences & coaching style",
    blurb: "How the work should feel, and how much explanation you want.",
    fields: [
      {
        key: "trainingFeel",
        label: "Feel",
        prompt: "How do you like training to feel?",
        type: "select",
        required: true,
        options: [
          { value: "performance", label: "Performance-based" },
          { value: "aesthetic", label: "Aesthetic" },
          { value: "longevity", label: "Longevity-focused" },
        ],
      },
      {
        key: "structurePreference",
        label: "Structure",
        prompt: "Structured templates or flexible guidelines?",
        type: "select",
        required: true,
        options: [
          { value: "templates", label: "Structured templates" },
          { value: "flexible", label: "Flexible guidelines" },
        ],
      },
      {
        key: "explanationDepth",
        label: "Explanation",
        prompt: "How much explanation do you want behind the programming?",
        type: "select",
        required: true,
        options: [
          { value: "brief", label: "Brief summary" },
          { value: "full", label: "Full rationale" },
        ],
      },
    ],
  },
  {
    id: 9,
    title: "Final check",
    blurb: "Anything we missed, and how you want to see progress.",
    fields: [
      {
        key: "anythingElse",
        label: "Anything else",
        prompt: "Is there anything else we should know to create the best plan?",
        type: "textarea",
      },
      {
        key: "progressMeasures",
        label: "Progress",
        prompt: "How do you want to measure progress?",
        type: "multiselect",
        required: true,
        options: [
          { value: "strength", label: "Strength" },
          { value: "aesthetics", label: "Aesthetics" },
          { value: "energy", label: "Energy" },
          { value: "mood", label: "Mood" },
          { value: "metrics", label: "Metrics / tests" },
        ],
      },
    ],
  },
];

export function sectionById(id: OnboardingSectionId): OnboardingSectionDef {
  const found = ONBOARDING_SECTIONS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown onboarding section ${id}`);
  return found;
}

export function isOnboardingSectionId(value: number): value is OnboardingSectionId {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

function asString(value: OnboardingAnswers[string] | undefined): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function optionLabel(section: OnboardingSectionDef, key: string, raw: string): string {
  const field = section.fields.find((f) => f.key === key);
  if (!field?.options) return raw;
  const parts = raw.split(",").map((p) => p.trim());
  return parts
    .map((p) => field.options?.find((o) => o.value === p)?.label ?? p)
    .join(", ");
}

export function filledDemoSection(id: OnboardingSectionId): OnboardingAnswers {
  const section = sectionById(id);
  const answers: OnboardingAnswers = {};
  for (const field of section.fields) {
    if (field.type === "number" || field.type === "scale") answers[field.key] = field.min ?? 3;
    else if (field.type === "multiselect") answers[field.key] = [field.options?.[0]?.value ?? "x"];
    else if (field.type === "select") answers[field.key] = field.options?.[0]?.value ?? "x";
    else answers[field.key] = field.key === "fullName" ? "Demo Member" : `demo-${field.key}`;
  }
  if (id === 2) {
    answers.goal1 = "Ski-season durability";
    answers.whyImportant = "Stay on snow without blowing up.";
  }
  return answers;
}

export function validateSectionAnswers(id: OnboardingSectionId, answers: OnboardingAnswers): string[] {
  const section = sectionById(id);
  const errors: string[] = [];
  for (const field of section.fields) {
    if (!field.required) continue;
    const value = answers[field.key];
    if (value === undefined || value === null || value === "") {
      errors.push(`${field.label} is required.`);
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      errors.push(`Choose at least one option for ${field.label}.`);
    }
  }
  return errors;
}

export function recapSection(id: OnboardingSectionId, answers: OnboardingAnswers): string[] {
  const section = sectionById(id);
  return section.fields
    .map((field) => {
      const raw = asString(answers[field.key]);
      if (!raw) return null;
      return `${field.label}: ${optionLabel(section, field.key, raw)}`;
    })
    .filter((line): line is string => Boolean(line));
}

function s(sections: Partial<Record<OnboardingSectionId, OnboardingAnswers>>, id: OnboardingSectionId, key: string): string {
  return asString(sections[id]?.[key]);
}

export function emptyClientSummary(): ClientSummary {
  return {
    name: "",
    ageGender: "",
    goals: "",
    trainingAvailability: "",
    equipmentAccess: "",
    limitationsInjuries: "",
    strengthsWeaknesses: "",
    recoveryNutritionNotes: "",
    coachingPreferences: "",
  };
}

export function buildClientSummary(
  sections: Partial<Record<OnboardingSectionId, OnboardingAnswers>>,
): ClientSummary {
  const goals = [s(sections, 2, "goal1"), s(sections, 2, "goal2"), s(sections, 2, "goal3")]
    .filter(Boolean)
    .join(" · ");
  const age = s(sections, 1, "age");
  const gender = optionLabel(sectionById(1), "gender", s(sections, 1, "gender"));
  const days = s(sections, 4, "daysPerWeek");
  const duration = optionLabel(sectionById(4), "sessionDuration", s(sections, 4, "sessionDuration"));
  const time = optionLabel(sectionById(4), "usualTrainTime", s(sections, 4, "usualTrainTime"));
  const feel = optionLabel(sectionById(8), "trainingFeel", s(sections, 8, "trainingFeel"));
  const structure = optionLabel(sectionById(8), "structurePreference", s(sections, 8, "structurePreference"));
  const explanation = optionLabel(sectionById(8), "explanationDepth", s(sections, 8, "explanationDepth"));

  return {
    name: s(sections, 1, "fullName"),
    ageGender: [age, gender].filter(Boolean).join(" / "),
    goals: [goals, s(sections, 2, "whyImportant")].filter(Boolean).join(" — "),
    trainingAvailability: [days && `${days} days/week`, duration, time].filter(Boolean).join(" · "),
    equipmentAccess: optionLabel(sectionById(1), "trainingEnvironment", s(sections, 1, "trainingEnvironment")),
    limitationsInjuries: [s(sections, 5, "injuriesSurgeriesPain"), s(sections, 5, "movementRestrictions"), s(sections, 5, "exercisesToAvoid")]
      .filter(Boolean)
      .join(" · "),
    strengthsWeaknesses: [s(sections, 3, "whatWorked"), s(sections, 7, "weakLinks")].filter(Boolean).join(" · "),
    recoveryNutritionNotes: [
      s(sections, 6, "sleepHours") && `Sleep: ${s(sections, 6, "sleepHours")}`,
      s(sections, 6, "stressLevel") && `Stress: ${optionLabel(sectionById(6), "stressLevel", s(sections, 6, "stressLevel"))}`,
      s(sections, 6, "nutritionStyle") && `Nutrition: ${optionLabel(sectionById(6), "nutritionStyle", s(sections, 6, "nutritionStyle"))}`,
      s(sections, 6, "recoveryTools"),
    ]
      .filter(Boolean)
      .join(" · "),
    coachingPreferences: [feel, structure, explanation].filter(Boolean).join(" · "),
  };
}

export const CLIENT_SUMMARY_FIELDS: { key: keyof ClientSummary; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "ageGender", label: "Age / gender" },
  { key: "goals", label: "Goals" },
  { key: "trainingAvailability", label: "Training availability" },
  { key: "equipmentAccess", label: "Equipment access" },
  { key: "limitationsInjuries", label: "Limitations / injuries" },
  { key: "strengthsWeaknesses", label: "Strengths / weaknesses" },
  { key: "recoveryNutritionNotes", label: "Recovery / nutrition notes" },
  { key: "coachingPreferences", label: "Coaching preferences" },
];
