import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { fetchData } from '../Configuration/BaseURL'; // Assuming this path is correct

const SLMastLookupModal = ({ isOpen, onClose, customParam }) => {
    const [sl, setSLs] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filters, setFilters] = useState({ sltypeCode: '', slCode: '', slName: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null); // State for error handling

    useEffect(() => {
        if (!isOpen) {
            setSLs([]);
            setFiltered([]);
            setFilters({ sltypeCode: '', slCode: '', slName: '' });
            setError(null);
            return; 
        }

        setLoading(true);
        setError(null); 

        const params = {
            PARAMS: JSON.stringify({
                search: "ActiveAll",
                page: 1,
                pageSize: 10, 
            }),
        };

        fetchData("/lookupSL", params)
            .then((result) => {
                if (result.success) {
                    const slData = JSON.parse(result.data[0].result);
                    setSLs(slData);
                    setFiltered(slData); 
                } else {
                    setError(result.message || "Failed to fetch SL data.");
                    setSLs([]); 
                    setFiltered([]);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch SL:", err);
                setError(`Error: ${err.message || 'An unexpected error occurred.'}`);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [isOpen, customParam]); 




    useEffect(() => {
        const newFiltered = sl.filter(item =>
            (item.sltypeCode || '').toLowerCase().includes((filters.sltypeCode || '').toLowerCase()) &&
            (item.slCode || '').toLowerCase().includes((filters.slCode || '').toLowerCase()) &&
            (item.slName || '').toLowerCase().includes((filters.slName || '').toLowerCase())
        );
        setFiltered(newFiltered);
    }, [filters, sl]); 

    const handleApply = (selectedSL) => {        
        onClose(selectedSL); 
    };


    const handleFilterChange = (e, key) => {
        setFilters({ ...filters, [key]: e.target.value });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
                {/* Close Icon */}
                <button
                    onClick={() => onClose(null)}
                    className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
                    aria-label="Close modal"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>

                <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">Select SL Account</h2>

                <div className="flex-grow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
                            <span>Loading SL accounts...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center bg-red-100 border border-red-400 text-red-700" role="alert">
                            <strong className="font-bold">Error:</strong>
                            <span className="block sm:inline"> {error}</span>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(90vh-120px)] custom-scrollbar">
                            <table className="w-full table-fixed divide-y divide-gray-100">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="w-[30px] px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">SL Type</th>
                                        <th className="w-[40px] px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">SL Code</th>
                                        <th className="w-[140px] px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">SL Name</th>
                                        <th className="w-[30px] px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">Action</th>
                                    </tr>
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.sltypeCode}
                                                onChange={(e) => handleFilterChange(e, 'sltypeCode')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.slCode}
                                                onChange={(e) => handleFilterChange(e, 'slCode')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.slName}
                                                onChange={(e) => handleFilterChange(e, 'slName')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1"></th> {/* Empty header for action column */}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filtered.length > 0 ? (
                                        filtered.map((slItem, index) => (
                                            <tr key={index}
                                                className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-xs"
                                                onClick={() => handleApply(slItem)} // Allow clicking row to apply
                                            >
                                                <td className="px-4 py-1 whitespace-nowrap">{slItem.sltypeCode}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{slItem.slCode}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{slItem.slName}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApply(slItem); }} // Stop propagation to prevent row click
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
                                                No matching SL accounts found.
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
                        Showing <strong>{filtered.length}</strong> of {sl.length} entries
                    </div>
                </div>
            </div>

            {/* Tailwind CSS Animations (add to your main CSS file or a global style block) */}
            {/* These styles should ideally be in your global CSS and correctly configured with Tailwind */}
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

export default SLMastLookupModal;