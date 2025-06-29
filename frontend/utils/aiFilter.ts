import ClaudeClient  from "@anthropic-ai/sdk";

const claude = new ClaudeClient({ apiKey: process.env.CLAUDE_API_KEY! });

interface Table {
  name: string;
  rows: Record<string, any>[];
}

interface FilterRequest {
  tables: Table[];
  query: string;
}

// STEP 1: Extract column metadata and sample values (limit tokens)
function generateSchemaSummary(tables: Table[]): string {
  return tables
    .map((table) => {
      const headers = Object.keys(table.rows[0] || {});
      const samples = table.rows.slice(0, 2); // sample few rows
      return `Table: ${table.name}
Columns: ${headers.join(", ")}
Sample rows:
${samples
        .map((r) => JSON.stringify(r))
        .join("\n")}
`;
    })
    .join("\n");
}

// STEP 2: Create prompt to get a TypeScript filter function
function buildClaudePrompt(schemaSummary: string, query: string): string {
  return `You are an expert assistant helping filter structured table data.

The tables are described below:
${schemaSummary}

Based on the user query:
"${query}"

Return a single valid TypeScript function that accepts a 'tables' array in the following format:
Array<{ name: string, rows: Record<string, any>[] }>

Your function should:
- Find relevant table(s)
- Apply the filter logic
- Return ONLY those rows from each matching table
- Preserve all original keys and values
- Do not explain the code. Return ONLY the function.

Function signature:
function filterTables(tables: Table[]): Table[] {
  // your logic
}`;
}

// STEP 3: Request Claude to generate the filter
export async function getFilterFunctionFromClaude(req: FilterRequest): Promise<string> {
  const schema = generateSchemaSummary(req.tables);
  const prompt = buildClaudePrompt(schema, req.query);

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    temperature: 0,
    system: "You are a clean code TypeScript assistant.",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const codeBlock = response.content.find((m) => typeof m.text === "string")?.text || "";

  // Extract code block (strip triple backticks if present)
  const match = codeBlock.match(/```(?:ts|typescript)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : codeBlock.trim();
}
