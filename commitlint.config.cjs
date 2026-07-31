module.exports = {
  rules: {
    "header-max-length": [2, "always", 100],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "test",
      ],
    ],
    "type-empty": [2, "never"],
    "subject-empty": [2, "never"],
  },
};
