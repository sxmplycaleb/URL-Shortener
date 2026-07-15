export default {
  test: {
    environment: "node",
    include: ["backend/tests/**/*.test.js"],
    fileParallelism: false,
    globals: false,
    testTimeout: 900_000,
    hookTimeout: 900_000,
  },
};
