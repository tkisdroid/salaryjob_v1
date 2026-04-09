export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-light/30 to-background px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
