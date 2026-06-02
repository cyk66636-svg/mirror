import { describe, expect, it } from "vitest";
import { reduceControlVisibility } from "./controlVisibility";

describe("reduceControlVisibility", () => {
  it("reveals hidden unpinned controls", () => {
    expect(reduceControlVisibility(false, false, "reveal")).toBe(true);
  });

  it("hides visible unpinned controls", () => {
    expect(reduceControlVisibility(true, false, "hide")).toBe(false);
  });

  it("keeps visible pinned controls revealed when hiding", () => {
    expect(reduceControlVisibility(true, true, "hide")).toBe(true);
  });

  it("reveals hidden pinned controls when hiding", () => {
    expect(reduceControlVisibility(false, true, "hide")).toBe(true);
  });
});
