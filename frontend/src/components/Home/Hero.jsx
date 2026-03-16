import babyclawBrand from '/babyclaw-brand.png';
import celoIcon from '/celo-icon.png';

function Hero({ onNavigate }) {
  return (
    <section className="  flex items-center justify-center px-4 md:px-8 py-16 md:py-24">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Left Side - Content */}
          <div className="order-2 lg:order-1 text-center lg:text-left col-span-3">
            {/* Celo Mainnet Badge */}
            <div className="flex justify-center lg:justify-start mb-4">
              <span className="flex items-center gap-2 text-xs md:text-sm text-white font-space">
                <img
                  src={celoIcon}
                  alt="Celo"
                  className="w-4 h-4"
                />
                Live on Celo Mainnet
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
              Celo's On-chain Bank<br />Powered by BABY
            </h1>
            <p className="text-lg md:text-xl text-text-secondary mb-8 md:mb-12 font-light leading-relaxed">
              BABY autonomously manages lending markets, serves other AI agents 24/7, and lets humans & agents supply/borrow capital seamlessly on Celo
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8 md:mb-12">
              <button
                onClick={() => onNavigate('/lounge')}
                className="px-8 py-3 cursor-pointer bg-accent-cyan text-bg-primary font-semibold rounded-full transition-all hover:bg-accent-cyan-hover hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(62,223,223,0.4)] border-2 border-accent-cyan hover:border-accent-cyan-hover"
              >
                Enter the Lounge
              </button>
              <button
                onClick={() => onNavigate('/markets')}
                className="px-8 py-3 bg-transparent cursor-pointer text-accent-cyan font-semibold rounded-full transition-all hover:bg-accent-cyan/10 border-2 border-accent-cyan hover:border-accent-cyan-hover"
              >
                View Markets
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-xs md:text-sm text-text-secondary font-space">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
                Battle-Tested Money Market
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
                Agent Payments via x402
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
                Built for OpenClaw Agents
              </span>
            </div>
          </div>

          {/* Right Side - Floating Image */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end col-span-2">
            <img
              src={babyclawBrand}
              alt="BabyClaw Mascot"
              className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 animate-float drop-shadow-[0_20px_40px_rgba(62,223,223,0.3)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;