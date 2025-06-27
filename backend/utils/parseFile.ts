import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export async function parseCSVFile(buffer: Buffer) {
  const content = buffer.toString("utf8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  return records;
}

export async function parseExcelFile(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const tables = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]!;
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return {
      name: sheetName,
      rows: data
    };
  });

  return tables; // Array<{ name: string, rows: RowData[] }>
}
