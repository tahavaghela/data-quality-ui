import React, { useState } from 'react';
import '../styles/uploadfiles.css';

const UploadFiles = () => {
  const [sourceFileName, setSourceFileName] = useState('No file chosen');
  const [targetFileName, setTargetFileName] = useState('No file chosen');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e, setFileName) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : 'No file chosen');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);

    try {
      const uploadRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/upload-files`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // ensures session cookie is sent
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      await uploadRes.json();
      alert('Files uploaded successfully!');
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <h2 className="upload-title">Upload Files</h2>
      <p className="upload-subtext">
        Upload and validate your data files with our advanced comparison system.
      </p>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="file-card">
          <h4>File Selection</h4>
          <div className="file-pair">
            <div className="file-box">
              <strong>Source File</strong>
              <div className="file-drop">
                <p>Drag & Drop your file here or</p>
                <label className="file-button">
                  Choose Source File
                  <input
                    type="file"
                    name="source_file"
                    hidden
                    onChange={(e) => handleFileChange(e, setSourceFileName)}
                  />
                </label>
                <p className="file-meta">Accepted: .csv, .xlsx, .txt | Max: 50MB</p>
                <p className="file-name">{sourceFileName}</p>
              </div>
            </div>
            <div className="file-box">
              <strong>Target File</strong>
              <div className="file-drop">
                <p>Drag & Drop your file here or</p>
                <label className="file-button">
                  Choose Target File
                  <input
                    type="file"
                    name="target_file"
                    hidden
                    onChange={(e) => handleFileChange(e, setTargetFileName)}
                  />
                </label>
                <p className="file-meta">Accepted: .csv, .xlsx, .txt | Max: 50MB</p>
                <p className="file-name">{targetFileName}</p>
              </div>
            </div>
          </div>

          <button type="submit" className="upload-btn" disabled={loading}>
            {loading ? 'Uploading...' : '⬆ Upload & Validate'}
          </button>
        </div>
      </form>

      <div className="user-tag">
        <i className="bi bi-person-circle"></i> You are logged in.
      </div>
    </div>
  );
};

export default UploadFiles;
