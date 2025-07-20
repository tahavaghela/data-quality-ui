import { FileDown  } from 'lucide-react';
import '../styles/DataProfile.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { downloadCSV } from '../../utils/downloadCSV';
import React from 'react';

const profileStats = [
  {
    index: 0,
    name: 'customer_id',
    dataType: 'integer',
    nullCount: 0,
    nonNullCount: 1000,
    percentNull: 0,
    uniqueValues: 1000,
    mode: 'N/A',
    summaryStats: 'Min: 1, Max: 1000, Mean: 500.5',
    outliers: 'No',
    outlierPercent: 0,
    isTimestamp: 'No',
    sampleValues: ['123', '456', '789'],
  },
  {
    index: 1,
    name: 'order_date',
    dataType: 'timestamp',
    nullCount: 5,
    nonNullCount: 995,
    percentNull: 0.5,
    uniqueValues: 980,
    mode: '2023-01-01',
    summaryStats: 'Min: 2023-01-01, Max: 2023-12-31',
    outliers: 'No',
    outlierPercent: 0,
    isTimestamp: 'Yes',
    sampleValues: ['2023-01-01', '2023-02-15', '2023-03-20'],
  },
  {
    index: 2,
    name: 'total_amount',
    dataType: 'float',
    nullCount: 10,
    nonNullCount: 990,
    percentNull: 1,
    uniqueValues: 920,
    mode: '100.0',
    summaryStats: 'Min: 10.5, Max: 999.99, Mean: 245.75',
    outliers: 'Yes',
    outlierPercent: 1.5,
    isTimestamp: 'No',
    sampleValues: ['99.99', '150.0', '249.99'],
  },
];

export default function DataProfile() {
  const navigate = useNavigate();
  const location = useLocation();

  const reportName = location.state?.reportName || 'Data Profile Summary';
  const generatedAt = location.state?.generatedAt || new Date().toLocaleString();

  const handleDownload = () => {
    const csvData = [
      [`Report Name: ${reportName}`],
      [`Generated At (UTC): ${new Date(generatedAt).toUTCString()}`],
      [],
      [
        'Index',
        'Name',
        'Data Type',
        'Null Count',
        'Non-Null Count',
        '% Null',
        'Unique Values',
        'Mode',
        'Summary Stats',
        'Outliers?',
        'Outlier %',
        'Timestamp?',
        'Sample Values',
      ],
      ...profileStats.map((col) => [
        col.index,
        col.name,
        col.dataType,
        col.nullCount,
        col.nonNullCount,
        col.percentNull + '%',
        col.uniqueValues,
        col.mode,
        col.summaryStats,
        col.outliers,
        col.outlierPercent + '%',
        col.isTimestamp,
        col.sampleValues.join(', '),
      ]),
    ];

    downloadCSV(csvData, 'data_profile_summary.csv');
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
              <th colSpan={13} style={{ textAlign: "left" }}>
                Report Name: {reportName}
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                Generated At (UTC): {new Date(generatedAt).toUTCString()}
              </th>
            </tr>
            <tr>
              <th>Index</th>
              <th>Name</th>
              <th>Data Type</th>
              <th>Null Count</th>
              <th>Non-Null Count</th>
              <th>% Null</th>
              <th>Unique Values</th>
              <th>Mode</th>
              <th>Summary Stats</th>
              <th>Outliers?</th>
              <th>Outlier %</th>
              <th>Timestamp?</th>
              <th>Sample Values</th>
            </tr>
          </thead>
          <tbody>
            {profileStats.map((col, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td>{col.index}</td>
                <td>{col.name}</td>
                <td>{col.dataType}</td>
                <td>{col.nullCount}</td>
                <td>{col.nonNullCount}</td>
                <td>{col.percentNull}%</td>
                <td>{col.uniqueValues}</td>
                <td>{col.mode}</td>
                <td>{col.summaryStats}</td>
                <td>{col.outliers}</td>
                <td>{col.outlierPercent}%</td>
                <td>{col.isTimestamp}</td>
                <td>{col.sampleValues.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}