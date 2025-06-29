interface Rule {
  type: string;
  group: string;
  maxSlotsPerPhase: number;
}

interface TableData {
  name: string;
  rows: any[];
}

interface Worker {
  WorkerGroup?: string;
  MaxLoadPerPhase?: number | string;
}

export default function validateLoadLimitRule(
  tableData: TableData[],
  rule: Rule
): string | null {
  try {

    // Normalize rule type check
    const normalizedRuleType = rule.type.replace(/[\s_\-]/g, "").toLowerCase();
    if (normalizedRuleType !== "loadlimit") {
    return `Rule type is not 'loadLimit'. Found: '${rule.type}'`;
    }


    if (!rule.group || typeof rule.group !== "string") {
      return "Invalid group: WorkerGroup name is required.";
    }

    const maxSlots = typeof rule.maxSlotsPerPhase === "string"
      ? parseInt(rule.maxSlotsPerPhase, 10)
      : rule.maxSlotsPerPhase;

    if (isNaN(maxSlots) || maxSlots <= 0) {
      return "Invalid maxSlotsPerPhase: Must be a positive integer.";
    }

    // Find worker table
    const workerTable = tableData.find((t) =>
      t.name.toLowerCase().includes("worker")
    );

    if (!workerTable || !Array.isArray(workerTable.rows)) {
      return "Worker table not found or invalid.";
    }

    const groupWorkers: Worker[] = workerTable.rows.filter(
      (worker: Worker) => worker.WorkerGroup === rule.group
    );

    if (groupWorkers.length === 0) {
      return `No workers found in WorkerGroup '${rule.group}'.`;
    }

    // Optional Feasibility Check (Advanced but Recommended)
    const totalGroupCapacity = groupWorkers.reduce((sum, worker) => {
      const load = typeof worker.MaxLoadPerPhase === "string"
        ? parseInt(worker.MaxLoadPerPhase, 10)
        : worker.MaxLoadPerPhase;
      return sum + (Number.isFinite(load!) && load! > 0 ? load! : 0);
    }, 0);

    if (totalGroupCapacity < maxSlots) {
      return `Load Limit too high: WorkerGroup '${rule.group}' has total capacity of ${totalGroupCapacity} tasks per phase, but Load Limit is set to ${maxSlots}.`;
    }
    return null; // ✅ No error
  } catch (err: any) {
    console.error("Load Limit validation error:", err);
    return `Load Limit rule validation error: ${err.message}`;
  }
}
