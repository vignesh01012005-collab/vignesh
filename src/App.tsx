import { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  History, 
  LayoutDashboard, 
  Plus, 
  Sparkles, 
  Trash2, 
  ChevronRight,
  Calendar,
  Weight,
  Repeat,
  X,
  User as UserIcon,
  LogOut,
  Bell,
  Info,
  CheckCircle2,
  AlertCircle,
  Timer,
  Activity,
  Zap,
  Flame,
  ArrowRight
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import { Workout, Exercise, VolumeStat, User } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize AI with support for both local (.env) and preview environments
const getApiKey = () => {
  // @ts-ignore - Try Vite's local env first
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (viteKey && viteKey !== "MY_GEMINI_API_KEY") return viteKey;
  
  // Fallback to platform's process.env (for preview)
  try {
    // @ts-ignore
    const processKey = process.env.GEMINI_API_KEY;
    if (processKey) return processKey;
  } catch {}
  
  return "";
};

// @ts-ignore
const ai = new GoogleGenAI({ apiKey: getApiKey() || "" });

// Notification System
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'history' | 'ai' | 'profile' | 'plan'>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<VolumeStat[]>([]);
  const [plateaus, setPlateaus] = useState<any[]>([]);
  const [recovery, setRecovery] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  const fetchWorkouts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/workouts?userId=${user.id}`);
      const data = await res.json();
      setWorkouts(data);
    } catch (err) {
      console.error("Failed to fetch workouts", err);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/stats?userId=${user.id}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchPlateaus = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/plateaus?userId=${user.id}`);
      const data = await res.json();
      setPlateaus(data);
    } catch (err) {
      console.error("Failed to fetch plateaus", err);
    }
  };

  const fetchRecovery = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/recovery?userId=${user.id}`);
      const data = await res.json();
      setRecovery(data);
    } catch (err) {
      console.error("Failed to fetch recovery", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkouts();
      fetchStats();
      fetchPlateaus();
      fetchRecovery();
    }
  }, [user]);

  const deleteWorkout = async (id: number) => {
    if (!confirm("Are you sure you want to delete this workout?")) return;
    try {
      await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
      addNotification("Workout deleted successfully", "success");
      fetchWorkouts();
      fetchStats();
    } catch (err) {
      addNotification("Failed to delete workout", "error");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
    addNotification("Logged out successfully");
  };

  if (!user) {
    return <AuthScreen onLogin={setUser} addNotification={addNotification} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50">
      {/* Notifications Overlay */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto min-w-[250px]",
                n.type === 'success' ? "bg-emerald-500 text-white" : 
                n.type === 'error' ? "bg-red-500 text-white" : "bg-zinc-800 text-white"
              )}
            >
              {n.type === 'success' && <CheckCircle2 size={18} />}
              {n.type === 'error' && <AlertCircle size={18} />}
              {n.type === 'info' && <Info size={18} />}
              <span className="text-sm font-medium">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-white border-b md:border-r border-zinc-200 p-4 flex md:flex-col gap-2 sticky top-0 z-50">
        <div className="hidden md:flex items-center gap-2 px-2 mb-8">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <Dumbbell className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">FitTrack Pro</span>
        </div>

        <NavItem 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
        />
        <NavItem 
          active={activeTab === 'log'} 
          onClick={() => setActiveTab('log')}
          icon={<Plus size={20} />}
          label="Log Workout"
        />
        <NavItem 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<History size={20} />}
          label="History"
        />
        <NavItem 
          active={activeTab === 'ai'} 
          onClick={() => setActiveTab('ai')}
          icon={<Sparkles size={20} />}
          label="AI Coach"
        />
        <NavItem 
          active={activeTab === 'plan'} 
          onClick={() => setActiveTab('plan')}
          icon={<Calendar size={20} />}
          label="My Plan"
        />
        <NavItem 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')}
          icon={<UserIcon size={20} />}
          label="Profile"
        />

        <div className="mt-auto hidden md:block pt-4 border-t border-zinc-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all w-full font-medium"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Hello, {user.username}!</h1>
                  <p className="text-zinc-500">Here's your progress over the last 6 days.</p>
                </div>
                <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                  <span className="text-emerald-700 font-semibold text-sm">6-Day View</span>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label="Total Workouts" 
                  value={workouts.length.toString()} 
                  subValue="All time"
                  icon={<Calendar className="text-emerald-500" />}
                />
                <StatCard 
                  label="Avg. Volume" 
                  value={stats.length > 0 ? Math.round(stats.reduce((acc, s) => acc + s.volume, 0) / stats.length).toLocaleString() : "0"} 
                  subValue="kg per session"
                  icon={<Weight className="text-blue-500" />}
                />
                <StatCard 
                  label="Consistency" 
                  value={`${Math.min(100, Math.round((stats.length / 6) * 100))}%`} 
                  subValue="Last 6 days"
                  icon={<Repeat className="text-purple-500" />}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecoveryHeatmap recovery={recovery} />
                <PlateauAlerts plateaus={plateaus} />
              </div>

              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <h3 className="text-lg font-semibold mb-6">6-Day Volume Progress (kg)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats}>
                      <defs>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#71717a', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#71717a', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorVolume)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="text-emerald-600 text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                <div className="space-y-3">
                  {workouts.slice(0, 3).map((w) => (
                    <div key={w.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{w.name}</h4>
                        <p className="text-xs text-zinc-500">{new Date(w.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{w.exercises.length} Exercises</p>
                        <p className="text-xs text-zinc-400">{w.exercises.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0).toLocaleString()} kg total</p>
                      </div>
                    </div>
                  ))}
                  {workouts.length === 0 && (
                    <div className="text-center py-12 bg-zinc-100/50 rounded-2xl border border-dashed border-zinc-300">
                      <p className="text-zinc-500">No workouts logged yet. Start your journey!</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'log' && (
            <WorkoutForm 
              userId={user.id}
              onSuccess={() => {
                addNotification("Workout saved!", "success");
                fetchWorkouts();
                fetchStats();
                setActiveTab('dashboard');
              }} 
            />
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <header>
                <h1 className="text-3xl font-bold tracking-tight">Workout History</h1>
                <p className="text-zinc-500">A detailed log of all your past sessions.</p>
              </header>

              <div className="space-y-4">
                {workouts.map((w) => (
                  <div key={w.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{w.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(w.date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Weight size={14} /> {w.exercises.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0).toLocaleString()} kg</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => w.id && deleteWorkout(w.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-zinc-400 text-left">
                            <th className="pb-2 font-medium">Exercise</th>
                            <th className="pb-2 font-medium">Sets</th>
                            <th className="pb-2 font-medium">Reps</th>
                            <th className="pb-2 font-medium">Weight</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {w.exercises.map((ex, idx) => (
                            <tr key={idx}>
                              <td className="py-2 font-medium">{ex.name}</td>
                              <td className="py-2">{ex.sets}</td>
                              <td className="py-2">{ex.reps}</td>
                              <td className="py-2">{ex.weight} kg</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {w.notes && (
                        <div className="mt-4 p-3 bg-zinc-50 rounded-lg text-sm text-zinc-600 italic">
                          "{w.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'ai' && <AICoach />}
          {activeTab === 'plan' && <PersonalizedPlan user={user} />}
          {activeTab === 'profile' && <Profile user={user} onUpdate={setUser} addNotification={addNotification} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AuthScreen({ onLogin, addNotification }: { onLogin: (u: User) => void, addNotification: (m: string, t?: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data);
        addNotification(isLogin ? "Welcome back!" : "Account created successfully!", "success");
      } else {
        addNotification(data.error || "Authentication failed", "error");
      }
    } catch (err) {
      addNotification("Network error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-xl max-w-md w-full"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500 p-4 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
            <Dumbbell className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FitTrack Pro</h1>
          <p className="text-zinc-500 text-sm">Your personal fitness companion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Username</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {isLoading ? "Please wait..." : (isLogin ? "Login" : "Sign Up")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-600 text-sm font-medium hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Profile({ user, onUpdate, addNotification }: { user: User, onUpdate: (u: User) => void, addNotification: (m: string, t?: any) => void }) {
  const [age, setAge] = useState(user.age || 0);
  const [weight, setWeight] = useState(user.weight || 0);
  const [height, setHeight] = useState(user.height || 0);
  const [isUpdating, setIsUpdating] = useState(false);

  // BMI Calculation: weight (kg) / [height (m)]^2
  const bmi = height > 0 ? (weight / ((height / 100) ** 2)).toFixed(1) : "0";
  
  // BMR Calculation (Mifflin-St Jeor Equation) - Simplified for demo
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, age, weight, height })
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate(data);
        addNotification("Profile updated successfully", "success");
      }
    } catch (err) {
      addNotification("Failed to update profile", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-zinc-500">Manage your physical stats and health metrics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Health Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
              <span className="text-zinc-500 text-sm">BMI</span>
              <span className="font-bold text-xl">{bmi}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
              <span className="text-zinc-500 text-sm">Est. BMR</span>
              <span className="font-bold text-xl">{Math.round(bmr)} kcal</span>
            </div>
            <p className="text-[10px] text-zinc-400 italic">
              * Calculations are estimates based on standard formulas.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold mb-2">Update Stats</h3>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Age</label>
            <input 
              type="number" 
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              value={age}
              onChange={e => setAge(parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Weight (kg)</label>
            <input 
              type="number" 
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              value={weight}
              onChange={e => setWeight(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Height (cm)</label>
            <input 
              type="number" 
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              value={height}
              onChange={e => setHeight(parseFloat(e.target.value) || 0)}
            />
          </div>
          <button 
            type="submit"
            disabled={isUpdating}
            className="w-full bg-emerald-500 text-white py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {isUpdating ? "Updating..." : "Save Changes"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
        active 
          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" 
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function StatCard({ label, value, subValue, icon }: { label: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-zinc-500 text-sm font-medium">{label}</span>
        <div className="p-2 bg-zinc-50 rounded-lg">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        <span className="text-zinc-400 text-xs">{subValue}</span>
      </div>
    </div>
  );
}

function RecoveryHeatmap({ recovery }: { recovery: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="text-emerald-500" size={20} />
          Recovery Heatmap
        </h3>
        <div className="text-[10px] uppercase font-bold text-zinc-400">Last 72 Hours</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {recovery.map((r, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-zinc-700">{r.muscle}</span>
              <span className={cn(
                "font-bold",
                r.status === 'Ready' ? "text-emerald-500" : 
                r.status === 'Recovering' ? "text-orange-500" : "text-red-500"
              )}>{r.recoveryPercentage}%</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${r.recoveryPercentage}%` }}
                className={cn(
                  "h-full transition-all duration-1000",
                  r.status === 'Ready' ? "bg-emerald-500" : 
                  r.status === 'Recovering' ? "bg-orange-500" : "bg-red-500"
                )}
              />
            </div>
            <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
              {r.status}
            </div>
          </div>
        ))}
        {recovery.length === 0 && (
          <div className="col-span-2 text-center py-8 text-zinc-400 text-sm">
            Log workouts to see recovery data
          </div>
        )}
      </div>
    </div>
  );
}

