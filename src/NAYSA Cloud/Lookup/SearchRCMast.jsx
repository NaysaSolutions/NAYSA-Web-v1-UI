import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons'; // Added faSpinner for loading
import { fetchData } from '../Configuration/BaseURL'; // Assuming this path is correct

const RCLookupModal = ({ isOpen, onClose, customParam }) => {
    const [rc, setRCs] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filters, setFilters] = useState({ rcCode: '', rcName: '', rcType: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null); // Added error state

    useEffect(() => {
        if (!isOpen) {
            // Reset states when modal is closed, mirroring BranchLookupModal and SLMastLookupModal
            setRCs([]);
            setFiltered([]);
            setFilters({ rcCode: '', rcName: '', rcType: '' });
            setError(null); // Clear any previous error
            return; // Exit early if not open
        }

        setLoading(true);
        setError(null); // Clear previous errors when opening the modal

        // Custom parameter adjustment (keeping existing logic)
        let actualCustomParam = customParam;
        switch (customParam) {
            case "apv_hd":
                actualCustomParam = "ActiveAll";
                break;
            default:
                break;
        }

        const params = {
            PARAMS: JSON.stringify({
                search: "",
                page: 1,
                pageSize: 10,
                // If customParam needs to be sent to the backend:
                // customParam: actualCustomParam, 
            }),
        };

        fetchData("/lookupRCMast", params)
            .then((result) => {
                if (result.success) {
                    // *** IMPORTANT: This line assumes your /lookupRCMast endpoint
                    // still returns data nested as result.data[0].result.
                    // If it now returns a direct array like /lookupSL, change to:
                    // const rcData = result.data;
                    const rcData = JSON.parse(result.data[0].result);
                    setRCs(rcData);
                    setFiltered(rcData);
                } else {
                    setError(result.message || "Failed to fetch RC data.");
                    setRCs([]); // Ensure state is empty if no data
                    setFiltered([]);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch RC:", err);
                setError(`Error: ${err.message || 'An unexpected error occurred.'}`); // Use internal error state
            })
            .finally(() => {
                setLoading(false);
            });
    }, [isOpen, customParam]); // customParam added as dependency for consistency

    useEffect(() => {
        const newFiltered = rc.filter(item =>
            (item.rcCode || '').toLowerCase().includes((filters.rcCode || '').toLowerCase()) &&
            (item.rcName || '').toLowerCase().includes((filters.rcName || '').toLowerCase()) &&
            (item.rcType || '').toLowerCase().includes((filters.rcType || '').toLowerCase())
        );
        setFiltered(newFiltered);
    }, [filters, rc]);

    const handleApply = (selectedRC) => { // Renamed param to selectedRC for clarity
        onClose(selectedRC);
    };

    const handleFilterChange = (e, key) => {
        setFilters({ ...filters, [key]: e.target.value });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
                {/* Close Icon */}
                <button
                    onClick={() => onClose(null)}
                    className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
                    aria-label="Close modal"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>

                <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">Select RC</h2>

                <div className="flex-grow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
                            <span>Loading RC accounts...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center bg-red-100 border border-red-400 text-red-700" role="alert">
                            <strong className="font-bold">Error:</strong>
                            <span className="block sm:inline"> {error}</span>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(90vh-120px)] custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">RC Code</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">Description</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">RC Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">Action</th>
                                    </tr>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.rcCode}
                                                onChange={(e) => handleFilterChange(e, 'rcCode')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.rcName}
                                                onChange={(e) => handleFilterChange(e, 'rcName')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.rcType}
                                                onChange={(e) => handleFilterChange(e, 'rcType')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1"></th> {/* Empty header for action column */}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filtered.length > 0 ? (
                                        filtered.map((rcItem, index) => ( // Renamed 'rc' to 'rcItem' to avoid conflict with state variable
                                            <tr key={index}
                                                className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-xs"
                                                onClick={() => handleApply(rcItem)} // Allow clicking row to apply
                                            >
                                                <td className="px-4 py-1 whitespace-nowrap">{rcItem.rcCode}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{rcItem.rcName}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{rcItem.rcType}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApply(rcItem); }} // Stop propagation to prevent row click
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
                                                No matching RC accounts found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer with count */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end items-center text-xs text-gray-600">
                    <div className="font-semibold">
                        Showing <strong>{filtered.length}</strong> of {rc.length} entries
                    </div>
                </div>
            </div>

            {/* Tailwind CSS Animations and Custom Scrollbar styles */}
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

export default RCLookupModal;