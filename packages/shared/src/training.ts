import type { UserRole } from "./types.js";

export type AssignmentStatus = "active" | "inactive";

export type WorkoutSegment = {
  name: string;
  prescription?: string;
  notes?: string;
  videoUrl?: string | null;
};

export type Program = {
  id: string;
  tenantId: string;
  title: string;
  notes: string;
  durationWeeks: number;
  createdAt: string;
};

export type Workout = {
  id: string;
  tenantId: string;
  programId: string;
  week: number;
  day: number;
  sortOrder: number;
  title: string;
  notes: string;
  videoUrl: string | null;
  segments: WorkoutSegment[];
};

export type ProgramAssignment = {
  id: string;
  tenantId: string;
  programId: string;
  memberEmail: string;
  userId: string | null;
  status: AssignmentStatus;
  assignedAt: string;
};

export type WorkoutLog = {
  id: string;
  tenantId: string;
  userId: string;
  workoutId: string;
  assignmentId: string;
  weight: string | null;
  reps: string | null;
  score: string | null;
  notes: string;
  completedAt: string | null;
  createdAt: string;
};

export type WorkoutWithLog = Workout & {
  log: WorkoutLog | null;
};

export type TrainingHome = {
  assignment: ProgramAssignment | null;
  program: Program | null;
  workouts: WorkoutWithLog[];
};

export type WorkoutDetail = {
  assignment: ProgramAssignment;
  program: Program;
  workout: Workout;
  log: WorkoutLog | null;
};

export type CreateWorkoutInput = {
  week: number;
  day: number;
  sortOrder?: number;
  title: string;
  notes?: string;
  videoUrl?: string | null;
  segments?: WorkoutSegment[];
};

export type CreateBlockInput = {
  title: string;
  notes?: string;
  durationWeeks?: number;
  workouts: CreateWorkoutInput[];
};

export type LogWorkoutInput = {
  weight?: string | null;
  reps?: string | null;
  score?: string | null;
  notes?: string;
  completed?: boolean;
};

export function isCoachRole(role: UserRole): boolean {
  return role === "owner" || role === "auditor";
}

export function validateCreateBlock(input: CreateBlockInput): string[] {
  const errors: string[] = [];
  if (!input.title?.trim()) errors.push("A block title is required.");
  const weeks = input.durationWeeks ?? 6;
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 12) {
    errors.push("Duration must be a whole number of weeks from 1 to 12.");
  }
  if (!Array.isArray(input.workouts) || input.workouts.length === 0) {
    errors.push("Add at least one workout to the block.");
    return errors;
  }
  input.workouts.forEach((workout, index) => {
    const label = `Workout ${index + 1}`;
    if (!workout.title?.trim()) errors.push(`${label} needs a title.`);
    if (!Number.isInteger(workout.week) || workout.week < 1 || workout.week > weeks) {
      errors.push(`${label} week must be between 1 and ${weeks}.`);
    }
    if (!Number.isInteger(workout.day) || workout.day < 1 || workout.day > 7) {
      errors.push(`${label} day must be between 1 and 7.`);
    }
  });
  return errors;
}

function segment(
  name: string,
  prescription: string,
  notes?: string,
  videoUrl?: string,
): WorkoutSegment {
  return { name, prescription, notes, videoUrl };
}

