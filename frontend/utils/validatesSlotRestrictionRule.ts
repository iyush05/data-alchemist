// Type definitions
interface Rule {
  type: string;
  minCommonSlots: number;
  group: string;
  groupType: "WorkerGroup" | "ClientGroup";
}

interface TableData {
  name: string;
  rows: any[];
}

interface Worker {
  WorkerGroup?: string;
  WorkerName?: string;
  WorkerID?: string;
  AvailableSlots?: string;
  Skills?: string;
}

interface Client {
  GroupTag?: string;
  RequestedTaskIDs?: string;
}

interface Task {
  TaskID?: string;
  RequiredSkills?: string;
}

export default function ValidateSlotRestrictionRule(
  tableData: TableData[],
  rule: Rule
): string | null {
  try {

    // Normalize rule type for safety (remove spaces/underscores, lowercase)
    const normalizedRuleType = rule.type.replace(/\s|_/g, '').toLowerCase();
    if (normalizedRuleType !== "slotrestriction") {
      return `Rule type is not 'slotRestriction'. Found: '${rule.type}'`;
    }

    if (!Array.isArray(tableData)) {
      return "Invalid table data - expected an array";
    }

    const minCommonSlots = typeof rule.minCommonSlots === 'string'
      ? parseInt(rule.minCommonSlots, 10)
      : rule.minCommonSlots;

    if (isNaN(minCommonSlots) || minCommonSlots <= 0) {
      return "Invalid minCommonSlots: Must be a positive number.";
    }

    if (!rule.group || typeof rule.group !== 'string') {
      return "Invalid group: Must be a non-empty string.";
    }

    if (rule.groupType === "WorkerGroup") {
      const workerTable = tableData.find((table) =>
        table.name.toLowerCase().includes("worker")
      );

      if (!workerTable || !Array.isArray(workerTable.rows)) {
        return "Worker table missing or invalid.";
      }

      const groupWorkers: Worker[] = workerTable.rows.filter(
        (worker) => worker.WorkerGroup === rule.group
      );

      if (groupWorkers.length === 0) {
        return `No workers found in WorkerGroup '${rule.group}'.`;
      }

      const slotCount = new Map<number, number>();
      const validWorkerSlots: number[][] = [];

      for (const worker of groupWorkers) {
        if (!worker.AvailableSlots) continue;
        try {
          const parsedSlots = JSON.parse(worker.AvailableSlots);
          const numericSlots = Array.isArray(parsedSlots)
            ? parsedSlots
                .map((s: any) => (typeof s === "string" ? parseInt(s, 10) : s))
                .filter((s: number) => Number.isInteger(s))
            : [];

          if (numericSlots.length > 0) {
            validWorkerSlots.push(numericSlots);
            numericSlots.forEach((slot) => {
              slotCount.set(slot, (slotCount.get(slot) || 0) + 1);
            });
          }
        } catch (err) {
          console.warn(`Worker '${worker.WorkerID || worker.WorkerName}' has invalid AvailableSlots JSON:`, worker.AvailableSlots);
        }
      }

      if (validWorkerSlots.length === 0) {
        return `No valid available slots found for workers in group '${rule.group}'.`;
      }

      const commonSlots = Array.from(slotCount.entries())
        .filter(([slot, count]) => count >= minCommonSlots)
        .map(([slot]) => slot);

      if (commonSlots.length > 0) {
        return null;
      } else {
        const allSlots = Array.from(slotCount.entries())
          .map(([slot, count]) => `${slot}(${count} workers)`)
          .join(", ");
        return `Slot Restriction failed for WorkerGroup '${rule.group}': Required at least 1 slot available to ${minCommonSlots}+ workers. Current slot counts: [${allSlots}]`;
      }
    }

    if (rule.groupType === "ClientGroup") {
      const clientTable = tableData.find((t) => t.name.toLowerCase().includes("client"));
      const workerTable = tableData.find((t) => t.name.toLowerCase().includes("worker"));
      const taskTable = tableData.find((t) => t.name.toLowerCase().includes("task"));

      if (!clientTable || !workerTable || !taskTable) {
        return "Missing one or more required tables (clients, workers, tasks).";
      }

      const groupClients = clientTable.rows.filter(
        (client: Client) => client.GroupTag === rule.group
      );

      if (groupClients.length === 0) {
        return `No clients found in ClientGroup '${rule.group}'.`;
      }

      const requestedTaskIds = groupClients.flatMap((client) =>
        client.RequestedTaskIDs?.split(",").map((id) => id.trim()) ?? []
      );

      if (requestedTaskIds.length === 0) {
        return `No valid TaskIDs found for ClientGroup '${rule.group}'.`;
      }

      const requiredSkills = new Set<string>();
      requestedTaskIds.forEach((taskId) => {
        const task = taskTable.rows.find((t: Task) => t.TaskID === taskId);
        if (task?.RequiredSkills) {
          task.RequiredSkills.split(",").map((s) => s.trim()).forEach((skill) => requiredSkills.add(skill));
        }
      });

      if (requiredSkills.size === 0) {
        return `No required skills found for tasks requested by ClientGroup '${rule.group}'.`;
      }

      const qualifiedWorkers = workerTable.rows.filter((worker: Worker) => {
        const workerSkills = worker.Skills?.split(",").map((s) => s.trim()) ?? [];
        return Array.from(requiredSkills).some((skill) => workerSkills.includes(skill));
      });

      if (qualifiedWorkers.length === 0) {
        return `No qualified workers found for tasks requested by ClientGroup '${rule.group}'.`;
      }

      const phaseWorkerCount: Record<number, number> = {};

      qualifiedWorkers.forEach((worker) => {
        try {
          const slots = JSON.parse(worker.AvailableSlots ?? "[]");
          slots.forEach((slot: any) => {
            const num = typeof slot === "string" ? parseInt(slot, 10) : slot;
            if (!isNaN(num)) {
              phaseWorkerCount[num] = (phaseWorkerCount[num] || 0) + 1;
            }
          });
        } catch (e) {
          console.warn(`Invalid AvailableSlots for worker ${worker.WorkerID}:`, worker.AvailableSlots);
        }
      });

      const viablePhases = Object.keys(phaseWorkerCount)
  .map(Number)
  .filter((phase) => !isNaN(phase));

if (viablePhases.length >= minCommonSlots) {
  return null;
} else {
  const allPhases = Object.entries(phaseWorkerCount)
    .map(([phase, count]) => `${phase}(${count} workers)`)
    .join(", ");
  return `ClientGroup '${rule.group}' validation failed: Required at least ${minCommonSlots} unique phases with qualified workers, but found only ${viablePhases.length}. Current phase counts: [${allPhases}]`;
}


      if (viablePhases.length > 0) {
        return null;
      } else {
        const allPhases = Object.entries(phaseWorkerCount)
          .map(([phase, count]) => `${phase}(${count} workers)`)
          .join(", ");
        return `Slot Restriction failed for ClientGroup '${rule.group}': No phases found with at least ${minCommonSlots} qualified workers. Current phase counts: [${allPhases}]`;
      }
    }

    return `Unsupported groupType: ${rule.groupType}`;
  } catch (err: any) {
    console.error("Validation error:", err);
    return `Validation error: ${err.message}`;
  }
}
