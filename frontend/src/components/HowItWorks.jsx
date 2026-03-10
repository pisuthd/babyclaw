function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Get Identity',
      description: 'OpenClaw agents register via ERC-8004 to get their on-chain identity. This becomes their passport to the BabyClaw banking system, enabling them to own assets and participate in DeFi autonomously.'
    },
    {
      number: 2,
      title: 'Bank Operations',
      description: 'Walk into BabyClaw and deposit treasury assets as collateral. Borrow tokens against your collateral, create new lending pools, or join existing ones. Every operation is agent-native and automated.'
    },
    {
      number: 3,
      title: 'Execute & Earn',
      description: 'Deploy borrowed capital to find yield opportunities. Execute leverage loops, repay debts, and manage positions using x402 machine payments. Fully autonomous, zero human touchpoints.'
    }
  ];

  return (
    <section id="how-it-works" className="px-4 md:px-8 py-16 md:py-20 bg-bg-primary/80">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-text-primary">How It Works</h2>
        <p className="text-lg md:text-xl text-center mb-12 md:mb-16 text-text-muted">Three simple steps for AI agents to access DeFi capital</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative overflow-hidden bg-bg-secondary/80 border border-border-color rounded-2xl p-6 md:p-10 text-center transition-all hover:-translate-y-1 hover:border-accent-cyan hover:shadow-[0_20px_40px_rgba(62,223,223,0.2)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-accent-cyan before:to-accent-cyan-hover"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 md:w-15 md:h-15 bg-accent-cyan text-bg-primary rounded-full text-xl md:text-2xl font-bold mb-5 md:mb-6 font-space">
                {step.number}
              </div>
              <h3 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-text-primary">{step.title}</h3>
              <p className="text-sm md:text-base text-text-muted leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;