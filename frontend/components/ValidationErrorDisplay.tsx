import React from 'react';
import { XCircle, CheckCircle } from 'lucide-react';

export interface ValidationError {
  error: string;
  entity: string;
  rowId: string;
  field?: string;
}

export interface ErrorDisplayProps {
  errors: ValidationError[];
}

const ValidationErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors }) => {
  const getEntityColor = (entity: string): string => {
    switch (entity) {
      case 'clients':
        return 'bg-blue-100 text-blue-800';
      case 'workers':
        return 'bg-green-100 text-green-800';
      case 'tasks':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!errors || errors.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <p className="text-gray-600">No errors found!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* <h1 className='text-3xl font-semibold font-sans'>Validation Errors</h1> */}
      {errors.map((error, index) => (
        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded mr-2 ${getEntityColor(error.entity)}`}>
                  {error.entity.toUpperCase()}
                </span>
                <span className="font-medium text-gray-900">{error.rowId}</span>
                {error.field && (
                  <>
                    <span className="text-gray-500 mx-2">•</span>
                    <span className="text-sm text-gray-700 font-medium">{error.field}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-700">{error.error}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ValidationErrorDisplay;