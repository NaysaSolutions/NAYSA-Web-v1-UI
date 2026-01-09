
import React, { useEffect, useMemo, useState } from "react";
import { NavLink  } from "react-router-dom";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  FiChevronDown,
  FiChevronRight,
  FiHome,
  FiBook,
  FiCreditCard,
  FiDollarSign,
  FiGlobe,
  FiShield,
  FiSearch,
  FiSun,
  FiMoon
} from "react-icons/fi";

const iconMap = {
  "Dashboard": FiHome,
  "General Ledger": FiBook,
  "Accounts Payable": FiCreditCard,
  "Accounts Receivable": FiDollarSign,
  "Global Reference": FiGlobe,
  "Application Security": FiShield
};

const highlightText = (text, searchTerm) => {
  if (!searchTerm) return text;
  const safe = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${safe})`, "gi");
  return String(text).split(regex).map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 rounded px-1">{part}</mark>
      : part
  );
};

const anyDescendantMatches = (node, lcTerm) => {
  if (!node) return false;
  if ((node.name || "").toLowerCase().includes(lcTerm)) return true;
  if (Array.isArray(node.subMenu)) {
    return node.subMenu.some((child) => anyDescendantMatches(child, lcTerm));
  }
  return false;
};

const MenuItem = ({ item, level = 0, searchTerm, onNavigate, onOpenModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const hasSubMenu = Array.isArray(item?.subMenu) && item.subMenu.length > 0;
  const Icon = level === 0 ? iconMap[item?.name] : null;
  const ChevronIcon = hasSubMenu ? (isOpen ? FiChevronDown : FiChevronRight) : null;
  const isPost = /finalize/i.test(item?.name ?? "");

  useEffect(() => {
    const lc = (searchTerm || "").toLowerCase();
    if (!lc) {
      setIsVisible(true);
      setIsOpen(false);
      return;
    }
    const matches = (item?.name || "").toLowerCase().includes(lc);
    const descendant = hasSubMenu && anyDescendantMatches(item, lc);
    setIsVisible(matches || descendant);
    if (descendant) setIsOpen(true);
  }, [searchTerm, item, hasSubMenu]);

  if (!isVisible) return null;

  const paddingLeft = level === 0 ? "pl-3" : level === 1 ? "pl-8" : "pl-12";

  const rowBase =
    `flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-200 group hover:scale-[1.02] ${paddingLeft} ` +
    (level === 0
      ? "text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-gray-700 hover:shadow-lg"
      : level === 1
      ? "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      : "text-gray-500 dark:text-gray-400 hover:bg-gray-25 dark:hover:bg-gray-800/30");

  const label = (
    <div className="flex items-center space-x-3 flex-1 min-w-0">
      {level === 0 && Icon && (
        <Icon
          className={`text-xl flex-shrink-0 transition-colors duration-200 ${
            isOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
          } group-hover:text-blue-600 dark:group-hover:text-blue-400`}
        />
      )}
      {level > 0 && (
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-200 ${
            level === 1 ? "bg-blue-300 dark:bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
          } group-hover:bg-blue-400 dark:group-hover:bg-blue-500`}
        />
      )}
      <span
        className={`truncate transition-colors duration-200 ${
          level === 0 ? "font-semibold text-sm" : level === 1 ? "text-sm" : "text-xs" +
          (isPost ? " text-blue-600 dark:text-blue-400" : "")
        }`}
      >
        {highlightText(item?.name || "", searchTerm)}
      </span>
    </div>
  );

  // Parent node
  if (hasSubMenu) {
    return (
      <li key={item?.code || item?.name}>
        <div
          className={rowBase + " cursor-pointer"}
          onClick={() => setIsOpen((o) => !o)}
          role="button"
          aria-expanded={isOpen}
          aria-controls={`submenu-${(item?.name || "").replace(/\s/g, "-")}`}
        >
          {label}
          {ChevronIcon && (
            <ChevronIcon
              className={`text-gray-400 dark:text-gray-500 transition-all duration-200 flex-shrink-0 ${
                isOpen ? "rotate-0 text-blue-600 dark:text-blue-400" : "group-hover:text-blue-600 dark:group-hover:text-blue-400"
              }`}
            />
          )}
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="mt-1 space-y-1">
            {item.subMenu.map((sub, i) => (
              <MenuItem
                key={(sub.code || sub.name || "k") + i}
                item={sub}
                level={level + 1}
                searchTerm={searchTerm}
                onNavigate={onNavigate}
                onOpenModal={onOpenModal}
              />
            ))}
          </ul>
        </div>
      </li>
    );
  }


  const isModal = !!item?.isModal;
  if (isModal) {
    return (
      <li key={item?.code || item?.name}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal?.(item?.componentKey); 
            onNavigate?.();                    
          }}
          className={rowBase + " w-full text-left cursor-pointer"}
        >
          {label}
        </button>
      </li>
    );
  }

  // Normal route
  return (
    <li key={item?.code || item?.name}>
      <NavLink
        to={item?.path}
        end
        onClick={() => onNavigate?.()}
        className={({ isActive }) =>
          rowBase +
          " block cursor-pointer " +
          (isActive ? " ring-1 ring-blue-500/40 bg-blue-50 dark:bg-gray-800/40" : "")
        }
      >
        {label}
      </NavLink>
    </li>
  );
};

const Sidebar = ({ menuItems = null, onNavigate, onOpenModal }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user } = useAuth();

  // internal fetch (only if menuItems prop not provided)
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (menuItems && Array.isArray(menuItems) && menuItems.length > 0) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetchData("menu-items",{ USER_CODE: user?.USER_CODE}); // GET /api/menu-items
        if (!alive) return;
        setFetched(res?.menuItems ?? []);
      } catch (e) {
        if (!alive) return;
        console.error("[Sidebar] menu fetch failed:", e);
        setError("Failed to load menu");
        setFetched([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [menuItems]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const items = useMemo(() => {
    if (menuItems && Array.isArray(menuItems) && menuItems.length > 0) return menuItems;
    return fetched;
  }, [menuItems, fetched]);

  return (
    <div className="sidebar flex flex-col h-screen w-80 bg-white dark:bg-gray-900 shadow-2xl">
      {/* Header */}
      <div className="flex-shrink-0 p-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <img
            src="naysa_logo.png"
            className="w-[80px] h-[50px] mb-1 object-contain"
            alt="Naysa Logo"
          />
          <span className="text-blue-900 cursor-pointer dark:text-white text-lg font-bold">
            Financials
          </span>
        </div>
        <button
          onClick={() => setIsDarkMode((v) => !v)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Menu list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading menu…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <nav>
            <ul className="space-y-1">
              {Array.isArray(items) && items.length > 0 ? (
                items.map((item, idx) => (
                  <MenuItem
                    key={(item.code || item.name || "root") + idx}
                    item={item}
                    level={0}
                    searchTerm={searchTerm}
                    onNavigate={onNavigate}
                    onOpenModal={onOpenModal}
                  />
                ))
              ) : (
                <li className="text-sm text-gray-500 dark:text-gray-400">No menu items</li>
              )}
            </ul>
          </nav>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          © 2025 NAYSA-Solutions Inc.
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
