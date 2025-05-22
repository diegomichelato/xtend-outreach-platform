import OpenAI from 'openai';
import { log } from '../vite';

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface EmailGenerationParams {
  recipientName: string;
  recipientCompany?: string;
  recipientRole?: string;
  senderName: string;
  senderEmail?: string;
  senderRole?: string;
  purpose: string; // cold outreach, follow-up, introduction, etc.
  context?: string; // any additional context to inform the AI
  tone?: string; // formal, casual, friendly, professional, etc.
}

/**
 * Generate email content using OpenAI's GPT model
 * 
 * @param params Parameters for email generation
 * @returns Generated subject and body content
 */
// For campaign email generation
export interface PersonalizedEmailRequest {
  creatorName: string;
  creatorBio?: string;
  creatorBrandVoice?: string;
  contactInfo: {
    firstName: string;
    lastName?: string | null;
    company?: string;
    role?: string | null;
    industry?: string;
    niche?: string | null;
    country?: string | null;
    businessLinkedin?: string | null;
    website?: string | null;
    linkedin?: string | null;
    city?: string | null;
  };
  strategy: {
    objective: string;
    customObjective?: string;
    tone: string;
    sequenceNumber: number;
    totalInSequence: number;
  };
  // Optional sender information (email account details)
  senderInfo?: {
    name?: string;
    email?: string;
    emailAccountId?: number;
    provider?: string;
    role?: string;
  };
}

export async function generatePersonalizedEmail(request: PersonalizedEmailRequest): Promise<{
  subject: string;
  body: string;
}> {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set in environment variables");
      throw new Error("OpenAI API key is not configured");
    }
    
    // Determine the sender name - could be the email account name or creator name
    const senderName = request.senderInfo?.name || request.creatorName;
    
    // Build a richer context including sender information and contact type
    const senderContext = [];
    const contactInsights = [];
    
    // Add creator bio and brand voice for context
    if (request.creatorBio) {
      senderContext.push(`About the creator: ${request.creatorBio}`);
    }
    
    if (request.creatorBrandVoice) {
      senderContext.push(`Creator's brand voice: ${request.creatorBrandVoice}`);
    }
    
    // Add sender information
    if (request.senderInfo) {
      if (request.senderInfo.role) {
        senderContext.push(`The sender's role is ${request.senderInfo.role}.`);
      }
      
      if (request.senderInfo.provider) {
        senderContext.push(`This email is being sent via ${request.senderInfo.provider}.`);
      }
    }
    
    // Compile insights about the contact for better personalization
    if (request.contactInfo.industry) {
      contactInsights.push(`Industry: ${request.contactInfo.industry}`);
    }
    
    if (request.contactInfo.niche) {
      contactInsights.push(`Niche: ${request.contactInfo.niche}`);
    }
    
    if (request.contactInfo.website) {
      contactInsights.push(`Has website: ${request.contactInfo.website}`);
    }
    
    if (request.contactInfo.linkedin) {
      contactInsights.push(`Has LinkedIn profile`);
    }
    
    if (request.contactInfo.country) {
      contactInsights.push(`Located in: ${request.contactInfo.country}`);
    }
    
    // Map campaign objectives to more specific email purposes
    let emailPurpose = request.strategy.objective;
    let additionalGuidance = "";
    
    // Provide specific guidance based on the campaign objective
    switch(request.strategy.objective.toLowerCase()) {
      case "book a demo":
        emailPurpose = "schedule a product demonstration";
        additionalGuidance = "Focus on the value they'll get from seeing the product in action. Make scheduling easy with clear time options.";
        break;
      case "introduce new product":
        emailPurpose = "introduce a new product";
        additionalGuidance = "Highlight what makes this product innovative and why it matters specifically to them based on their role and industry.";
        break;
      case "request a call":
        emailPurpose = "schedule a phone call";
        additionalGuidance = "Keep it brief and focus on 1-2 pain points you can discuss on the call. Make it clear the call will be valuable, not just a sales pitch.";
        break;
      case "follow up from event":
        emailPurpose = "follow up from an event";
        additionalGuidance = "Reference the specific event and any conversation points if available. Remind them of your solution's relevance to their needs.";
        break;
      case "start a partnership":
        emailPurpose = "propose a partnership";
        additionalGuidance = "Focus on mutual benefits and complementary strengths. Include a clear next step to explore the partnership further.";
        break;
      case "reconnect":
        emailPurpose = "reconnect with a past contact";
        additionalGuidance = "Mention previous interactions if possible and provide a compelling reason to reconnect now.";
        break;
      case "offer free trial":
        emailPurpose = "offer a free trial";
        additionalGuidance = "Emphasize the value they'll get from the trial period and how easy it is to get started. Include clear trial terms.";
        break;
      case "share case study":
        emailPurpose = "share a relevant case study";
        additionalGuidance = "Focus on results achieved for a similar company/industry and why this is relevant to their specific challenges.";
        break;
    }
    
    // Include custom objective if provided
    if (request.strategy.customObjective) {
      senderContext.push(`Specific campaign goal: ${request.strategy.customObjective}`);
    }
    
    // Create email context for sequence position
    const sequenceContext = `This is email ${request.strategy.sequenceNumber} of ${request.strategy.totalInSequence} in the sequence.`;
    
    // Generate a personalized email using our enhanced parameters
    return generateEmailContent({
      recipientName: `${request.contactInfo.firstName} ${request.contactInfo.lastName || ''}`.trim(),
      recipientCompany: request.contactInfo.company,
      recipientRole: request.contactInfo.role || undefined,
      senderName: senderName,
      senderEmail: request.senderInfo?.email,
      senderRole: request.senderInfo?.role,
      purpose: emailPurpose,
      tone: request.strategy.tone,
      context: `${sequenceContext} ${additionalGuidance} ${senderContext.join(' ')} Contact insights: ${contactInsights.join(', ')}`
    });
  } catch (error) {
    console.error("Error in generatePersonalizedEmail:", error);
    throw error;
  }
}

