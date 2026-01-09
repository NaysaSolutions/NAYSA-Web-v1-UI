import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSort, faSortUp, faSortDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const CutoffLookupModal = ({ isOpen, onClose, source, customParam }) => {
    const [cutoffs, setCutoffs] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filters, setFilters] = useState({ cutoffCode: '', cutoffName: '', status: '' });
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setCutoffs([]);
            setFiltered([]);
            setFilters({ cutoffCode: "", cutoffName: "", status: "" });
            setSortConfig({ key: "", direction: "asc" });
            return; // Exit early if not open
        }

        const fetchCutoffs = async () => {
            setLoading(true);

            try {
                const { data: result } = await apiClient.get("/lookupCutOff", {
                    params: {
                        PARAMS: customParam || "All", // Pass filter parameter directly
                    }
                });

                const cutoffData =
                    Array.isArray(result?.data) && result.data[0]?.result
                        ? JSON.parse(result.data[0].result)
                        : [];

                setCutoffs(cutoffData);
                setFiltered(cutoffData);
            } catch (err) {
                console.error("Failed to fetch Cutoff References:", err);
                setCutoffs([]);
                setFiltered([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCutoffs();
    }, [isOpen, customParam]);

    useEffect(() => {
        let currentFiltered = [...cutoffs];

        // Apply filters
        currentFiltered = currentFiltered.filter(item =>
            (item.cutoffCode || '').toLowerCase().includes((filters.cutoffCode || '').toLowerCase()) &&
            (item.cutoffName || '').toLowerCase().includes((filters.cutoffName || '').toLowerCase())
        );

        // Apply sorting
        if (sortConfig.key) {
            currentFiltered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        setFiltered(currentFiltered);
    }, [filters, cutoffs, sortConfig]);

    const handleApply = (cutoff) => {
        const cutoffData = {
            cutoffCode: cutoff.cutoffCode,
            cutoffName: cutoff.cutoffName
        };
        onClose(cutoffData, source);
    };

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
            return sortConfig.direction === 'asc' ? <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" /> : <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />;
        }
        return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
                {/* Close Icon */}
                <button
                    onClick={() => onClose(null, source)}
                    className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
                    aria-label="Close modal"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>

                <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">Select Cutoff Reference</h2>

                <div className="flex-grow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
                            <span>Loading cutoff references...</span>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(90vh-160px)] custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {/* Headers with Sort */}
                                        <th
                                            className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                                            onClick={() => handleSort('cutoffCode')}
                                        >
                                            Cutoff Code {renderSortIcon('cutoffCode')}
                                        </th>
                                        <th
                                            className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                                            onClick={() => handleSort('cutoffName')}
                                        >
                                            Description {renderSortIcon('cutoffName')}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                                            Action
                                        </th>
                                    </tr>
                                    {/* Filter Row */}
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.cutoffCode}
                                                onChange={(e) => handleFilterChange(e, 'cutoffCode')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.cutoffName}
                                                onChange={(e) => handleFilterChange(e, 'cutoffName')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filtered.length > 0 ? (
                                        filtered.map((cutoff, index) => (
                                            <tr key={index}
                                                className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-xs"
                                                onClick={() => handleApply(cutoff)}
                                            >
                                                <td className="px-4 py-1 whitespace-nowrap">{cutoff.cutoffCode}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{cutoff.cutoffName}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApply(cutoff); }}
                                                        className="px-6 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
                                                    >
                                                        Apply
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-6 text-center text-gray-500 text-lg">
                                                No matching cutoff references found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 text-right text-xs text-gray-600">
                    Showing <span className="font-semibold">{filtered.length}</span> of <span className="font-semibold">{cutoffs.length}</span> entries
                </div>
            </div>

            {/* Tailwind CSS Animations */}
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

export default CutoffLookupModal;