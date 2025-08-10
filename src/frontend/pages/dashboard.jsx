import React, { useState, useEffect } from "react";
import apiClient from "../apiClient";
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

const Dashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    avg_time: 0,
    chart_labels: [],
    chart_values: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await apiClient.get("/api/dashboard");
        const data = response.data;
        setStats(data);
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
    labels: stats.chart_labels,
    datasets: [
      {
        data: stats.chart_values,
        backgroundColor: "#1a73e8",
        borderRadius: 4,
      },
    ],
  };

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <p>
          Welcome back, <strong>User ID: {user}</strong>! Here's a summary of your data validation activities.
        </p>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Validations</h3>
          <p>{stats.total}</p>
          <div className="chart-container" style={{ height: `${chartHeight}px` }}>
            <Bar data={totalChartData} options={chartOptions} />
          </div>
        </div>

        <div className="stat-card">
          <h3>Successful Validations</h3>
          <p>{stats.successful}</p>
        </div>

        <div className="stat-card">
          <h3>Failed Validations</h3>
          <p>{stats.failed}</p>
        </div>
      </div>

      <div className="other-stats">
        <div className="stat-card">
          <h3>Average Processing Time</h3>
          <p>{stats.avg_time} seconds</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
