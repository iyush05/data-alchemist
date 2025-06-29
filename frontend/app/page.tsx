"use client";

import React, { useState, useCallback, useMemo } from "react";
import axios from "axios";
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import ValidationErrorDisplay from "../components/ValidationErrorDisplay"
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import RulesDropDown from "@/components/rulesDropDown";
import {CellClickedEvent} from 'ag-grid-community'
import SlotSelection from "@/components/slotSelection";
import GroupSelection from "@/components/groupSelection";
import ValidateSlotRestrictionRule from "../utils/validatesSlotRestrictionRule"
import isValidPhaseInput from "@/utils/isValidPhaseInput";
import validateLoadLimitRule from "@/utils/validateLoadLimitRule";
import SliderPrioritizationWeightsPanel from "@/components/SliderPrioritizationUI";
import SearchSummary from "@/components/SearchSummary";
import downloadAllTablesSeparately from "@/utils/downloadTables";

ModuleRegistry.registerModules([ AllCommunityModule ]);

interface RowData {
  [key: string]: any;
}

interface TableData {
  name: string;
  rows: RowData[];
}

interface ValidationError {
  error: string;
  entity: string;
  rowId: string;
  field?: string;
}

// Rule interface matching your component types
interface Rule {
  id: number;
  type: 'Co-run' | 'Load-limit' | 'Phase-window' | 'Slot Restriction' | 'Pattern Match' | 'Precedence Override';
  tasks?: string[];
  // workerGroup?: string;
  group?: string;
  max?: number;
  task?: string;
  phases?: string;
  // Additional fields for slot restriction
  slots?: number;
  minCommonSlots?: number;
  groupType?: 'WorkerGroup' | 'ClientGroup';
  pattern?: string;
  precedence?: number;
  maxSlotsPerPhase?: number;
  phaseWindowTasks?: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef[][]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [rule, setRule] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [slotSelection, setSlotSelection] = useState("");
  const [groupSelect, setGroupSelect] = useState("");
  const [minCommonSlots, setMinCommonSlots] = useState(0);
  const [maxSlotsPerPhase, setMaxSlotsPerPhase] = useState(0);
  const [allowedPhase, setAllowedPhase] = useState<string>("")
  const [prioritizationWeights, setPrioritizationWeights] = useState({});
  const [aiQuery, setAiQuery] = useState("");
  // State for storing all rules
  const [rules, setRules] = useState<Rule[]>([]);
  const [nextRuleId, setNextRuleId] = useState(1);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [searchSummary, setSearchSummary] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Modified to accept tables parameter
  const runValidation = async (tablesToValidate: TableData[] = tables) => {
    try {
      // Map tables to respective entities
      const clients = tablesToValidate.find((t) => t.name.toLowerCase().includes("client"))?.rows || [];
      const workers = tablesToValidate.find((t) => t.name.toLowerCase().includes("worker"))?.rows || [];
      const tasks = tablesToValidate.find((t) => t.name.toLowerCase().includes("task"))?.rows || [];


      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/validate`, {
        clients,
        workers,
        tasks,
      });
      setValidationErrors(response.data.errors || []);
    } catch (error) {
      console.error("Validation failed", error);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log(process.env.NEXT_PUBLIC_API_URL);
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploaded: TableData[] = response.data.data;

      // Add unique IDs to each row to prevent key conflicts
      const processedTables = uploaded.map(table => ({
        ...table,
        rows: table.rows.map((row, index) => ({
          ...row,
          _uniqueId: row._uniqueId || `${table.name}_row_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        }))
      }));

      // Generate column definitions for AG Grid
      const generatedColumnDefs = processedTables.map((table) => {
        const firstRow = table.rows[0] || {};
        return Object.keys(firstRow)
          .filter(key => key !== '_uniqueId')
          .map((key) => ({
            field: key,
            headerName: key,
            editable: true,
            resizable: true,
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 100,
            cellEditor: 'agTextCellEditor',
            cellEditorParams: {
              maxLength: 200
            }
          } as ColDef))
      });

      setTables(processedTables);
      setColumnDefs(generatedColumnDefs);
      setActiveIndex(0);
      
      await runValidation(processedTables);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setLoading(false);
    }
  };

  function downloadJSON(data: any, filename = "data.json") {
  const exportRules = { ...rules, ...prioritizationWeights}
  const jsonStr = JSON.stringify(exportRules, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

  const handleAddRule = () => {
    if (!rule) return;

    let newRule: Rule;

    switch (rule) {
      case "Co-run":
        if (selectedTasks.length === 0) {
          alert("Please select at least one task for Co-run rule");
          return;
        }
        newRule = {
          id: nextRuleId,
          type: 'Co-run',
          tasks: [...selectedTasks]
        };
        break;
      
      case "Slot Restriction":
        // Validate slot restriction inputs
        if (!slotSelection || !groupSelect) {
          alert("Please select both slot limit and group type for Slot Restriction rule");
          return;
        }
        
        if (isNaN(minCommonSlots) || minCommonSlots <= 0) {
          alert("Please enter a valid number of slots");
          return;
        }
        newRule = {
          id: nextRuleId,
          type: 'Slot Restriction',
          minCommonSlots: minCommonSlots === undefined ? 0 : minCommonSlots,
          groupType: slotSelection as 'WorkerGroup' | 'ClientGroup',
          // workerGroup: groupSelect === 'worker' ? 'WorkerGroup' : undefined,
          group: groupSelect
          // You might want to collect specific group names from UI
        };
        const error = ValidateSlotRestrictionRule(tables, newRule); //error = null means validation passed
        if(error) {
          alert(`Slot Restriction failed for ${slotSelection} ${groupSelect}: Required minimum ${minCommonSlots} common slots.`)
          return;
        }
        break;
      
        case "Load Limit":
        newRule = {
          id: nextRuleId,
          type: 'Load-limit',
          group: groupSelect,
          maxSlotsPerPhase: maxSlotsPerPhase
        };
        const loadError = validateLoadLimitRule(tables, newRule);
        if(loadError) {
          alert(`Load Limit Rule failed: ${loadError}`)
          return;
        }
        break;

      case "Phase-window":
        if(!isValidPhaseInput(allowedPhase)) {
            alert("Invalid Allowed Phase Input")
            return
          }
        newRule = {
          id: nextRuleId,
          type: 'Phase-window',
          phaseWindowTasks: selectedTasks.at(-1), 
          phases: allowedPhase 
        };
        break;
      
      case "Pattern Match":
        newRule = {
          id: nextRuleId,
          type: 'Pattern Match',
          pattern: "default_pattern" // You might want to collect this from UI
        };
        break;
      
      case "Precedence Override":
        newRule = {
          id: nextRuleId,
          type: 'Precedence Override',
          precedence: 1 // You might want to collect this from UI
        };
        break;
      
      default:
        return;
    }

    // Add the new rule to the rules array
    setRules(prevRules => [...prevRules, newRule]);
    setNextRuleId(prev => prev + 1);
    
    // Reset form
    setRule("");
    setSelectedTasks([]);
    setSlotSelection("");
    setGroupSelect("");
    
  };

  const handleMinCommonSlots = (e: any) => {
    e.preventDefault()
    setMinCommonSlots(e.target.value);
  }

  const handleMaxSlotsPerPhase = (e: any) => {
    e.preventDefault()
    setMaxSlotsPerPhase(e.target.value);
  }

  const handleAllowedPhase = (e: any) => {
    e.preventDefault()
    setAllowedPhase(e.target.value);
  }

  const handleExportRules = () => {
    downloadJSON(rule)
  }

  const handleExportClients = () => {
    downloadAllTablesSeparately(tables)
  }

  const handleDeleteRule = (ruleId: number) => {
    setRules(prevRules => prevRules.filter(rule => rule.id !== ruleId));
  };

  // Handle cell value changes
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const { data, colDef, newValue } = event;
    
    // Update the data in state
    const updatedTables = [...tables];
    const activeTable = updatedTables[activeIndex];
    const rowIndex = activeTable.rows.findIndex(row => row._uniqueId === data._uniqueId);
    
    if (rowIndex !== -1 && colDef.field) {
      activeTable.rows[rowIndex][colDef.field] = newValue;
      setTables(updatedTables);
      
      // Run validation on updated data
      await runValidation(updatedTables);
    }
  }, [tables, activeIndex]);

  const handleOptionSelect = (value: string) => {
    setRule(value);
    // Reset selected tasks when changing rule type
    setSelectedTasks([]);
    setSlotSelection("");
    setGroupSelect("");
  } 

  const handleSlotSelect = (value: string) => {
    setSlotSelection(value);
  }

  const handleGroupSelect = (value: string) => {
    setGroupSelect(value);
  }

  const handleAiQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAiQuery(event?.target.value);
  }

  const handleAssistant = async() => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/llm/search`, {data: tables, query: aiQuery}, {
      headers: { "Content-Type": "application/json" },
    })
    setSearchSummary(response.data.summary || response.data.message || JSON.stringify(response.data, null, 2));
    setShowSearchPopup(true);
    } catch(error) {
        console.error("AI Assistant failed", error);
        setSearchSummary("Error: Failed to get response from AI Assistant. Please try again.");
        setShowSearchPopup(true);
    } finally {
        setIsAiLoading(false);
    }
  }

    const closeSearchPopup = () => {
    setShowSearchPopup(false);
  };

  // AG Grid configuration
  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    editable: true,
  }), []);

  const gridOptions = useMemo(() => ({
    theme: 'legacy',
    enableCellTextSelection: true,
    suppressMovableColumns: false,
    animateRows: true,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    getRowId: (params: any) => params.data._uniqueId,
  }), []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // Grid is ready, can perform additional setup if needed
  }, []);

  const onCellClicked = (event: CellClickedEvent) => {
    if(rule == "Co-run" && event.value && event.value.startsWith("T")) {
      // Avoid duplicates
      if (!selectedTasks.includes(event.value)) {
        setSelectedTasks(prev => [...prev, event.value]);
      }
    }
    if(rule == "Phase-window" && event.value && event.value.startsWith("T")) {
      // Avoid duplicates
      if (!selectedTasks.includes(event.value)) {
        setSelectedTasks(prev => [...prev, event.value]);
      }
    }
  };

  // Current active table data
  const currentRowData = useMemo(() => {
    return tables[activeIndex]?.rows || [];
  }, [tables, activeIndex]);

  const currentColumnDefs = useMemo(() => {
    const baseDefs = columnDefs[activeIndex] || [];
    
    
    // Add cellClassRules dynamically based on current validation errors
    return baseDefs.map(colDef => ({
      ...colDef,
      cellClassRules: {
        'cell-error': (params: any) => {
          const hasError = validationErrors.some(error => {
            // Try multiple ways to match the row
            const idMatches = [
              error.rowId === params.data._uniqueId,
              error.rowId === params.data.id,
              error.rowId === params.data.ClientID,
              error.rowId === params.data.WorkerID,
              error.rowId === params.data.TaskID,
              error.rowId === String(params.node.rowIndex + 1), // 1-based index
              error.rowId === String(params.node.rowIndex), // 0-based index
            ];
            
            const rowMatch = idMatches.some(match => match);
            
            // Check field match - if error.field is undefined/null, highlight the identifying column
            let fieldMatch = false;
            if (error.field) {
              // Specific field error
              fieldMatch = error.field === colDef.field;
            } else {
              // Row-level error - highlight the identifying column based on entity
              if (error.entity === 'clients' && colDef.field === 'ClientID') {
                fieldMatch = true;
              } else if (error.entity === 'workers' && colDef.field === 'WorkerID') {
                fieldMatch = true;
              } else if (error.entity === 'tasks' && colDef.field === 'TaskID') {
                fieldMatch = true;
              }
            }
            
            return rowMatch && fieldMatch;
          });
          
          return hasError;
        }
      },
      // Also try cellStyle as backup
      cellStyle: (params: any) => {
        const hasError = validationErrors.some(error => {
          const idMatches = [
            error.rowId === params.data._uniqueId,
            error.rowId === params.data.id,
            error.rowId === params.data.ClientID,
            error.rowId === params.data.WorkerID,
            error.rowId === params.data.TaskID,
            error.rowId === String(params.node.rowIndex + 1),
            error.rowId === String(params.node.rowIndex),
          ];
          
          const rowMatch = idMatches.some(match => match);
          
          let fieldMatch = false;
          if (error.field) {
            fieldMatch = error.field === colDef.field;
          } else {
            // Row-level error - highlight the identifying column
            if (error.entity === 'clients' && colDef.field === 'ClientID') {
              fieldMatch = true;
            } else if (error.entity === 'workers' && colDef.field === 'WorkerID') {
              fieldMatch = true;
            } else if (error.entity === 'tasks' && colDef.field === 'TaskID') {
              fieldMatch = true;
            }
          }
          
          return rowMatch && fieldMatch;
        });
        
        if (hasError) {
          return {
            backgroundColor: '#fee2e2 !important',
            border: '2px solid #dc2626 !important'
          };
        }
        return null;
      }
    }));
  }, [columnDefs, activeIndex, validationErrors]);

  return (
    <div className="p-6">
      <div className="flex">
        <div>
          <h1 className="text-2xl font-bold mb-4">Upload CSV/XLSX and Edit Grid</h1>

      <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} className="mb-2" />
        </div>
      <button
        onClick={handleUpload}
        disabled={loading || !file}
        className="px-4 py-2 bg-blue-500 text-white rounded mb-6 mt-10 disabled:bg-gray-400"
      >
        {loading ? "Uploading..." : "Upload and Show Grid"}
      </button>
      <div className="justify-end ml-12 h-fit">
        <button className="rounded text-white h-8 border bg-green-700 px-3 mx-4 mt-10" onClick={handleExportRules}>Export Rules</button>
        <button className="rounded text-white h-8 border bg-green-700 px-3" onClick={handleExportClients}>Export Tables</button>
      </div>
      </div>
      {tables.length > 0 && (
        <div>
          {/* Tab Bar */}
          <div className="flex space-x-2 mb-4 border-b pb-2 w-full">
            {tables.map((table, index) => (
              <button
                key={index}
                className={`px-4 py-2 rounded-t transition-colors ${
                  index === activeIndex
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                {table.name || `Table ${index + 1}`}
              </button>
            ))}
            <div className="ml-auto">
              <label className="pr-2 font-stretch-125%">AI Assistant</label>
              <input type="text" placeholder="Enter your query" className="border rounded-3xl w-xs mx-2 px-3 h-10" value={aiQuery} onChange={handleAiQuery}/>
              <button className="rounded-md border p-1 text-gray-100 hover: cursor-pointer px-4 bg-blue-500" onClick={handleAssistant}>Submit</button>
            </div>
          </div>

            {showSearchPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="relative bg-white rounded-xl p-6 max-w-4xl max-h-[80vh] overflow-y-auto m-4 w-full">
                <button
                  onClick={closeSearchPopup}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold z-10"
                >
                  ×
                </button>
                <div className="pr-8">
                  <h2 className="text-xl font-semibold mb-4">AI Assistant Response</h2>
                  <SearchSummary summary={searchSummary} />
                </div>
              </div>
            </div>
          )}

          {/* AG Grid */}
          <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
            <AgGridReact
              rowData={currentRowData}
              columnDefs={currentColumnDefs}
              defaultColDef={defaultColDef}
              gridOptions={gridOptions}
              onGridReady={onGridReady}
              onCellValueChanged={onCellValueChanged}
              suppressMenuHide={true}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              onCellClicked={onCellClicked}
            />
          </div>

          {/* Validation Errors */}
          <div className="grid grid-cols-4 gap-2 pb-4">
              <div className="col-span-2 w-full px-4">
                <h1 className='text-3xl font-semibold font-sans pl-4 pt-3'>Validation Errors</h1>
            <div className="max-h-96 w-full px-4 mt-2 overflow-y-auto rounded">
              <ValidationErrorDisplay errors={validationErrors} />
            </div>
            </div>
            <div className="col-span-2 px-4 pt-4 font-semibold font-sans gap-3">
              <div className="text-2xl font-sans font-semibold pb-4">Create New Rule</div>
              <div className="flex gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Type:
                </label>
                <div><RulesDropDown onSelect={handleOptionSelect}/></div>
                </div>
              <div>
                {(() => {
                  switch (rule) {
                    case "Co-run":
                      return <div className="text-gray-800">
                        <p>Selected Tasks: {selectedTasks.length > 0 ? selectedTasks.join(", ") : "None"}</p>
                        <p className="text-sm text-gray-600">Click on TaskID cells to select them</p>
                      </div>
                    break;
                    case "Slot Restriction":
                      return <div className="space-y-3 flex gap-1">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Group Category
                          </label>
                          <SlotSelection onSelect={handleSlotSelect} />
                          {slotSelection && (
                            <p className="text-sm text-gray-600 mt-1">
                              Selected: {slotSelection} slots
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Group Type:
                          </label>
                          <GroupSelection onSelect={handleGroupSelect}/>
                          {groupSelect && (
                            <p className="text-sm text-gray-600 mt-1">
                              Selected: {groupSelect} group restriction
                            </p>
                          )}
                        </div>
                        {slotSelection && groupSelect && (
                          <div className="bg-blue-50 p-2 rounded text-sm">
                            <strong>Rule Summary:</strong> Limit {groupSelect} groups to maximum {slotSelection} slots
                          </div>
                        )}
                        <div className="w-14 rounded-md font-medium text-md pr-4">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            minCommonSlots:
                          </label>
                          <input type="number" className="w-14 rounded border pl-1" value={minCommonSlots} onChange={handleMinCommonSlots} />
                        </div>
                      </div>
                    break;
                    case "Load Limit":
                      return <div className="flex">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Group:
                          </label>
                        <GroupSelection onSelect={handleGroupSelect}/>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            maxSlotsPerPhase:
                          </label>
                        <input type="number" value={maxSlotsPerPhase} className="w-14 rounded border pl-1 ml-1 mt-2" onChange={handleMaxSlotsPerPhase}/>
                        </div>
                          <div className="bg-blue-50 p-2 rounded text-sm w-42 ml-1">
                            <strong>Rule Summarry:</strong> Limit total task assignments for workers in group {groupSelect} to no more than {maxSlotsPerPhase} tasks per phase.
                          </div>
                      </div>
                    break;
                    case "Phase-window":
                      return <div className="flex">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            TaskID:
                          </label>
                        <p>Selected Tasks: {selectedTasks.length > 0 ? selectedTasks.at(-1) : "None"}</p>
                        <p className="text-sm text-gray-600">Click on TaskID cells to select them</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Allowed Phase List/Range:
                          </label>
                          <input type="text" placeholder="eg: [1,2,3] or 2-5" className="h-6 px-1 border rounded" value={allowedPhase} onChange={handleAllowedPhase}/>
                        </div>
                      </div>
                    break;
                    case "Pattern Match":
                      return <div>Pattern Match</div>
                    break;
                    case "Precedence Override":
                      return <div>Precedence Override</div>
                    break;
                    default:
                      break;
                  }
                })()}
              </div>
              <button 
                className="bg-blue-500 rounded-sm px-2 text-white hover:cursor-pointer h-8 disabled:bg-gray-400 ml-6 mt-6" 
                onClick={handleAddRule}
                disabled={
                  !rule || 
                  (rule === "Co-run" && selectedTasks.length === 0) ||
                  (rule === "Slot Restriction" && (!slotSelection || !groupSelect))
                }
              >
                Add Rule
              </button>
              </div>
              <div className="pt-4 text-2xl font-semibold font-sans">Current Rules:</div>
              <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                {rules.length === 0 ? (
                  <p className="text-gray-500 text-sm">No rules created yet</p>
                ) : (
                  rules.map((rule, index) => (
                    <div key={rule.id} className="bg-gray-100 p-3 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">Rule {index + 1}: {rule.type}</span>
                          <div className="text-sm text-gray-600 mt-1">
                            {rule.type === 'Co-run' && rule.tasks && (
                              <span>Tasks: {rule.tasks.join(", ")}</span>
                            )}
                            {rule.type === 'Load-limit' && (
                              <span>Group: {rule.group}, MaxSlotsPerPhase: {rule.maxSlotsPerPhase}</span>
                            )}
                            {rule.type === 'Phase-window' && (
                              <span>Task: {rule.phaseWindowTasks}, Phases: {rule.phases}</span>
                            )}
                            {rule.type === 'Slot Restriction' && (
                              <span>
                                Min Slots: {rule.minCommonSlots}, Group Type: {rule.groupType}
                                {rule.group && `, Group: ${rule.group}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
            <div className="flex justify-center p-4 w-1/2 border-t text-gray-700">
            <div className="shadow-2xl w-xl"><SliderPrioritizationWeightsPanel onChange={setPrioritizationWeights} /></div>
          </div>
        </div>
      )}

      {/* Custom CSS for error styling */}
      <style jsx global>{`
        .cell-error {
          background-color: #fee2e2 !important;
          border: 1px solid #dc2626 !important;
        }
        
        .ag-theme-alpine .ag-row-hover {
          background-color: #f3f4f6;
        }
        
        .ag-theme-alpine .ag-cell-focus {
          border: 2px solid #3b82f6 !important;
        }
      `}</style>
    </div>
  );
}