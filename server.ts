import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("workout.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    age INTEGER,
    weight REAL,
    height REAL
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER,
    name TEXT NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight REAL,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes (Simple for demo/project purposes)
  app.post("/api/auth/signup", (req, res) => {
    const { username, password } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, password);
      res.status(201).json({ id: info.lastInsertRowid, username });
    } catch (error) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/profile", (req, res) => {
    const { userId, age, weight, height } = req.body;
    try {
      db.prepare("UPDATE users SET age = ?, weight = ?, height = ? WHERE id = ?").run(age, weight, height, userId);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // API Routes (User-specific)
  app.get("/api/workouts", (req, res) => {
    const userId = req.query.userId;
    const workouts = db.prepare("SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC").all(userId);
    const workoutsWithExercises = workouts.map((workout: any) => {
      const exercises = db.prepare("SELECT * FROM exercises WHERE workout_id = ?").all(workout.id);
      return { ...workout, exercises };
    });
    res.json(workoutsWithExercises);
  });

  app.post("/api/workouts", (req, res) => {
    const { userId, name, notes, exercises } = req.body;
    
    const insertWorkout = db.prepare("INSERT INTO workouts (user_id, name, notes) VALUES (?, ?, ?)");
    const insertExercise = db.prepare("INSERT INTO exercises (workout_id, name, sets, reps, weight) VALUES (?, ?, ?, ?, ?)");

    const transaction = db.transaction((workoutData: any) => {
      const info = insertWorkout.run(userId, workoutData.name, workoutData.notes);
      const workoutId = info.lastInsertRowid;
      
      for (const ex of workoutData.exercises) {
        insertExercise.run(workoutId, ex.name, ex.sets, ex.reps, ex.weight);
      }
      return workoutId;
    });

    try {
      const workoutId = transaction({ name, notes, exercises });
      res.status(201).json({ id: workoutId, message: "Workout saved successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save workout" });
    }
  });

  app.delete("/api/workouts/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM workouts WHERE id = ?").run(id);
      res.json({ message: "Workout deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete workout" });
    }
  });

  app.get("/api/stats", (req, res) => {
    const userId = req.query.userId;
    // Get last 6 days of workout volume
    const stats = db.prepare(`
      SELECT date(date) as day, SUM(sets * reps * weight) as volume
      FROM exercises
      JOIN workouts ON exercises.workout_id = workouts.id
      WHERE workouts.user_id = ? AND date >= date('now', '-6 days')
      GROUP BY day
      ORDER BY day ASC
    `).all(userId);
    res.json(stats);
  });

  const MUSCLE_MAPPING: { [key: string]: string[] } = {
    'bench press': ['Chest', 'Shoulders', 'Arms'],
    'squat': ['Legs', 'Core'],
    'deadlift': ['Back', 'Legs', 'Core'],
    'pull up': ['Back', 'Arms'],
    'overhead press': ['Shoulders', 'Arms'],
    'bicep curl': ['Arms'],
    'tricep extension': ['Arms'],
    'leg press': ['Legs'],
    'lat pulldown': ['Back', 'Arms'],
    'row': ['Back', 'Arms'],
    'plank': ['Core'],
    'push up': ['Chest', 'Shoulders', 'Arms'],
    'lunges': ['Legs'],
  };

  app.get("/api/plateaus", (req, res) => {
    const userId = req.query.userId;
    
    // Get all unique exercises for this user
    const exercises = db.prepare(`
      SELECT DISTINCT exercises.name 
      FROM exercises 
      JOIN workouts ON exercises.workout_id = workouts.id 
      WHERE workouts.user_id = ?
    `).all(userId);

    const plateaus = [];

    for (const ex of exercises as any) {
      // Get max weight for this exercise per week for the last 4 weeks
      const history = db.prepare(`
        SELECT 
          strftime('%W', workouts.date) as week,
          MAX(exercises.weight) as max_weight
        FROM exercises
        JOIN workouts ON exercises.workout_id = workouts.id
        WHERE workouts.user_id = ? AND exercises.name = ?
        GROUP BY week
        ORDER BY week DESC
        LIMIT 4
      `).all(userId, ex.name);

      if (history.length >= 3) {
        const weights = history.map((h: any) => h.max_weight);
        // Check if weight has not increased for 3 weeks
        let stalled = true;
        for (let i = 0; i < weights.length - 1; i++) {
          if (weights[i] > weights[i+1]) {
            stalled = false;
            break;
          }
        }

        if (stalled) {
          plateaus.push({
            exerciseName: ex.name,
            lastWeight: weights[0],
            weeksStalled: history.length - 1,
            suggestion: `Try reducing weight by 10% and focusing on explosive tempo, or switch to a similar exercise like ${ex.name.includes('bench') ? 'Dumbbell Press' : 'Variations'} for 2 weeks.`
          });
        }
      }
    }

    res.json(plateaus);
  });

  app.get("/api/recovery", (req, res) => {
    const userId = req.query.userId;
    const muscles = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
    const recoveryData = muscles.map(muscle => {
      // Get volume for this muscle in the last 72 hours
      const recentWorkouts = db.prepare(`
        SELECT exercises.name, exercises.sets, exercises.reps, exercises.weight, workouts.date
        FROM exercises
        JOIN workouts ON exercises.workout_id = workouts.id
        WHERE workouts.user_id = ? AND workouts.date >= date('now', '-3 days')
      `).all(userId);

      let muscleVolume = 0;
      for (const workout of recentWorkouts as any) {
        const mappedMuscles = MUSCLE_MAPPING[workout.name.toLowerCase()] || [];
        if (mappedMuscles.includes(muscle)) {
          muscleVolume += workout.sets * workout.reps * workout.weight;
        }
      }

      // Simple recovery logic: 
      // 0 volume = 100% recovered
      // High volume = lower recovery
      // This is a simplified model for the demo
      const maxVolumeThreshold = 5000; // Arbitrary threshold for "heavy" work
      let recoveryPercentage = Math.max(0, 100 - (muscleVolume / maxVolumeThreshold) * 100);
      
      let status: 'Overtrained' | 'Recovering' | 'Ready' = 'Ready';
      if (recoveryPercentage < 30) status = 'Overtrained';
      else if (recoveryPercentage < 80) status = 'Recovering';

      return {
        muscle,
        recoveryPercentage: Math.round(recoveryPercentage),
        status
      };
    });

    res.json(recoveryData);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
