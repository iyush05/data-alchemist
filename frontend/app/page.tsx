"use client";

import React, { useState } from "react";
import axios from "axios";
import { DataGrid, Column, RenderEditCellProps } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { CellMouseArgs, CellMouseEvent } from "react-data-grid";

interface RowData {
  [key: string]: any;
}

interface TableData {
  name: string;
  rows: RowData[];
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [columns, setColumns] = useState<Column<RowData>[][]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const rowKeyGetter = (row: RowData) => row.id || row.ClientID || JSON.stringify(row);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  function onCellDoubleClick(args: CellMouseArgs<any, any>, event: CellMouseEvent) {
  if (args.column.key === 'id') {
    event.preventGridDefault();
  }
}

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8080/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploaded: TableData[] = response.data.data;

      const generatedColumns = uploaded.map((table) =>
        Object.keys(table.rows[0] || {}).map((key) => ({
          key,
          name: key,
          renderEditCell: (props: RenderEditCellProps<RowData>) => {
            return (
              <input
                className="w-full h-full px-2 border-0 outline-none"
                defaultValue={props.row[props.column.key] as string}
                onBlur={(event) => {
                  console.log('Saving value via blur:', event.target.value); // Debug log
                  props.onRowChange({ ...props.row, [props.column.key]: event.target.value });
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    console.log('Saving value via Enter:', (event.target as HTMLInputElement).value); // Debug log
                    props.onRowChange({ ...props.row, [props.column.key]: (event.target as HTMLInputElement).value });
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    props.onClose?.(true); // Close without saving
                  }
                }}
                autoFocus
              />
            );
          },
          editable: true,
          resizable: true,
        }))
      );

      setTables(uploaded);
      setColumns(generatedColumns);
      setActiveIndex(0);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableRowsChange = (newRows: RowData[]) => {
    console.log('Row change detected:', newRows); // Debug log
    const updated = [...tables];
    updated[activeIndex].rows = newRows;
    setTables(updated);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📤 Upload CSV/XLSX and Edit Grid</h1>

      <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} className="mb-2" />
      <button
        onClick={handleUpload}
        disabled={loading || !file}
        className="px-4 py-2 bg-blue-500 text-white rounded mb-6"
      >
        {loading ? "Uploading..." : "Upload and Show Grid"}
      </button>

      {tables.length > 0 && (
        <div>
          {/* Tab Bar */}
          <div className="flex space-x-2 mb-4 border-b pb-2">
            {tables.map((table, index) => (
              <button
                key={index}
                className={`px-4 py-2 rounded-t ${
                  index === activeIndex
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                {table.name || `Table ${index + 1}`}
              </button>
            ))}
          </div>

          {/* Active Grid */}
          <DataGrid
            columns={columns[activeIndex]}
            rows={tables[activeIndex].rows}
            onRowsChange={handleTableRowsChange}
            rowKeyGetter={(row) => row.ClientID || row.id || JSON.stringify(row)}
            className="rdg-light"
            style={{ height: 500 }}
            onCellDoubleClick={onCellDoubleClick}
          />

        </div>
      )}
    </div>
  );
}