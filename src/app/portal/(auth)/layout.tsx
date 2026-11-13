export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-forest px-4 py-12">
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
