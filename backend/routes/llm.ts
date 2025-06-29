import express from 'express'
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface TableData {
  sheetName: string;
  headers: string[];
  rows: any[][];
}

interface SearchRequest {
  data: TableData[];
  query: string;
  maxResults?: number;
  includeContext?: boolean;
}

interface SearchResponse {
  results: any[];
  summary: string;
  executionTime: number;
  totalRowsSearched: number;
}

// Helper function to chunk large datasets
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Helper function to convert table data to CSV format for Claude
function tableToCSV(table: TableData, maxRows?: number): string {
  const rows = maxRows ? table.rows.slice(0, maxRows) : table.rows;
  const csvContent = [
    table.headers.join(','),
    ...rows.map(row => row.map(cell => 
      typeof cell === 'string' && cell.includes(',') 
        ? `"${cell.replace(/"/g, '""')}"` 
        : String(cell)
    ).join(','))
  ].join('\n');
  
  return csvContent;
}

// Helper function to get table summary for large datasets
function getTableSummary(table: TableData): string {
  const sampleSize = Math.min(5, table.rows.length);
  const sample = table.rows.slice(0, sampleSize);
  
  return `Sheet: ${table.sheetName}
Headers: ${table.headers.join(', ')}
Total Rows: ${table.rows.length}
Sample Data (first ${sampleSize} rows):
${tableToCSV({ ...table, rows: sample })}`;
}

// Main search route
router.post('/search', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { data, query, maxResults = 100, includeContext = false }: SearchRequest = req.body;

    // Validation
    if (!data || !Array.isArray(data) || data.length === 0) {
    res.status(400).json({
        error: 'Invalid data format. Expected array of table objects.'
      });
    }

    if (!query || typeof query !== 'string') {
        res.status(400).json({
        error: 'Query is required and must be a string.'
      });
    }

    let totalRowsSearched = 0;
    const allResults: any[] = [];

    // Process each table
    for (const table of data) {
      if (!table.headers || !table.rows || !Array.isArray(table.rows)) {
        continue;
      }

      totalRowsSearched += table.rows.length;

      // For very large datasets (>10k rows), use chunking and summary approach
      if (table.rows.length > 10000) {
        
        // First, get a summary and initial assessment
        const tableSummary = getTableSummary(table);
        
        const summaryPrompt = `Given this table summary and user query, determine if this table likely contains relevant data and suggest which columns might be most relevant:

Table Summary:
${tableSummary}

User Query: ${query}

Respond with:
1. Whether this table likely contains relevant data (yes/no)
2. Which specific columns are most relevant
3. What type of filtering or search criteria should be applied`;

        const summaryResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: summaryPrompt
          }]
        });

        const summaryAnalysis = summaryResponse.content[0].text;
        
        // If Claude determines the table is relevant, process it in chunks
        if (summaryAnalysis.toLowerCase().includes('yes')) {
          const chunks = chunkArray(table.rows, 1000);
          
          for (let i = 0; i < Math.min(chunks.length, 10); i++) { // Limit to first 10 chunks
            const chunk = chunks[i];
            const chunkTable = { ...table, rows: chunk };
            const csvData = tableToCSV(chunkTable);
            
            const chunkPrompt = `Search this data chunk for information relevant to the query. Return matching rows as JSON array.

Data:
${csvData}

Query: ${query}

Instructions:
- Return only rows that match the query criteria
- Format as JSON array of objects using headers as keys
- If no matches found, return empty array
- Limit to top ${Math.ceil(maxResults / 4)} most relevant results from this chunk`;

            const chunkResponse = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4000,
              messages: [{
                role: 'user',
                content: chunkPrompt
              }]
            });

            try {
              const chunkResults = JSON.parse(chunkResponse.content[0].text);
              if (Array.isArray(chunkResults)) {
                allResults.push(...chunkResults.map(result => ({
                  ...result,
                  _source: table.sheetName,
                  _chunk: i + 1
                })));
              }
            } catch (parseError) {
              console.error(`Error parsing chunk ${i + 1} results:`, parseError);
            }
          }
        }
      } else {
        // For smaller datasets, process normally
        const csvData = tableToCSV(table);
        
        const searchPrompt = `Search this data for information relevant to the query. Return matching rows as JSON array.

Data:
${csvData}

Query: ${query}

Instructions:
- Return only rows that match the query criteria
- Format as JSON array of objects using headers as keys
- If no matches found, return empty array
- Limit to top ${maxResults} most relevant results
- Include reasoning for why each result matches the query`;

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: searchPrompt
          }]
        });

        try {
          const results = JSON.parse(response.content[0].text);
          if (Array.isArray(results)) {
            allResults.push(...results.map(result => ({
              ...result,
              _source: table.sheetName
            })));
          }
        } catch (parseError) {
          console.error('Error parsing results:', parseError);
        }
      }
    }

    // Generate summary
    const summaryPrompt = `Based on the search query and results found, provide a concise summary of the findings:

Query: ${query}
Number of results: ${allResults.length}
Total rows searched: ${totalRowsSearched}

Results sample: ${JSON.stringify(allResults.slice(0, 3), null, 2)}

Provide a brief summary of what was found and key insights.`;

    const summaryResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    });

    const executionTime = Date.now() - startTime;

    const response: SearchResponse = {
      results: allResults.slice(0, maxResults),
      summary: summaryResponse.content[0].text,
      executionTime,
      totalRowsSearched
    };

    res.json(response);

  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({
      error: 'Internal server error during search operation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;