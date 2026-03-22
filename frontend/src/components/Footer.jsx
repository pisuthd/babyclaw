function Footer() {
  return (
    <footer className="bg-bg-secondary/80 border-t border-border-color">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent mb-3" style={{ fontFamily: '"Orbitron", sans-serif' }}>
              BabyClaw
            </div>
            <p className="text-text-muted text-sm leading-relaxed max-w-sm">
              Autonomous DeFi Banking with BABY, an OpenClaw agent powered by Tether's WDK
            </p>
          </div>

          {/* Features Column */}
          <div>
            <h3 className="text-text-primary font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">Autonomous Yield</a></li>
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">Cross-Chain Allocation</a></li>
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">Token Burns</a></li> 
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="text-text-primary font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">Documentation</a></li>
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">GitHub</a></li>
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">Smart Contracts</a></li> 
            </ul>
          </div>

          {/* Community Column */}
          <div>
            <h3 className="text-text-primary font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">Discord</a></li>
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">Twitter</a></li>
              <li><a href="#" className="text-text-secondary hover:text-accent-cyan transition-colors">Forum</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border-color mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-text-muted text-sm">
            Made with ❤️ during Tether Hackathon Galactica: WDK Edition 1
          </p>
          <p className="text-text-muted text-sm">
            © 2026 BabyClaw. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;