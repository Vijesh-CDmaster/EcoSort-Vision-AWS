import { Recycle, Leaf, Trash2, GlassWater, type LucideProps } from "lucide-react";

export const Icons = {
  Logo: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M14.5 9.5 11 13V9" />
      <path d="m9.5 14.5 3.5-3.5V15" />
    </svg>
  ),
  Recycling: (props: LucideProps) => <Recycle {...props} />,
  Compost: (props: LucideProps) => <Leaf {...props} />,
  Landfill: (props: LucideProps) => <Trash2 {...props} />,
  Glass: (props: LucideProps) => <GlassWater {...props} />,
};
