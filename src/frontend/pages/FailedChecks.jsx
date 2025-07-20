import React from "react";
import "../styles/FailedChecks.css";
import { FileDown  } from 'lucide-react';
import { useNavigate, useLocation } from "react-router-dom";
import { downloadCSV } from "../../utils/downloadCSV";

const failedChecks = [
  {
    name: "Null Value Check",
    field: "customer_id",
    source: "NULL",
    target: "",
    status: "Failed",
  },
  {
    name: "Data Type Consistency",
    field: "transaction_amount",
    source: "abc",
    target: "123.45",
    status: "Failed",
  },
  {
    name: "Range Validation",
    field: "age",
    source: "150",
    target: "30",
    status: "Failed",
  },
  {
    name: "Uniqueness Constraint",
    field: "email",
    source: "test@example.com",
    target: "test@example.com",
    status: "Failed",
  },
  {
    name: "Referential Integrity",
    field: "order_id",
    source: "ORD123",
    target: "N/A",
    status: "Failed",
  },
  {
    name: "Format Validation",
    field: "phone_number",
    source: "123-ABC-4567",
    target: "123-456-7890",
    status: "Failed",
  },
  {
    name: "Date Format",
    field: "order_date",
    source: "2023/13/01",
    target: "2023-01-01",
    status: "Failed",
  },
  {
    name: "Duplicate Records",
    field: "record_hash",
    source: "HashA",
    target: "HashA",
    status: "Failed",
  },
  {
    name: "Data Completeness",
    field: "address",
    source: "",
    target: "123 Main St",
    status: "Failed",
  },
];

export default function FailedCheck() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get report details from navigation state
  const reportName = location.state?.reportName || "Failed Checks Report";
  const generatedAt = location.state?.generatedAt || new Date().toLocaleString();

  const handleDownload = () => {
    const csvData = [
      [`Report Name: ${reportName}`],
      [`Generated At (UTC): ${new Date(generatedAt).toUTCString()}`],
      [],
      ["Check Name", "Field", "Source", "Target", "Status"],
      ...failedChecks.map((check) => [
        check.name,
        check.field,
        check.source,
        check.target,
        check.status,
      ]),
    ];

    downloadCSV(csvData, "failed_checks_report.csv");
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
              <th colSpan={5} style={{ textAlign: "left" }}>
                Report Name: {reportName}
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                Generated At (UTC): {new Date(generatedAt).toUTCString()}
              </th>
            </tr>
            <tr>
              <th>Check Name</th>
              <th>Field</th>
              <th>Source</th>
              <th>Target</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {failedChecks.map((check, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "even-row" : "odd-row"}>
                <td>{check.name}</td>
                <td>{check.field}</td>
                <td>{check.source}</td>
                <td>{check.target}</td>
                <td>
                  <span className="status-badge">{check.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}