import React, { useState, useEffect } from 'react';
import '../styles/reports.css'; // Use the updated CSS below

const dummyData = [
  {
    source: 'sales_q1_2024.xlsx',
    target: 'sales_forecast_q2_2024.xlsx',
    status: 'Completed',
    timestamp: '6/24/2025, 5:06:11 AM',
  },
  {
    source: 'inventory_snapshot.txt',
    target: 'warehouse_audit.txt',
    status: 'Pending',
    timestamp: '6/23/2025, 11:06:11 PM',
  },
  {
    source: 'transactions_feb.xlsx',
    target: 'transactions_march.xlsx',
    status: 'Failed',
    timestamp: '6/23/2025, 11:06:11 AM',
  },
  {
    source: 'customer_data_v1.csv',
    target: 'customer_data_v2.csv',
    status: 'Completed',
    timestamp: '6/22/2025, 11:06:11 AM',
  },
  {
    source: 'product_catalog_old.csv',
    target: 'product_catalog_new.csv',
    status: 'Completed',
    timestamp: '6/21/2025, 11:06:11 AM',
  },
  {
    source: 'user_profiles_backup.csv',
    target: 'user_profiles_live.csv',
    status: 'Failed',
    timestamp: '6/20/2025, 11:06:11 AM',
  },
];

const UploadHistory = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const perPage = 3;

  const filtered = dummyData.filter((item) => {
    const matchesStatus = filter === 'All' || item.status === filter;
    const matchesSearch =
      item.source.toLowerCase().includes(search.toLowerCase()) ||
      item.target.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  return (
    <div className="reports-container">
      <p className="reports-subtitle">
        :file_folder: Review all uploaded and validated files.
        <span className="user-id">Your User ID: <strong>04548776890435805433</strong></span>
      </p>

      <div className="reports-filters">
        <input
          type="text"
          placeholder=":mag: Search uploads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Completed">:white_check_mark: Completed</option>
          <option value="Pending">:clock3: Pending</option>
          <option value="Failed">:x: Failed</option>
        </select>
      </div>

      <div className="reports-table-wrapper">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Source File</th>
              <th>Target File</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, index) => (
              <tr key={index}>
                <td>{item.source}</td>
                <td>{item.target}</td>
                <td>
                  <span className={`badge ${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td>{item.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            className={page === i + 1 ? 'active' : ''}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default UploadHistory;