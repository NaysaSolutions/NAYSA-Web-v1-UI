import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons'; // Added faSpinner
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const BranchLookupModal = ({ isOpen, onClose, customParam }) => {
    const [branches, setBranches] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filters, setFilters] = useState({ branchCode: '', branchName: '' });
    const [loading, setLoading] = useState(false);

   

    useEffect(() => {
        if (!isOpen) {
            setBranches([]);
            setFiltered([]);
            setFilters({ branchCode: "", branchName: "" });
            return;
        }

        let alive = true;

        (async () => {
            setLoading(true);
            try {
            const { data: result } = await apiClient.get("/lookupBranch", {
                  params: {
                  PARAMS: JSON.stringify({
                    search: "",
                    page: 1,
                    pageSize: 10,
                }),
                },
            });
            const branchData =
                Array.isArray(result?.data) && result.data[0]?.result
                ? JSON.parse(result.data[0].result)
                : [];

            if (!alive) return;
            setBranches(branchData);
            setFiltered(branchData);
            } catch (err) {
            console.error("Failed to fetch Branch:", err);
            if (!alive) return;
            setBranches([]);
            setFiltered([]);
            } finally {
            if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
        }, [isOpen, customParam]);


    useEffect(() => {
        const newFiltered = branches.filter(branch =>
            (branch.branchCode || '').toLowerCase().includes((filters.branchCode || '').toLowerCase()) &&
            (branch.branchName || '').toLowerCase().includes((filters.branchName || '').toLowerCase())
        );
        setFiltered(newFiltered);
    }, [filters, branches]); // Depend on 'branches' (original data) for filtering

    const handleApply = (branch) => {
        onClose(branch);
    };

    const handleFilterChange = (e, key) => {
        setFilters({ ...filters, [key]: e.target.value });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
                {/* Close Icon */}
                <button
                    onClick={() => onClose(null)}
                    className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
                    aria-label="Close modal"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>

                <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">Select Branch Codes</h2>

                <div className="flex-grow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
                            <span>Loading branches...</span>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(90vh-120px)] custom-scrollbar"> {/* Adjusted max-h for the table container */}
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {/* Headers */}
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">Branch Code</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">Branch Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200">Action</th>
                                    </tr>
                                    {/* Filter Row */}
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.branchCode}
                                                onChange={(e) => handleFilterChange(e, 'branchCode')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.branchName}
                                                onChange={(e) => handleFilterChange(e, 'branchName')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1"></th> {/* Empty header for action column */}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filtered.length > 0 ? (
                                        filtered.map((branch, index) => (
                                            <tr key={index}
                                                className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-xs"
                                                onClick={() => handleApply(branch)} // Allow clicking row to apply
                                            >
                                                <td className="px-4 py-1 whitespace-nowrap">{branch.branchCode}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{branch.branchName}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApply(branch); }} // Stop propagation to prevent row click
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
                                                No matching branches found.
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
                        Showing <strong>{filtered.length}</strong> of {branches.length} entries
                    </div>
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

export default BranchLookupModal;