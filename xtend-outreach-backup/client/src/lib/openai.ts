import { apiRequest } from "./queryClient";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

interface OpenAIResponse {
  subject: string;
  body: string;
}

export interface EmailGenerationRequest {
  creatorName: string;
  creatorBio: string;
  creatorBrandVoice: string;
  contactInfo: {
    firstName: string;
    lastName?: string;
    company: string;
    role?: string;
    industry?: string;
    niche?: string;
    country?: string;
    businessLinkedin?: string;
    website?: string;
    linkedin?: string;
  };
  strategy: {
    objective: string;
    customObjective?: string;
    tone: string;
    sequenceNumber: number;
    totalInSequence: number;
  };
}

export async function generateEmail(data: EmailGenerationRequest): Promise<OpenAIResponse> {
  try {
    const response = await apiRequest("POST", "/api/emails/generate", data);
    return await response.json();
  } catch (error) {
    console.error("Error generating email:", error);
    throw new Error("Failed to generate email. Please try again.");
  }
}
