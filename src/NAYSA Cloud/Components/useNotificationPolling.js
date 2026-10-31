import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadNotificationCount } from "@/NAYSA Cloud/Services/notificationService.js";

const DEFAULT_POLL_MINUTES = 1;
const DEFAULT_RETENTION_DAYS = 2;
const MAX_POLL_MINUTES = 1440;
const MAX_RETENTION_DAYS = 365;

export const notificationPollStorageKey = (userCode) =>
  `naysa_notification_poll_minutes_${String(userCode || "").toUpperCase()}`;

export const notificationRetentionStorageKey = (userCode) =>
  `naysa_notification_retention_days_${String(userCode || "").toUpperCase()}`;

const normalizeWholeNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

const readStoredInterval = (userCode) => {
  const raw = localStorage.getItem(notificationPollStorageKey(userCode));
  if (raw === null) return DEFAULT_POLL_MINUTES;
  const stored = Number(raw);
  return normalizeWholeNumber(stored, DEFAULT_POLL_MINUTES, 0, MAX_POLL_MINUTES);
};

const readStoredRetention = (userCode) => {
  const stored = Number(localStorage.getItem(notificationRetentionStorageKey(userCode)));
  return normalizeWholeNumber(stored, DEFAULT_RETENTION_DAYS, 1, MAX_RETENTION_DAYS);
};

export default function useNotificationPolling(userCode) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pollMinutes, setPollMinutesState] = useState(() => readStoredInterval(userCode));
  const [retentionDays, setRetentionDaysState] = useState(() => readStoredRetention(userCode));
  const requestRunning = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!userCode || requestRunning.current) return;
    requestRunning.current = true;
    try {
      setUnreadCount(await getUnreadNotificationCount(userCode, retentionDays));
    } catch {
      // The navbar remains usable during a temporary notification/API failure.
    } finally {
      requestRunning.current = false;
    }
  }, [retentionDays, userCode]);

  const setPollMinutes = useCallback(
    (minutes) => {
      const normalized = normalizeWholeNumber(minutes, DEFAULT_POLL_MINUTES, 0, MAX_POLL_MINUTES);
      localStorage.setItem(notificationPollStorageKey(userCode), String(normalized));
      setPollMinutesState(normalized);
    },
    [userCode]
  );

  const setRetentionDays = useCallback(
    (days) => {
      const normalized = normalizeWholeNumber(days, DEFAULT_RETENTION_DAYS, 1, MAX_RETENTION_DAYS);
      localStorage.setItem(notificationRetentionStorageKey(userCode), String(normalized));
      setRetentionDaysState(normalized);
    },
    [userCode]
  );

  useEffect(() => {
    setPollMinutesState(readStoredInterval(userCode));
    setRetentionDaysState(readStoredRetention(userCode));
    setUnreadCount(0);
    if (userCode) refreshUnreadCount();
  }, [userCode, refreshUnreadCount]);

  useEffect(() => {
    if (!userCode || pollMinutes === 0) return undefined;
    const timer = window.setInterval(refreshUnreadCount, pollMinutes * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [pollMinutes, refreshUnreadCount, userCode]);

  return {
    unreadCount,
    setUnreadCount,
    pollMinutes,
    setPollMinutes,
    retentionDays,
    setRetentionDays,
    refreshUnreadCount,
  };
}
