
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptApiKey } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's API key
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    // Always try to fetch from OpenRouter first (no auth required for model list)
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform and sort models by popularity/name
        const transformedModels = data.data.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
          pricing: model.pricing,
          context_length: model.context_length,
          architecture: model.architecture
        })).sort((a: any, b: any) => {
          // Popular models first
          const popularModels = [
            'gpt-4o', 'gpt-4', 'claude-3.5-sonnet', 'claude-3', 'gemini', 'llama-3.1'
          ];
          
          const aPopular = popularModels.some(p => a.id.toLowerCase().includes(p));
          const bPopular = popularModels.some(p => b.id.toLowerCase().includes(p));
          
          if (aPopular && !bPopular) return -1;
          if (!aPopular && bPopular) return 1;
          
          return a.name.localeCompare(b.name);
        });

        return NextResponse.json({ data: transformedModels });
      }
    } catch (error) {
      console.error("Failed to fetch from OpenRouter:", error);
    }

    // Fall back to default popular models if OpenRouter is unavailable
    const defaultModels = [
      { 
        id: "openai/gpt-4o", 
        name: "GPT-4o", 
        description: "OpenAI's most advanced multimodal flagship model",
        pricing: { prompt: "0.000005", completion: "0.000015" },
        context_length: 128000
      },
      { 
        id: "openai/gpt-4o-mini", 
        name: "GPT-4o Mini", 
        description: "Affordable and intelligent small model for fast, lightweight tasks",
        pricing: { prompt: "0.00000015", completion: "0.0000006" },
        context_length: 128000
      },
      { 
        id: "anthropic/claude-3.5-sonnet", 
        name: "Claude 3.5 Sonnet", 
        description: "Most intelligent model by Anthropic",
        pricing: { prompt: "0.000003", completion: "0.000015" },
        context_length: 200000
      },
      { 
        id: "anthropic/claude-3-haiku", 
        name: "Claude 3 Haiku", 
        description: "Fastest and most compact model for near-instant responsiveness",
        pricing: { prompt: "0.00000025", completion: "0.00000125" },
        context_length: 200000
      },
      { 
        id: "google/gemini-pro-1.5", 
        name: "Gemini Pro 1.5", 
        description: "Google's most capable multimodal model",
        pricing: { prompt: "0.00000125", completion: "0.000005" },
        context_length: 1000000
      },
      { 
        id: "meta-llama/llama-3.1-8b-instruct", 
        name: "Llama 3.1 8B", 
        description: "Meta's efficient open-source model",
        pricing: { prompt: "0.00000018", completion: "0.00000018" },
        context_length: 131072
      }
    ];

    return NextResponse.json({ data: defaultModels });
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
