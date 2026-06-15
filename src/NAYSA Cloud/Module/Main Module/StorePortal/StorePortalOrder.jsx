import React, { useEffect, useMemo, useState } from "react";
import { fetchData, fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";

const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

const getDateRange = (start, end) => {
  if (!start || !end) return [];

  const dates = [];
  let current = new Date(start);
  const last = new Date(end);

  while (current <= last) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const tomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
};

export default function StorePortalOrder() {
  const [userCode] = useState("AGA");
  const [storeCode, setStoreCode] = useState("HO");
  const [storeType, setStoreType] = useState("Company"); // Company or Franchisee

  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(new Date()));

  const [items, setItems] = useState([]);
  const [orderMatrix, setOrderMatrix] = useState({});

  const [deliveryDate, setDeliveryDate] = useState(tomorrowDate());
  const [confirmationRows, setConfirmationRows] = useState([]);

  const dates = useMemo(() => getDateRange(startDate, endDate), [startDate, endDate]);

  const loadItems = async () => {
    const res = await fetchData("store-portal/items", { storeType });

    const loadedItems = res.data || [];
    setItems(loadedItems);

    const matrix = {};

    loadedItems.forEach((item) => {
      matrix[item.itemCode] = {};

      dates.forEach((date) => {
        matrix[item.itemCode][date] = 0;
      });
    });

    setOrderMatrix(matrix);
  };

  const handleQtyChange = (itemCode, date, value) => {
    setOrderMatrix((prev) => ({
      ...prev,
      [itemCode]: {
        ...prev[itemCode],
        [date]: Number(value || 0),
      },
    }));
  };

  const submitWeeklyForecast = async () => {
    const details = [];

    items.forEach((item) => {
      dates.forEach((date) => {
        details.push({
          itemCode: item.itemCode,
          itemName: item.itemName,
          uomCode: item.uomCode,
          deliveryDate: date,
          orderQty: Number(orderMatrix[item.itemCode]?.[date] || 0),
        });
      });
    });

    const payload = {
      userCode,
      storeCode,
      storeType,
      startDate,
      endDate,
      orderType: "WeeklyForecast",
      details,
    };

    const res = await postRequest("store-portal/weekly-forecast", payload);

    alert(res.message || "Weekly forecast submitted successfully.");
  };

  const loadConfirmation = async () => {
    const res = await fetchData("store-portal/confirmation", {
      storeCode,
      storeType,
      deliveryDate,
    });

    setConfirmationRows(res.data || []);
  };

  const handleConfirmQtyChange = (index, value) => {
    setConfirmationRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              orderQty: Number(value || 0),
            }
          : row
      )
    );
  };

  const confirmOrder = async () => {
    if (deliveryDate < tomorrowDate()) {
      alert("Confirmation is only allowed for next delivery date or future date.");
      return;
    }

    const payload = {
      userCode,
      storeCode,
      storeType,
      deliveryDate,
      orderType: "ConfirmedOrder",
      details: confirmationRows.map((row) => ({
        forecastId: row.forecastId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        uomCode: row.uomCode,
        deliveryDate,
        orderQty: Number(row.orderQty || 0),
      })),
    };

    const res = await postRequest("store-portal/confirm-order", payload);

    alert(res.message || "Order confirmed successfully.");
  };

  useEffect(() => {
    if (dates.length > 0) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeType, startDate, endDate]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Store Portal Ordering System</h1>
        <p className="text-sm text-red-600 font-semibold">
          Order confirmation is required by 1:00 PM prior to the delivery date.
        </p>
      </div>

      <div className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">Weekly Forecast</h2>

        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="text-sm">Store Code</label>
            <input
              className="border rounded w-full p-2"
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Store Type</label>
            <select
              className="border rounded w-full p-2"
              value={storeType}
              onChange={(e) => setStoreType(e.target.value)}
            >
              <option value="Company">Company Store</option>
              <option value="Franchisee">Franchisee</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Start Date</label>
            <input
              type="date"
              className="border rounded w-full p-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">End Date</label>
            <input
              type="date"
              className="border rounded w-full p-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              className="bg-blue-600 text-white rounded px-4 py-2 w-full"
              onClick={loadItems}
            >
              Load Items
            </button>
          </div>
        </div>

        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Item Code</th>
                <th className="border p-2 text-left">Item Name</th>
                <th className="border p-2 text-left">UOM</th>
                {dates.map((date) => (
                  <th key={date} className="border p-2 text-center">
                    {date}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.itemCode}>
                  <td className="border p-2">{item.itemCode}</td>
                  <td className="border p-2">{item.itemName}</td>
                  <td className="border p-2">{item.uomCode}</td>

                  {dates.map((date) => (
                    <td key={date} className="border p-2">
                      <input
                        type="number"
                        min="0"
                        className="border rounded p-1 w-24 text-right"
                        value={orderMatrix[item.itemCode]?.[date] ?? 0}
                        onChange={(e) =>
                          handleQtyChange(item.itemCode, date, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td className="border p-3 text-center" colSpan={dates.length + 3}>
                    No items loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="bg-green-600 text-white rounded px-4 py-2"
          onClick={submitWeeklyForecast}
        >
          Submit Weekly Forecast
        </button>
      </div>

      <div className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">Daily Order Confirmation</h2>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm">Delivery Date</label>
            <input
              type="date"
              className="border rounded w-full p-2"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              className="bg-blue-600 text-white rounded px-4 py-2 w-full"
              onClick={loadConfirmation}
            >
              Load Forecast
            </button>
          </div>
        </div>

        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Item Code</th>
                <th className="border p-2 text-left">Item Name</th>
                <th className="border p-2 text-left">UOM</th>
                <th className="border p-2 text-right">Confirmed Qty</th>
              </tr>
            </thead>

            <tbody>
              {confirmationRows.map((row, index) => (
                <tr key={`${row.itemCode}-${index}`}>
                  <td className="border p-2">{row.itemCode}</td>
                  <td className="border p-2">{row.itemName}</td>
                  <td className="border p-2">{row.uomCode}</td>
                  <td className="border p-2 text-right">
                    <input
                      type="number"
                      min="0"
                      className="border rounded p-1 w-28 text-right"
                      value={row.orderQty}
                      onChange={(e) => handleConfirmQtyChange(index, e.target.value)}
                    />
                  </td>
                </tr>
              ))}

              {confirmationRows.length === 0 && (
                <tr>
                  <td className="border p-3 text-center" colSpan={4}>
                    No forecast loaded for confirmation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="bg-green-600 text-white rounded px-4 py-2"
          onClick={confirmOrder}
        >
          Confirm Order
        </button>
      </div>
    </div>
  );
}
