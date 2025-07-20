import { useLocation, useNavigate } from "react-router-dom";
import { downloadCSV } from "../../utils/downloadCSV";
import "../styles/DetailedOverview.css";
import { FileDown  } from 'lucide-react';
import React from "react";

const mismatches = [
  {
    index: 1,
    column: "product_id",
    source: "P1001",
    target: "P1002",
  },
  {
    index: 2,
    column: "quantity",
    source: "20",
    target: "25",
  },
  {
    index: 3,
    column: "price",
    source: "$100",
    target: "$105",
  },
  {
    index: 4,
    column: "description",
    source: "Blue Widget",
    target: "Green Widget",
  },
  {
    index: 5,
    column: "category",
    source: "Tools",
    target: "Hardware",
  },
  {
    index: 6,
    column: "sku",
    source: "SKU1234",
    target: "SKU4321",
  },
  {
    index: 7,
    column: "supplier",
    source: "Acme Corp",
    target: "Globex Inc",
  },
  {
    index: 8,
    column: "delivery_date",
    source: "2025-06-15",
    target: "2025-06-18",
  },
  {
    index: 9,
    column: "status",
    source: "Pending",
    target: "Shipped",
  },
];

export default function DetailedOverview() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get dynamic data from Reports.jsx
  const reportName = location.state?.reportName || "Detailed Overview Report";
  const generatedAt =
    location.state?.generatedAt || new Date().toLocaleString();

  const handleDownload = () => {
    const csvData = [
      [`Report Name: ${reportName}`],
      [`Generated At (UTC): ${new Date(generatedAt).toUTCString()}`],
      [],
      ["Row Index", "Column", "Source Value", "Target Value"],
      ...mismatches.map((item) => [
        item.index,
        item.column,
        item.source,
        item.target,
      ]),
    ];
    downloadCSV(csvData, "detailed_overview_report.csv");
  };

  return (
    <div className="summary-container">
      <div className="summary-header">
        <button className="back-link" onClick={() => navigate('/reports')}>
          &larr; Back to Reports
        </button>
        <button className="icon-button" onClick={handleDownload} title="Download CSV" style={{ marginLeft: '12px' }}>
          <FileDown size={30} />
        </button>
      </div>

      <div className="table-wrapper">
        <table className="summary-table">
          <thead>
            <tr>
              <th colSpan={4} style={{ textAlign: "left" }}>
                Report Name: {reportName}
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                Generated At (UTC): {new Date(generatedAt).toUTCString()}
              </th>
            </tr>
            <tr>
              <th>Row Index</th>
              <th>Column</th>
              <th>Source Value</th>
              <th>Target Value</th>
            </tr>
          </thead>
          <tbody>
            {mismatches.map((item, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "even-row" : "odd-row"}
              >
                <td>{item.index}</td>
                <td>{item.column}</td>
                <td>{item.source}</td>
                <td>{item.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}