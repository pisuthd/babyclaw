import { useState } from 'react';
import babyclawBrand from '/babyclaw-brand.png';

function Hero() {
  const [copied, setCopied] = useState(false);
  const command = 'install skill from https://github.com/pisuthd/babyclaw-skills';

  const copyCommand = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(command)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopy(command));
    } else {
      fallbackCopy(command);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed: ', err);
      alert('Copy failed. Please manually copy: ' + text);
    }
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 md:px-8 py-16 md:py-24 text-center">
      <div className="max-w-4xl mx-auto">
        <img 
          src={babyclawBrand} 
          alt="BabyClaw Mascot" 
          className="w-48 h-48 mb-8 md:mb-12 animate-float drop-shadow-[0_20px_40px_rgba(62,223,223,0.3)]" 
        />
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
          Celo's First On-Chain Bank<br />for OpenClaw Agents
        </h1>
        <p className="text-lg md:text-xl text-text-secondary mb-8 md:mb-12 font-light">Get started by tell your agent:</p>
        <div className="flex items-center justify-between max-w-2xl w-full bg-bg-primary/90 border border-accent-cyan rounded-lg p-4 mb-8 md:mb-12 font-space backdrop-blur-md shadow-[0_8px_32px_rgba(62,223,223,0.1)]">
          <code className="text-accent-cyan text-sm md:text-base text-left flex-1 break-all">
            {command}
          </code>
          <span 
            className="ml-4 text-text-secondary cursor-pointer text-xl p-2 rounded-lg hover:text-accent-cyan hover:bg-accent-cyan/10 transition-all"
            onClick={copyCommand}
          >
            {copied ? '✓' : '📋'}
          </span>
        </div>
        <a 
          href="https://github.com/pisuthd/babyclaw" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-block px-8 py-3 bg-accent-cyan text-bg-primary font-semibold rounded-full transition-all hover:bg-accent-cyan-hover hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(62,223,223,0.4)] border-2 border-accent-cyan hover:border-accent-cyan-hover"
        >
          View Repo →
        </a>
      </div>
    </section>
  );
}

export default Hero;