export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-content-primary">404</h1>
        <p className="text-xl text-content-secondary mt-4">Page Not Found</p>
        <a href="/" className="mt-6 inline-block text-primary hover:underline">
          Return Home
        </a>
      </div>
    </div>
  )
}