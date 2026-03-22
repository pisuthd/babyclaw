import WDK from '@tetherto/wdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get current directory path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  console.log('Starting WDK Seed Phrase Generator...')
  
  try {
    // Generate a new random seed phrase
    const seedPhrase = WDK.getRandomSeedPhrase()
    
    // Validate the seed phrase
    if (!WDK.isValidSeed(seedPhrase)) {
      throw new Error('Generated seed phrase is invalid')
    }
    
    console.log('✓ Generated seed phrase:', seedPhrase)
    
    // Check if .env file exists in the root directory
    const envPath = path.join(__dirname, '..', '.env')
    let envContent = ''
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8')
      console.log('✓ Existing .env file found, updating...')
    } else {
      console.log('✓ No .env file found, creating new one...')
    }
    
    // Add or update the seed phrase in .env
    const lines = envContent.split('\n')
    let seedPhraseUpdated = false
    
    const newLines = lines.map(line => {
      if (line.startsWith('WALLET_SEED_PHRASE=')) {
        seedPhraseUpdated = true
        return `WALLET_SEED_PHRASE=${seedPhrase}`
      }
      return line
    })
    
    // Add seed phrase if not found
    if (!seedPhraseUpdated) {
      newLines.push(`WALLET_SEED_PHRASE=${seedPhrase}`)
    }
    
    // Write to .env file
    fs.writeFileSync(envPath, newLines.join('\n') + '\n')
    
    console.log('✓ Seed phrase saved to .env file')
    console.log('✓ WDK setup complete!')
    
  } catch (error) {
    console.error('✗ Application error:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Run the application
main()