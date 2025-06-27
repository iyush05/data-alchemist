export function runValidations(clients: any[], workers: any[], tasks: any[], rules: any[] = []) {
  const errors: string[] = [];

  // Missing Required Columns
  const requiredClientCols = ["ClientID", "PriorityLevel"];
  requiredClientCols.forEach((col) => {
    if (!clients[0] || !(col in clients[0])) {
      errors.push(`Missing required column in Clients: ${col}`);
    }
  });

  // Duplicate IDs
  const clientIDs = clients.map((c) => c.ClientID);
  const duplicates = clientIDs.filter((id, idx, arr) => arr.indexOf(id) !== idx);
  if (duplicates.length) errors.push(`Duplicate Client IDs: ${duplicates.join(", ")}`);

  // Malformed AvailableSlots
  workers.forEach((w, idx) => {
    try {
      const slots = JSON.parse(w.AvailableSlots);
      if (!Array.isArray(slots) || !slots.every((x: any) => typeof x === "number")) {
        errors.push(`Malformed AvailableSlots at Worker row ${idx + 1}`);
      }
    } catch {
      errors.push(`Invalid JSON in AvailableSlots for Worker ${w.WorkerID}`);
    }
  });

  // Out-of-range PriorityLevel
  clients.forEach((c) => {
    const level = parseInt(c.PriorityLevel);
    if (isNaN(level) || level < 1 || level > 5) {
      errors.push(`Invalid PriorityLevel for Client ${c.ClientID}`);
    }
  });

  // Broken JSON in AttributesJSON
  clients.forEach((c) => {
    try {
      JSON.parse(c.AttributesJSON);
    } catch {
      errors.push(`Broken JSON in AttributesJSON for Client ${c.ClientID}`);
    }
  });

  // Unknown Task references in RequestedTaskIDs
  const taskIDs = tasks.map((t) => t.TaskID);
  clients.forEach((c) => {
    const requested = c.RequestedTaskIDs?.split(",").map((id: string) => id.trim());
    requested?.forEach((reqId: string) => {
      if (!taskIDs.includes(reqId)) {
        errors.push(`Unknown TaskID "${reqId}" in RequestedTaskIDs for Client ${c.ClientID}`);
      }
    });
  });

  // Circular Co-run detection (Assuming co-run rules are passed in `rules`)
  const coRunMap: Record<string, string[]> = {};
  rules
    .filter((r: any) => r.type === "coRun")
    .forEach((r: any) => {
      r.tasks.forEach((task: string) => {
        if (!coRunMap[task]) coRunMap[task] = [];
        coRunMap[task] = [...new Set([...coRunMap[task], ...r.tasks.filter((t: string) => t !== task)])];
      });
    });

  const visited = new Set<string>();
  const dfs = (node: string, path: Set<string>) => {
    if (path.has(node)) return true;
    if (!coRunMap[node]) return false;
    path.add(node);
    for (const neighbor of coRunMap[node]) {
      if (dfs(neighbor, path)) return true;
    }
    path.delete(node);
    return false;
  };

  Object.keys(coRunMap).forEach((node) => {
    if (dfs(node, new Set())) {
      errors.push(`Circular Co-Run detected starting at Task ${node}`);
    }
  });

  // Overloaded Workers
  workers.forEach((w) => {
    const slots = JSON.parse(w.AvailableSlots);
    if (slots.length < Number(w.MaxLoadPerPhase)) {
      errors.push(`Worker ${w.WorkerID} has insufficient AvailableSlots for MaxLoadPerPhase`);
    }
  });

  // Skill-Coverage Matrix
  const workerSkills = new Set(workers.flatMap((w) => w.Skills.split(",").map((s: string) => s.trim())));
  tasks.forEach((t) => {
    const requiredSkills = t.RequiredSkills?.split(",").map((s: string) => s.trim()) || [];
    requiredSkills.forEach((skill: string) => {
      if (!workerSkills.has(skill)) {
        errors.push(`No worker covers required skill "${skill}" for Task ${t.TaskID}`);
      }
    });
  });

  return errors;
}
