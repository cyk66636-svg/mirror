import { getFillLightStyle } from "../features/fill-light/fillLight";
import type { FillLightLayout } from "../features/settings/mirrorSettings";

type FillLightProps = {
  brightness: number;
  colorTemperature: number;
  layout: FillLightLayout;
};

export function FillLight({
  brightness,
  colorTemperature,
  layout,
}: FillLightProps) {
  const style = getFillLightStyle(brightness, colorTemperature);

  return (
    <div className={`fill-light fill-light--${layout}`} aria-hidden="true">
      <div className="fill-light-background" style={style} />
      {layout === "frame" ? (
        <div
          className="fill-light-frame"
          style={{ ...style, color: style.backgroundColor }}
        />
      ) : null}
    </div>
  );
}
