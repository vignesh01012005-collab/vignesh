export interface User {
  id: number;
  username: string;
  age?: number;
  weight?: number;
  height?: number;
}

export interface Exercise {
  id?: number;
  workout_id?: number;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Workout {
  id?: number;
  user_id?: number;
  date: string;
  name: string;
  notes?: string;
  exercises: Exercise[];
}

export interface VolumeStat {
  day: string;
  volume: number;
}

export interface PlateauInfo {
  exerciseName: string;
  lastWeight: number;
  weeksStalled: number;
  suggestion: string;
}

export interface MuscleRecovery {
  muscle: string;
  recoveryPercentage: number; // 0 to 100
  status: 'Overtrained' | 'Recovering' | 'Ready';
}
