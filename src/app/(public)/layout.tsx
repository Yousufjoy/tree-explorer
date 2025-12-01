import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nextjs App",
  description: "Nextjs App",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div>{children}</div>;
}
