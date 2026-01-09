import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";



const ATCLookupModal = ({ isOpen, onClose, customParam }) => {
  const [atcs, setAtcs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({
    atcCode: '',
    atcDesc: '',
    taxRate: '',
    taxType: '',
  });
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    if (isOpen) {
      setLoading(true);

      switch (customParam) {
        case "apv_hd":
          customParam = "ATC"; // Adjust based on actual parameter
          break;
        default:
          break;
      }

      fetchData(currentPage);
    }
  }, [isOpen, customParam, currentPage]);


 const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const { data: result } = await apiClient.post("/lookupATC", {
        params: {
          PARAMS: JSON.stringify({ search: customParam ?? "ActiveAll" }),
          page,
          itemsPerPage,
        },
      });

      const atcData =
        Array.isArray(result?.data) && result.data[0]?.result
          ? JSON.parse(result.data[0].result)
          : [];

      setAtcs(atcData);
      setFiltered(atcData);
    } catch (err) {
      console.error("Failed to fetch ATC:", err);
      setAtcs([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };


  const handleApply = (atc) => {
    onClose(atc); // Pass the selected ATC back to the parent
  };

  useEffect(() => {
    const newFiltered = atcs.filter(item =>
      (item.atcCode || '').toLowerCase().includes((filters.atcCode || '').toLowerCase()) &&
      (item.atcDesc || '').toLowerCase().includes((filters.atcDesc || '').toLowerCase()) &&
      (item.taxRate || '').toLowerCase().includes((filters.taxRate || '').toLowerCase()) &&
      (item.taxType || '').toLowerCase().includes((filters.taxType || '').toLowerCase())
    );

    if (sortConfig.key) {
      newFiltered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFiltered(newFiltered);
    console.log('Filtered ATC Data:', newFiltered);
  }, [filters, atcs, sortConfig]);

  const handleFilterChange = (e, key) => {
    setFilters({ ...filters, [key]: e.target.value });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (column) => {
    if (sortConfig.key === column) {
      return sortConfig.direction === 'asc' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />;
    }
    return <FontAwesomeIcon icon={faSort} />;
  };

  const handleNextPage = () => {
    setCurrentPage(prevPage => prevPage + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage(prevPage => prevPage - 1);
  };

  const getPaginatedData = () => {
    return filtered.slice(0, itemsPerPage); // Display only up to itemsPerPage
  };

  if (!isOpen) return null;

  const paginatedData = getPaginatedData();

  // Showing X of Y
  const totalItems = filtered.length;
  const itemsDisplayed = paginatedData.length;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="global-lookup-main-div-ui">
      <div className="global-lookup-div-ui max-w-2xl max-h-[100vh]">
        <button
          onClick={() => onClose(null)}
          className="global-lookup-button-close-ui"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="global-lookup-headertext-ui">Select ATC</h2>

        {loading ? (
          <div className="global-lookup-loading-main-div-ui">
            <div className="global-lookup-loading-sub-div-ui"></div>
          </div>
        ) : (
          <div className="global-lookup-table-main-div-ui max-h-[70vh] scroll-y-auto">
            <table className="global-lookup-table-div-ui">
              <thead className="global-lookup-thead-div-ui">
                <tr className="global-lookup-tr-ui">
                  <th className="global-lookup-th-ui w-24" onClick={() => handleSort('atcCode')}>
                    ATC Code {renderSortIcon('atcCode')}
                  </th>
                  <th className="global-lookup-th-ui" onClick={() => handleSort('atcDesc')}>
                    ATC Description {renderSortIcon('atcDesc')}
                  </th>
                  <th className="global-lookup-th- w-24" onClick={() => handleSort('taxRate')}>
                    Tax Rate {renderSortIcon('taxRate')}
                  </th>
                  <th className="global-lookup-th-ui w-0">Action</th>
                </tr>
                <tr className="global-lookup-tr-ui">
                  <th className="global-lookup-th-ui">
                    <input
                      type="text"
                      value={filters.atcCode}
                      onChange={(e) => handleFilterChange(e, 'atcCode')}
                      className="global-lookup-filter-text-ui"
                    />
                  </th>
                  <th className="global-lookup-th-ui">
                    <input
                      type="text"
                      value={filters.atcName}
                      onChange={(e) => handleFilterChange(e, 'atcDesc')}
                      className="global-lookup-filter-text-ui"
                    />
                  </th>
                  <th className="global-lookup-th-ui">
                    <input
                      type="text"
                      value={filters.atcRate}
                      onChange={(e) => handleFilterChange(e, 'taxRate')}
                      className="global-lookup-filter-text-ui"
                    />
                  </th>
                  <th className="global-lookup-th-ui"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center">
                      <div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="text-sm text-gray-500 mt-2">Loading ATCs...</div>
                    </td>
                  </tr>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((atc, index) => (
                    <tr key={index} className="global-lookup-tr-ui">
                      <td className="global-lookup-td-ui">{atc.atcCode}</td>
                      <td className="global-lookup-td-ui">{atc.atcName}</td>
                      <td className="global-lookup-td-ui text-right">{atc.atcRate}</td>
                      <td className="global-lookup-td-ui">
                        <button
                          onClick={() => handleApply(atc)}
                          className="global-lookup-apply-button-ui"
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="global-lookup-td-ui">
                      No matching ATCs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="global-lookup-footer-div-ui">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="global-lookup-footer-button-prevnext-ui"
          >
            Previous
          </button>
          <div className="global-lookup-count-ui">
            {startItem}-{endItem} of {totalItems}
          </div>
          <button
            onClick={handleNextPage}
            disabled={filtered.length <= currentPage * itemsPerPage}
            className="global-lookup-footer-button-prevnext-ui"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ATCLookupModal;
