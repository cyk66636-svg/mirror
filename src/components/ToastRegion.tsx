type ToastRegionProps = {
  message?: string;
};

export function ToastRegion({ message }: ToastRegionProps) {
  return (
    <div
      className={`toast-region${message ? " is-visible" : ""}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
