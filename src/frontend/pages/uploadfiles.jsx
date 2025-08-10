import React, { useState } from "react";
import apiClient from "../apiClient";
import "../styles/uploadfiles.css";

const UploadFiles = () => {
  const [sourceFile, setSourceFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleUpload = async () => {
    if (!sourceFile || !targetFile) {
      setUploadStatus("Please select both files.");
      return;
    }

    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append("source_file", sourceFile);
    formData.append("target_file", targetFile);

    try {
      const res = await apiClient.post("/api/upload-files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus("Upload successful and logged to DB!");
      setSourceFile(null);
      setTargetFile(null);
    } catch (err) {
      console.error(err);
      setUploadStatus("Upload failed.");
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>Upload Files</h2>
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
      </div>
    </div>
  );
};

export default UploadFiles;
