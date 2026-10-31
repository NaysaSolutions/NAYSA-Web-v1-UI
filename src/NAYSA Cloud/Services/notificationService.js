import apiClient from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

export const getUnreadNotificationCount = async (userCode, retentionDays = 2) => {
  const response = await apiClient.get("/notifications/unread-count", { params: { userCode, retentionDays } });
  return Number(response?.data?.unreadCount || 0);
};

export const getNotifications = async (userCode, filter = "UNREAD", limit = 30, retentionDays = 2) => {
  const response = await apiClient.get("/notifications", { params: { userCode, filter, limit, retentionDays } });
  return Array.isArray(response?.data?.data) ? response.data.data : [];
};

export const markNotificationRead = async (userCode, notificationId) => {
  const response = await apiClient.post("/notifications/mark-read", {
    json_data: { userCode, notificationId },
  });
  return response?.data?.data || {};
};

export const markAllNotificationsRead = async (userCode) => {
  const response = await apiClient.post("/notifications/mark-all-read", {
    json_data: { userCode },
  });
  return response?.data?.data || {};
};
