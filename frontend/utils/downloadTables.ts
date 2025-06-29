import * as XLSX from "xlsx";

export function downloadTableAsXLSX(tableData: any[] | {name: string, rows: any[]}, filename: string) {
  let dataToExport: any[];
  let sheetName = "Sheet1";

  // Handle different data structures
  if (Array.isArray(tableData)) {
    dataToExport = tableData;
  } else if (tableData && typeof tableData === 'object' && 'rows' in tableData) {
    dataToExport = tableData.rows;
    sheetName = tableData.name || "Sheet1";
  } else {
    console.error(`Expected array or object with 'rows' property for ${filename}, got:`, typeof tableData, tableData);
    return;
  }

  // Validate that we have an array to work with
  if (!Array.isArray(dataToExport)) {
    console.error(`Expected array in rows property for ${filename}, got:`, typeof dataToExport, dataToExport);
    return;
  }

  // Handle empty arrays
  if (dataToExport.length === 0) {
    console.warn(`No data to export for ${filename}`);
    return;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error(`Error exporting ${filename}:`, error);
  }
}

export default function downloadAllTablesSeparately(tables: Record<string, any[] | {name: string, rows: any[]}>) {
  // Validate input
  if (!tables || typeof tables !== 'object') {
    console.error('Expected tables object, got:', typeof tables, tables);
    return;
  }

  for (const [tableName, data] of Object.entries(tables)) {
    // Additional validation for each table
    if (data === null || data === undefined) {
      console.warn(`Skipping ${tableName}: data is null or undefined`);
      continue;
    }
    
    // Use the table's name if it has one, otherwise use the key
    const filename = (data && typeof data === 'object' && 'name' in data && data.name) 
      ? `${data.name}.xlsx` 
      : `${tableName}.xlsx`;
    
    downloadTableAsXLSX(data, filename);
  }
}