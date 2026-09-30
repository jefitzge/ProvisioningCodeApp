/** Presents a recovery path when no configured route matches. */
export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <h2 className="mb-2 text-2xl font-semibold text-foreground">Page not found</h2>
        <p className="mb-8 max-w-md text-muted-foreground">The page does not exist or has been moved.</p>
        <a href="/" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors">Return to dashboard</a>
      </div>
    </div>
  );
}
