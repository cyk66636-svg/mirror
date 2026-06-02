export type VisibilityAction = "reveal" | "hide";

export function reduceControlVisibility(
  visible: boolean,
  pinned: boolean,
  action: VisibilityAction,
): boolean {
  if (action === "reveal") {
    return true;
  }

  return pinned ? visible : false;
}
