// utils/downloadCSV.js
export function downloadCSV(data, filename = "report.csv") {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    data.map((row) => row.map(escapeCSVValue).join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCSVValue(value) {
  if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}