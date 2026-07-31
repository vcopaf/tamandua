declare const browser: typeof chrome;
declare function defineBackground(main: () => void): unknown;
declare function defineContentScript(options: {
  matches: string[];
  main: () => void;
}): unknown;
