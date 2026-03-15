import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

function Header({ onNavigate }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Lounge', path: '/lounge' },
    { label: 'Markets', path: '/markets' },
    // { label: '$BABY', path: '/baby' },
    { label: 'Portfolio', path: '/portfolio' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/90 backdrop-blur-md border-b border-border-color px-4 py-4 md:px-8 md:py-5">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <a 
          href="#/" 
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="text-2xl font-bold bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent"
        >
          BabyClaw
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className="text-sm cursor-pointer font-medium text-text-secondary hover:text-accent-cyan transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Connect Button */}
        <div className="flex items-center">
          <ConnectButton />
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden ml-4 p-2 text-text-secondary hover:text-accent-cyan transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-border-color pt-4">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className="text-left px-4 py-2 text-sm font-medium text-text-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 rounded-lg transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
