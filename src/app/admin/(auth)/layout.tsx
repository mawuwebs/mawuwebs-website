export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-forest px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(252,125,20,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(250,242,160,0.15), transparent 40%)",
        }}
      />
      <main className="relative w-full max-w-md">{children}</main>
    </div>
  );
}
