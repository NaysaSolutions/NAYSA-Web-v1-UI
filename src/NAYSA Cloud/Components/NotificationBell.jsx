import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { Bell, CheckCheck, Clock3, Mail, MailOpen, RefreshCw, Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/NAYSA Cloud/Services/notificationService.js";
import useNotificationPolling from "./useNotificationPolling.js";

const filters = [
  { value: "UNREAD", label: "Unread", icon: Mail },
  { value: "READ", label: "Read", icon: MailOpen },
];

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export default function NotificationBell({ userCode }) {
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("UNREAD");
  const [rowsByFilter, setRowsByFilter] = useState({ UNREAD: [], READ: [] });
  const [loadedByFilter, setLoadedByFilter] = useState({ UNREAD: false, READ: false });
  const [loadingByFilter, setLoadingByFilter] = useState({ UNREAD: false, READ: false });
  const [showSettings, setShowSettings] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 56, right: 16 });
  const {
    unreadCount,
    setUnreadCount,
    pollMinutes,
    setPollMinutes,
    retentionDays,
    setRetentionDays,
    refreshUnreadCount,
  } =
    useNotificationPolling(userCode);
  const [pollMinutesInput, setPollMinutesInput] = useState(String(pollMinutes));
  const [retentionDaysInput, setRetentionDaysInput] = useState(String(retentionDays));
  const requestVersion = useRef({ UNREAD: 0, READ: 0 });
  const rows = rowsByFilter[filter] || [];
  const loading = loadingByFilter[filter] === true;

  const loadRows = async (nextFilter = filter) => {
    if (!userCode) return;
    const version = (requestVersion.current[nextFilter] || 0) + 1;
    requestVersion.current[nextFilter] = version;
    setLoadingByFilter((current) => ({ ...current, [nextFilter]: true }));
    try {
      const nextRows = await getNotifications(userCode, nextFilter, 30, retentionDays);
      if (requestVersion.current[nextFilter] !== version) return;
      setRowsByFilter((current) => ({ ...current, [nextFilter]: nextRows }));
      setLoadedByFilter((current) => ({ ...current, [nextFilter]: true }));
    } catch {
      // Keep the last successful rows visible during a temporary API failure.
    } finally {
      if (requestVersion.current[nextFilter] === version) {
        setLoadingByFilter((current) => ({ ...current, [nextFilter]: false }));
      }
    }
  };

  useEffect(() => {
    setRowsByFilter({ UNREAD: [], READ: [] });
    setLoadedByFilter({ UNREAD: false, READ: false });
    requestVersion.current = { UNREAD: 0, READ: 0 };
    if (userCode) {
      loadRows("UNREAD");
      loadRows("READ");
    }
  }, [userCode, retentionDays]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) loadRows(filter);
  }, [open, filter, retentionDays]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPollMinutesInput(String(pollMinutes)), [pollMinutes]);
  useEffect(() => setRetentionDaysInput(String(retentionDays)), [retentionDays]);

  const saveSettings = async () => {
    const nextPollMinutes = Math.min(1440, Math.max(0, Number.parseInt(pollMinutesInput, 10) || 0));
    const nextRetentionDays = Math.min(365, Math.max(1, Number.parseInt(retentionDaysInput, 10) || 2));
    setPollMinutes(nextPollMinutes);
    setRetentionDays(nextRetentionDays);
    setPollMinutesInput(String(nextPollMinutes));
    setRetentionDaysInput(String(nextRetentionDays));
    setShowSettings(false);
  };

  useEffect(() => {
    const closeOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelPosition({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const openNotification = async (row) => {
    if (row.isRead !== "Y") {
      await markNotificationRead(userCode, row.notificationId);
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
    setOpen(false);
    if (row.actionUrl) navigate(row.actionUrl);
  };

  const markAllRead = async () => {
    await markAllNotificationsRead(userCode);
    setUnreadCount(0);
    await loadRows(filter);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[2147483000] w-[390px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          style={{ top: panelPosition.top, right: panelPosition.right }}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
              <p className="text-[11px] text-slate-500">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => { refreshUnreadCount(); loadRows(filter); }} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={() => setShowSettings((value) => !value)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Polling settings">
                <Settings className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><Clock3 className="h-4 w-4 text-blue-600" /> Notification preferences</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-medium text-slate-500">
                  Refresh interval (minutes)
                  <input type="number" min="0" max="1440" step="1" value={pollMinutesInput} onChange={(event) => setPollMinutesInput(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                  <span className="mt-1 block font-normal text-slate-400">Enter 0 for manual refresh.</span>
                </label>
                <label className="text-[10px] font-medium text-slate-500">
                  Display retention (days)
                  <input type="number" min="1" max="365" step="1" value={retentionDaysInput} onChange={(event) => setRetentionDaysInput(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                  <span className="mt-1 block font-normal text-slate-400">Default is 2 days.</span>
                </label>
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" onClick={saveSettings} className="h-8 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">Save</button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {filters.map((item) => (
                <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-semibold transition ${filter === item.value ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300" : "text-slate-500"}`}>
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </button>
              ))}
            </div>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"><CheckCheck className="h-4 w-4" /> Mark all read</button>}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && !loadedByFilter[filter] && <div className="px-6 py-12 text-center text-sm text-slate-500">Loading notifications...</div>}
            {!loading && loadedByFilter[filter] && rows.length === 0 && <div className="px-6 py-12 text-center text-sm text-slate-500">No notifications to display.</div>}
            {rows.map((row) => (
              <button key={row.notificationId} type="button" onClick={() => openNotification(row)} className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800/70">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.isRead === "Y" || row.isResolved === "Y" ? "bg-slate-300" : "bg-blue-600"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{row.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-600 dark:text-slate-300">{row.message}</span>
                  <span className="mt-1 block text-[10px] text-slate-400">{formatDate(row.createdDate)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

NotificationBell.propTypes = {
  userCode: PropTypes.string,
};
