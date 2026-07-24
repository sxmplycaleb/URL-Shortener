import { describe, expect, test } from "vitest";

import { formatCompactNumber } from "@/lib/numberFormatter";

describe("formatCompactNumber", () => {
  test.each([
    [999, "999"],
    [1_000, "1K"],
    [3_200, "3.2K"],
    [12_000, "12K"],
    [125_000, "125K"],
    [980_000, "980K"],
    [1_200_000, "1.2M"],
    [5_800_000, "5.8M"],
  ])("formats %i as %s", (value, expected) => {
    expect(formatCompactNumber(value)).toBe(expected);
  });
});
