"use client";

import WorkoutLogger from "@/components/WorkoutLogger";

export default function NewWorkoutPage() {
  return (
    <WorkoutLogger routineId={null} routineName="Workout" initialExercises={[]} />
  );
}
