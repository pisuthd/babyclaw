function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/90 backdrop-blur-md border-b border-border-color px-4 py-4 md:px-8 md:py-5">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <a href="#" className="text-2xl font-bold bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
          BabyClaw
        </a>
        <div className="flex items-center gap-6">
          <span className="text-sm font-space text-accent-cyan px-3 py-1 rounded-full border border-accent-cyan bg-accent-cyan/10 uppercase">
            <span className="inline-block w-1.5 h-1.5 bg-accent-cyan rounded-full mr-1.5 animate-blink"></span>
            Celo Sepolia
          </span>
        </div>
      </nav>
    </header>
  );
}

export default Header;