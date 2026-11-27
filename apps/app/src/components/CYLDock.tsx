export type CYLDockProps = {
  titles: string[];
  selectedIndex: number;
  compact: boolean;
  dark: boolean;
  height: number;
  routeKey: string;
  scrollTarget: string | undefined;
  onHeight: (height: number) => void;
  onSelect: (index: number, identifier: string) => void;
};

// Metro resolves the iOS implementation separately. Android/web link no CYL code.
export const cylDockAvailable = false;
export default function CYLDock(_props: CYLDockProps) {
  return null;
}
