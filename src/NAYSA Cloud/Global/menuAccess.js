export const getAccessibleMenuModules = () => {
  if (typeof window === "undefined") return null;

  const storedMenuItems = window.sessionStorage.getItem("menuItems");
  if (storedMenuItems === null) return null;

  try {
    const menuItems = JSON.parse(storedMenuItems);
    const moduleCodes = new Set();
    const visited = new WeakSet();

    const collectModuleCodes = (value) => {
      if (!value || typeof value !== "object" || visited.has(value)) return;
      visited.add(value);

      const moduleCode = value.moduleCode ?? value.module_code ?? value.MODULE_CODE;
      if (moduleCode) moduleCodes.add(String(moduleCode).trim().toUpperCase());

      Object.values(value).forEach(collectModuleCodes);
    };

    collectModuleCodes(menuItems);
    return moduleCodes.size > 0 ? moduleCodes : null;
  } catch {
    return null;
  }
};

export const hasAccessibleMenuModule = (moduleCodes, moduleCode) =>
  moduleCodes === null || moduleCodes.has(String(moduleCode || "").trim().toUpperCase());
