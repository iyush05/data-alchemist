import ClaudeClient from "@anthropic-ai/sdk";

const claude = new ClaudeClient({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface Table {
  name: string;
  rows: Record<string, any>[];
}

interface FilterRequest {
  tables: Table[];
  query: string;
}

interface SchemaInfo {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    sampleValues: any[];
  }>;
  rowCount: number;
}

// Enhanced schema analysis with type inference
function inferColumnType(values: any[]): string {
  const nonNullValues = values.filter(v => v != null);
  if (nonNullValues.length === 0) return 'unknown';
  
  const types = new Set(nonNullValues.map(v => typeof v));
  if (types.size === 1) {
    const type = types.values().next().value;
    if (type === 'number') {
      return nonNullValues.every(v => Number.isInteger(v)) ? 'integer' : 'number';
    }
    return type;
  }
  return 'mixed';
}

// STEP 1: Enhanced schema summary with type information
export default function generateSchemaSummary(tables: Table[]): string {
  const schemas: SchemaInfo[] = tables.map(table => {
    if (table.rows.length === 0) {
      return {
        tableName: table.name,
        columns: [],
        rowCount: 0
      };
    }

    const headers = Object.keys(table.rows[0]);
    const columns = headers.map(header => {
      const values = table.rows.slice(0, 10).map(row => row[header]);
      const uniqueValues = [...new Set(values)].slice(0, 5);
      
      return {
        name: header,
        type: inferColumnType(values),
        sampleValues: uniqueValues
      };
    });

    return {
      tableName: table.name,
      columns,
      rowCount: table.rows.length
    };
  });

  return schemas.map(schema => 
    `Table: ${schema.tableName} (${schema.rowCount} rows)
Columns:
${schema.columns.map(col => 
  `  - ${col.name}: ${col.type} (samples: ${col.sampleValues.map(v => JSON.stringify(v)).join(', ')})`
).join('\n')}
`).join('\n');
}

// STEP 2: Enhanced prompt with better examples and constraints
export function buildClaudePrompt(schemaSummary: string, query: string): string {
  return `You are an expert JavaScript developer creating data filtering functions.

AVAILABLE TABLES:
${schemaSummary}

USER QUERY: "${query}"

Generate a JavaScript function that:
1. Accepts tables array (array of objects with name and rows properties)
2. Filters data based on the user query
3. Returns filtered tables with same structure
4. Handles case-insensitive string matching when appropriate
5. Supports common operations: equals, contains, greater than, less than, date ranges
6. Returns empty array if no matches found

IMPORTANT CONSTRAINTS:
- Return ONLY the function code, no explanations
- Use plain JavaScript (no TypeScript types)
- Handle null/undefined values safely
- Preserve original data structure
- Use descriptive variable names

Example structure:
\`\`\`javascript
function filterTables(tables) {
  // Your filtering logic here
  return filteredTables;
}
\`\`\``;
}

// STEP 3: Enhanced Claude integration with better error handling
export async function getFilterFunctionFromClaude(prompt: string): Promise<string> {
  try {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514", // Using Sonnet 4 for better efficiency
      max_tokens: 2048,
      temperature: 0,
      system: "You are a TypeScript expert. Generate clean, efficient filtering functions. Return only code, no explanations.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((m) => m.type === "text")?.text || "";
    
    // Try to extract code block first
    const codeBlockMatch = textContent.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Fallback: look for function definition
    const functionMatch = textContent.match(/function\s+filterTables[\s\S]*?(?=\n\n|\n$|$)/);
    if (functionMatch) {
      return functionMatch[0].trim();
    }

    // Last resort: return cleaned text
    return textContent.trim();
    
  } catch (error) {
    console.error('Error calling Claude:', error);
    throw new Error(`Failed to generate filter function: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to convert TypeScript to JavaScript
function stripTypeScript(code: string): string {
  return code
    // Remove type annotations from function parameters
    .replace(/(\w+):\s*[^,)]+/g, '$1')
    // Remove return type annotations
    .replace(/\):\s*[^{]+{/g, ') {')
    // Remove array type annotations like Array<...>
    .replace(/Array<[^>]+>/g, 'Array')
    // Remove interface references
    .replace(/:\s*\w+\[\]/g, '')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// STEP 4: Safe function execution with validation
export function executeFilterFunction(
  filterCode: string, 
  tables: Table[]
): Table[] {
  try {
    // Basic validation
    if (!filterCode.includes('function filterTables')) {
      throw new Error('Invalid function format');
    }

    // Convert TypeScript to JavaScript
    const jsCode = stripTypeScript(filterCode);
    
    // Create a safe execution context
    const safeEval = new Function('tables', `
      ${jsCode}
      return filterTables(tables);
    `);

    const result = safeEval(tables);
    
    // Validate result structure
    if (!Array.isArray(result)) {
      throw new Error('Function must return an array');
    }

    // Ensure all results have correct structure
    const validatedResult = result.filter(table => 
      table && 
      typeof table.name === 'string' && 
      Array.isArray(table.rows)
    );

    return validatedResult;
    
  } catch (error) {
    console.error('Error executing filter function:', error);
    throw new Error(`Filter execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// STEP 5: Main orchestration function
export async function filterTablesWithClaude(
  tables: Table[], 
  query: string
): Promise<Table[]> {
  try {
    // Generate schema summary
    const schemaSummary = generateSchemaSummary(tables);
    
    // Build prompt
    const prompt = buildClaudePrompt(schemaSummary, query);
    
    // Get filter function from Claude
    const filterCode = await getFilterFunctionFromClaude(prompt);
    
    // Execute and return results
    return executeFilterFunction(filterCode, tables);
    
  } catch (error) {
    console.error('Error in filterTablesWithClaude:', error);
    throw error;
  }
}

// Example usage:
/*
const tables: Table[] = [
  {
    name: "employees",
    rows: [
      { id: 1, name: "John Doe", department: "Engineering", salary: 75000 },
      { id: 2, name: "Jane Smith", department: "Marketing", salary: 65000 }
    ]
  }
];

const results = await filterTablesWithClaude(tables, "employees with salary > 70000");
*/