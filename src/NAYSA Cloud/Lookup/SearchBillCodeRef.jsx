import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons'; // Added faSpinner, faSort, faSortUp, faSortDown
import { fetchData } from '../Configuration/BaseURL';

const BillCodeLookupModal = ({ isOpen, onClose, customParam }) => {
    const [billcode, setBillCodes] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filters, setFilters] = useState({ billCode: '', billName: '', uomCode: '' });
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' }); // Added for consistency, even if not fully used for sorting yet

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setBillCodes([]);
            setFiltered([]);
            setFilters({ billCode: '', billName: '', uomCode: '' });
            setSortConfig({ key: '', direction: 'asc' });
            return; // Exit early if not open
        }

        setLoading(true);

        const params = {
            PARAMS: JSON.stringify({
                search: "",
                page: 1,
                pageSize: 100, // Increased pageSize to fetch more data initially for filtering
            }),
        };

        fetchData("/lookupBillcode", params)
            .then((result) => {
                if (result.success && result.data && result.data.length > 0 && result.data[0].result) {
                    const resultData = JSON.parse(result.data[0].result);
                    setBillCodes(resultData);
                    setFiltered(resultData); // Initialize filtered with all data
                } else {
                    console.warn(result.message || "No Billing Code found.");
                    setBillCodes([]); // Ensure state is empty if no data
                    setFiltered([]);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch Billing Code", err);
                // Optionally, display a user-friendly error message in the UI
            })
            .finally(() => {
                setLoading(false);
            });
    }, [isOpen]); // Depend on isOpen to re-fetch when it changes

    useEffect(() => {
        let currentFiltered = [...billcode];

        // Apply filters
        currentFiltered = currentFiltered.filter(item =>
            (item.billCode || '').toLowerCase().includes((filters.billCode || '').toLowerCase()) &&
            (item.billName || '').toLowerCase().includes((filters.billName || '').toLowerCase()) &&
            (item.uomCode || '').toLowerCase().includes((filters.uomCode || '').toLowerCase())
        );

        // No sorting logic applied here yet, but the `sortConfig` state is ready if you add it.
        // If sorting is added later, implement it here:
        // if (sortConfig.key) {
        //     currentFiltered.sort((a, b) => { /* sorting logic */ });
        // }

        setFiltered(currentFiltered);
    }, [filters, billcode, sortConfig]); // Add sortConfig as dependency for future sorting

    const handleApply = (selectedBillcode) => {
        onClose(selectedBillcode);
    };

    const handleFilterChange = (e, key) => {
        setFilters({ ...filters, [key]: e.target.value });
    };

    // Placeholder for sorting, if you decide to implement it later
    const handleSort = (key) => {
        // Implement sorting logic here if needed
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (column) => {
        if (sortConfig.key === column) {
            return sortConfig.direction === 'asc' ? <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" /> : <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />;
        }
        return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
                {/* Close Icon */}
                <button
                    onClick={() => onClose(null)}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-gray-100"
                    aria-label="Close modal"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>

                <h2 className="text-lg font-semibold text-blue-800 p-3 border-b border-gray-100">Select Bill Code</h2>

                <div className="flex-grow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
                            <span>Loading Bill Codes...</span>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(90vh-160px)] custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {/* Headers - onClick for sorting is commented out, but ready */}
                                        <th
                                            className="px-4 py-2 text-left text-sm font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                                            // onClick={() => handleSort('billCode')} // Uncomment to enable sorting
                                        >
                                            Bill Code {renderSortIcon('billCode')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-sm font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                                            // onClick={() => handleSort('billName')} // Uncomment to enable sorting
                                        >
                                            Description {renderSortIcon('billName')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-sm font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                                            // onClick={() => handleSort('uomCode')} // Uncomment to enable sorting
                                        >
                                            UOM {renderSortIcon('uomCode')}
                                        </th>
                                        <th className="px-4 py-2 text-left text-sm font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">
                                            Action
                                        </th>
                                    </tr>
                                    {/* Filter Row */}
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.billCode}
                                                onChange={(e) => handleFilterChange(e, 'billCode')}
                                                placeholder="Filter..."
                                                className="block w-full px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.billName}
                                                onChange={(e) => handleFilterChange(e, 'billName')}
                                                placeholder="Filter..."
                                                className="block w-full px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.uomCode}
                                                onChange={(e) => handleFilterChange(e, 'uomCode')}
                                                placeholder="Filter..."
                                                className="block w-full px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filtered.length > 0 ? (
                                        filtered.map((item, index) => (
                                            <tr key={index}
                                                className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-sm"
                                                onClick={() => handleApply(item)} // Allow clicking row to apply
                                            >
                                                <td className="px-4 py-1 whitespace-nowrap">{item.billCode}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{item.billName}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{item.uomCode}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApply(item); }} // Stop propagation to prevent row click
                                                        className="px-6 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
                                                    >
                                                        Apply
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-6 text-center text-gray-500 text-lg">
                                                No matching Bill Codes found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 text-right text-sm text-gray-600">
                    Showing <span className="font-semibold">{filtered.length}</span> of <span className="font-semibold">{billcode.length}</span> entries
                </div>
            </div>

            {/* Tailwind CSS Animations (add to your CSS file or a style block if not globally available) */}
            <style jsx="true">{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out forwards;
                }
                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
        </div>
    );
};

export default BillCodeLookupModal;