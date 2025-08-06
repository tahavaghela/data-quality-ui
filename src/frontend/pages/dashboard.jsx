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
    pending: 0,
    userId: "",
    recent: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect hook to fetch data when the component mounts
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get the backend URL from the environment variable
        const backendUrl = import.meta.env.VITE_API_BASE_URL;
        
        if (!backendUrl) {
          throw new Error("Backend API URL is not configured.");
        }
        
        // This is where you make the API call
        const response = await fetch(`${backendUrl}/dashboard`);
        
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
  }, []); // The empty dependency array ensures this runs only once

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
      
      {/* ... (rest of your component JSX) ... */}
    </>
  );
};

export default Dashboard;