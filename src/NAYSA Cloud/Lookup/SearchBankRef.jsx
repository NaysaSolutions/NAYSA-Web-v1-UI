import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import {fetchData} from '../Configuration/BaseURL';


const BankTypeLookupModal = ({ isOpen, onClose, customParam }) => {
  const [banks, setBanks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ bankTypeCode: '', bankTypeName: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);

      const params = {
        PARAMS: JSON.stringify({
          search: "",
          page: 1,
          pageSize: 10,
        }),
      };

      fetchData("/lookupBankType", params)
      .then((result) => {
        if (result.success) {
          const bankData = JSON.parse(result.data[0].result);
          setBanks(bankData);
          setFiltered(bankData);
        } else {
          alert(result.message || "Failed to fetch Bank Type");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch Bank Type:", err);
        alert(`Error: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }
  
  }, [isOpen]);
  

  useEffect(() => {
    const newFiltered = banks.filter(item =>
      (item.bankTypeCode || '').toLowerCase().includes((filters.bankTypeCode || '').toLowerCase()) &&
      (item.bankTypeName || '').toLowerCase().includes((filters.bankTypeName || '').toLowerCase())
    );
    setFiltered(newFiltered);
  }, [filters, banks]);

  const handleApply = (bank) => {

    
    onClose(bank);
  };

  const handleFilterChange = (e, key) => {
    setFilters({ ...filters, [key]: e.target.value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto relative">
        {/* Close Icon */}
        <button
          onClick={() => onClose(null)}
          className="absolute top-3 right-3 text-red-500 hover:text-red-700"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-lg font-semibold mb-4 uppercase">Select Bank Type</h2>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded">
            <table className="min-w-full border-collapse text-sm text-center border border-gray-200">
              <thead className='text-gray-700 uppercase bg-gray-100'>
                <tr>
                  <th className="px-2 py-2 border">Bank Code</th>
                  <th className="px-6 py-2 border">Bank Name</th>
                  <th className="px-4 py-2 border">Action</th>
                </tr>
                <tr className="bg-white">
                  <th className="border px-4 py-1">
                    <input
                      type="text"
                      value={filters.banktype_code}
                      onChange={(e) => handleFilterChange(e, 'banktype_code')}
                      className="w-full border px-2 py-1 rounded text-sm"
                    />
                  </th>
                  <th className="border px-4 py-1">
                    <input
                      type="text"
                      value={filters.bankTypeName}
                      onChange={(e) => handleFilterChange(e, 'bankTypeName')}
                      className="w-full border px-2 py-1 rounded text-sm"
                    />
                  </th>
                  <th className="border px-4 py-1"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
  {loading ? (
    <tr>
      <td colSpan="3" className="py-10 text-center">
        <div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm text-gray-500 mt-2">Loading banks...</div>
      </td>
    </tr>
  ) : filtered.length > 0 ? (
    filtered.map((bank, index) => (
      <tr key={index} className="bg-white hover:bg-gray-100 transition">
        <td className="px-4 py-2 border">{bank.bankTypeCode}</td>
        <td className="px-4 py-2 border">{bank.bankTypeName}</td>
        <td className="border px-4 py-2">
          <button
            onClick={() => handleApply(bank)}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Apply
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="3" className="px-4 py-6 text-center text-gray-500">
        No matching bank found.
      </td>
    </tr>
  )}
</tbody>

            </table>
            <div className="p-3 text-sm text-gray-600">
              Showing <strong>{filtered.length}</strong> of {banks.length} entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankTypeLookupModal;
