export type VisibilityAction = "reveal" | "hide";

export function reduceControlVisibility(
  visible: boolean,
  pinned: boolean,
  action: VisibilityAction,
): boolean {
  void visible;
  return action === "reveal" || pinned;
}
