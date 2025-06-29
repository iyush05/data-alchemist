export function runValidations(
  clients: any[],
  workers: any[],
  tasks: any[],
  rules: any[] = []
) {
  const errors: {
    error: string;
    entity: "clients" | "workers" | "tasks" | "rules";
    rowId: string;
    field?: string;
  }[] = [];

  // --- Validation 1: Missing required columns ---
  const requiredClientCols = ["ClientID", "PriorityLevel", "RequestedTaskIDs", "AttributesJSON"];
  const requiredWorkerCols = ["WorkerID", "AvailableSlots", "Skills", "MaxLoadPerPhase"];
  const requiredTaskCols = ["TaskID", "Duration", "RequiredSkills", "MaxConcurrent"];

  // Check client columns
  requiredClientCols.forEach((col) => {
    if (!clients[0] || !(col in clients[0])) {
      errors.push({
        error: `Missing required column: ${col}`,
        entity: "clients",
        rowId: "all",
      });
    }
  });

  // Check worker columns
  requiredWorkerCols.forEach((col) => {
    if (!workers[0] || !(col in workers[0])) {
      errors.push({
        error: `Missing required column: ${col}`,
        entity: "workers",
        rowId: "all",
      });
    }
  });

  // Check task columns
  requiredTaskCols.forEach((col) => {
    if (!tasks[0] || !(col in tasks[0])) {
      errors.push({
        error: `Missing required column: ${col}`,
        entity: "tasks",
        rowId: "all",
      });
    }
  });

  // --- Validation 2: Duplicate IDs ---
  const clientIDs = new Set<string>();
  clients.forEach((c) => {
    if (clientIDs.has(c.ClientID)) {
      errors.push({
        error: `Duplicate ClientID: ${c.ClientID}`,
        entity: "clients",
        rowId: c.ClientID,
      });
    } else {
      clientIDs.add(c.ClientID);
    }
  });

  const workerIDs = new Set<string>();
  workers.forEach((w) => {
    if (workerIDs.has(w.WorkerID)) {
      errors.push({
        error: `Duplicate WorkerID: ${w.WorkerID}`,
        entity: "workers",
        rowId: w.WorkerID,
      });
    } else {
      workerIDs.add(w.WorkerID);
    }
  });

  const taskIDs = new Set<string>();
  tasks.forEach((t) => {
    if (taskIDs.has(t.TaskID)) {
      errors.push({
        error: `Duplicate TaskID: ${t.TaskID}`,
        entity: "tasks",
        rowId: t.TaskID,
      });
    } else {
      taskIDs.add(t.TaskID);
    }
  });

  // --- Validation 3: Malformed lists ---
  workers.forEach((w) => {
    // Check AvailableSlots - handle both JSON array and bracket notation
    try {
      let slots;
      if (w.AvailableSlots.startsWith('[') && w.AvailableSlots.endsWith(']')) {
        slots = JSON.parse(w.AvailableSlots);
      } else {
        // Handle bracket notation like [1,2,3]
        slots = w.AvailableSlots.replace(/[\[\]]/g, '').split(',').map((x: string) => Number(x.trim()));
      }
      if (!Array.isArray(slots) || !slots.every((x: any) => typeof x === "number" && !isNaN(x))) {
        errors.push({
          error: `Malformed AvailableSlots for Worker ${w.WorkerID}`,
          entity: "workers",
          rowId: w.WorkerID,
          field: "AvailableSlots",
        });
      }
    } catch {
      errors.push({
        error: `Invalid array in AvailableSlots for Worker ${w.WorkerID}`,
        entity: "workers",
        rowId: w.WorkerID,
        field: "AvailableSlots",
      });
    }

    // Check Skills array - handle comma-separated values
    try {
      let skills;
      if (w.Skills.startsWith('[') && w.Skills.endsWith(']')) {
        skills = JSON.parse(w.Skills);
      } else {
        // Handle comma-separated values like "data,analysis"
        skills = w.Skills.split(',').map((s: string) => s.trim());
      }
      if (!Array.isArray(skills) || !skills.every((x: any) => typeof x === "string" && x.length > 0)) {
        errors.push({
          error: `Malformed Skills for Worker ${w.WorkerID}`,
          entity: "workers",
          rowId: w.WorkerID,
          field: "Skills",
        });
      }
    } catch {
      errors.push({
        error: `Invalid array in Skills for Worker ${w.WorkerID}`,
        entity: "workers",
        rowId: w.WorkerID,
        field: "Skills",
      });
    }

    // Check MaxLoadPerPhase - this appears to be a single number in the data
    const maxLoad = Number(w.MaxLoadPerPhase);
    if (isNaN(maxLoad) || maxLoad < 0) {
      errors.push({
        error: `Invalid MaxLoadPerPhase for Worker ${w.WorkerID}`,
        entity: "workers",
        rowId: w.WorkerID,
        field: "MaxLoadPerPhase",
      });
    }
  });

  // Check RequiredSkills in tasks
  tasks.forEach((t) => {
    try {
      let skills;
      if (t.RequiredSkills.startsWith('[') && t.RequiredSkills.endsWith(']')) {
        skills = JSON.parse(t.RequiredSkills);
      } else {
        // Handle comma-separated values like "ml,coding"
        skills = t.RequiredSkills.split(',').map((s: string) => s.trim());
      }
      if (!Array.isArray(skills) || !skills.every((x: any) => typeof x === "string" && x.length > 0)) {
        errors.push({
          error: `Malformed RequiredSkills for Task ${t.TaskID}`,
          entity: "tasks",
          rowId: t.TaskID,
          field: "RequiredSkills",
        });
      }
    } catch {
      errors.push({
        error: `Invalid array in RequiredSkills for Task ${t.TaskID}`,
        entity: "tasks",
        rowId: t.TaskID,
        field: "RequiredSkills",
      });
    }
  });

  // --- Validation 4: Out-of-range values ---
  clients.forEach((c) => {
    const level = Number(c.PriorityLevel);
    if (isNaN(level) || level < 1 || level > 5) {
      errors.push({
        error: `PriorityLevel out of range (1-5) for Client ${c.ClientID}`,
        entity: "clients",
        rowId: c.ClientID,
        field: "PriorityLevel",
      });
    }
  });

  tasks.forEach((t) => {
    const duration = Number(t.Duration);
    if (isNaN(duration) || duration < 1) {
      errors.push({
        error: `Duration must be >= 1 for Task ${t.TaskID}`,
        entity: "tasks",
        rowId: t.TaskID,
        field: "Duration",
      });
    }

    const maxConcurrent = Number(t.MaxConcurrent);
    if (isNaN(maxConcurrent) || maxConcurrent < 1) {
      errors.push({
        error: `MaxConcurrent must be >= 1 for Task ${t.TaskID}`,
        entity: "tasks",
        rowId: t.TaskID,
        field: "MaxConcurrent",
      });
    }
  });

  // --- Validation 5: Broken JSON in AttributesJSON ---
  clients.forEach((c) => {
    // Skip validation if AttributesJSON doesn't look like JSON (starts with {)
    if (c.AttributesJSON && c.AttributesJSON.startsWith('{')) {
      try {
        JSON.parse(c.AttributesJSON);
      } catch {
        errors.push({
          error: `Invalid JSON in AttributesJSON for Client ${c.ClientID}`,
          entity: "clients",
          rowId: c.ClientID,
          field: "AttributesJSON",
        });
      }
    }
  });

  // --- Validation 6: Unknown references ---
  const taskIDArray = tasks.map((t) => t.TaskID);
  
  // Check RequestedTaskIDs
  clients.forEach((c) => {
    if (c.RequestedTaskIDs) {
      const requestedTasks = c.RequestedTaskIDs.split(",").map((id: string) => id.trim());
      requestedTasks.forEach((taskId: string) => {
        if (taskId && !taskIDArray.includes(taskId)) {
          errors.push({
            error: `Unknown TaskID '${taskId}' in RequestedTaskIDs for Client ${c.ClientID}`,
            entity: "clients",
            rowId: c.ClientID,
            field: "RequestedTaskIDs",
          });
        }
      });
    }
  });

  // Check regex rules referencing missing TaskIDs
  rules.forEach((rule, index) => {
    if (rule.Type === "regex" && rule.TaskIDs) {
      const ruleTaskIDs = rule.TaskIDs.split(",").map((id: string) => id.trim());
      ruleTaskIDs.forEach((taskId: string) => {
        if (!taskIDArray.includes(taskId)) {
          errors.push({
            error: `Regex rule references unknown TaskID '${taskId}'`,
            entity: "rules",
            rowId: `rule_${index}`,
          });
        }
      });
    }
  });

  // --- Validation 7: Circular co-run groups ---
  const coRunGroups = new Map<string, string[]>();
  
  // Build co-run groups map
  rules.forEach((rule) => {
    if (rule.Type === "co-run" && rule.TaskIDs) {
      const taskIds = rule.TaskIDs.split(",").map((id: string) => id.trim());
      taskIds.forEach((taskId:any, index:any) => {
        if (index < taskIds.length - 1) {
          if (!coRunGroups.has(taskId)) {
            coRunGroups.set(taskId, []);
          }
          coRunGroups.get(taskId)!.push(taskIds[index + 1]);
        }
      });
    }
  });

  // Check for circular dependencies
  function hasCircularDependency(startTask: string, visited: Set<string> = new Set()): boolean {
    if (visited.has(startTask)) {
      return true;
    }
    
    visited.add(startTask);
    const dependencies = coRunGroups.get(startTask) || [];
    
    for (const dep of dependencies) {
      if (hasCircularDependency(dep, new Set(visited))) {
        return true;
      }
    }
    
    return false;
  }

  coRunGroups.forEach((deps, taskId) => {
    if (hasCircularDependency(taskId)) {
      errors.push({
        error: `Circular co-run dependency detected involving Task ${taskId}`,
        entity: "rules",
        rowId: taskId,
      });
    }
  });

  // --- Validation 8: Conflicting rules vs. phase-window constraints ---
  const phaseWindows = new Map<string, { start: number; end: number }>();
  
  // Extract phase windows
  rules.forEach((rule, index) => {
    if (rule.Type === "phase-window" && rule.TaskIDs && rule.WindowStart && rule.WindowEnd) {
      const taskIds = rule.TaskIDs.split(",").map((id: string) => id.trim());
      taskIds.forEach((taskId:any) => {
        phaseWindows.set(taskId, {
          start: Number(rule.WindowStart),
          end: Number(rule.WindowEnd)
        });
      });
    }
  });

  // Check for conflicts between co-run and phase-window constraints
  coRunGroups.forEach((deps, taskId) => {
    const taskWindow = phaseWindows.get(taskId);
    if (taskWindow) {
      deps.forEach((depTaskId) => {
        const depWindow = phaseWindows.get(depTaskId);
        if (depWindow) {
          // Check if windows don't overlap
          if (taskWindow.end < depWindow.start || depWindow.end < taskWindow.start) {
            errors.push({
              error: `Co-run constraint conflicts with phase-window for Tasks ${taskId} and ${depTaskId}`,
              entity: "rules",
              rowId: `${taskId}_${depTaskId}`,
            });
          }
        }
      });
    }
  });

  // --- Validation 9: Overloaded workers ---
  workers.forEach((w) => {
    try {
      let availableSlots;
      if (w.AvailableSlots.startsWith('[') && w.AvailableSlots.endsWith(']')) {
        availableSlots = JSON.parse(w.AvailableSlots);
      } else {
        availableSlots = w.AvailableSlots.replace(/[\[\]]/g, '').split(',').map((x: string) => Number(x.trim()));
      }
      
      const maxLoad = Number(w.MaxLoadPerPhase);
      
      if (Array.isArray(availableSlots) && !isNaN(maxLoad)) {
        const totalSlots = availableSlots.length;
        if (maxLoad > totalSlots) {
          errors.push({
            error: `Worker ${w.WorkerID} has MaxLoadPerPhase (${maxLoad}) > available slots (${totalSlots})`,
            entity: "workers",
            rowId: w.WorkerID,
            field: "MaxLoadPerPhase",
          });
        }
      }
    } catch {
      // Already handled in malformed lists validation
    }
  });

  // --- Validation 10: Phase-slot saturation ---
  // Note: Since tasks don't have explicit Phase field in the data, 
  // we'll use PreferredPhases to estimate phase distribution
  const phaseTaskDurations = new Map<number, number>();
  const phaseWorkerSlots = new Map<number, number>();

  // Calculate total task durations per phase using PreferredPhases
  tasks.forEach((t) => {
    const duration = Number(t.Duration);
    if (!isNaN(duration) && t.PreferredPhases) {
      // Parse preferred phases like "1 - 2", "[2,3,4]", "3 - 5", etc.
      let phases: number[] = [];
      
      if (t.PreferredPhases.includes('-')) {
        // Handle range format like "1 - 2"
        const rangeParts = t.PreferredPhases.split('-').map((p:any) => parseInt(p.trim()));
        if (rangeParts.length === 2 && !isNaN(rangeParts[0]) && !isNaN(rangeParts[1])) {
          for (let i = rangeParts[0]; i <= rangeParts[1]; i++) {
            phases.push(i);
          }
        }
      } else if (t.PreferredPhases.startsWith('[')) {
        // Handle array format like "[2,3,4]"
        try {
          phases = JSON.parse(t.PreferredPhases);
        } catch {
          // Handle bracket notation without quotes
          phases = t.PreferredPhases.replace(/[\[\]]/g, '').split(',').map((p:any) => parseInt(p.trim())).filter((p:any) => !isNaN(p));
        }
      } else {
        // Handle single number
        const singlePhase = parseInt(t.PreferredPhases);
        if (!isNaN(singlePhase)) {
          phases = [singlePhase];
        }
      }
      
      // Distribute duration across preferred phases
      phases.forEach(phase => {
        phaseTaskDurations.set(phase, (phaseTaskDurations.get(phase) || 0) + duration / phases.length);
      });
    }
  });

  // Calculate total worker slots per phase (assuming 5 phases max)
  for (let phase = 1; phase <= 5; phase++) {
    workers.forEach((w) => {
      try {
        let availableSlots;
        if (w.AvailableSlots.startsWith('[') && w.AvailableSlots.endsWith(']')) {
          availableSlots = JSON.parse(w.AvailableSlots);
        } else {
          availableSlots = w.AvailableSlots.replace(/[\[\]]/g, '').split(',').map((x: string) => Number(x.trim()));
        }
        
        const maxLoad = Number(w.MaxLoadPerPhase);
        
        if (Array.isArray(availableSlots) && !isNaN(maxLoad)) {
          const currentSlots = phaseWorkerSlots.get(phase) || 0;
          phaseWorkerSlots.set(phase, currentSlots + Math.min(maxLoad, availableSlots.length));
        }
      } catch {
        // Already handled in malformed lists validation
      }
    });
  }

  // Check for phase saturation
  phaseTaskDurations.forEach((totalDuration, phase) => {
    const totalSlots = phaseWorkerSlots.get(phase) || 0;
    if (totalDuration > totalSlots) {
      errors.push({
        error: `Phase ${phase} is oversaturated: total task duration (${Math.round(totalDuration)}) > total worker slots (${totalSlots})`,
        entity: "tasks",
        rowId: `phase_${phase}`,
      });
    }
  });

  // --- Validation 11: Skill-coverage matrix ---
  const allRequiredSkills = new Set<string>();
  const allWorkerSkills = new Set<string>();

  // Collect all required skills
  tasks.forEach((t) => {
    try {
      let skills;
      if (t.RequiredSkills.startsWith('[') && t.RequiredSkills.endsWith(']')) {
        skills = JSON.parse(t.RequiredSkills);
      } else {
        skills = t.RequiredSkills.split(',').map((s: string) => s.trim());
      }
      if (Array.isArray(skills)) {
        skills.forEach((skill: string) => allRequiredSkills.add(skill));
      }
    } catch {
      // Already handled in malformed lists validation
    }
  });

  // Collect all worker skills
  workers.forEach((w) => {
    try {
      let skills;
      if (w.Skills.startsWith('[') && w.Skills.endsWith(']')) {
        skills = JSON.parse(w.Skills);
      } else {
        skills = w.Skills.split(',').map((s: string) => s.trim());
      }
      if (Array.isArray(skills)) {
        skills.forEach((skill: string) => allWorkerSkills.add(skill));
      }
    } catch {
      // Already handled in malformed lists validation
    }
  });

  // Check skill coverage
  allRequiredSkills.forEach((skill) => {
    if (!allWorkerSkills.has(skill)) {
      errors.push({
        error: `Required skill '${skill}' is not available in any worker`,
        entity: "tasks",
        rowId: "skill_coverage",
        field: "RequiredSkills",
      });
    }
  });

  // --- Validation 12: Max-concurrency feasibility ---
  tasks.forEach((t) => {
    try {
      let requiredSkills;
      if (t.RequiredSkills.startsWith('[') && t.RequiredSkills.endsWith(']')) {
        requiredSkills = JSON.parse(t.RequiredSkills);
      } else {
        requiredSkills = t.RequiredSkills.split(',').map((s: string) => s.trim());
      }
      const maxConcurrent = Number(t.MaxConcurrent);
      
      if (Array.isArray(requiredSkills) && !isNaN(maxConcurrent)) {
        // Count qualified workers for this task
        let qualifiedWorkers = 0;
        
        workers.forEach((w) => {
          try {
            let workerSkills;
            if (w.Skills.startsWith('[') && w.Skills.endsWith(']')) {
              workerSkills = JSON.parse(w.Skills);
            } else {
              workerSkills = w.Skills.split(',').map((s: string) => s.trim());
            }
            if (Array.isArray(workerSkills)) {
              const hasAllSkills = requiredSkills.every((skill: string) => 
                workerSkills.includes(skill)
              );
              if (hasAllSkills) {
                qualifiedWorkers++;
              }
            }
          } catch {
            // Already handled in malformed lists validation
          }
        });

        if (maxConcurrent > qualifiedWorkers) {
          errors.push({
            error: `Task ${t.TaskID} MaxConcurrent (${maxConcurrent}) > qualified workers (${qualifiedWorkers})`,
            entity: "tasks",
            rowId: t.TaskID,
            field: "MaxConcurrent",
          });
        }
      }
    } catch {
      // Already handled in malformed lists validation
    }
  });

  return errors;
}