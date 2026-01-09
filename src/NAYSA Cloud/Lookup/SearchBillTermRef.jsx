// import React, { useState, useEffect } from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faTimes } from '@fortawesome/free-solid-svg-icons';
// import {fetchData} from '../Configuration/BaseURL';


// const BillTermLookupModal = ({ isOpen, onClose }) => {
//   const [billterm, setBillterms] = useState([]);
//   const [filtered, setFiltered] = useState([]);
//   const [filters, setFilters] = useState({ billtermCode: '', billtermName: '', daysDue: '' });
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (isOpen) {
//       setLoading(true);
  
//       const params = {
//         PARAMS: JSON.stringify({
//           search: "",
//           page: 1,
//           pageSize: 10,
//         }),
//       };

//       fetchData("/lookupBillterm", params)
//       .then((result) => {
//         if (result.success) {
//           const resultData = JSON.parse(result.data[0].result);
//           setBillterms(resultData);
//           setFiltered(resultData);
//         } else {
//           alert(result.message || "Failed to fetch Billing Term");
//         }
//       })
//       .catch((err) => {
//         console.error("Failed to fetch Billing Term:", err);
//         alert(`Error: ${err.message}`);
//       })
//       .finally(() => {
//         setLoading(false);
//       });
//   }
//   }, [isOpen]);
  

//   useEffect(() => {
//     const newFiltered = billterm.filter(item =>
//       (item.billtermCode || '').toLowerCase().includes((filters.billtermCode || '').toLowerCase()) &&
//       (item.billtermName || '').toLowerCase().includes((filters.billtermName || '').toLowerCase()) &&
//       (item.daysDue?.toString() || '').toLowerCase().includes((filters.daysDue || '').toLowerCase())
//     );
//     setFiltered(newFiltered);
//   }, [filters, billterm]);

//   const handleApply = (billterm) => {
//     onClose(billterm);
//   };

  
//   const handleFilterChange = (e, key) => {
//     setFilters({ ...filters, [key]: e.target.value });
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-auto relative">
//         {/* Close Icon */}
//         <button
//           onClick={() => onClose(null)}
//           className="absolute top-3 right-3 text-red-500 hover:text-red-700"
//         >
//           <FontAwesomeIcon icon={faTimes} size="lg" />
//         </button>

//         <h2 className="text-lg font-semibold mb-4 uppercase">Select Billing Term</h2>

//         {loading ? (
//           <div className="flex justify-center items-center h-32">
//             <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//           </div>
//         ) : (
//           <div className="overflow-x-auto max-h-[60vh] rounded">
//             <table className="min-w-full border-collapse text-sm border border-gray-200">
//               <thead className='text-gray-700 uppercase bg-gray-100 sticky top-0 z-10'>
//                 <tr>
//                   <th className="px-2 py-2 border">Billing Term</th>
//                   <th className="px-10 py-2 border">Description</th>
//                   <th className="px-4 py-2 border text-right">Rate</th>
//                   <th className="px-4 py-2 border">Action</th>
//                 </tr>
//                 <tr className="bg-white">
//                   <th className="border px-4 py-1">
//                     <input
//                       type="text"
//                       value={filters.billtermCode}
//                       onChange={(e) => handleFilterChange(e, 'billtermCode')}
//                       className="w-full border px-2 py-1 rounded text-sm"
//                     />
//                   </th>
//                   <th className="border px-4 py-1">
//                     <input
//                       type="text"
//                       value={filters.billtermName}
//                       onChange={(e) => handleFilterChange(e, 'billtermName')}
//                       className="w-full border px-2 py-1 rounded text-sm"
//                     />
//                   </th>
//                   <th className="border px-4 py-1">
//                     <input
//                       type="text"
//                       value={filters.daysDue}
//                       onChange={(e) => handleFilterChange(e, 'daysDue')}
//                       className="w-full border px-2 py-1 rounded text-sm"
//                     />
//                   </th>              
//                   <th className="border px-4 py-1"></th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//   {loading ? (
//     <tr>
//       <td colSpan="3" className="py-10 text-center">
//         <div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
//         <div className="text-sm text-gray-500 mt-2">Loading Billing Term...</div>
//       </td>
//     </tr>
//   ) : filtered.length > 0 ? (
//     filtered.map((billterm, index) => (
//       <tr key={index} className="bg-white hover:bg-gray-100 transition">
//         <td className="px-4 py-2 border">{billterm.billtermCode}</td>
//         <td className="px-4 py-2 border">{billterm.billtermName}</td>
//         <td className="px-4 py-2 border">{billterm.daysDue}</td>
//         <td className="border px-4 py-2">
//           <button
//             onClick={() => handleApply(billterm)}
//             className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
//           >
//             Apply
//           </button>
//         </td>
//       </tr>
//     ))
//   ) : (
//     <tr>
//       <td colSpan="3" className="px-4 py-6 text-center text-gray-500">
//         No matching Billing Term found.
//       </td>
//     </tr>
//   )}
// </tbody>

//             </table>
//             <div className="p-3 text-sm text-gray-600">
//               Showing <strong>{filtered.length}</strong> of {billterm.length} entries
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default BillTermLookupModal;

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons'; // Added faSpinner
import { fetchData } from '../Configuration/BaseURL'; // Assuming this path is correct

const BillTermLookupModal = ({ isOpen, onClose }) => {
    const [billterm, setBillterms] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [filters, setFilters] = useState({ billtermCode: '', billtermName: '', daysDue: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setBillterms([]);
            setFiltered([]);
            setFilters({ billtermCode: '', billtermName: '', daysDue: '' });
            return; // Exit early if not open
        }

        setLoading(true);

        const params = {
            PARAMS: JSON.stringify({
                search: "",
                page: 1,
                pageSize: 10,
            }),
        };

        fetchData("/lookupBillterm", params)
            .then((result) => {
                if (result.success && result.data && result.data.length > 0 && result.data[0].result) {
                    const resultData = JSON.parse(result.data[0].result);
                    setBillterms(resultData);
                    setFiltered(resultData); // Initialize filtered with all data
                } else {
                    console.warn(result.message || "No Billing Term found.");
                    setBillterms([]); // Ensure state is empty if no data
                    setFiltered([]);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch Billing Term:", err);
                // Optionally, display a user-friendly error message in the UI
            })
            .finally(() => {
                setLoading(false);
            });
    }, [isOpen]);

    useEffect(() => {
        const newFiltered = billterm.filter(item =>
            (item.billtermCode || '').toLowerCase().includes((filters.billtermCode || '').toLowerCase()) &&
            (item.billtermName || '').toLowerCase().includes((filters.billtermName || '').toLowerCase()) &&
            (item.daysDue?.toString() || '').toLowerCase().includes((filters.daysDue || '').toLowerCase())
        );
        setFiltered(newFiltered);
    }, [filters, billterm]); // Depend on 'billterm' (original data) for filtering

    const handleApply = (selectedBillterm) => { // Renamed parameter for clarity
        onClose(selectedBillterm);
    };

    const handleFilterChange = (e, key) => {
        setFilters({ ...filters, [key]: e.target.value });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
                {/* Close Icon */}
                <button
                    onClick={() => onClose(null)}
                    className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
                    aria-label="Close modal"
                >
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>

                <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">Select Billing Term</h2>

                <div className="flex-grow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
                            <span>Loading Billing Terms...</span>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(90vh-160px)] custom-scrollbar"> {/* Adjusted max-h */}
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className='bg-gray-100 sticky top-0 z-10 shadow-sm'>
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">Billing Term</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">Description</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">Days Due</th>
                                        <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">Action</th>
                                    </tr>
                                    {/* Filter Row */}
                                    <tr className="bg-gray-100">
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.billtermCode}
                                                onChange={(e) => handleFilterChange(e, 'billtermCode')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.billtermName}
                                                onChange={(e) => handleFilterChange(e, 'billtermName')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1">
                                            <input
                                                type="text"
                                                value={filters.daysDue}
                                                onChange={(e) => handleFilterChange(e, 'daysDue')}
                                                placeholder="Filter..."
                                                className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-1"></th> {/* Empty header for action column */}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filtered.length > 0 ? (
                                        filtered.map((item, index) => (
                                            <tr key={index}
                                                className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-xs"
                                                onClick={() => handleApply(item)} // Allow clicking row to apply
                                            >
                                                <td className="px-4 py-1 whitespace-nowrap">{item.billtermCode}</td>
                                                <td className="px-4 py-1 whitespace-nowrap">{item.billtermName}</td>
                                                <td className="px-4 py-1 whitespace-nowrap text-right">{item.daysDue}</td>
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
                                                No matching Billing Terms found.
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
                        Showing <strong>{filtered.length}</strong> of {billterm.length} entries
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

export default BillTermLookupModal;