import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Miyo Global",
    template: "%s | Miyo Global",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
