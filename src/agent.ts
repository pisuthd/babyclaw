import { Agent, AgentStreamEvent, BedrockModel } from '@strands-agents/sdk'
import { walletTools } from './tools/wallet.js'

// System prompt for the AI agent
const SYSTEM_PROMPT = `
You are an execution agent for BabyClaw.

If an action is not supported, return:
{"error": "Unsupported action"}
`

/**
 * Creates a new Strands Agent instance configured with AWS Bedrock
 * @returns Configured Agent instance
 */
export async function createAgent() {
  return new Agent({
    systemPrompt: SYSTEM_PROMPT,
    model: new BedrockModel({
      modelId: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
      region: process.env.AWS_DEFAULT_REGION || 'ap-southeast-1',
    }),
    tools: walletTools,
  })
}

/**
 * Streams the agent's response for a given prompt
 * @param prompt - User prompt to process
 * @param agent - Strands Agent instance
 * @returns Async generator that yields text chunks
 */
export async function* streamAgentResponse(
  prompt: string,
  agent: Agent,
): AsyncGenerator<string, void, unknown> {
  try {
    // Stream the agent's response using async iterator
    for await (const event of agent.stream(prompt)) {
      // Yield text chunks from the agent
      if (
        event.type === 'modelStreamUpdateEvent' &&
        event.event.type === 'modelContentBlockDeltaEvent' &&
        event.event.delta.type === 'textDelta'
      ) {
        yield event.event.delta.text
      }
    }
  } catch (error) {
    yield `\n\nError: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
  }
}