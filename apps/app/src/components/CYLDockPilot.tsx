export type CYLDockProps = {
  titles: string[];
  selectedIndex: number;
  dark: boolean;
  height: number;
  onHeight: (height: number) => void;
  onSelect: (index: number, identifier: string) => void;
};

// Metro resolves the iOS implementation separately. Android/web link no CYL code.
export const pilotDockAvailable = false;
export default function CYLDockPilot(_props: CYLDockProps) {
  return null;
}
