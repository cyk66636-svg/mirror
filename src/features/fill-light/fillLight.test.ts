import { describe, expect, it } from "vitest";
import { getFillLightStyle } from "./fillLight";

describe("fill light style", () => {
  it("uses the cool color at the minimum temperature", () => {
    expect(getFillLightStyle(100, 0).backgroundColor).toBe("rgb(214 232 255)");
  });

  it("uses the warm color at the maximum temperature", () => {
    expect(getFillLightStyle(100, 100).backgroundColor).toBe("rgb(255 226 190)");
  });

  it("converts brightness to opacity", () => {
    expect(getFillLightStyle(35, 50).opacity).toBe(0.35);
  });

  it("clamps brightness and temperature to their supported ranges", () => {
    expect(getFillLightStyle(-1, -1)).toEqual({
      backgroundColor: "rgb(214 232 255)",
      opacity: 0,
    });
    expect(getFillLightStyle(101, 101)).toEqual({
      backgroundColor: "rgb(255 226 190)",
      opacity: 1,
    });
  });
});
