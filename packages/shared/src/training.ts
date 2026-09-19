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

