export function Footer() {
  return (
    <footer className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t mt-auto">
      <div className="container flex h-12 md:h-14 items-center justify-between">
        <p className="mx-2 sm:mx-6 text-xs sm:text-sm text-muted-foreground text-center w-full">
          Powered by <a href="#" target="_blank" rel="noopener noreferrer" className="hover:underline">Ex Revolution</a>
        </p>
      </div>
    </footer>
  )
}
