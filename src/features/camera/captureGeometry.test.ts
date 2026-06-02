import { describe, expect, it } from "vitest";
import { computeCoverCrop } from "./captureGeometry";

describe("capture geometry", () => {
  it("computes a centered cover crop", () => {
    expect(computeCoverCrop(1920, 1080, 500, 500, 1)).toEqual({
      sx: 420,
      sy: 0,
      sw: 1080,
      sh: 1080,
    });
  });

  it("applies zoom around the center of the cover crop", () => {
    expect(computeCoverCrop(1920, 1080, 500, 500, 2)).toEqual({
      sx: 690,
      sy: 270,
      sw: 540,
      sh: 540,
    });
  });

  it("clamps zoom to the supported range", () => {
    expect(computeCoverCrop(1920, 1080, 500, 500, 0)).toEqual({
      sx: 420,
      sy: 0,
      sw: 1080,
      sh: 1080,
    });
    expect(computeCoverCrop(1920, 1080, 500, 500, 3)).toEqual({
      sx: 690,
      sy: 270,
      sw: 540,
      sh: 540,
    });
  });

  it("rejects a zero viewport width", () => {
    expect(() => computeCoverCrop(1920, 1080, 0, 500, 1)).toThrow(
      new RangeError("Viewport dimensions must be positive finite numbers."),
    );
  });

  it("rejects a zero viewport height", () => {
    expect(() => computeCoverCrop(1920, 1080, 500, 0, 1)).toThrow(
      new RangeError("Viewport dimensions must be positive finite numbers."),
    );
  });

  it("rejects a non-finite zoom", () => {
    expect(() => computeCoverCrop(1920, 1080, 500, 500, NaN)).toThrow(
      new RangeError("Zoom must be a finite number."),
    );
  });

  it("computes a centered cover crop for a portrait source", () => {
    expect(computeCoverCrop(1080, 1920, 500, 500, 1)).toEqual({
      sx: 0,
      sy: 420,
      sw: 1080,
      sh: 1080,
    });
  });
});
