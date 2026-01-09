import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import {fetchData} from '../Configuration/BaseURL';

const BankMastLookupModal = ({ isOpen, onClose}) => {
  const [bamast, setBamast] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ bankCode: '', bankTypeCode: '', acctCode: '' , bankAcctNo: ''  , currCode: ''});
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

      fetchData("/lookupBank", params)
        .then((result) => {
          if (result.success) {
            const bankData = JSON.parse(result.data[0].result);
            setBamast(bankData);
            setFiltered(bankData);
          } else {
            alert(result.message || "Failed to fetch Bank");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch lookup Bank:", err);
          alert(`Error: ${err.message}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }

  }, [isOpen]);
  

  useEffect(() => {
    const newFiltered = bamast.filter(item =>
      (item.bankCode || '').toLowerCase().includes((filters.bankCode || '').toLowerCase()) &&
      (item.bankTypeCode || '').toLowerCase().includes((filters.bankTypeCode || '').toLowerCase()) &&
      (item.acctCode || '').toLowerCase().includes((filters.acctCode || '').toLowerCase()) &&
      (item.bankAcctNo || '').toLowerCase().includes((filters.bankAcctNo || '').toLowerCase()) &&
      (item.currCode || '').toLowerCase().includes((filters.currCode || '').toLowerCase())
    );
    setFiltered(newFiltered);
  }, [filters, bamast]);



  const handleApply = (bank) => { 
    onClose(bank);
  };

  
  const handleFilterChange = (e, key) => {
    setFilters({ ...filters, [key]: e.target.value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-3 w-full max-w-3xl max-h-[90vh] overflow-auto relative">
        {/* Close Icon */}
        <button
          onClick={() => onClose(null)}
          className="absolute top-3 right-3 text-red-500 hover:text-red-700"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-sm font-semibold mb-3">Select Bank</h2>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] rounded">
            <table className="min-w-full border-collapse text-xs text-left border border-gray-200">
              <thead className='text-blue-800 bg-gray-100 sticky top-0 z-10'>
                <tr>
                  <th className="px-2 py-2 border">Bank Code</th>
                  <th className="px-2 py-2 border">Bank Type</th>
                  <th className="px-2 py-2 border text-center">Account Code</th>
                  <th className="px-2 py-2 border text-center">Bank Account No</th>
                  <th className="px-2 py-2 border text-center">Currency</th>
                  <th className="px-2 py-2 border">Action</th>
                </tr>
                <tr className="bg-white">
                  <th className="border px-2 py-1">
                    <input
                      type="text"
                      value={filters.bankCode}
                      onChange={(e) => handleFilterChange(e, 'bankCode')}
                      className="w-full border px-2 py-1 rounded text-sm"
                    />
                  </th>
                  <th className="border px-2 py-1">
                    <input
                      type="text"
                      value={filters.bankTypeCode}
                      onChange={(e) => handleFilterChange(e, 'bankTypeCode')}
                      className="w-full border px-2 py-1 rounded text-sm"
                    />
                  </th>
                  <th className="border px-2 py-1">
                    <input
                      type="text"
                      value={filters.acctCode}
                      onChange={(e) => handleFilterChange(e, 'acctCode')}
                      className="w-full border px-2 py-1 rounded text-sm"
                    />
                  </th>
                  <th className="border px-2 py-1">
                    <input
                      type="text"
                      value={filters.bankAcctNo}
                      onChange={(e) => handleFilterChange(e, 'bankAcctNo')}
                      className="w-full border px-2 py-1 rounded text-sm"
                    />
                  </th>
                  <th className="border px-2 py-1">
                    <input
                      type="text"
                      value={filters.currCode}
                      onChange={(e) => handleFilterChange(e, 'currCode')}
                      className="w-full border px-2 py-1 rounded text-sm"
                    />
                  </th>               
                  <th className="border px-2 py-1"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
  {loading ? (
    <tr>
      <td colSpan="3" className="py-10 text-center">
        <div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm text-gray-500 mt-2">Loading bamast...</div>
      </td>
    </tr>
  ) : filtered.length > 0 ? (
    filtered.map((bank, index) => (
      <tr key={index} className="bg-white hover:bg-gray-100 transition">
        <td className="px-2 py-1 border">{bank.bankCode}</td>
        <td className="px-2 py-1 border">{bank.bankTypeCode}</td>
        <td className="px-2 py-1 border">{bank.acctCode}</td>
        <td className="px-2 py-1 border">{bank.bankAcctNo}</td>
        <td className="px-2 py-1 border">{bank.currCode}</td>
        <td className="border px-2 py-1">
          <button
            onClick={() => handleApply(bank)}
            className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
          >
            Apply
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="3" className="px-4 py-6 text-center text-gray-500">
        No matching Bank found.
      </td>
    </tr>
  )}
</tbody>

            </table>
            <div className="p-2 text-sm text-gray-600">
              Showing <strong>{filtered.length}</strong> of {bamast.length} entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankMastLookupModal;
