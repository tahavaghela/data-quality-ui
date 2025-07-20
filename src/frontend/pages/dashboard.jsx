import React, { useState } from "react";
import "../styles/dashboard.css";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Dashboard = () => {
  const [stats] = useState({
    total: 6,
    successful: 3,
    failed: 2,
    pending: 1,
    userId: "0454877689",
    recent: [
      {
        source: "sales_q1_2024.xlsx",
        target: "sales_forecast_q2_2024.xlsx",
        status: "Completed",
        timestamp: "6/24/2025, 5:06:11 AM",
      },
      {
        source: "inventory_snapshot.txt",
        target: "warehouse_audit.txt",
        status: "Pending",
        timestamp: "6/23/2025, 11:06:11 PM",
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  const chartHeight = 60;

  const totalChartData = {
    labels: ["Jan", "Feb", "Mar"],
    datasets: [
      {
        data: [1, 3, stats.total],
        backgroundColor: "#1a73e8",
        borderRadius: 4,
      },
    ],
  };

  const successChartData = {
    labels: ["Jan", "Feb", "Mar"],
    datasets: [
      {
        data: [1, 2, stats.successful],
        backgroundColor: "#27ae60",
        borderRadius: 4,
      },
    ],
  };

  const failedChartData = {
    labels: ["Jan", "Feb", "Mar"],
    datasets: [
      {
        data: [1, 1, stats.failed],
        backgroundColor: "#e74c3c",
        borderRadius: 4,
      },
    ],
  };

  return (
    <>
      <p style={{ fontSize: "1.05rem", marginBottom: "20px", color: "#444" }}>
        Welcome back, <strong>User ID: {stats.userId}</strong>! Here's a summary
        of your data validation activities.
      </p>

      <div className="kpi-cards">
        <div className="card kpi blue">
          <div>Total Validations</div>
          <h3>{stats.total}</h3>
          <div className="chart-wrapper">
            <Bar
              data={totalChartData}
              options={chartOptions}
              height={chartHeight}
            />
          </div>
        </div>

        <div className="card kpi green">
          <div>Successful Validations</div>
          <h3>{stats.successful}</h3>
          <div className="chart-wrapper">
            <Bar
              data={successChartData}
              options={chartOptions}
              height={chartHeight}
            />
          </div>
        </div>

        <div className="card kpi red">
          <div>Failed Validations</div>
          <h3>{stats.failed}</h3>
          <div className="chart-wrapper">
            <Bar
              data={failedChartData}
              options={chartOptions}
              height={chartHeight}
            />
          </div>
        </div>
      </div>

      <div className="row">
        <div className="card status-card">
          <h4>Validation Status Breakdown</h4>

          <div className="status-item">
            <span>Completed</span>
            <div className="bar">
              <div className="bar-fill green" style={{ width: "60%" }}>
                <span className="bar-label">60%</span>
              </div>
            </div>
          </div>

          <div className="status-item">
            <span>Pending</span>
            <div className="bar">
              <div className="bar-fill yellow" style={{ width: "20%" }}>
                <span className="bar-label">20%</span>
              </div>
            </div>
          </div>

          <div className="status-item">
            <span>Failed</span>
            <div className="bar">
              <div className="bar-fill red" style={{ width: "40%" }}>
                <span className="bar-label">40%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card actions">
          <h4>Quick Actions</h4>
          <Link to="/upload-files">
            <button className="primary">
              <i className="bi bi-plus-circle"></i> New Validation
            </button>
          </Link>
          <Link to="/reports">
            <button className="secondary">
              <i className="bi bi-folder2-open"></i> View All Reports
            </button>
          </Link>
        </div>
      </div>

      <div className="card table-card">
        <h4>Recent Validations</h4>
        <table>
          <thead>
            <tr>
              <th>Source File</th>
              <th>Target File</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {stats.recent.map((r, i) => (
              <tr key={i}>
                <td>{r.source}</td>
                <td>{r.target}</td>
                <td>
                  <span className={`badge ${r.status.toLowerCase()}`}>
                    {r.status}
                  </span>
                </td>
                <td>{r.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Dashboard;