/**
 * Generates content based on a custom prompt from the user
 * 
 * @param customPrompt The user's custom instructions
 * @param contactInfo Contact information to provide context
 * @param temperature Optional temperature parameter for AI response (0-1)
 * @returns Generated content with subject and body
 */
export async function generateCustomContent(
  customPrompt: string, 
  contactInfo: {
    firstName: string;
    lastName: string;
    company: string;
    role: string;
    industry: string;
    email: string;
  },
  temperature: number = 0.7
): Promise<{
  subject?: string;
  body?: string;
  content?: string;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    
    const userPrompt = `
Contact Information:
- Name: ${contactInfo.firstName} ${contactInfo.lastName}
- Company: ${contactInfo.company}
- Role: ${contactInfo.role}
- Industry: ${contactInfo.industry}
- Email: ${contactInfo.email}

Instructions:
${customPrompt}

Please format your response in JSON with:
1. "subject" - A compelling email subject line (if appropriate)
2. "body" - The complete email content or response
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert email copywriter and content generator. Create content according to the user's custom instructions, utilizing the contact information provided." 
        },
        { role: "user", content: userPrompt }
      ],
      temperature: temperature,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });
    
    const responseContent = completion.choices[0]?.message?.content?.trim();
    
    if (!responseContent) {
      throw new Error('No content was generated by the AI model');
    }
    
    try {
      // Parse the JSON response
      const content = JSON.parse(responseContent);
      return content;
    } catch (parseError) {
      console.log(`Failed to parse AI response as JSON: ${parseError}`);
      console.log(`Raw response: ${responseContent}`);
      
      // Return the raw content if JSON parsing fails
      return { content: responseContent };
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error generating custom content with OpenAI: ${errorMsg}`);
    
    throw error;
  }
}

/**
 * Generate creator profile using OpenAI based on Drive folder and pillar information
 */
export async function generateCreatorProfile(
  name: string,
  role: string,
  googleDriveFolder?: string,
  pillarUrl?: string
): Promise<{
  bio: string;
  brandVoice: string;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      log('OPENAI_API_KEY is not set');
      throw new Error('OpenAI API key is not configured');
    }
    
    const systemPrompt = `You are an expert content strategist specializing in creator profiles.
Your task is to craft a compelling, professional profile for a creator based on the available information.

About the creator:
- Name: ${name}
- Role: ${role}
${googleDriveFolder ? `- Google Drive Folder ID: ${googleDriveFolder}` : ''}
${pillarUrl ? `- Pillar Content URL: ${pillarUrl}` : ''}

Format the response as a valid JSON object with these fields:
1. "bio" - A comprehensive biography (150-200 words) that highlights the creator's expertise, experience, and unique value proposition
2. "brandVoice" - A concise description (50-75 words) of the creator's communication style, tone, and personality in professional settings

The profile should:
- Be professional yet engaging
- Highlight the creator's unique qualities based on their role
- Reference their content pillars (if available via pillarUrl)
- Mention their digital assets (if available via Google Drive)
- Be suitable for professional outreach and marketing
- Sound authentic and conversational
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a professional profile for ${name}, who is a ${role}.` }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

    // Extract the generated content from the response
    const responseContent = completion.choices[0]?.message?.content?.trim();
    
    if (!responseContent) {
      throw new Error('No content was generated by the AI model');
    }
    
    try {
      // Parse the JSON response
      const profileContent = JSON.parse(responseContent);
      
      if (!profileContent.bio || !profileContent.brandVoice) {
        throw new Error('Generated content is missing required fields');
      }
      
      return {
        bio: profileContent.bio,
        brandVoice: profileContent.brandVoice
      };
    } catch (parseError) {
      log(`Failed to parse AI response as JSON: ${parseError}`);
      log(`Raw response: ${responseContent}`);
      
      // Fallback with placeholder content
      return {
        bio: `${name} is a ${role} with expertise in digital content creation and audience engagement. With a track record of successful projects and a commitment to quality, ${name.split(' ')[0]} brings a unique perspective to each endeavor.`,
        brandVoice: `Professional, clear, and approachable communication style that resonates with audiences while maintaining industry expertise.`
      };
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log(`Error generating creator profile with OpenAI: ${errorMsg}`);
    
    // Provide a fallback response if the API call fails
    return {
      bio: `${name} is a ${role} with expertise in digital content creation and audience engagement. With a track record of successful projects and a commitment to quality, ${name.split(' ')[0]} brings a unique perspective to each endeavor.`,
      brandVoice: `Professional, clear, and approachable communication style that resonates with audiences while maintaining industry expertise.`
    };
  }
}

