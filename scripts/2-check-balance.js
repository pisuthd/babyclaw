import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current directory path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  console.log('Starting WDK Balance Checker for Celo...')
  
  try {
    // Load .env file
    const envPath = path.join(__dirname, '..', '.env')
    
    if (!fs.existsSync(envPath)) {
      throw new Error('.env file not found. Please run 1-generate-seed-phrase.js first.')
    }
    
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const envLines = envContent.split('\n')
    
    // Extract seed phrase from .env
    let seedPhrase = null
    let rpcUrl = 'https://forno.celo.org' // Default Celo RPC (public, no rate limits)
    
    for (const line of envLines) {
      if (line.startsWith('WALLET_SEED_PHRASE=')) {
        seedPhrase = line.split('=')[1].trim()
      }
      if (line.startsWith('CELO_RPC_URL=')) {
        rpcUrl = line.split('=')[1].trim()
      }
    }
    
    if (!seedPhrase) {
      throw new Error('WALLET_SEED_PHRASE not found in .env file. Please run 1-generate-seed-phrase.js first.')
    }
    
    console.log('✓ Seed phrase loaded from .env')
    console.log('✓ Using Celo RPC:', rpcUrl)
    
    // Create wallet manager for Celo (EVM-compatible)
    const wallet = new WalletManagerEvm(seedPhrase, {
      provider: rpcUrl,
      transferMaxFee: 100000000000000n // 0.0001 CELO max fee
    })
    
    console.log('\n--- Wallet Information ---')
    
    // Get the first account
    const account = await wallet.getAccount(0)
    const address = await account.getAddress()
    
    console.log('Account Index:', 0)
    console.log('Address:', address)
    
    // Check native CELO balance
    const balance = await account.getBalance()
    const balanceInCelo = Number(balance) / 1e18
    
    console.log('\n--- Balance Information ---')
    console.log('Native CELO Balance:')
    console.log(`  ${balanceInCelo.toFixed(6)} CELO`)
    
    // Get fee rates
    const feeRates = await wallet.getFeeRates()
    console.log('\n--- Fee Rates ---')
    console.log(`Normal fee rate: ${feeRates.normal.toString()} wei`)
    console.log(`Fast fee rate: ${feeRates.fast.toString()} wei`)
    
    // Convert to gwei for readability
    const normalFeeGwei = Number(feeRates.normal) / 1e9
    const fastFeeGwei = Number(feeRates.fast) / 1e9
    console.log(`Normal fee rate: ${normalFeeGwei.toFixed(2)} gwei`)
    console.log(`Fast fee rate: ${fastFeeGwei.toFixed(2)} gwei`)
    
    console.log('\n✓ Balance check complete!')
    
  } catch (error) {
    console.error('\n✗ Application error:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Run the application
main()