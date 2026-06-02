const COOL_RGB = [214, 232, 255];
const WARM_RGB = [255, 226, 190];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function getFillLightStyle(brightness: number, temperature: number): {
  backgroundColor: string;
  opacity: number;
} {
  const opacity = clamp(brightness, 0, 100) / 100;
  const warmth = clamp(temperature, 0, 100) / 100;
  const [red, green, blue] = COOL_RGB.map((channel, index) =>
    Math.round(channel + (WARM_RGB[index] - channel) * warmth),
  );

  return {
    backgroundColor: `rgb(${red} ${green} ${blue})`,
    opacity,
  };
}
