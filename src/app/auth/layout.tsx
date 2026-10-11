export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages have their own full-page layout without sidebar
  return <>{children}</>;
}
