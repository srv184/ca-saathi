"use client";
import { useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  description?: string;
  service_type: string;
  due_date: string;
  status: string;
  filed_at?: string;
  client?: { name: string; entity_type: string };
}

const SERVICE_COLORS: Record<string, string> = {
  GST: "badge-blue",
  ITR: "badge-purple",
  TDS: "badge-amber",
  ROC: "badge-green",
  AUDIT: "badge-red",
  BOOKKEEPING: "badge-gray",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDueBadge(dueDate: string, status: string): string {
  if (status === "FILED") return "badge-green";
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return "badge-red";
  if (days <= 7) return "badge-amber";
  return "badge-gray";
}

function getDueLabel(dueDate: string, status: string): string {
  if (status === "FILED") return "Filed";
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days}d`;
  return new Date(dueDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function CalendarPage() {
  const now = new Date();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [filter, setFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadTasks();
  }, [month, year, filter]);

  async function loadTasks() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: month.toString(),
        year: year.toString(),
        pageSize: "200",
      });
      if (filter !== "all") params.set("status", filter);

      const res = await fetch(`/api/compliance/tasks?${params}`);
      const data = await res.json();
      setTasks(data.data?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function generateTasks() {
    setGenerating(true);
    setMsg("");
    try {
      const res = await fetch("/api/compliance/tasks", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.data?.message ?? "Tasks generated");
        await loadTasks();
      }
    } catch {
      setMsg("Failed to generate tasks");
    } finally {
      setGenerating(false);
    }
  }

  async function markFiled(taskId: string) {
    try {
      await fetch(`/api/compliance/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-filed" }),
      });
      await loadTasks();
    } catch {
      // ignore
    }
  }

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const overdue = tasks.filter(
    (t) => t.status !== "FILED" && getDaysUntilDue(t.due_date) < 0,
  );
  const upcoming = tasks.filter(
    (t) => t.status !== "FILED" && getDaysUntilDue(t.due_date) >= 0,
  );
  const filed = tasks.filter((t) => t.status === "FILED");

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Compliance Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tasks.length} tasks for {MONTHS[month - 1]} {year}
          </p>
        </div>
        <button
          onClick={generateTasks}
          className="btn-primary w-full sm:w-auto"
          disabled={generating}
        >
          {generating ? "Generating…" : "⚡ Generate tasks"}
        </button>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg mb-4">
          {msg}
        </div>
      )}

      {/* Month navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-4 sm:gap-4">
        <button
          onClick={prevMonth}
          className="btn-secondary px-3 text-sm"
        >
          ←
        </button>
        <span className="min-w-0 flex-1 font-medium text-gray-900 text-center sm:min-w-32">
          {MONTHS[month - 1]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="btn-secondary px-3 text-sm"
        >
          →
        </button>
        <button
          onClick={() => {
            setMonth(now.getMonth() + 1);
            setYear(now.getFullYear());
          }}
          className="btn-secondary px-3 text-xs sm:ml-2"
        >
          Today
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: "all", label: "All" },
          { value: "PENDING", label: "Pending" },
          { value: "FILED", label: "Filed" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === f.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 border-b border-gray-50 animate-pulse bg-gray-50"
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <h3 className="text-base font-medium text-gray-900">
            No tasks for this month
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Click "Generate tasks" to auto-create compliance tasks for all your
            clients
          </p>
          <button
            onClick={generateTasks}
            className="btn-primary mt-4"
            disabled={generating}
          >
            {generating ? "Generating…" : "⚡ Generate tasks"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-600 mb-2">
                ⚠ Overdue ({overdue.length})
              </h3>
              <TaskList tasks={overdue} onMarkFiled={markFiled} />
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Upcoming ({upcoming.length})
              </h3>
              <TaskList tasks={upcoming} onMarkFiled={markFiled} />
            </div>
          )}

          {/* Filed */}
          {filed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-green-600 mb-2">
                ✓ Filed ({filed.length})
              </h3>
              <TaskList tasks={filed} onMarkFiled={markFiled} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskList({
  tasks,
  onMarkFiled,
}: {
  tasks: Task[];
  onMarkFiled: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {tasks.map((task, i) => (
        <div
          key={task.id}
          className={`flex flex-col items-stretch gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${
            i < tasks.length - 1 ? "border-b border-gray-50" : ""
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {task.title}
              </p>
              <span
                className={SERVICE_COLORS[task.service_type] ?? "badge-gray"}
              >
                {task.service_type}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {task.client?.name ?? "—"}
              {task.description ? ` · ${task.description}` : ""}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:shrink-0">
            <span className={getDueBadge(task.due_date, task.status)}>
              {getDueLabel(task.due_date, task.status)}
            </span>
            {task.status !== "FILED" && (
              <button
                onClick={() => onMarkFiled(task.id)}
                className="inline-flex min-h-11 items-center px-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark filed
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
