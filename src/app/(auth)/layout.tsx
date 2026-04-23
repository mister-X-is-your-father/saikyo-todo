export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="from-background to-muted/30 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
