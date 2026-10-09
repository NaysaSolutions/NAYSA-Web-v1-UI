export const getAccessibleMenuModules = (menuSource) => {
  if (typeof window === "undefined") return null;

  const storedMenuItems = menuSource === undefined ? window.sessionStorage.getItem("menuItems") : menuSource;
  if (storedMenuItems === null || storedMenuItems === undefined) return null;

  try {
    const menuItems = typeof storedMenuItems === "string" ? JSON.parse(storedMenuItems) : storedMenuItems;
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

export const getAccessibleMenuComponents = (menuSource) => {
  if (typeof window === "undefined") return null;

  const storedMenuItems = menuSource === undefined ? window.sessionStorage.getItem("menuItems") : menuSource;
  if (storedMenuItems === null || storedMenuItems === undefined) return null;

  try {
    const menuItems = typeof storedMenuItems === "string" ? JSON.parse(storedMenuItems) : storedMenuItems;
    const componentKeys = new Set();
    const visited = new WeakSet();

    const collectComponentKeys = (value) => {
      if (!value || typeof value !== "object" || visited.has(value)) return;
      visited.add(value);

      const componentKey = value.componentKey ?? value.component_key ?? value.COMPONENT_KEY;
      if (componentKey) componentKeys.add(String(componentKey).trim().toUpperCase());

      Object.values(value).forEach(collectComponentKeys);
    };

    collectComponentKeys(menuItems);
    return componentKeys.size > 0 ? componentKeys : null;
  } catch {
    return null;
  }
};

export const hasAccessibleMenuComponent = (componentKeys, componentKey) =>
  componentKeys === null || componentKeys.has(String(componentKey || "").trim().toUpperCase());
