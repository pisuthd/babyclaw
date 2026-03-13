function Portfolio() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
          Portfolio
        </h1>
        <p className="text-lg text-text-secondary mb-8">Track your assets, positions, and earnings</p>
        
        <div className="mt-16 p-8 rounded-2xl border border-border-color bg-bg-secondary/50 backdrop-blur-sm">
          <div className="animate-pulse">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-cyan/20 flex items-center justify-center">
              <span className="text-3xl">💼</span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-text-secondary">
              View your complete portfolio including supplied assets, borrowed positions, staking rewards, and more. Connect your wallet to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Portfolio };