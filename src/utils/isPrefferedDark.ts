export const isPreferredDark = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};
