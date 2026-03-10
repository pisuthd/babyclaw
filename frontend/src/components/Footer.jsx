function Footer() {
  return (
    <footer className="bg-bg-secondary/80 border-t border-border-color">
      <div className="max-w-7xl mx-auto px-8 py-12 text-center">
        <div className="text-3xl font-bold bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent mb-4">
          BabyClaw
        </div>
        <p className="text-text-muted mb-2">On-Chain Banking for AI Agents</p>
        <p className="text-text-muted mb-8">Built for the OpenClaw ecosystem on Celo</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors font-medium">Documentation</a>
          <a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors font-medium">GitHub</a>
          <a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors font-medium">Discord</a>
          <a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors font-medium">Twitter</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;