/** Seeded 6-week Ajax block assigned to member@ajax.local in mock + SQL seed. */
export const DEMO_BLOCK: {
  title: string;
  notes: string;
  durationWeeks: number;
  workouts: CreateWorkoutInput[];
} = {
  title: "Ajax Foundation — 6 weeks",
  notes:
    "A first custom block: three sessions a week, strength plus easy aerobic work. Load only when the movement stays quiet and controlled.",
  durationWeeks: 6,
  workouts: [
    {
      week: 1,
      day: 1,
      title: "Lower body — settle the pattern",
      notes: "Find depth and a still torso before you chase load. Leave two reps in reserve.",
      videoUrl: "https://www.youtube.com/watch?v=MxsSz_VZ4p4",
      segments: [
        segment("Goblet squat", "3 × 8", "Pause one breath at the bottom.", "https://www.youtube.com/watch?v=MxsSz_VZ4p4"),
        segment("Romanian deadlift", "3 × 6", "Soft knees, long spine."),
        segment("Calf raise", "2 × 12"),
      ],
    },
    {
      week: 1,
      day: 3,
      title: "Upper body — press and pull",
      notes: "Even tempo. Stop the set when the shoulder shrug starts to take over.",
      segments: [
        segment("Dumbbell bench press", "3 × 8"),
        segment("Chest-supported row", "3 × 8"),
        segment("Half-kneeling press", "2 × 8 / side"),
      ],
    },
    {
      week: 1,
      day: 5,
      title: "Easy aerobic + mobility",
      notes: "Conversational pace. This is recovery you can still feel proud of.",
      videoUrl: "https://www.youtube.com/watch?v=L_xrDAtykMI",
      segments: [
        segment("Zone 2", "30–40 min walk, bike, or ski-erg"),
        segment("Hip 90/90", "2 × 45s / side"),
      ],
    },
    {
      week: 2,
      day: 1,
      title: "Lower body — add a little load",
      notes: "Same patterns as week 1. A small jump in weight is enough.",
      segments: [
        segment("Goblet squat", "3 × 8"),
        segment("Romanian deadlift", "3 × 6"),
        segment("Split squat", "2 × 8 / side"),
      ],
    },
    {
      week: 2,
      day: 3,
      title: "Upper body — clean positions",
      notes: "Keep the ribs stacked. Do not chase a pump.",
      segments: [
        segment("Dumbbell bench press", "3 × 8"),
        segment("Chest-supported row", "3 × 10"),
        segment("Face pull", "2 × 12"),
      ],
    },
    {
      week: 2,
      day: 5,
      title: "Easy aerobic + walk-out",
      notes: "Same zone 2 as week 1. Finish with unhurried breathing.",
      segments: [
        segment("Zone 2", "35–45 min"),
        segment("Couch stretch", "2 × 40s / side"),
      ],
    },
    {
      week: 3,
      day: 1,
      title: "Lower body — density",
      notes: "Shorter rests if the last set still looks like the first.",
      segments: [
        segment("Front-loaded squat", "4 × 6"),
        segment("Hip hinge", "3 × 6"),
        segment("Calf raise", "3 × 10"),
      ],
    },
    {
      week: 3,
      day: 3,
      title: "Upper body — denser sets",
      notes: "One extra working set. Form still wins.",
      segments: [
        segment("Dumbbell bench press", "4 × 6"),
        segment("Single-arm row", "3 × 8 / side"),
        segment("Half-kneeling press", "3 × 6 / side"),
      ],
    },
    {
      week: 3,
      day: 5,
      title: "Aerobic — slightly longer",
      notes: "Stay conversational. If you cannot speak a sentence, ease off.",
      segments: [segment("Zone 2", "40–50 min"), segment("World's greatest stretch", "2 / side")],
    },
    {
      week: 4,
      day: 1,
      title: "Lower body — strength emphasis",
      notes: "Top sets at a true 7/10 effort. No grinding.",
      segments: [
        segment("Squat pattern", "4 × 5"),
        segment("Romanian deadlift", "3 × 5"),
        segment("Cossack squat", "2 × 6 / side"),
      ],
    },
    {
      week: 4,
      day: 3,
      title: "Upper body — strength emphasis",
      notes: "Pause the last rep of each set on the chest or at the hang.",
      segments: [
        segment("Press", "4 × 5"),
        segment("Row", "4 × 6"),
        segment("Carry", "2 × 30m"),
      ],
    },
    {
      week: 4,
      day: 5,
      title: "Easy aerobic — keep the week honest",
      notes: "Do not turn this into intervals.",
      segments: [segment("Zone 2", "40 min"), segment("Ankle rocks", "2 × 10 / side")],
    },
    {
      week: 5,
      day: 1,
      title: "Lower body — power without chaos",
      notes: "Crisp reps. Stop before the landing gets loud.",
      segments: [
        segment("Squat pattern", "3 × 5"),
        segment("Box step-up", "3 × 5 / side"),
        segment("Broad jump (soft)", "3 × 3"),
      ],
    },
    {
      week: 5,
      day: 3,
      title: "Upper body — press, pull, carry",
      notes: "A little more snap, same control.",
      segments: [
        segment("Press", "3 × 5"),
        segment("Row", "3 × 6"),
        segment("Farmer carry", "3 × 30m"),
      ],
    },
    {
      week: 5,
      day: 5,
      title: "Aerobic — steady",
      notes: "Same easy pace. This week is about arriving recovered.",
      segments: [segment("Zone 2", "40–45 min"), segment("Breathing reset", "5 min nasal, slow")],
    },
    {
      week: 6,
      day: 1,
      title: "Lower body — settle and note",
      notes: "Repeat a week-4 load if it still feels quiet. Write down what moved well.",
      segments: [
        segment("Squat pattern", "3 × 5"),
        segment("Hinge", "3 × 5"),
        segment("Calf raise", "2 × 12"),
      ],
    },
    {
      week: 6,
      day: 3,
      title: "Upper body — settle and note",
      notes: "Same idea as Tuesday. This is a checkpoint, not a test day.",
      segments: [
        segment("Press", "3 × 5"),
        segment("Row", "3 × 6"),
        segment("Carry", "2 × 30m"),
      ],
    },
    {
      week: 6,
      day: 5,
      title: "Easy finish",
      notes: "Walk, breathe, write a short note for your coach. The next block starts from here.",
      segments: [segment("Zone 2", "30–40 min"), segment("Full-body mobility", "8–10 min")],
    },
  ],
};

export const DEMO_MEMBER_EMAIL = "member@ajax.local";
