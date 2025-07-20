import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/reports.css";

const Reports = () => {
  const navigate = useNavigate();

  const allReports = [
    {
      datetime: "6/24/2025, 5:06:11 AM",
      name: "Q1 Sales vs Q2 Forecast",
      status: "Completed",
    },
    {
      datetime: "6/23/2025, 11:06:11 PM",
      name: "Inventory Count Discrepancy",
      status: "Failed",
    },
    {
      datetime: "6/23/2025, 11:06:11 AM",
      name: "Monthly Transactions Mismatch",
      status: "Completed",
    },
    {
      datetime: "6/22/2025, 11:06:11 AM",
      name: "Customer Data Reconciliation Report",
      status: "Failed",
    },
    {
      datetime: "6/21/2025, 11:06:11 AM",
      name: "Product Catalog Update Report",
      status: "Completed",
    },
    {
      datetime: "6/20/2025, 11:06:11 AM",
      name: "User Profile Sync Errors",
      status: "Failed",
    },
    {
      datetime: "6/19/2025, 11:06:11 AM",
      name: "Out-of-Stock Analysis",
      status: "Completed",
    },
    {
      datetime: "6/18/2025, 11:06:11 AM",
      name: "Order Fulfillment Errors",
      status: "Failed",
    },
    {
      datetime: "6/17/2025, 11:06:11 AM",
      name: "Data Completeness Audit",
      status: "Completed",
    },
  ];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailedOverview, setShowDetailedOverview] = useState(false);
  const reportsPerPage = 3;

  const filteredReports = allReports.filter((report) => {
    const matchStatus =
      statusFilter === "All" || report.status === statusFilter;
    const matchSearch = report.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(
    indexOfFirstReport,
    indexOfLastReport
  );
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="reports-container">
      <p className="reports-subtitle">
        :bar_chart: Generate and analyze detailed reports of your data validation
        processes.
        <span className="user-id">
          Your User ID: <b>04548776890435805433</b>
        </span>
      </p>

      <div className="reports-filters">
        <input
          type="text"
          placeholder=":mag: Search reports..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <select value={statusFilter} onChange={handleFilterChange}>
          <option value="All">All Status</option>
          <option value="Completed">:white_check_mark: Completed</option>
          <option value="Failed">:x: Failed</option>
        </select>
      </div>

      <div className="reports-table-wrapper">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Report Name</th>
              <th>Status</th>
              <th>Failed Checks</th>
              <th>Detailed Overview</th>
              <th>Source Profile</th>
            </tr>
          </thead>
          <tbody>
            {currentReports.length > 0 ? (
              currentReports.map((r, i) => (
                <tr key={i}>
                  <td>{r.datetime}</td>
                  <td>{r.name}</td>
                  <td>
                    <span className={`badge ${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="checks-link"
                      onClick={() => navigate("/failed-check")}
                    >
                      Checks <i className="bi bi-box-arrow-up-right"></i>
                    </button>
                  </td>
                  <td>
                    <button
                      className="checks-link"
                      onClick={() => navigate("/detailed-overview")}
                    >
                      View <i className="bi bi-box-arrow-up-right"></i>
                    </button>
                  </td>
                  <td>
                    <button
                      className="checks-link"
                      onClick={() => navigate("/profile-summary")}
                    >
                      Profile <i className="bi bi-box-arrow-up-right"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No reports found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &laquo;
        </button>
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => handlePageChange(i + 1)}
            className={currentPage === i + 1 ? "active" : ""}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          &raquo;
        </button>
      </div>
    </div>
  );
};

export default Reports;