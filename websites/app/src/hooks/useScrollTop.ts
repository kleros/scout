export const useScrollTop = () => {
  return (smooth = false) => {
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  };
};
