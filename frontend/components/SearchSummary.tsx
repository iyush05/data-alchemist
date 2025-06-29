"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface SearchSummaryProps {
  summary: string;
}

const SearchSummary: React.FC<SearchSummaryProps> = ({ summary }) => {
  return (
    <div className="border rounded-xl p-4 bg-gray-50 max-w-2xl mx-auto text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          h2: ({ ...props }) => (
            <h2 className="text-lg font-semibold mt-4 mb-2" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside ml-4 mb-2" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="mb-1" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-2" {...props} />
          ),
        }}
      >
        {summary}
      </ReactMarkdown>
    </div>
  );
};

export default SearchSummary;