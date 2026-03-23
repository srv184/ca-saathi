// Compliance rules engine
// Maps entity type + service → list of recurring tasks with due dates
// This drives the entire compliance calendar automatically

export interface ComplianceRule {
  title: string;
  description: string;
  service_type: string;
  frequency: "monthly" | "quarterly" | "annual" | "once";
  // For monthly: due on this day every month
  // For quarterly: due on this day of these months
  // For annual: due on this day of this month
  due_day: number;
  due_months?: number[]; // 1=Jan, 3=Mar, etc. If empty = all months
}

export const COMPLIANCE_RULES: Record<string, ComplianceRule[]> = {
  // ─── GST Rules ───────────────────────────────────────
  GST: [
    {
      title: "GSTR-1 Filing",
      description: "Monthly outward supplies return",
      service_type: "GST",
      frequency: "monthly",
      due_day: 11,
    },
    {
      title: "GSTR-3B Filing",
      description: "Monthly summary return with tax payment",
      service_type: "GST",
      frequency: "monthly",
      due_day: 20,
    },
    {
      title: "GSTR-9 Annual Return",
      description: "Annual GST return",
      service_type: "GST",
      frequency: "annual",
      due_day: 31,
      due_months: [12],
    },
  ],

  // ─── ITR Rules ───────────────────────────────────────
  ITR: [
    {
      title: "ITR Filing",
      description: "Income tax return filing",
      service_type: "ITR",
      frequency: "annual",
      due_day: 31,
      due_months: [7],
    },
    {
      title: "Advance Tax Q1",
      description: "First instalment of advance tax",
      service_type: "ITR",
      frequency: "annual",
      due_day: 15,
      due_months: [6],
    },
    {
      title: "Advance Tax Q2",
      description: "Second instalment of advance tax",
      service_type: "ITR",
      frequency: "annual",
      due_day: 15,
      due_months: [9],
    },
    {
      title: "Advance Tax Q3",
      description: "Third instalment of advance tax",
      service_type: "ITR",
      frequency: "annual",
      due_day: 15,
      due_months: [12],
    },
    {
      title: "Advance Tax Q4",
      description: "Fourth instalment of advance tax",
      service_type: "ITR",
      frequency: "annual",
      due_day: 15,
      due_months: [3],
    },
  ],

  // ─── TDS Rules ───────────────────────────────────────
  TDS: [
    {
      title: "TDS Payment",
      description: "Monthly TDS deposit to government",
      service_type: "TDS",
      frequency: "monthly",
      due_day: 7,
    },
    {
      title: "TDS Return 24Q/26Q Q1",
      description: "Quarterly TDS return for April-June",
      service_type: "TDS",
      frequency: "annual",
      due_day: 31,
      due_months: [7],
    },
    {
      title: "TDS Return 24Q/26Q Q2",
      description: "Quarterly TDS return for July-September",
      service_type: "TDS",
      frequency: "annual",
      due_day: 31,
      due_months: [10],
    },
    {
      title: "TDS Return 24Q/26Q Q3",
      description: "Quarterly TDS return for October-December",
      service_type: "TDS",
      frequency: "annual",
      due_day: 31,
      due_months: [1],
    },
    {
      title: "TDS Return 24Q/26Q Q4",
      description: "Quarterly TDS return for January-March",
      service_type: "TDS",
      frequency: "annual",
      due_day: 31,
      due_months: [5],
    },
  ],

  // ─── ROC Rules ───────────────────────────────────────
  ROC: [
    {
      title: "Annual Return MGT-7",
      description: "Company annual return filing with MCA",
      service_type: "ROC",
      frequency: "annual",
      due_day: 29,
      due_months: [11],
    },
    {
      title: "Financial Statements AOC-4",
      description: "Filing of financial statements with MCA",
      service_type: "ROC",
      frequency: "annual",
      due_day: 29,
      due_months: [10],
    },
    {
      title: "DIR-3 KYC",
      description: "Director KYC annual filing",
      service_type: "ROC",
      frequency: "annual",
      due_day: 30,
      due_months: [9],
    },
  ],

  // ─── Audit Rules ─────────────────────────────────────
  AUDIT: [
    {
      title: "Tax Audit Report 3CD",
      description: "Tax audit report under section 44AB",
      service_type: "AUDIT",
      frequency: "annual",
      due_day: 30,
      due_months: [9],
    },
  ],

  // ─── Bookkeeping Rules ───────────────────────────────
  BOOKKEEPING: [
    {
      title: "Monthly Books Closure",
      description: "Close books of accounts for the month",
      service_type: "BOOKKEEPING",
      frequency: "monthly",
      due_day: 10,
    },
  ],
};

export interface GeneratedTask {
  title: string;
  description: string;
  service_type: string;
  due_date: Date;
}

// Generate all compliance tasks for a client for the next N months
export function generateTasksForClient(
  servicesEngaged: string[],
  fromDate: Date,
  months: number = 12,
): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];
  const endDate = new Date(fromDate);
  endDate.setMonth(endDate.getMonth() + months);

  for (const service of servicesEngaged) {
    const rules = COMPLIANCE_RULES[service.toUpperCase()];
    if (!rules) continue;

    for (const rule of rules) {
      if (rule.frequency === "monthly") {
        // Generate one task per month
        const current = new Date(fromDate);
        current.setDate(1);

        while (current <= endDate) {
          const dueDate = new Date(
            current.getFullYear(),
            current.getMonth(),
            rule.due_day,
          );
          if (dueDate >= fromDate && dueDate <= endDate) {
            tasks.push({
              title: rule.title,
              description: rule.description,
              service_type: rule.service_type,
              due_date: dueDate,
            });
          }
          current.setMonth(current.getMonth() + 1);
        }
      } else if (
        rule.frequency === "annual" ||
        rule.frequency === "quarterly"
      ) {
        // Generate tasks for specific months
        const months = rule.due_months ?? [];
        for (const month of months) {
          // Try current year and next year
          for (const yearOffset of [0, 1]) {
            const dueDate = new Date(
              fromDate.getFullYear() + yearOffset,
              month - 1,
              rule.due_day,
            );
            if (dueDate >= fromDate && dueDate <= endDate) {
              tasks.push({
                title: rule.title,
                description: rule.description,
                service_type: rule.service_type,
                due_date: dueDate,
              });
            }
          }
        }
      }
    }
  }

  // Sort by due date
  tasks.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());

  // Remove duplicates
  const seen = new Set<string>();
  return tasks.filter((t) => {
    const key = `${t.title}_${t.due_date.toISOString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
