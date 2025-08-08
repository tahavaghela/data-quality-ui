import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/uploadfiles.css";

const UploadFiles = () => {
  const [sourceFile, setSourceFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/session`, { withCredentials: true });
        setUser(res.data);
      } catch (err) {
        console.error("User not logged in or session fetch failed", err);
        setUser(null);
        // If unauthorized, redirect to the login endpoint
        if (err.response && err.response.status === 401) {
          window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/login`;
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserSession();
  }, []);

  const handleUpload = async () => {
    if (!sourceFile || !targetFile) {
      setUploadStatus("Please select both files.");
      return;
    }

    const formData = new FormData();
    formData.append("source_file", sourceFile);
    formData.append("target_file", targetFile);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/upload-files`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );
      setUploadStatus("Upload successful and logged to DB!");
    } catch (err) {
      console.error(err);
      setUploadStatus("Upload failed.");
    }
  };

  // Added a loading state check to prevent rendering until session check is complete
  if (loading) {
    return <div>Checking session...</div>;
  }

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>Upload Files</h2>
        {user ? (
          <>
            <div className="file-input-group">
              <label>Source File</label>
              <input type="file" onChange={(e) => setSourceFile(e.target.files[0])} />
            </div>
            <div className="file-input-group">
              <label>Target File</label>
              <input type="file" onChange={(e) => setTargetFile(e.target.files[0])} />
            </div>
            <button className="upload-btn" onClick={handleUpload}>
              Upload
            </button>
            {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
          </>
        ) : (
          <p>Redirecting to login...</p>
        )}
      </div>
    </div>
  );
};

export default UploadFiles;