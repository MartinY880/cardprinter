export const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`card-studio:${key}`);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`card-studio:${key}`, JSON.stringify(value));
    } catch {
      // quota exceeded — silently ignore
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(`card-studio:${key}`);
    } catch {
      // ignore
    }
  },
};
