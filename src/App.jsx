import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  CheckCircle2, Circle, Star, Trash2, Pencil, MoreVertical, Plus, Search,
  Calendar as CalendarIcon, BarChart3, Settings as SettingsIcon, LayoutDashboard,
  ListTodo, Clock, Flame, Filter, X, ChevronLeft, ChevronRight, Tag, Bell,
  Menu, ArrowUpRight, Layers, Sparkles, AlertTriangle, ChevronDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from "recharts";

/* ------------------------------------------------------------------ */
/*  DO3 — a futuristic, minimal productivity dashboard                 */
/*  Palette: White #FFFFFF · Black #0A0A0A · Red #E11B23 (accent)      */
/*  Fonts: Space Grotesk (display) · Inter (body) · JetBrains Mono     */
/*  Note: this is delivered as a single-file interactive React         */
/*  artifact (the environment's supported format) rather than a full   */
/*  multi-file Next.js project. All logic is componentized internally  */
/*  so it maps 1:1 onto Navbar/Sidebar/TaskCard/etc. if split later,   */
/*  and state is isolated in one place so a real API/DB is a drop-in.  */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "My Tasks", icon: ListTodo },
  { id: "today", label: "Today", icon: Clock },
  { id: "upcoming", label: "Upcoming", icon: CalendarIcon },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
  { id: "important", label: "Important", icon: Star },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const CATEGORIES = ["Work", "Personal", "Health", "Study", "Errands"];
