'use client'

import React, { useState, useEffect } from 'react';

type CriteriaKey =
  | 'priorityLevel'
  | 'requestedTasksFulfillment'
  | 'fairness'
  | 'skillMatchStrictness'
  | 'durationEfficiency';

const CRITERIA: Record<CriteriaKey, string> = {
  priorityLevel: 'Client Priority',
  requestedTasksFulfillment: 'Task Fulfillment',
  fairness: 'Fair Distribution',
  skillMatchStrictness: 'Skill Match Strictness',
  durationEfficiency: 'Short Duration Preference',
};

interface Props {
  onChange?: (weights: Record<CriteriaKey, number>) => void;
}

export default function SliderPrioritizationWeightsPanel({ onChange }: Props) {
  const [weights, setWeights] = useState<Record<CriteriaKey, number>>({
    priorityLevel: 5,
    requestedTasksFulfillment: 5,
    fairness: 5,
    skillMatchStrictness: 5,
    durationEfficiency: 5,
  });

  // Normalize weights so their sum = 1.0
  const getNormalizedWeights = (): Record<CriteriaKey, number> => {
    const total = Object.values(weights).reduce((sum, val) => sum + val, 0);
    const normalized: Record<CriteriaKey, number> = {} as any;
    Object.entries(weights).forEach(([key, val]) => {
      normalized[key as CriteriaKey] = total === 0 ? 0 : parseFloat((val / total).toFixed(4));
    });
    return normalized;
  };

  useEffect(() => {
    if (onChange) {
      onChange(getNormalizedWeights());
    }
  }, [weights]);

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg space-y-6 max-w-xl mx-auto">
      <h2 className="text-xl font-semibold">Set Prioritization Weights</h2>
      {Object.entries(CRITERIA).map(([key, label]) => (
        <div key={key} className="flex flex-col space-y-1">
          <label htmlFor={key} className="text-sm font-medium text-gray-700">
            {label}: {weights[key as CriteriaKey]}
          </label>
          <input
            id={key}
            type="range"
            min={0}
            max={10}
            step={1}
            value={weights[key as CriteriaKey]}
            onChange={(e) =>
              setWeights((prev) => ({
                ...prev,
                [key]: Number(e.target.value),
              }))
            }
            className="w-full"
          />
        </div>
      ))}
      <div className="text-sm text-gray-600 pt-2 border-t">
        Weights will be automatically normalized for export.
      </div>
    </div>
  );
}
