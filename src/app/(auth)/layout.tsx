export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-labelledby="signup-heading login-heading"
      className="from-background to-muted/30 flex min-h-dvh items-center justify-center bg-gradient-to-br p-4 focus-visible:outline-none"
    >
      <div className="w-full max-w-md">{children}</div>
    </main>
  )
}
