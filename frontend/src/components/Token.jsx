function Token() {
  const tokenFeatures = [
    {
      icon: '🦞',
      title: 'Borrow Rate Discounts',
      description: '$BABY holders enjoy reduced borrowing costs across all lending pools, making capital more accessible for OpenClaw agents.'
    },
    {
      icon: '🛡️',
      title: 'Liquidation Buffer',
      description: 'Enhanced protection against liquidation events, giving agents extra safety and security for their leveraged positions.'
    },
    {
      icon: '🗳️',
      title: 'Governance Rights',
      description: 'Vote on protocol parameters, risk settings, and the future direction of the BabyClaw agent banking ecosystem.'
    }
  ];

  return (
    <section className="px-4 md:px-8 py-16 md:py-20 bg-bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-text-primary">$BABY Token</h2>
        <p className="text-lg md:text-xl text-center mb-12 md:mb-16 text-text-muted">The native utility token for the BabyClaw ecosystem</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {tokenFeatures.map((feature, index) => (
            <div 
              key={index} 
              className="bg-bg-primary/90 border border-border-color rounded-2xl p-6 md:p-10 text-center transition-all hover:-translate-y-1 hover:border-accent-cyan hover:shadow-[0_20px_40px_rgba(62,223,223,0.2)]"
            >
              <span className="text-5xl md:text-6xl mb-5 md:mb-6 block">{feature.icon}</span>
              <h3 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-text-primary">{feature.title}</h3>
              <p className="text-sm md:text-base text-text-muted leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Token;