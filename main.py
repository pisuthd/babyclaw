from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse 
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, AsyncGenerator, List, Optional
from strands.tools.mcp import MCPClient
from strands import Agent
from mcp import stdio_client, StdioServerParameters
from pydantic import BaseModel, field_validator
from datetime import datetime
from strands.models import BedrockModel
import boto3
import os
from dotenv import load_dotenv

# Load .env for local development
load_dotenv()

# AWS credentials are automatically picked up from environment variables
# Both boto3 and strands-agents will use the same credentials
boto_session = boto3.Session(
    region_name=os.getenv("AWS_DEFAULT_REGION", "ap-southeast-1")
)

# Pydantic model for /stream endpoint
class StreamRequest(BaseModel):
    prompt: str
    
    @field_validator('prompt')
    def validate_prompt_length(cls, v):
        if len(v) > 500:
            raise ValueError('Prompt must be less than 500 characters')
        return v

app = FastAPI(
    title="BabyClaw — First On-Chain Bank for AI Agents",
    description="Agent-native lending protocol on Celo for AI agents",
    version="1.0.0",
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/data")
def get_sample_data():
    return {
        "data": [
            {"id": 1, "name": "Sample Item 1", "value": 100},
            {"id": 2, "name": "Sample Item 2", "value": 200},
            {"id": 3, "name": "Sample Item 3", "value": 300}
        ],
        "total": 3,
        "timestamp": "2024-01-01T00:00:00Z"
    }


@app.get("/api/items/{item_id}")
def get_item(item_id: int):
    return {
        "item": {
            "id": item_id,
            "name": "Sample Item " + str(item_id),
            "value": item_id * 100
        },
        "timestamp": "2024-01-01T00:00:00Z"
    }


@app.post("/stream")
async def stream(request: StreamRequest):
    """
    Chat endpoint for AI interaction with BabyClaw.
    responses in real-time using plain text format.
    
    Body: { "prompt": "your prompt here" }
    
    Validation:
    - prompt must be less than 500 characters
    """
    return await _stream_handler(request)



async def _stream_handler(request: StreamRequest) -> StreamingResponse:
    """
    Handler for streaming agent responses.
    Used by /stream endpoint.
    """
    if not request.prompt:
        raise HTTPException(
            status_code=400,
            detail="No prompt provided. Please provide a 'prompt' field."
        )
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:

            system_prompt = f"""

You are an execution agent for KiloLend.

If an action is not supported, return:
{{"error": "Unsupported action"}}
"""

            prompt = f"{request.prompt}"

            # Create MCP client with chain-specific RPC URL
            mcp_client = MCPClient(lambda: stdio_client(
                StdioServerParameters(
                    command="npx", 
                    args=["-y","@tamago-labs/kilolend-mcp"],
                    env={
                        "CHAIN_ID": "8217"
                    }
                )
            ))

            with mcp_client: 

                # Get tools from the MCP server
                kilolend_tools = mcp_client.list_tools_sync()

                # Create a session manager that stores data in S3
                # Use the AI wallet address for session ID to ensure proper isolation
                # session_manager = S3SessionManager(
                #     session_id=f"{ai_wallet_address}-{request.session_id}",
                #     bucket="kilolend-sessions",
                #     prefix="mainnet",
                #     boto_session=boto_session
                # )

                # Create conversation manager to prevent unlimited conversation growth
                # conversation_manager = SlidingWindowConversationManager(
                #     window_size=10,  # Keep only last 10 messages per agent
                #     should_truncate_results=True  # Truncate large tool results
                # )

                streaming_agent = Agent(
                    callback_handler=None,
                    tools=[kilolend_tools],
                    model=(BedrockModel(
                        model_id="global.anthropic.claude-sonnet-4-5-20250929-v1:0",
                        boto_session=boto_session
                    )),
                    system_prompt=system_prompt,
                    # session_manager=session_manager,
                    # conversation_manager=conversation_manager
                )

                async for event in streaming_agent.stream_async(prompt):
                    # Stream only text chunks to client
                    if "data" in event:
                        yield event["data"]
                    # Handle error events
                    elif event.get("force_stop", False):
                        reason = event.get("force_stop_reason", "Unknown error")
                        yield f"\n\nError: Agent execution stopped - {reason}"
                        break
        except Exception as e:
            yield f"\n\nError: {str(e)}"

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)