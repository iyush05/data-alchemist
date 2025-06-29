
// export async function aiSuggestions () {
//     const prompt = `
// You are a data cleanup assistant.  

// Here is the data (clients, workers, tasks):  

// Clients: ${JSON.stringify(clients)}  
// Workers: ${JSON.stringify(workers)}  
// Tasks: ${JSON.stringify(tasks)}  

// These are the validation errors:  
// ${validationErrors.join("\n")}  

// For each error, suggest an exact fix for the affected data row/field.  
// Give your answer as a JSON array, where each object has:  

// {
//   "error": "<original error>",
//   "suggestedFix": "<what to change (in plain English)>",
//   "fieldToChange": "<field name>",
//   "rowIdentifier": "<example: ClientID/WorkerID/TaskID>"
// }
// `;

//   try {
//     const response = await axios.post(
//       "https://api.anthropic.com/v1/messages", // Claude API endpoint
//       {
//         model: "claude-sonnet-4-20250514",  // or whichever model you want
//         max_tokens: 800,
//         temperature: 0,
//         messages: [
//           { role: "user", content: prompt }
//         ]
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "x-api-key": process.env.CLAUDE_API_KEY  // Your Claude API Key
//         }
//       }
//     );

//     const aiText = response.data.content[0].text;
// }catch (error) {
//     console.error(error.response?.data || error);
//     res.status(500).json({ error: "AI Error Suggesting Fixes" });
// }