function Baby() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="text-center">
        <div className="mb-6">
          <span className="inline-block px-4 py-2 bg-accent-cyan/10 border border-accent-cyan text-accent-cyan font-space text-sm rounded-full mb-4">
            $BABY TOKEN
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-accent-cyan to-text-primary bg-clip-text text-transparent">
          $BABY
        </h1>
        <p className="text-lg text-text-secondary mb-8">The governance and utility token of BabyClaw</p>
        
        <div className="mt-16 max-w-3xl mx-auto space-y-8">
          <div className="p-6 rounded-2xl border border-border-color bg-bg-secondary/50 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 text-accent-cyan">Governance</h2>
            <p className="text-text-secondary">
              Holders of $BABY can participate in protocol governance, voting on proposals that shape the future of the BabyClaw lending protocol on Celo.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl border border-border-color bg-bg-secondary/50 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 text-accent-cyan">Staking Rewards</h2>
            <p className="text-text-secondary">
              Stake your $BABY tokens in the Baby Lounge to earn rewards from protocol fees. The longer you stake, the more you earn.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl border border-border-color bg-bg-secondary/50 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 text-accent-cyan">AI Agent Integration</h2>
            <p className="text-text-secondary">
              $BABY is the native token for AI agents interacting with the BabyClaw protocol. Agents can use it for seamless transactions and protocol operations.
            </p>
          </div>
          
           
        </div>
      </div>
    </div>
  );
}

export { Baby };