export async function generateEmailContent(params: EmailGenerationParams): Promise<{
  subject: string;
  body: string;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      log('OPENAI_API_KEY is not set');
      throw new Error('OpenAI API key is not configured');
    }
    
    // Determine if this is a follow-up email from context
    const isFollowUp = params.context?.toLowerCase().includes('email 2 of') || 
                     params.context?.toLowerCase().includes('email 3 of') ||
                     params.context?.toLowerCase().includes('follow-up');

    // Extract sequence number if available
    let sequenceNumber = 1;
    let totalInSequence = 1;
    const sequenceMatch = params.context?.match(/email (\d+) of (\d+)/i);
    if (sequenceMatch && sequenceMatch.length >= 3) {
      sequenceNumber = parseInt(sequenceMatch[1]);
      totalInSequence = parseInt(sequenceMatch[2]);
    }
    
    // Prepare contact demographics info for targeting
    const contactDemographics = [];
    if (params.recipientRole) contactDemographics.push(`role as ${params.recipientRole}`);
    if (params.recipientCompany) contactDemographics.push(`company ${params.recipientCompany}`);
    
    // Enhanced system prompt with more detailed instructions based on purpose
    const systemPrompt = `You are an expert email copywriter specializing in highly effective ${params.purpose} emails.
Your task is to craft a compelling, personalized email that will engage the recipient and achieve specific objectives.

About the recipient:
- Name: ${params.recipientName}
${params.recipientCompany ? `- Company: ${params.recipientCompany}` : ''}
${params.recipientRole ? `- Role: ${params.recipientRole}` : ''}

About the sender:
- Name: ${params.senderName}
${params.senderEmail ? `- Email: ${params.senderEmail}` : ''}
${params.senderRole ? `- Role: ${params.senderRole}` : ''}

Email parameters:
- Primary objective: ${params.purpose}
- Email tone: ${params.tone || 'professional'}
- Email sequence: ${sequenceNumber} of ${totalInSequence}
${params.context ? `- Additional context: ${params.context}` : ''}

Format your response as a JSON object with:
1. "subject" - A compelling subject line (45 characters or less)
2. "body" - The complete email text content
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Write a persuasive ${params.purpose} email to ${params.recipientName} ${
            params.recipientCompany ? `at ${params.recipientCompany}` : ''
          } that will achieve our objective. The tone should be ${params.tone || 'professional'}.` 
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });
    
    // Extract the generated content from the response
    const responseContent = completion.choices[0]?.message?.content?.trim();
    
    if (!responseContent) {
      throw new Error('No content was generated by the AI model');
    }
    
    try {
      // Parse the JSON response
      const emailContent = JSON.parse(responseContent);
      
      if (!emailContent.subject || !emailContent.body) {
        throw new Error('Generated content is missing required fields');
      }
      
      return {
        subject: emailContent.subject,
        body: emailContent.body
      };
    } catch (parseError) {
      log(`Failed to parse AI response as JSON: ${parseError}`);
      log(`Raw response: ${responseContent}`);
      
      // Provide a fallback if JSON parsing fails
      let signature = `Best regards,\n${params.senderName}`;
      
      if (params.senderRole) {
        signature += `\n${params.senderRole}`;
      }
      
      if (params.senderEmail) {
        signature += `\n${params.senderEmail}`;
      }
      
      return {
        subject: `Regarding your role at ${params.recipientCompany || 'your company'}`,
        body: `Hi ${params.recipientName},\n\nI hope this message finds you well. I wanted to reach out regarding...\n\n[AI content generation failed - please write your message here]\n\n${signature}`
      };
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log(`Error generating email content with OpenAI: ${errorMsg}`);
    
    // Provide a fallback response if the API call fails
    let signature = `Best regards,\n${params.senderName}`;
    
    if (params.senderRole) {
      signature += `\n${params.senderRole}`;
    }
    
    if (params.senderEmail) {
      signature += `\n${params.senderEmail}`;
    }
    
    return {
      subject: `Regarding your role at ${params.recipientCompany || 'your company'}`,
      body: `Hi ${params.recipientName},\n\nI hope this message finds you well. I wanted to reach out regarding...\n\n[AI content generation failed - please write your message here]\n\n${signature}`
    };
  }
}