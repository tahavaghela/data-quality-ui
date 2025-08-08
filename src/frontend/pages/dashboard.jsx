import React, { useState, useEffect } from "react";
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
  // Use state to hold the fetched stats data
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

  // useEffect hook to fetch data when the component mounts
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const backendUrl = import.meta.env.VITE_API_BASE_URL;
        
        if (!backendUrl) {
          throw new Error("Backend API URL is not configured.");
        }
        
        // CORRECTED: Added '/api' prefix to the endpoint
        const response = await fetch(`${backendUrl}/api/dashboard`, { withCredentials: true });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setStats(data); // Set the state with the fetched data
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

  // CORRECTED: Updated the chart data to use fetched stats
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

  const successChartData = {
    labels: stats.chart_labels,
    datasets: [
      {
        data: stats.chart_values, // This will be incorrect, need to get specific successful data from backend
        backgroundColor: "#27ae60",
        borderRadius: 4,
      },
    ],
  };

  const failedChartData = {
    labels: stats.chart_labels,
    datasets: [
      {
        data: stats.chart_values, // This will be incorrect, need to get specific failed data from backend
        backgroundColor: "#e74c3c",
        borderRadius: 4,
      },
    ],
  };

  // Render a loading state while fetching data
  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  // Render an error state if fetching failed
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  // The rest of your existing return statement
  return (
    <>
      <p style={{ fontSize: "1.05rem", marginBottom: "20px", color: "#444" }}>
        Welcome back, <strong>User ID: {stats.userId}</strong>! Here's a summary
        of your data validation activities.
      </p>
      {/* ... rest of your component JSX */}
    </>
  );
};

export default Dashboard;