export type ElementSelectionMessage = {
  type: "TAMANDUA_ELEMENT_SELECTED";
  element: Record<string, unknown>;
};

export type ExtensionMessage =
  | { type: "TAMANDUA_HEALTH" }
  | { type: "TAMANDUA_ANALYZE_PAGE" }
  | { type: "TAMANDUA_START_SELECTOR" }
  | { type: "TAMANDUA_STOP_SELECTOR" }
  | { type: "TAMANDUA_HIGHLIGHT_ELEMENT"; selector: string }
  | ElementSelectionMessage
  | {
      type: "TAMANDUA_ELEMENT_SELECTED_FORWARD";
      element: Record<string, unknown>;
    };
