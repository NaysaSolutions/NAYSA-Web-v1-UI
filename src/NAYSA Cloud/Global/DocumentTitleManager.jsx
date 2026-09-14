import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_APPLICATION_TITLE = "NAYSA Financials Cloud";

const normalizePath = (value) => {
  const path = String(value || "").trim();
  if (!path) return "";

  return (path.startsWith("/") ? path : `/${path}`).replace(/\/$/, "") || "/";
};

const getMenuName = (item) =>
  String(item?.menuName || item?.menu_name || item?.MENU_NAME || item?.name || "").trim();

const getComponentKey = (item) =>
  String(
    item?.componentKey || item?.component_key || item?.COMPONENT_KEY || "",
  ).trim();

const getMenuPath = (item) =>
  normalizePath(item?.path || item?.pathUrl || item?.route || item?.url || "");

const findMenu = (items, predicate) => {
  for (const item of Array.isArray(items) ? items : []) {
    if (predicate(item)) return item;

    const match = findMenu(item?.subMenu, predicate);
    if (match) return match;
  }

  return null;
};

const DocumentTitleManager = ({ menuItems = [], routeRows = [], activeComponentKey = "" }) => {
  const location = useLocation();

  const title = useMemo(() => {
    const currentPath = normalizePath(location.pathname);
    const routeComponentKey = currentPath.startsWith("/page/")
      ? decodeURIComponent(currentPath.slice("/page/".length))
      : "";
    const targetComponentKey = String(activeComponentKey || routeComponentKey).trim();

    if (activeComponentKey) {
      const modalMenu = findMenu(
        menuItems,
        (item) => getComponentKey(item) === targetComponentKey,
      );
      const modalTitle = getMenuName(modalMenu);
      if (modalTitle) return modalTitle;
    }

    const routeMatch = (Array.isArray(routeRows) ? routeRows : []).find(
      (row) => getMenuPath(row) === currentPath,
    );
    const routeTitle = getMenuName(routeMatch);
    if (routeTitle) return routeTitle;

    const pathMenu = findMenu(menuItems, (item) => getMenuPath(item) === currentPath);
    const pathTitle = getMenuName(pathMenu);
    if (pathTitle) return pathTitle;

    if (targetComponentKey) {
      const componentMenu = findMenu(
        menuItems,
        (item) => getComponentKey(item) === targetComponentKey,
      );
      const componentTitle = getMenuName(componentMenu);
      if (componentTitle) return componentTitle;

      const componentRoute = (Array.isArray(routeRows) ? routeRows : []).find(
        (row) => getComponentKey(row) === targetComponentKey,
      );
      const componentRouteTitle = getMenuName(componentRoute);
      if (componentRouteTitle) return componentRouteTitle;
    }

    return DEFAULT_APPLICATION_TITLE;
  }, [activeComponentKey, location.pathname, menuItems, routeRows]);

  useEffect(() => {
    const resolvedTitle = title || DEFAULT_APPLICATION_TITLE;
    const titleElement = document.querySelector("title");
    document.title = resolvedTitle;

    if (!titleElement) return undefined;

    const observer = new MutationObserver(() => {
      if (document.title !== resolvedTitle) document.title = resolvedTitle;
    });
    observer.observe(titleElement, { childList: true, characterData: true, subtree: true });

    return () => observer.disconnect();
  }, [title]);

  useEffect(
    () => () => {
      document.title = DEFAULT_APPLICATION_TITLE;
    },
    [],
  );

  return null;
};

export default DocumentTitleManager;
