import React from 'react';

// Type definitions
type RuleType = 'Co-run' | 'Load-limit' | 'Phase-window';

interface BaseRuleProps {
  ruleNumber: number;
  type: RuleType;
  onDelete?: (ruleNumber: number) => void;
}

interface CoRunRuleProps extends BaseRuleProps {
  type: 'Co-run';
  tasks: string[];
  workerGroup?: never;
  max?: never;
  task?: never;
  phases?: never;
}

interface LoadLimitRuleProps extends BaseRuleProps {
  type: 'Load-limit';
  workerGroup: string;
  max: number;
  tasks?: never;
  task?: never;
  phases?: never;
}

interface PhaseWindowRuleProps extends BaseRuleProps {
  type: 'Phase-window';
  task: string;
  phases: number[];
  tasks?: never;
  workerGroup?: never;
  max?: never;
}

type RuleComponentProps = CoRunRuleProps | LoadLimitRuleProps | PhaseWindowRuleProps;

// Rule interface for state management
interface Rule {
  id: number;
  type: RuleType;
  tasks?: string[];
  workerGroup?: string;
  max?: number;
  task?: string;
  phases?: number[];
}

const RuleComponent: React.FC<RuleComponentProps> = ({ 
  ruleNumber, 
  type, 
  tasks = [], 
  workerGroup, 
  max, 
  task, 
  phases = [],
  onDelete 
}) => {
  const renderRuleContent = (): React.ReactElement => {
    switch (type) {
      case 'Co-run':
        return (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Tasks:</span>
            <div className="flex gap-1">
              {tasks.map((t, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>
        );
      
      case 'Load-limit':
        return (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">WorkerGroup:</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                {workerGroup}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Max:</span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-semibold">
                {max}
              </span>
            </div>
          </div>
        );
      
      case 'Phase-window':
        return (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">TaskID:</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                {task}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Phases:</span>
              <div className="flex gap-1">
                {phases.map((phase, index) => (
                  <span key={index} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                    {phase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return <span className="text-gray-500">Unknown rule type</span>;
    }
  };

  const getTypeColor = (): string => {
    switch (type) {
      case 'Co-run':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Load-limit':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'Phase-window':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const handleDelete = (): void => {
    if (onDelete) {
      onDelete(ruleNumber);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">
            Rule {ruleNumber}:
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor()}`}>
            {type}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>
      
      <div className="pl-2">
        {renderRuleContent()}
      </div>
    </div>
  );
};

// Helper function to create proper props based on rule type
const createRuleProps = (rule: Rule, onDelete: (ruleNumber: number) => void): RuleComponentProps => {
  const baseProps = {
    ruleNumber: rule.id,
    type: rule.type,
    onDelete
  };

  switch (rule.type) {
    case 'Co-run':
      return {
        ...baseProps,
        type: 'Co-run',
        tasks: rule.tasks || []
      } as CoRunRuleProps;
    
    case 'Load-limit':
      return {
        ...baseProps,
        type: 'Load-limit',
        workerGroup: rule.workerGroup || '',
        max: rule.max || 0
      } as LoadLimitRuleProps;
    
    case 'Phase-window':
      return {
        ...baseProps,
        type: 'Phase-window',
        task: rule.task || '',
        phases: rule.phases || []
      } as PhaseWindowRuleProps;
    
    default:
      throw new Error(`Unknown rule type: ${rule.type}`);
  }
};
