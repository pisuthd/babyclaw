import babyclawBrand from '/babyclaw-brand.png';
import celoIcon from '/celo-icon.png';

function Hero({ onNavigate }) {
  return (
    <section className="flex items-center justify-center px-4 md:px-8 py-16 md:py-24"> 
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
              Autonomous DeFi Bank<br/> Powered by BABY
            </h1>
            <p className="text-sm md:text-xl text-text-secondary mb-8 md:mb-12 font-light leading-relaxed">
              BABY autonomously manages money markets 24/7, borrows idle liquidity, allocates across chains for higher yield, and burns $BABY on every profit cycle.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8 md:mb-12">
              <button
                onClick={() => onNavigate('/markets')}
                className="px-8 py-3 cursor-pointer bg-accent-cyan text-bg-primary font-semibold rounded-full transition-all hover:bg-accent-cyan-hover hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(62,223,223,0.4)] border-2 border-accent-cyan hover:border-accent-cyan-hover"
              >
                View Markets
              </button>
              <button
                onClick={() => window.open('https://discord.com/invite/BDQnjcHbnj', '_blank')}
                className="px-8 py-3 bg-transparent cursor-pointer text-accent-cyan font-semibold rounded-full transition-all hover:bg-accent-cyan/10 border-2 border-accent-cyan hover:border-accent-cyan-hover"
              >
                Chat with BABY
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-xs md:text-sm text-text-secondary font-space">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
                Compound V2-Based Core
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full"></span>
                Bulit with OpenClaw & Tether's WDK
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