function PlateauAlerts({ plateaus }: { plateaus: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="text-orange-500" size={20} />
          Plateau Buster
        </h3>
        <div className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-bold">
          {plateaus.length} Alerts
        </div>
      </div>

      <div className="space-y-4">
        {plateaus.map((p, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl space-y-2"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-orange-900">{p.exerciseName}</h4>
              <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                Stalled {p.weeksStalled} Weeks
              </span>
            </div>
            <p className="text-xs text-orange-800 leading-relaxed">
              {p.suggestion}
            </p>
          </motion.div>
        ))}
        {plateaus.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-emerald-500" size={24} />
            </div>
            <p className="text-zinc-500 text-sm">No plateaus detected. Keep pushing!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkoutForm({ userId, onSuccess }: { userId: number, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: 3, reps: 10, weight: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 10, weight: 0 }]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setExercises(newExercises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || exercises.some(ex => !ex.name)) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, notes, exercises })
      });
      if (res.ok) onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Log Workout</h1>
        <p className="text-zinc-500">Record your session details below.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Workout Name</label>
            <input 
              type="text" 
              placeholder="e.g. Upper Body Power"
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Notes (Optional)</label>
            <textarea 
              placeholder="How did you feel?"
              className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all min-h-[80px]"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Exercises</h3>
            <button 
              type="button"
              onClick={addExercise}
              className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors"
            >
              <Plus size={16} /> Add Exercise
            </button>
          </div>

          {exercises.map((ex, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm relative group">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">Name</label>
                  <input 
                    type="text" 
                    placeholder="Exercise"
                    className="w-full px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100 focus:border-emerald-500 outline-none text-sm"
                    value={ex.name}
                    onChange={e => updateExercise(idx, 'name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">Sets</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100 focus:border-emerald-500 outline-none text-sm"
                    value={ex.sets}
                    onChange={e => updateExercise(idx, 'sets', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">Reps</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100 focus:border-emerald-500 outline-none text-sm"
                    value={ex.reps}
                    onChange={e => updateExercise(idx, 'reps', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">Weight (kg)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    className="w-full px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100 focus:border-emerald-500 outline-none text-sm"
                    value={ex.weight}
                    onChange={e => updateExercise(idx, 'weight', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              {exercises.length > 1 && (
                <button 
                  type="button"
                  onClick={() => removeExercise(idx)}
                  className="absolute -right-2 -top-2 bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save Workout"}
        </button>
      </form>
    </motion.div>
  );
}

function AICoach() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAdvice = async () => {
    if (!prompt) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      alert("API Key is missing.");
      return;
    }
    setIsGenerating(true);
    setResponse(null);
    
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: `You are a professional fitness and nutrition coach. The user wants advice on: "${prompt}".
        
        CRITICAL INSTRUCTIONS:
        1. If the user asks for a diet, meal, or nutrition plan, you MUST generate a complete plan with SPECIFIC FOOD NAMES (e.g., "Grilled Chicken", "Oatmeal with Blueberries", "Greek Yogurt"). Do NOT give generic advice like "eat more protein".
        2. Provide a highly structured response using the schema below.
        3. Use tables for workout splits and daily meal plans.
        
        Schema Requirements:
        - title: A catchy title.
        - summary: A brief overview.
        - sections: Array of content blocks.
        - Each section MUST have a 'heading' and a 'format' ("table", "list", or "text").
        - If format is "table", provide 'tableData' with 'headers' and 'rows'.
        - If format is "list", provide 'listData' (array of strings).
        - If format is "text", provide 'textData' (string).` }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    heading: { type: Type.STRING },
                    format: { type: Type.STRING },
                    tableData: {
                      type: Type.OBJECT,
                      properties: {
                        headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rows: { type: Type.ARRAY, items: { type: Type.OBJECT } }
                      }
                    },
                    listData: { type: Type.ARRAY, items: { type: Type.STRING } },
                    textData: { type: Type.STRING }
                  },
                  required: ["heading", "format"]
                }
              }
            },
            required: ["title", "summary", "sections"]
          }
        }
      });

      const data = JSON.parse(result.text || "{}");
      setResponse(data);
    } catch (err) {
      console.error("AI Coach Error:", err);
      // Fallback to simple text if JSON fails
      setResponse({
        title: "Coach Advice",
        summary: "I encountered an error generating the structured view, but here is the raw advice.",
        sections: [{ heading: "Advice", format: "text", textData: "Please try a different prompt or check your connection." }]
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          AI Fitness & Nutrition Coach <Sparkles className="text-emerald-500" />
        </h1>
        <p className="text-zinc-500">Get structured workout plans and diet advice instantly.</p>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {['Full Body Workout', 'Keto Diet Plan', 'Leg Day Routine', 'High Protein Snacks'].map(tag => (
            <button 
              key={tag}
              onClick={() => setPrompt(`Generate a ${tag}`)}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
        <textarea 
          placeholder="Ask anything... e.g. 'Create a 3-day muscle building split' or 'Suggest a healthy breakfast for weight loss'"
          className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all min-h-[100px]"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        <button 
          onClick={generateAdvice}
          disabled={isGenerating || !prompt}
          className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
        >
          {isGenerating ? "Coach is thinking..." : <><Sparkles size={18} /> Get Structured Advice</>}
        </button>
      </div>

      {isGenerating && (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-64 bg-zinc-200 rounded-lg"></div>
          <div className="h-32 w-full bg-zinc-100 rounded-2xl"></div>
        </div>
      )}

      {response && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900">{response.title}</h2>
            <p className="text-zinc-500 leading-relaxed">{response.summary}</p>
          </div>

          {response.sections.map((section: any, sIdx: number) => (
            <div key={sIdx} className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100">
                <h3 className="font-bold text-zinc-800">{section.heading}</h3>
              </div>
              <div className="p-6">
                {section.format === 'table' && section.tableData && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-zinc-400 border-b border-zinc-100">
                          {section.tableData.headers.map((h: string) => (
                            <th key={h} className="pb-3 px-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {section.tableData.rows.map((row: any, rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-zinc-50/50 transition-colors">
                            {section.tableData.headers.map((h: string) => (
                              <td key={h} className="py-4 px-2 text-sm text-zinc-700 font-medium">
                                {row[h]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {section.format === 'list' && section.listData && (
                  <ul className="space-y-3">
                    {section.listData.map((item: string, iIdx: number) => (
                      <li key={iIdx} className="flex items-start gap-3 text-sm text-zinc-600">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {section.format === 'text' && section.textData && (
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {section.textData}
                  </p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function PersonalizedPlan({ user }: { user: User }) {
  const [plan, setPlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePlan = async () => {
    if (!user.age || !user.weight) {
      alert("Please update your Age and Weight in the Profile tab first!");
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      alert("API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file and restart the server.");
      return;
    }

    setIsGenerating(true);
    setPlan(null);
    
    const prompt = `
      You are a professional fitness trainer.
      Based on the user's age and weight, create a structured 6-day weekly workout plan.
      
      User Information:
      Age: ${user.age}
      Weight: ${user.weight} kg
      
      Requirements:
      - Plan must be safe and suitable for beginners.
      - Focus on fat loss, strength, and mobility.
      - Each day should target different muscle groups.
      - Include: Warm-up, Workout exercises, Sets and reps, Rest time, Cool down.
      
      Weekly Split Example:
      Day 1 – Full Body, Day 2 – Upper Body, Day 3 – Cardio + Core, Day 4 – Lower Body, Day 5 – Strength Training, Day 6 – HIIT or Cardio, Day 7 – Rest.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              weeklyPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING, description: "e.g. Day 1" },
                    focus: { type: Type.STRING, description: "e.g. Full Body" },
                    warmup: { type: Type.STRING },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          sets: { type: Type.STRING },
                          reps: { type: Type.STRING },
                          rest: { type: Type.STRING }
                        },
                        required: ["name", "sets", "reps", "rest"]
                      }
                    },
                    cooldown: { type: Type.STRING }
                  },
                  required: ["day", "focus", "warmup", "exercises", "cooldown"]
                }
              }
            },
            required: ["weeklyPlan"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setPlan(result);
    } catch (err) {
      console.error("Personalized Plan Error:", err);
      alert("Error generating your personalized plan. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getDayIcon = (focus: string) => {
    const f = focus.toLowerCase();
    if (f.includes('cardio') || f.includes('hiit')) return <Flame className="text-orange-500" />;
    if (f.includes('strength') || f.includes('body')) return <Dumbbell className="text-emerald-500" />;
    if (f.includes('core')) return <Zap className="text-yellow-500" />;
    if (f.includes('rest')) return <Repeat className="text-zinc-400" />;
    return <Activity className="text-blue-500" />;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personalized 6-Day Plan</h1>
          <p className="text-zinc-500">Customized for Age: {user.age} | Weight: {user.weight}kg</p>
        </div>
        <button 
          onClick={generatePlan} 
          disabled={isGenerating}
          className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Sparkles size={20} />
          {isGenerating ? "Creating Plan..." : "Generate My Plan"}
        </button>
      </div>

      {!plan && !isGenerating && (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-zinc-300 text-center space-y-4">
          <div className="bg-zinc-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">No Plan Generated Yet</h3>
          <p className="text-zinc-500 max-w-xs mx-auto">Click the button above to create a custom 6-day workout routine based on your body metrics.</p>
        </div>
      )}

      {isGenerating && (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-zinc-200 animate-pulse space-y-4">
              <div className="h-6 w-32 bg-zinc-100 rounded"></div>
              <div className="h-20 w-full bg-zinc-50 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {plan && plan.weeklyPlan && (
        <div className="space-y-8 pb-12">
          {plan.weeklyPlan.map((dayPlan: any, idx: number) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-zinc-100">
                    {getDayIcon(dayPlan.focus)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{dayPlan.day}</h3>
                    <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{dayPlan.focus}</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-zinc-400 text-xs font-medium">
                  <Timer size={14} />
                  <span>~45-60 mins</span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Warm-up</span>
                    <p className="text-sm text-emerald-900">{dayPlan.warmup}</p>
                  </div>
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1">Cool-down</span>
                    <p className="text-sm text-blue-900">{dayPlan.cooldown}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 border-b border-zinc-100">
                        <th className="pb-3 pl-2">Exercise</th>
                        <th className="pb-3">Sets</th>
                        <th className="pb-3">Reps</th>
                        <th className="pb-3">Rest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {dayPlan.exercises.map((ex: any, eIdx: number) => (
                        <tr key={eIdx} className="group hover:bg-zinc-50/50 transition-colors">
                          <td className="py-4 pl-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                <ArrowRight size={14} />
                              </div>
                              <span className="font-semibold text-zinc-800">{ex.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-zinc-600 font-medium">{ex.sets}</td>
                          <td className="py-4 text-zinc-600 font-medium">{ex.reps}</td>
                          <td className="py-4">
                            <span className="px-2 py-1 bg-zinc-100 rounded-md text-[10px] font-bold text-zinc-500">
                              {ex.rest}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
