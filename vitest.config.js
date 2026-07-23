export default {
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["backend/tests/**/*.test.js", "src/**/*.test.ts"],
    fileParallelism: false,
    globals: false,
    testTimeout: 900_000,
    hookTimeout: 900_000,
  },
};