const PRIORITIES = ["High", "Medium", "Low"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const seedTasks = [];

const WEEKLY_HISTORY = [
  { day: "Mon", done: 4 }, { day: "Tue", done: 6 }, { day: "Wed", done: 3 },
  { day: "Thu", done: 7 }, { day: "Fri", done: 5 }, { day: "Sat", done: 2 }, { day: "Sun", done: 8 },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

function isOverdue(t) {
  if (t.completed) return false;
  return t.dueDate < todayISO();
}

function statusOf(t) {
  if (t.completed) return "Completed";
  if (isOverdue(t)) return "Overdue";
  if (t.important) return "Important";
  return "Pending";
}

/* ------------------------- Circular Progress ------------------------ */
function RadialProgress({ value, size = 96, stroke = 8, label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1a1a1a0d" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#E11B23" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono font-bold text-black" style={{ fontSize: size * 0.22 }}>{Math.round(value)}%</span>
        {label && <span className="text-[10px] uppercase tracking-wider text-black/50">{label}</span>}
      </div>
      {sub}
    </div>
  );
}

/* ------------------------------ CountUp ------------------------------ */
function CountUp({ to, duration = 700, className }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setVal(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span className={className}>{val}</span>;
}

/* ------------------------------ Priority chip ------------------------------ */
function PriorityTag({ priority }) {
  const styles = {
    High: "bg-[#E11B23] text-white",
    Medium: "bg-black text-white",
    Low: "bg-black/[0.06] text-black/70",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function StatusPill({ t }) {
  const s = statusOf(t);
  const map = {
    Completed: "text-black/40 line-through",
    Overdue: "text-[#E11B23]",
    Important: "text-[#E11B23]",
    Pending: "text-black/50",
  };
  const icon = s === "Overdue" ? <AlertTriangle size={11} /> : null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide ${map[s]}`}>
      {icon}{s}
    </span>
  );
}

/* ------------------------------ Task Card ------------------------------ */
function TaskCard({ task, onToggle, onToggleImportant, onDelete, onEdit, index }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const overdue = isOverdue(task);
  return (
    <div
      className={`group relative bg-white rounded-2xl border border-black/[0.07] p-4 sm:p-5 transition-all duration-300
        hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.18)]
        ${task.completed ? "opacity-60" : ""} ${overdue ? "ring-1 ring-[#E11B23]/30" : ""}`}
      style={{ animation: `card-in 420ms cubic-bezier(.22,1,.36,1) both`, animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id)}
          aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
          className="mt-0.5 shrink-0 transition-transform duration-200 active:scale-90"
        >
          {task.completed ? (
            <CheckCircle2 size={22} className="text-[#E11B23]" fill="#E11B2314" />
          ) : (
            <Circle size={22} className="text-black/25 group-hover:text-[#E11B23] transition-colors" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold text-[15px] text-black leading-snug transition-all duration-300 ${task.completed ? "line-through decoration-2 decoration-[#E11B23]/60 text-black/40" : ""}`}>
              {task.title}
            </h4>
            <button
              onClick={() => onToggleImportant(task.id)}
              aria-label="Toggle important"
              className="shrink-0 transition-transform duration-200 hover:scale-110"
            >
              <Star size={17} className={task.important ? "text-[#E11B23]" : "text-black/20"} fill={task.important ? "#E11B23" : "none"} />
            </button>
          </div>
          {task.description && (
            <p className="text-[13px] text-black/50 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <PriorityTag priority={task.priority} />
            <span className="inline-flex items-center gap-1 text-[11px] text-black/45 bg-black/[0.04] px-2 py-0.5 rounded-full">
              <Tag size={10} /> {task.category}
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${overdue ? "text-[#E11B23] bg-[#E11B23]/10" : "text-black/45 bg-black/[0.04]"}`}>
              <Clock size={10} /> {task.dueDate} · {task.dueTime}
            </span>
            <StatusPill t={task} />
          </div>

          {task.subtasks?.length > 0 && (
            <div className="mt-2 text-[11px] text-black/40">{task.subtasks.length} subtask{task.subtasks.length > 1 ? "s" : ""}</div>
          )}
        </div>

        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen((v) => !v)} className="p-1.5 rounded-lg text-black/30 hover:text-black hover:bg-black/[0.05] transition-colors">
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-32 bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden animate-[card-in_180ms_ease-out]">
              <button onClick={() => { onEdit(task); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-black/70 hover:bg-black/[0.04]">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => { onDelete(task.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#E11B23] hover:bg-[#E11B23]/5">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Empty state ------------------------------ */
function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-black/[0.04] flex items-center justify-center mb-3">
        <Sparkles size={22} className="text-black/25" />
      </div>
      <p className="text-sm text-black/40">{text}</p>
    </div>
  );
}

/* ------------------------------ Add/Edit Task Modal ------------------------------ */
function TaskModal({ open, onClose, onSave, initial }) {
  const blank = { title: "", description: "", dueDate: todayISO(), dueTime: "09:00", priority: "Medium", category: "Work", reminder: false, subtasks: [] };
  const [form, setForm] = useState(blank);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : blank);
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    } else {
      setVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  if (!open) return null;

  const addSubtask = () => {
    if (!subtaskDraft.trim()) return;
    setForm((f) => ({ ...f, subtasks: [...f.subtasks, subtaskDraft.trim()] }));
    setSubtaskDraft("");
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ background: "rgba(10,10,10,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl border border-black/10 shadow-2xl max-h-[92vh] overflow-y-auto transition-all duration-300 ${visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-[0.98]"}`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-white/95 backdrop-blur border-b border-black/[0.06] z-10">
          <h3 className="font-display text-xl font-bold text-black">{initial ? "Edit Task" : "New Task"}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/[0.05] text-black/50 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-black/40">Title</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to get done?"
              className="mt-1 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#E11B23]/40 focus:border-[#E11B23] transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-black/40">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add a short description"
              rows={2}
              className="mt-1 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-black resize-none focus:outline-none focus:ring-2 focus:ring-[#E11B23]/40 focus:border-[#E11B23] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-black/40">Due date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#E11B23]/40 focus:border-[#E11B23]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-black/40">Due time</label>
              <input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#E11B23]/40 focus:border-[#E11B23]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-black/40">Priority</label>
              <div className="mt-1 flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button key={p} onClick={() => setForm({ ...form, priority: p })}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all ${form.priority === p ? "bg-black text-white border-black" : "border-black/10 text-black/50 hover:border-black/30"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-black/40">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#E11B23]/40 focus:border-[#E11B23]">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-black/40">Subtasks</label>
            <div className="mt-1 flex gap-2">
              <input
                value={subtaskDraft}
                onChange={(e) => setSubtaskDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                placeholder="Add a subtask"
                className="flex-1 rounded-xl border border-black/10 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E11B23]/40 focus:border-[#E11B23]"
              />
              <button onClick={addSubtask} className="px-3 rounded-xl bg-black text-white text-sm hover:bg-black/85 transition-colors">Add</button>
            </div>
            {form.subtasks.length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.subtasks.map((s, i) => (
                  <li key={i} className="flex items-center justify-between text-[13px] text-black/60 bg-black/[0.03] rounded-lg px-3 py-1.5">
                    {s}
                    <button onClick={() => setForm((f) => ({ ...f, subtasks: f.subtasks.filter((_, idx) => idx !== i) }))} className="text-black/30 hover:text-[#E11B23]">
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.checked })} className="accent-[#E11B23] w-4 h-4" />
            <span className="text-sm text-black/60 flex items-center gap-1.5"><Bell size={13} /> Remind me before due time</span>
          </label>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2 sticky bottom-0 bg-white/95 backdrop-blur">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-black/10 text-black/60 font-semibold text-sm hover:bg-black/[0.04] transition-colors">
            Cancel
          </button>
          <button
            disabled={!form.title.trim()}
            onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-[#E11B23] text-white font-semibold text-sm hover:bg-[#c81620] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#E11B23]/20"
          >
            {initial ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Search + Filter Bar ------------------------------ */
function SearchFilterBar({ query, setQuery, filter, setFilter, sort, setSort }) {
  const filters = ["All", "Active", "Completed", "Important", "Overdue", "High Priority"];
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-5">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E11B23]/30 focus:border-[#E11B23] transition-all"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? "bg-black text-white" : "bg-black/[0.04] text-black/50 hover:bg-black/[0.08]"}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="relative">
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-black/10 bg-white text-xs font-semibold text-black/60 focus:outline-none focus:ring-2 focus:ring-[#E11B23]/30">
          <option value="due">Sort: Due date</option>
          <option value="priority">Sort: Priority</option>
          <option value="recent">Sort: Recently added</option>
          <option value="alpha">Sort: Alphabetical</option>
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
      </div>
    </div>
  );
}

/* ------------------------------ Floating decorative chips (hero) ------------------------------ */
function FloatingChip({ children, className, style, delay = 0 }) {
  return (
    <div
      className={`absolute bg-white/90 backdrop-blur border border-black/[0.06] rounded-2xl shadow-[0_20px_45px_-15px_rgba(0,0,0,0.25)] px-4 py-3 ${className}`}
      style={{ animation: `float-y 6s ease-in-out ${delay}s infinite`, ...style }}
    >
      {children}
    </div>
  );
}

/* ================================================================== */
/*                              MAIN APP                               */
/* ================================================================== */
export default function App() {
  const [tasks, setTasks] = useState(() => {
  try {
    const savedTasks = localStorage.getItem("todo_tasks");
    return savedTasks ? JSON.parse(savedTasks) : seedTasks;
  } catch {
    return seedTasks;
  }
});
  useEffect(() => {
  localStorage.setItem("todo_tasks", JSON.stringify(tasks));
}, [tasks]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("due");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [calMonth, setCalMonth] = useState(new Date());
  const [dailyGoal, setDailyGoal] = useState(8);
  const [weeklyGoal, setWeeklyGoal] = useState(40);
  const heroRef = useRef(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      setParallax({ x, y });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - completedCount;
  const productivity = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const importantCount = tasks.filter((t) => t.important && !t.completed).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const streak = 5;

  const addOrUpdateTask = (form) => {
    if (form.id) {
      setTasks((ts) => ts.map((t) => (t.id === form.id ? { ...t, ...form } : t)));
    } else {
      setTasks((ts) => [{ ...form, id: uid(), important: false, completed: false }, ...ts]);
    }
  };
  const toggleTask = (id) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const toggleImportant = (id) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, important: !t.important } : t)));
  const deleteTask = (id) => setTasks((ts) => ts.filter((t) => t.id !== id));
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };
  const openNew = () => { setEditing(null); setModalOpen(true); };

  const filteredSorted = useMemo(() => {
    let list = [...tasks];

    // tab-level scoping
    if (activeTab === "today") list = list.filter((t) => t.dueDate === todayISO());
    if (activeTab === "upcoming") list = list.filter((t) => t.dueDate > todayISO() && !t.completed);
    if (activeTab === "completed") list = list.filter((t) => t.completed);
    if (activeTab === "important") list = list.filter((t) => t.important);
    if (activeTab === "calendar") list = list.filter((t) => t.dueDate === selectedDate);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }

    if (filter === "Active") list = list.filter((t) => !t.completed);
    if (filter === "Completed") list = list.filter((t) => t.completed);
    if (filter === "Important") list = list.filter((t) => t.important);
    if (filter === "Overdue") list = list.filter(isOverdue);
    if (filter === "High Priority") list = list.filter((t) => t.priority === "High");

    const prioRank = { High: 0, Medium: 1, Low: 2 };
    if (sort === "due") list.sort((a, b) => (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime));
    if (sort === "priority") list.sort((a, b) => prioRank[a.priority] - prioRank[b.priority]);
    if (sort === "alpha") list.sort((a, b) => a.title.localeCompare(b.title));
    // "recent" keeps insertion order (list already newest-first from state)

    return list;
  }, [tasks, activeTab, query, filter, sort, selectedDate]);

  const todaysTasks = tasks.filter((t) => t.dueDate === todayISO());

  /* ----------------------------- Calendar grid data ----------------------------- */
  const calendarDays = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = new Date(y, m, d).toISOString().slice(0, 10);
      cells.push(iso);
    }
    return cells;
  }, [calMonth]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => { (map[t.dueDate] ||= []).push(t); });
    return map;
  }, [tasks]);

  const categoryCounts = useMemo(() => {
    const map = {};
    CATEGORIES.forEach((c) => (map[c] = { total: 0, done: 0 }));
    tasks.forEach((t) => {
      if (!map[t.category]) map[t.category] = { total: 0, done: 0 };
      map[t.category].total++;
      if (t.completed) map[t.category].done++;
    });
    return map;
  }, [tasks]);

  return (
    <div className="min-h-screen w-full bg-white text-black" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes float-y { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
        @keyframes float-slow { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        @keyframes card-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(225,27,35,0.35); } 100% { box-shadow: 0 0 0 14px rgba(225,27,35,0); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        }
      `}</style>

      <div className="flex">
        {/* ---------------- Sidebar (desktop) ---------------- */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-black/[0.06] px-5 py-6">
          <div className="flex items-center gap-2 px-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center">
              <span className="font-display font-bold text-white text-sm">D3</span>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">DO3</span>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active ? "bg-[#E11B23] text-white shadow-lg shadow-[#E11B23]/25" : "text-black/55 hover:bg-black/[0.05] hover:text-black"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="rounded-2xl bg-black text-white p-4 mt-4">
            <div className="flex items-center gap-1.5 text-[#ff5b61] text-xs font-semibold mb-1">
              <Flame size={13} /> {streak} day streak
            </div>
            <p className="text-[11px] text-white/60">Keep it going — complete one more task today.</p>
          </div>
        </aside>

        {/* ---------------- Mobile top bar ---------------- */}
        <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <span className="font-display font-bold text-white text-xs">D3</span>
            </div>
            <span className="font-display font-bold">DO3</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-black/[0.05]">
            <Menu size={20} />
          </button>
        </div>

        {/* ---------------- Mobile drawer ---------------- */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex justify-end" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div onClick={(e) => e.stopPropagation()} className="relative w-64 h-full bg-white p-5 animate-[card-in_250ms_ease-out]">
              <div className="flex items-center justify-between mb-6">
                <span className="font-display font-bold text-lg">Menu</span>
                <button onClick={() => setSidebarOpen(false)}><X size={20} /></button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${active ? "bg-[#E11B23] text-white" : "text-black/60 hover:bg-black/[0.05]"}`}>
                      <Icon size={17} />{item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* ---------------- Main content ---------------- */}
        <main className="flex-1 min-w-0 pt-16 lg:pt-0 pb-24 lg:pb-10 px-4 sm:px-8 lg:px-10">
          {/* Desktop top bar */}
          <div className="hidden lg:flex items-center justify-between py-6">
            <div>
              <p className="text-xs text-black/40 font-mono">{new Date().toDateString()}</p>
              <h2 className="font-display text-xl font-bold capitalize">{NAV_ITEMS.find((n) => n.id === activeTab)?.label}</h2>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-[#E11B23] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#c81620] transition-all hover:-translate-y-0.5 shadow-lg shadow-[#E11B23]/25"
            >
              <Plus size={16} /> Add New Task
            </button>
          </div>

          {/* ===================== DASHBOARD ===================== */}
          {activeTab === "dashboard" && (
            <section>
              <div
                ref={heroRef}
                className="relative overflow-hidden rounded-[2rem] bg-black text-white px-6 sm:px-12 py-14 sm:py-20 mb-10"
              >
                {/* ambient 3D shapes */}
                <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-[#E11B23]/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#E11B23]/10 blur-3xl" />
                <div
                  className="absolute top-10 right-16 w-24 h-24 rounded-3xl border border-white/10"
                  style={{ transform: `translate(${parallax.x * 20}px, ${parallax.y * 20}px) rotate(12deg)`, animation: "float-slow 7s ease-in-out infinite" }}
                />
                <div
                  className="absolute bottom-16 left-10 w-16 h-16 rounded-2xl bg-white/5 border border-white/10"
                  style={{ transform: `translate(${parallax.x * -14}px, ${parallax.y * -14}px)`, animation: "float-slow 8s ease-in-out infinite 1s" }}
                />

                <div className="relative grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#ff5b61] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                      <Sparkles size={12} /> DO3 Productivity OS
                    </span>
                    <h1 className="font-display font-bold text-4xl sm:text-6xl leading-[1.02] mt-5">
                      GET THINGS<br /> <span className="text-[#E11B23]">DONE.</span>
                    </h1>
                    <p className="text-white/60 mt-4 text-base sm:text-lg max-w-md">Turn your plans into progress.</p>
                    <button
                      onClick={openNew}
                      className="mt-8 inline-flex items-center gap-2 bg-[#E11B23] text-white px-6 py-3.5 rounded-2xl font-semibold hover:bg-[#c81620] transition-all hover:-translate-y-0.5"
                      style={{ animation: "pulse-ring 2.4s ease-out infinite" }}
                    >
                      <Plus size={18} /> Add New Task
                    </button>
                  </div>

                  {/* floating dashboard window */}
                  <div className="relative h-[360px] hidden sm:block">
                    <div
                      className="absolute inset-0 bg-white text-black rounded-3xl p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] border border-white/10"
                      style={{ transform: `perspective(1200px) rotateY(${-8 + parallax.x * 6}deg) rotateX(${4 - parallax.y * 6}deg)`, transition: "transform 120ms ease-out" }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-black/40 font-semibold">Today</p>
                          <p className="font-display font-bold text-lg">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
                        </div>
                        <RadialProgress value={productivity} size={64} stroke={6} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-black/[0.04] rounded-xl p-2.5 text-center">
                          <p className="font-mono font-bold text-lg"><CountUp to={tasks.length} /></p>
                          <p className="text-[10px] text-black/40">Tasks</p>
                        </div>
                        <div className="bg-black/[0.04] rounded-xl p-2.5 text-center">
                          <p className="font-mono font-bold text-lg text-[#E11B23]"><CountUp to={completedCount} /></p>
                          <p className="text-[10px] text-black/40">Completed</p>
                        </div>
                        <div className="bg-black/[0.04] rounded-xl p-2.5 text-center">
                          <p className="font-mono font-bold text-lg"><CountUp to={pendingCount} /></p>
                          <p className="text-[10px] text-black/40">Pending</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {todaysTasks.slice(0, 3).map((t) => (
                          <div key={t.id} className="flex items-center gap-2 text-[12px] bg-black/[0.03] rounded-lg px-2.5 py-2">
                            {t.completed ? <CheckCircle2 size={13} className="text-[#E11B23]" /> : <Circle size={13} className="text-black/25" />}
                            <span className={`truncate ${t.completed ? "line-through text-black/35" : "text-black/70"}`}>{t.title}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-[#E11B23] rounded-full transition-all duration-700" style={{ width: `${productivity}%` }} />
                        </div>
                      </div>
                    </div>

                    <FloatingChip className="-top-6 -right-4 text-xs font-semibold flex items-center gap-1.5" delay={0}>
                      <CheckCircle2 size={13} className="text-[#E11B23]" /> {completedCount} Completed
                    </FloatingChip>
                    <FloatingChip className="top-1/3 -left-8 text-xs font-semibold" delay={1.2}>
                      {pendingCount} Tasks left
                    </FloatingChip>
                    <FloatingChip className="-bottom-6 right-6 text-xs font-semibold flex items-center gap-1.5" delay={0.6}>
                      <Flame size={13} className="text-[#E11B23]" /> {streak} Day Streak
                    </FloatingChip>
                    <FloatingChip className="bottom-10 -left-10 text-xs font-semibold font-mono" delay={1.8}>
                      {productivity}% Done
                    </FloatingChip>
                  </div>
                </div>
              </div>

              {/* quick stat cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {[
                  { label: "Completed Today", value: completedCount, icon: CheckCircle2 },
                  { label: "Pending", value: pendingCount, icon: ListTodo },
                  { label: "Important", value: importantCount, icon: Star },
                  { label: "Overdue", value: overdueCount, icon: AlertTriangle },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white rounded-2xl border border-black/[0.07] p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                    <div className="w-9 h-9 rounded-xl bg-[#E11B23]/10 flex items-center justify-center mb-3">
                      <Icon size={17} className="text-[#E11B23]" />
                    </div>
                    <p className="font-mono font-bold text-2xl"><CountUp to={value} /></p>
                    <p className="text-xs text-black/45 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg">Today's Tasks</h3>
                <span className="text-xs text-black/40 font-mono">You're {productivity}% done today 🔥</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {todaysTasks.length ? todaysTasks.map((t, i) => (
                  <TaskCard key={t.id} task={t} index={i} onToggle={toggleTask} onToggleImportant={toggleImportant} onDelete={deleteTask} onEdit={openEdit} />
                )) : <EmptyState text="Nothing scheduled for today. Add a task to get started." />}
              </div>
            </section>
          )}

          {/* ===================== TASK LIST VIEWS ===================== */}
          {["tasks", "today", "upcoming", "completed", "important"].includes(activeTab) && (
            <section>
              <SearchFilterBar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} />
              {filteredSorted.length ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredSorted.map((t, i) => (
                    <TaskCard key={t.id} task={t} index={i} onToggle={toggleTask} onToggleImportant={toggleImportant} onDelete={deleteTask} onEdit={openEdit} />
                  ))}
                </div>
              ) : (
                <EmptyState text="No tasks match here yet." />
              )}
            </section>
          )}

          {/* ===================== CATEGORIES ===================== */}
          {activeTab === "categories" && (
            <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map((c) => {
                const stats = categoryCounts[c] || { total: 0, done: 0 };
                const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
                return (
                  <div key={c} className="bg-white rounded-2xl border border-black/[0.07] p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-display font-bold">{c}</span>
                      <Tag size={15} className="text-[#E11B23]" />
                    </div>
                    <p className="text-xs text-black/45 mb-3">{stats.done}/{stats.total} completed</p>
                    <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-[#E11B23] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* ===================== CALENDAR ===================== */}
          {activeTab === "calendar" && (
            <section className="grid lg:grid-cols-[1fr_320px] gap-6">
              <div className="bg-white rounded-2xl border border-black/[0.07] p-5">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-black/[0.05]"><ChevronLeft size={18} /></button>
                  <h3 className="font-display font-bold">{calMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
                  <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-black/[0.05]"><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-black/40 font-semibold mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((iso, i) => {
                    if (!iso) return <div key={i} />;
                    const isToday = iso === todayISO();
                    const isSelected = iso === selectedDate;
                    const dayTasks = tasksByDate[iso] || [];
                    const hasImportant = dayTasks.some((t) => t.important && !t.completed);
                    return (
                      <button
                        key={iso}
                        onClick={() => setSelectedDate(iso)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all relative
                          ${isSelected ? "bg-[#E11B23] text-white" : isToday ? "bg-black text-white" : "hover:bg-black/[0.05] text-black/70"}`}
                      >
                        {parseInt(iso.slice(-2), 10)}
                        {dayTasks.length > 0 && (
                          <span className={`absolute bottom-1 w-1 h-1 rounded-full ${hasImportant && !isSelected ? "bg-[#E11B23]" : isSelected || isToday ? "bg-white" : "bg-black/30"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="font-display font-bold mb-3">{selectedDate === todayISO() ? "Today" : selectedDate}</h4>
                <div className="space-y-3">
                  {filteredSorted.length ? filteredSorted.map((t, i) => (
                    <TaskCard key={t.id} task={t} index={i} onToggle={toggleTask} onToggleImportant={toggleImportant} onDelete={deleteTask} onEdit={openEdit} />
                  )) : <EmptyState text="No tasks on this date." />}
                </div>
              </div>
            </section>
          )}

          {/* ===================== ANALYTICS ===================== */}
          {activeTab === "analytics" && (
            <section className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-black/[0.07] p-6 flex items-center gap-5">
                  <RadialProgress value={productivity} label="Today" />
                  <div>
                    <p className="font-display font-bold text-lg">Daily Productivity</p>
                    <p className="text-xs text-black/45">{completedCount} of {tasks.length} tasks done</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.07] p-6 flex items-center gap-5">
                  <RadialProgress value={Math.round((WEEKLY_HISTORY.reduce((a, b) => a + b.done, 0) / weeklyGoal) * 100)} label="Week" />
                  <div>
                    <p className="font-display font-bold text-lg">Weekly Completion</p>
                    <p className="text-xs text-black/45">{WEEKLY_HISTORY.reduce((a, b) => a + b.done, 0)} of {weeklyGoal} goal</p>
                  </div>
                </div>
                <div className="bg-black text-white rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E11B23]/20 flex items-center justify-center">
                    <Flame size={22} className="text-[#E11B23]" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-lg">{streak} Day Streak</p>
                    <p className="text-xs text-white/50">Most productive: Sunday</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold">Weekly Productivity</h3>
                  <span className="flex items-center gap-1 text-xs text-[#E11B23] font-semibold"><ArrowUpRight size={13} /> +12% vs last week</span>
                </div>
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={WEEKLY_HISTORY} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#0000000d" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#00000066" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#00000066" }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "#00000006" }} contentStyle={{ borderRadius: 12, border: "1px solid #00000012", fontSize: 12 }} />
                      <Bar dataKey="done" fill="#E11B23" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
                  <h3 className="font-display font-bold mb-4">Completed vs Pending</h3>
                  <div className="flex items-center gap-6">
                    <RadialProgress value={productivity} size={110} label="Total" />
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#E11B23]" /> Completed — {completedCount}</div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-black/15" /> Pending — {pendingCount}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
                  <h3 className="font-display font-bold mb-4">Monthly Snapshot</h3>
                  <ul className="text-sm space-y-2.5 text-black/60">
                    <li className="flex justify-between"><span>Tasks created</span><span className="font-mono font-semibold text-black">{tasks.length + 14}</span></li>
                    <li className="flex justify-between"><span>Tasks completed</span><span className="font-mono font-semibold text-black">{completedCount + 22}</span></li>
                    <li className="flex justify-between"><span>Best streak</span><span className="font-mono font-semibold text-black">9 days</span></li>
                    <li className="flex justify-between"><span>Avg. daily tasks</span><span className="font-mono font-semibold text-black">6.4</span></li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* ===================== SETTINGS ===================== */}
          {activeTab === "settings" && (
            <section className="max-w-lg space-y-5">
              <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
                <h3 className="font-display font-bold mb-4">Goals</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5"><span className="text-black/60">Daily task goal</span><span className="font-mono font-semibold">{dailyGoal}</span></div>
                    <input type="range" min="1" max="20" value={dailyGoal} onChange={(e) => setDailyGoal(+e.target.value)} className="w-full accent-[#E11B23]" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5"><span className="text-black/60">Weekly task goal</span><span className="font-mono font-semibold">{weeklyGoal}</span></div>
                    <input type="range" min="5" max="100" value={weeklyGoal} onChange={(e) => setWeeklyGoal(+e.target.value)} className="w-full accent-[#E11B23]" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
                <h3 className="font-display font-bold mb-4">Preferences</h3>
                {["Enable reminders", "Show completed tasks in Today", "Compact task cards"].map((label) => (
                  <label key={label} className="flex items-center justify-between py-2.5 border-b last:border-0 border-black/[0.05] cursor-pointer">
                    <span className="text-sm text-black/65">{label}</span>
                    <input type="checkbox" defaultChecked className="accent-[#E11B23] w-4 h-4" />
                  </label>
                ))}
              </div>
              <div className="bg-black text-white rounded-2xl p-6">
                <p className="text-xs text-white/50">This is a frontend-only demo. Connect a backend/database to persist tasks, goals, and preferences across sessions.</p>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* mobile FAB */}
      <button
        onClick={openNew}
        className="lg:hidden fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-[#E11B23] text-white flex items-center justify-center shadow-2xl shadow-[#E11B23]/40 active:scale-90 transition-transform"
        style={{ animation: "pulse-ring 2.6s ease-out infinite" }}
        aria-label="Add new task"
      >
        <Plus size={24} />
      </button>

      {/* mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-black/[0.06] flex justify-around py-2">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className="flex flex-col items-center gap-0.5 px-2 py-1">
              <Icon size={19} className={active ? "text-[#E11B23]" : "text-black/35"} />
              <span className={`text-[9px] font-medium ${active ? "text-[#E11B23]" : "text-black/35"}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={addOrUpdateTask} initial={editing} />
    </div>
  );
}
