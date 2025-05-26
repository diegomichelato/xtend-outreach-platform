import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { IStorage } from "../storage";
import { Contact, CompanyInformation, PipelineCard, Proposal, MeetingLog } from "@shared/schema";
import { PipelineChangeLog } from "../routes/aiAgentRoutes";

// Initialize AI clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Types for relationship summary
interface RelationshipSummaryInput {
  contactId?: number;
  companyName?: string;
}

interface RelationshipSummary {
  status: string;
  lastInteraction: string;
  nextSteps: string[];
  keyInsights: string[];
}

// Types for meeting brief
interface MeetingBriefInput {
  contactId?: number;
  companyName?: string;
}

interface MeetingBrief {
  companyOverview: string;
  pastInteractions: string;
  talkingPoints: string[];
  recommendedApproach: string;
}

// Types for communication analysis
interface CommunicationAnalysisInput {
  text: string;
  contactId?: number;
  companyName?: string;
}

interface CommunicationAnalysis {
  summary: string;
  sentimentScore: number;
  extractedTasks: string[];
  followUpRecommendation: string;
}

export class AiAgentService {
  private storage: IStorage;
  private pipelineChangeLogs: PipelineChangeLog[] = [];
  private nextLogId: number = 1;

  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  // Log a pipeline card stage change
  async logPipelineChange(changeData: Omit<PipelineChangeLog, 'id'>): Promise<PipelineChangeLog> {
    try {
      // Create a new pipeline change log
      const newLog: PipelineChangeLog = {
        id: this.nextLogId++,
        ...changeData,
        timestamp: changeData.timestamp || new Date()
      };
      
      // Add to in-memory storage
      this.pipelineChangeLogs.push(newLog);
      
      // Keep logs sorted by timestamp (most recent first)
      this.pipelineChangeLogs.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );
      
      console.log(`Logged pipeline change for card ${changeData.cardId}: ${changeData.previousStage} -> ${changeData.newStage}`);
      
      return newLog;
    } catch (error) {
      console.error("Error logging pipeline change:", error);
      throw error;
    }
  }
  
  // Get pipeline change logs with optional filtering
  async getPipelineChangeLogs(
    filters: Record<string, any> = {}, 
    limit: number = 20
  ): Promise<PipelineChangeLog[]> {
    try {
      // Start with all logs
      let filteredLogs = [...this.pipelineChangeLogs];
      
      // Apply filters
      if (filters.cardId) {
        filteredLogs = filteredLogs.filter(log => log.cardId === filters.cardId);
      }
      
      if (filters.companyName) {
        const companyName = String(filters.companyName).toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.companyName.toLowerCase().includes(companyName)
        );
      }
      
      // Return limited results
      return filteredLogs.slice(0, limit);
    } catch (error) {
      console.error("Error retrieving pipeline logs:", error);
      return [];
    }
  }
  
  // Answer a direct question with comprehensive system data access
  async answerQuestion(question: string): Promise<string> {
    try {
      console.log("Processing question:", question);
      
      // Comprehensive system information object
      let systemInfo = { 
        platform: {
          name: "Creator Marketing Platform",
          modules: [
            "Contact Management", 
            "Creator Profiles", 
            "Sales Pipeline",
            "Proposal Management",
            "Email Campaigns",
            "Analytics Dashboard"
          ]
        },
        statistics: {},
        samples: {}
      };
      
      // Data gathering with comprehensive error handling
      try {
        // CONTACT DATA
        try {
          const contacts = await this.storage.getContacts();
          if (contacts && Array.isArray(contacts)) {
            systemInfo.statistics.contacts = {
              total: contacts.length,
              industries: [...new Set(contacts.filter(c => c.industry).map(c => c.industry))].slice(0, 5)
            };
            
            // Always include some sample contacts for context
            systemInfo.samples.contacts = contacts.slice(0, 5).map(c => ({
              name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
              company: c.company || 'Unknown',
              email: c.email || 'Unknown',
              industry: c.industry || 'Unknown'
            }));
          }
        } catch (err) {
          console.error("Error getting contacts:", err);
          systemInfo.statistics.contacts = { error: "Could not retrieve contact data" };
        }
        
        // PIPELINE DATA
        try {
          const cards = await this.storage.getPipelineCards();
          if (cards && Array.isArray(cards)) {
            // Count cards by stage
            const stageCount = {};
            cards.forEach(card => {
              const stage = card.currentStage || 'Unknown';
              stageCount[stage] = (stageCount[stage] || 0) + 1;
            });
            
            systemInfo.statistics.pipeline = {
              total: cards.length,
              byStage: stageCount,
              verticals: [...new Set(cards.filter(c => c.vertical).map(c => c.vertical))].slice(0, 5)
            };
            
            // Include sample cards
            systemInfo.samples.pipelineCards = cards.slice(0, 5).map(card => ({
              company: card.companyName || 'Unknown',
              stage: card.currentStage || 'Unknown',
              vertical: card.vertical || 'Unknown'
            }));
          }
        } catch (err) {
          console.error("Error getting pipeline data:", err);
          systemInfo.statistics.pipeline = { error: "Could not retrieve pipeline data" };
        }
        
        // CREATOR DATA
        try {
          const creators = await this.storage.getCreators();
          if (creators && Array.isArray(creators)) {
            systemInfo.statistics.creators = {
              total: creators.length
            };
            
            systemInfo.samples.creators = creators.slice(0, 3).map(creator => ({
              name: creator.name || 'Unknown',
              role: creator.role || 'Creator',
              bio: creator.bio ? `${creator.bio.substring(0, 100)}...` : 'No bio available'
            }));
          }
        } catch (err) {
          console.error("Error getting creator data:", err);
          systemInfo.statistics.creators = { error: "Could not retrieve creator data" };
        }
        
        // PROPOSAL DATA
        try {
          const proposals = await this.storage.getProposals();
          if (proposals && Array.isArray(proposals)) {
            // Count proposals by status
            const statusCount = {};
            proposals.forEach(prop => {
              const status = prop.status || 'Unknown';
              statusCount[status] = (statusCount[status] || 0) + 1;
            });
            
            systemInfo.statistics.proposals = {
              total: proposals.length,
              byStatus: statusCount
            };
          }
        } catch (err) {
          console.error("Error getting proposal data:", err);
        }
        
        // MEETING LOGS DATA
        try {
          const meetingLogs = await this.storage.getMeetingLogs();
          if (meetingLogs && Array.isArray(meetingLogs)) {
            systemInfo.statistics.meetings = {
              total: meetingLogs.length,
              mostRecent: meetingLogs.length > 0 ? new Date(meetingLogs[0].meetingDate).toLocaleDateString() : 'None'
            };
          }
        } catch (err) {
          console.error("Error getting meeting logs:", err);
        }
        
      } catch (dataError) {
        console.error("Error in comprehensive data gathering:", dataError);
        // Provide fallback info about system capabilities
        systemInfo.error = "Could not retrieve complete system data. Some information may be limited.";
      }
      
      // Build comprehensive prompt with context about the platform
      const prompt = `
You are an AI assistant for a creator marketing platform that helps companies collaborate with content creators for marketing campaigns and sponsorships. Your task is to analyze the system data and answer questions about the platform.

QUESTION: "${question}"

SYSTEM OVERVIEW:
This platform helps manage relationships between brands/companies and content creators. It includes contact management, creator profiles, sales pipeline tracking, proposal generation, and email campaign tools.

DATA FROM THE SYSTEM:
${JSON.stringify(systemInfo, null, 2)}

Please provide a detailed and helpful answer based on the available data. If you don't have enough information, explain what specific data would be needed to better answer the question.
`;
      
      // Use GPT-4o for comprehensive answers
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { 
            role: "system", 
            content: "You are an expert AI assistant for a creator marketing platform. Analyze available data thoroughly to provide comprehensive, accurate answers. Always relate your answer to the platform's functionality and available data."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 800
      });
      
      return response.choices[0].message.content || "I was unable to analyze the system data to answer your question. Please try a more specific question about contacts, creators, or the sales pipeline.";
    } catch (error) {
      console.error("Error answering question:", error);
      return "I encountered an error while analyzing the system data. Please try again or contact our support team if the issue persists.";
    }
  }

  // Analyze the question to determine which data types are relevant
  private analyzeQuestion(question: string): string[] {
    const topics = [];
    const lowerQuestion = question.toLowerCase();
    
    // Check for keywords related to different data types
    if (lowerQuestion.includes('company') || lowerQuestion.includes('companies')) {
      topics.push('companies');
    }
    
    if (lowerQuestion.includes('contact') || lowerQuestion.includes('contacts') || lowerQuestion.includes('person') || lowerQuestion.includes('people')) {
      topics.push('contacts');
    }
    
    if (lowerQuestion.includes('pipeline') || lowerQuestion.includes('sales') || lowerQuestion.includes('deal')) {
      topics.push('pipelineCards');
    }
    
    if (lowerQuestion.includes('creator') || lowerQuestion.includes('influencer') || lowerQuestion.includes('talent')) {
      topics.push('creators');
    }
    
    if (lowerQuestion.includes('proposal') || lowerQuestion.includes('offer')) {
      topics.push('proposals');
    }
    
    if (lowerQuestion.includes('meeting') || lowerQuestion.includes('call')) {
      topics.push('meetingLogs');
    }
    
    if (lowerQuestion.includes('campaign') || lowerQuestion.includes('outreach')) {
      topics.push('campaigns');
    }
    
    if (lowerQuestion.includes('email') || lowerQuestion.includes('message')) {
      topics.push('emails');
    }
    
    // If no specific topics were identified, include summary data from all topics
    if (topics.length === 0) {
      return ['summary'];
    }
    
    return topics;
  }
  
  // Gather only the system data relevant to the question
  private async gatherFilteredSystemData(topics: string[]): Promise<any> {
    try {
      // Create container for system data with statistics instead of full records
      const systemData: any = {
        summary: {
          contactsCount: 0,
          companiesCount: 0,
          creatorsCount: 0,
          campaignsCount: 0,
          emailsCount: 0,
          pipelineCount: 0
        },
        companies: [],
        contacts: [],
        pipelineCards: [],
        creators: [],
        meetingLogs: [],
        campaigns: [],
        emails: []
      };
      
      // Always add statistical summary regardless of topic
      try {
        // Just count some basic stats about the system
        const contactsData = await this.storage.getContacts();
        systemData.summary.contactsCount = contactsData?.length || 0;
        
        const creatorsData = await this.storage.getCreators();
        systemData.summary.creatorsCount = creatorsData?.length || 0;
        
        const pipelineCards = await this.storage.getPipelineCards();
        systemData.summary.pipelineCount = pipelineCards?.length || 0;
        
        console.log("Successfully loaded system statistics");
      } catch (error) {
        console.error("Error loading basic system statistics:", error);
      }
      
      // Add only the most relevant data to reduce token usage
      try {
        // Load a very limited dataset based on the question topic
        if (topics.includes('contacts')) {
          const contacts = await this.storage.getContacts();
          // Just get basic contact info, limited to 5 recent contacts
          systemData.contacts = (contacts || []).slice(0, 5).map(contact => ({
            id: contact.id,
            name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            email: contact.email,
            company: contact.company,
            createdAt: contact.createdAt
          }));
        }
        
        if (topics.includes('companies') || topics.includes('pipeline')) {
          const cards = await this.storage.getPipelineCards();
          // Add up to 3 pipeline cards with minimal info
          systemData.pipelineCards = (cards || []).slice(0, 3).map(card => ({
            id: card.id,
            companyName: card.companyName,
            vertical: card.vertical,
            currentStage: card.currentStage,
            contactName: card.contactName
          }));
        }
        
        if (topics.includes('creators')) {
          const creators = await this.storage.getCreators();
          // Just basic creator info, limited to 2
          systemData.creators = (creators || []).slice(0, 2).map(creator => ({
            id: creator.id,
            name: creator.name,
            role: creator.role,
            bio: creator.bio ? (creator.bio.substring(0, 100) + '...') : null
          }));
        }
      } catch (error) {
        console.error("Error gathering filtered system data:", error);
      }
      
      return systemData;
    } catch (error) {
      console.error("Error in overall data gathering:", error);
      // Return empty data with just stats if there's an error
      return {
        summary: {
          contactsCount: 0,
          companiesCount: 0,
          creatorsCount: 0,
          campaignsCount: 0,
          emailsCount: 0
        },
        companies: [],
        contacts: [],
        pipelineCards: [],
        creators: [],
        meetingLogs: [],
        campaigns: [],
        emails: []
      };
    }
  }
  
  // Helper methods to fetch limited data
  private async fetchCompanies(limit: number): Promise<any[]> {
    try {
      // Fetch company information
      const companyInfo = await this.storage.getCompanyInfo(1); // Get specific company info with safer query
      if (companyInfo) {
        // Safe company object without problematic fields
        const companies = [{
          id: companyInfo.id,
          companyName: companyInfo.companyName || "Unknown Company",
          website: companyInfo.website || "",
          industry: companyInfo.industry || "",
          description: companyInfo.description || "",
          createdAt: companyInfo.createdAt || new Date()
        }];
        return companies;
      }
      return [];
    } catch (error) {
      console.error("Error fetching companies:", error);
      return [];
    }
  }
  
  private async fetchContacts(limit: number): Promise<any[]> {
    try {
      // Use a direct database query to get a limited set of contacts
      const contacts = await this.storage.getContacts();
      if (contacts && contacts.length > 0) {
        // Filter sensitive fields and limit the number of contacts
        return contacts.slice(0, limit).map(contact => ({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          company: contact.company,
          role: contact.role,
          industry: contact.industry,
          createdAt: contact.createdAt
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return [];
    }
  }
  
  private async fetchPipelineCards(limit: number): Promise<any[]> {
    try {
      // Fetch pipeline cards data
      const cards = await this.storage.getPipelineCards();
      return cards.slice(0, limit);
    } catch (error) {
      console.error("Error fetching pipeline cards:", error);
      return [];
    }
  }
  
  private async fetchCreators(limit: number): Promise<any[]> {
    try {
      const creators = await this.storage.getCreators();
      // Filter out large data fields to reduce token usage
      return creators.slice(0, limit).map(creator => {
        // Only keep essential fields
        const { id, name, email, role, bio } = creator;
        return { id, name, email, role, bio };
      });
    } catch (error) {
      console.error("Error fetching creators:", error);
      return [];
    }
  }
  
  private async fetchProposals(limit: number): Promise<any[]> {
    try {
      // Get proposals if the method exists
      const proposals = [];
      // This is a placeholder as we might not have direct access to proposals
      return proposals.slice(0, limit);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      return [];
    }
  }
  
  private async fetchMeetingLogs(limit: number): Promise<any[]> {
    try {
      const logs = await this.storage.getMeetingLogs();
      return logs.slice(0, limit);
    } catch (error) {
      console.error("Error fetching meeting logs:", error);
      return [];
    }
  }
  
  private async fetchCampaigns(limit: number): Promise<any[]> {
    try {
      const campaigns = await this.storage.getCampaigns();
      return campaigns.slice(0, limit).map(campaign => {
        // Only keep essential campaign fields
        const { id, name, objective, tone, status, createdAt } = campaign;
        return { id, name, objective, tone, status, createdAt };
      });
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      return [];
    }
  }
  
  private async fetchEmails(limit: number): Promise<any[]> {
    try {
      const emails = await this.storage.getAllEmails();
      return emails.slice(0, limit).map(email => {
        // Only keep essential email fields and truncate content
        const { id, subject, recipientEmail, sentAt, status } = email;
        return { id, subject, recipientEmail, sentAt, status };
      });
    } catch (error) {
      console.error("Error fetching emails:", error);
      return [];
    }
  }
  
  // Limit data size for the context to prevent token limit issues
  private limitDataForContext(systemData: any): any {
    // Create a copy of the system data
    const limitedData: any = { ...systemData };
    
    // Limit the amount of text in each field for long text fields
    for (const key in limitedData) {
      if (Array.isArray(limitedData[key])) {
        // For each item in the array
        limitedData[key] = limitedData[key].map((item: any) => {
          const newItem: any = { ...item };
          
          // Limit text fields
          for (const field in newItem) {
            if (typeof newItem[field] === 'string' && newItem[field].length > 500) {
              newItem[field] = newItem[field].substring(0, 500) + '... (truncated)';
            }
          }
          
          return newItem;
        });
      }
    }
    
    return limitedData;
  }
  
  // Build a prompt that includes only the most relevant context data
  private buildContextAwarePrompt(question: string, systemData: any): string {
    // First, add the basic system summary statistics regardless of detail level
    let prompt = `
You are an AI assistant integrated into a creator marketing platform. Answer the following question using the provided system data as context. Be helpful, concise, and accurate.

QUESTION:
"""
${question}
"""

SYSTEM SUMMARY:
- Number of contacts in system: ${systemData.summary.contactsCount || 0}
- Number of creators in system: ${systemData.summary.creatorsCount || 0}
- Number of pipeline cards in system: ${systemData.summary.pipelineCount || 0}
`;

    // Only include array data sections if they have content
    // This helps prevent errors with undefined arrays
    if (Array.isArray(systemData.contacts) && systemData.contacts.length > 0) {
      prompt += `
CONTACT DATA (Sample of ${systemData.contacts.length} contacts):
${JSON.stringify(systemData.contacts, null, 2)}
`;
    }
    
    if (Array.isArray(systemData.pipelineCards) && systemData.pipelineCards.length > 0) {
      prompt += `
PIPELINE DATA (Sample of ${systemData.pipelineCards.length} cards):
${JSON.stringify(systemData.pipelineCards, null, 2)}
`;
    }
    
    if (Array.isArray(systemData.creators) && systemData.creators.length > 0) {
      prompt += `
CREATOR DATA (Sample of ${systemData.creators.length} creators):
${JSON.stringify(systemData.creators, null, 2)}
`;
    }
    
    // Add instruction for how to respond
    prompt += `
Based on the available system data, please provide a clear and helpful answer to the question.
- If you don't have enough information to answer fully, explain what additional data would be needed.
- If the question requires specific details not present in the data, suggest how the user might find that information.
- Keep your answer focused and direct.
`;
    
    return prompt;
  }

  // Get a summary of the relationship with a contact or company
  async getRelationshipSummary(input: RelationshipSummaryInput): Promise<RelationshipSummary> {
    try {
      // Gather all relevant data
      const data = await this.gatherContactAndCompanyData(input);
      
      // Create the prompt
      const prompt = `
      You are an AI relationship manager for a creator marketing agency. Analyze the relationship with ${data.companyName || "this company"} based on the following data:
      
      CONTACT INFORMATION:
      ${data.contact ? JSON.stringify(data.contact, null, 2) : "No specific contact information available."}
      
      COMPANY INFORMATION:
      ${data.companyInfo ? JSON.stringify(data.companyInfo, null, 2) : "No company information available."}
      
      PIPELINE DATA:
      ${data.pipelineCards.length > 0 ? JSON.stringify(data.pipelineCards, null, 2) : "No pipeline data available."}
      
      PROPOSAL DATA:
      ${data.proposals.length > 0 ? JSON.stringify(data.proposals, null, 2) : "No proposal data available."}
      
      MEETING LOGS:
      ${data.meetingLogs.length > 0 ? JSON.stringify(data.meetingLogs, null, 2) : "No meeting logs available."}
      
      Based on this information, provide a relationship summary in the following JSON format:
      {
        "status": "A concise assessment of the current relationship status",
        "lastInteraction": "Details about the most recent interaction with this contact/company",
        "nextSteps": ["List of 2-4 recommended next steps to advance the relationship"],
        "keyInsights": ["List of 3-5 important insights about this relationship"]
      }
      
      Ensure that your response is detailed, actionable, and based solely on the provided data.
      `;

      // Call GPT-4 for analysis
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are an expert relationship manager for a creator marketing agency." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      // Parse and return the response
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        status: result.status || "No relationship status available",
        lastInteraction: result.lastInteraction || "No recent interactions recorded",
        nextSteps: result.nextSteps || [],
        keyInsights: result.keyInsights || []
      };
    } catch (error) {
      console.error("Error generating relationship summary:", error);
      return {
        status: "Error generating relationship summary",
        lastInteraction: "Unable to retrieve interaction data",
        nextSteps: ["Contact system administrator to resolve AI analysis issues"],
        keyInsights: ["There was an error processing relationship data"]
      };
    }
  }

  // Generate a meeting brief for an upcoming meeting
  async getMeetingBrief(input: MeetingBriefInput): Promise<MeetingBrief> {
    try {
      // Gather all relevant data
      const data = await this.gatherContactAndCompanyData(input);
      
      // Create the prompt
      const prompt = `
      You are an AI meeting preparation assistant for a creator marketing agency. Create a comprehensive brief for an upcoming meeting with ${data.companyName || "this company"} based on the following data:
      
      CONTACT INFORMATION:
      ${data.contact ? JSON.stringify(data.contact, null, 2) : "No specific contact information available."}
      
      COMPANY INFORMATION:
      ${data.companyInfo ? JSON.stringify(data.companyInfo, null, 2) : "No company information available."}
      
      PIPELINE DATA:
      ${data.pipelineCards.length > 0 ? JSON.stringify(data.pipelineCards, null, 2) : "No pipeline data available."}
      
      PROPOSAL DATA:
      ${data.proposals.length > 0 ? JSON.stringify(data.proposals, null, 2) : "No proposal data available."}
      
      MEETING LOGS:
      ${data.meetingLogs.length > 0 ? JSON.stringify(data.meetingLogs, null, 2) : "No meeting logs available."}
      
      Based on this information, provide a meeting brief in the following JSON format:
      {
        "companyOverview": "A concise overview of the company and their needs",
        "pastInteractions": "Summary of past interactions and current relationship status",
        "talkingPoints": ["List of 3-5 specific topics to discuss during the meeting"],
        "recommendedApproach": "Strategic advice on how to conduct the meeting to maximize chances of success"
      }
      
      Ensure that your response is detailed, actionable, and based solely on the provided data.
      `;

      // Call Claude for analysis (using Claude for variety and potentially different insights)
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        system: "You are an expert meeting preparation assistant for a creator marketing agency.",
        max_tokens: 1500,
        messages: [
          { role: "user", content: prompt }
        ]
      });

      // Parse and return the response
      // Claude doesn't always return perfectly formatted JSON, so we need to handle that
      let result;
      try {
        // Check if content is available and has the expected format
        if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
          const textContent = response.content[0].text;
          const jsonMatch = textContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in Claude's response");
          }
        } else {
          throw new Error("Unexpected response format from Claude");
        }
      } catch (parseError) {
        console.error("Error parsing Claude's response:", parseError);
        
        // Fallback to OpenAI if Claude's response can't be parsed
        const fallbackResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are an expert meeting preparation assistant for a creator marketing agency." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        
        result = JSON.parse(fallbackResponse.choices[0].message.content || '{}');
      }
      
      return {
        companyOverview: result.companyOverview || "No company overview available",
        pastInteractions: result.pastInteractions || "No past interactions recorded",
        talkingPoints: result.talkingPoints || [],
        recommendedApproach: result.recommendedApproach || "No specific approach recommended"
      };
    } catch (error) {
      console.error("Error generating meeting brief:", error);
      return {
        companyOverview: "Error generating company overview",
        pastInteractions: "Unable to retrieve interaction data",
        talkingPoints: ["Discuss technical issues with AI analysis system"],
        recommendedApproach: "Focus on gathering basic information during this meeting"
      };
    }
  }

  // Analyze communication text (email, meeting notes, etc.)
  async analyzeCommunication(input: CommunicationAnalysisInput): Promise<CommunicationAnalysis> {
    try {
      // Gather context data if available
      const data = input.contactId || input.companyName 
        ? await this.gatherContactAndCompanyData({
            contactId: input.contactId,
            companyName: input.companyName
          })
        : { 
            contact: null, 
            companyInfo: null, 
            companyName: input.companyName || "Unknown company", 
            pipelineCards: [], 
            proposals: [], 
            meetingLogs: [] 
          };
      
      // Create the prompt
      const prompt = `
      You are an AI communication analyst for a creator marketing agency. Analyze the following communication text related to ${data.companyName || "a business relationship"}:
      
      COMMUNICATION TEXT:
      """
      ${input.text}
      """
      
      CONTEXT - CONTACT INFORMATION:
      ${data.contact ? JSON.stringify(data.contact, null, 2) : "No specific contact information available."}
      
      CONTEXT - COMPANY INFORMATION:
      ${data.companyInfo ? JSON.stringify(data.companyInfo, null, 2) : "No company information available."}
      
      Based on this information, provide a communication analysis in the following JSON format:
      {
        "summary": "A concise summary of the key points in the communication",
        "sentimentScore": 0.x, // A number between 0 (very negative) and 1 (very positive) representing the sentiment
        "extractedTasks": ["List of 0-5 action items or tasks mentioned or implied in the communication"],
        "followUpRecommendation": "A specific recommendation on how to follow up to this communication"
      }
      
      Ensure that your analysis is objective, actionable, and based solely on the provided text and context.
      `;

      // Call GPT-4 for analysis
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { role: "system", content: "You are an expert communication analyst for a creator marketing agency." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      // Parse and return the response
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        summary: result.summary || "No summary available",
        sentimentScore: typeof result.sentimentScore === 'number' ? result.sentimentScore : 0.5,
        extractedTasks: result.extractedTasks || [],
        followUpRecommendation: result.followUpRecommendation || "No follow-up recommendation available"
      };
    } catch (error) {
      console.error("Error analyzing communication:", error);
      return {
        summary: "Error analyzing communication",
        sentimentScore: 0.5,
        extractedTasks: ["Contact system administrator to resolve AI analysis issues"],
        followUpRecommendation: "Unable to provide follow-up recommendation due to processing error"
      };
    }
  }

  // Helper function to gather comprehensive system data for the AI agent
  private async gatherSystemData() {
    // Initialize result variables for all system data
    const contacts: Contact[] = [];
    const companies: CompanyInformation[] = [];
    const pipelineCards: PipelineCard[] = [];
    const creators: any[] = [];  // Using any since the creator type might be complex
    const proposals: Proposal[] = [];
    const meetingLogs: MeetingLog[] = [];
    const campaigns: any[] = []; // Using any since we don't have a direct Campaign type
    const emails: any[] = []; // Using any for email data

    // Get all contacts
    try {
      const allContacts = await this.storage.getContacts();
      if (allContacts && allContacts.length > 0) {
        contacts.push(...allContacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }

    // Get all companies
    try {
      const allCompanies = await this.storage.getCompanyInformation();
      if (allCompanies && allCompanies.length > 0) {
        companies.push(...allCompanies);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }

    // Get all pipeline cards
    try {
      const allCards = await this.storage.getPipelineCards();
      if (allCards && allCards.length > 0) {
        pipelineCards.push(...allCards);
      }
    } catch (error) {
      console.error('Error fetching pipeline cards:', error);
    }

    // Get all creators
    try {
      const allCreators = await this.storage.getCreators();
      if (allCreators && allCreators.length > 0) {
        creators.push(...allCreators);
      }
    } catch (error) {
      console.error('Error fetching creators:', error);
    }

    // Get all proposals
    try {
      const allProposals = await this.storage.getProposals();
      if (allProposals && allProposals.length > 0) {
        proposals.push(...allProposals);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }

    // Get all meeting logs
    try {
      const allLogs = await this.storage.getAllMeetingLogs();
      if (allLogs && allLogs.length > 0) {
        meetingLogs.push(...allLogs);
      }
    } catch (error) {
      console.error('Error fetching meeting logs:', error);
    }

    // Get all campaigns (if available)
    try {
      if (typeof this.storage.getCampaigns === 'function') {
        const allCampaigns = await this.storage.getCampaigns();
        if (allCampaigns && allCampaigns.length > 0) {
          campaigns.push(...allCampaigns);
        }
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }

    // Get email data (if available)
    try {
      // We'll try different methods that might exist in the storage interface
      if (typeof this.storage.getAllEmails === 'function') {
        const allEmails = await this.storage.getAllEmails();
        if (allEmails && allEmails.length > 0) {
          emails.push(...allEmails);
        }
      } else if (typeof this.storage.getEmails === 'function') {
        const someEmails = await this.storage.getEmails();
        if (someEmails && someEmails.length > 0) {
          emails.push(...someEmails);
        }
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    }

    return {
      contacts,
      companies,
      pipelineCards,
      creators,
      proposals,
      meetingLogs,
      campaigns,
      emails
    };
  }

  // Helper function to gather all relevant data for a contact or company
  private async gatherContactAndCompanyData(input: { contactId?: number; companyName?: string }) {
    // Initialize result variables
    let contact: Contact | null = null;
    let companyInfo: CompanyInformation | null = null;
    let companyName = input.companyName || "";
    const pipelineCards: PipelineCard[] = [];
    const proposals: Proposal[] = [];
    const meetingLogs: MeetingLog[] = [];

    // Get contact information if contactId is provided
    if (input.contactId) {
      try {
        const fetchedContact = await this.storage.getContact(input.contactId);
        contact = fetchedContact || null;
        if (contact && contact.company) {
          companyName = contact.company;
        }
      } catch (error) {
        console.error('Error fetching contact:', error);
      }
    }

    // Get company information if company name is provided or derived from contact
    if (companyName) {
      try {
        const fetchedCompanyInfo = await this.storage.findCompanyByName(companyName);
        companyInfo = fetchedCompanyInfo || null;
      } catch (error) {
        console.error('Error fetching company info:', error);
      }
    }

    // Get pipeline cards related to the company
    try {
      const allCards = await this.storage.getPipelineCards();
      if (companyName) {
        pipelineCards.push(...allCards.filter(card => 
          card.companyName?.toLowerCase() === companyName.toLowerCase()
        ));
      } else if (contact) {
        pipelineCards.push(...allCards.filter(card => 
          card.contactEmail === contact.email
        ));
      }
    } catch (error) {
      console.error('Error fetching pipeline cards:', error);
    }

    // Get proposals related to the company or contact
    try {
      const allProposals = await this.storage.getProposals();
      if (companyName) {
        proposals.push(...allProposals.filter(proposal => 
          proposal.contactCompany?.toLowerCase() === companyName.toLowerCase()
        ));
      } else if (contact) {
        proposals.push(...allProposals.filter(proposal => 
          proposal.contactEmail === contact.email
        ));
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }

    // Get meeting logs (if available)
    try {
      if (companyInfo && companyInfo.id) {
        // If we need to get meeting logs only for a specific company
        meetingLogs.push(...await this.storage.getMeetingLogsByCompany(companyInfo.id));
      } else if (companyName) {
        // If we have company name but no ID, try to get all logs and filter
        const allLogs = await this.storage.getAllMeetingLogs();
        if (allLogs && allLogs.length > 0) {
          // If there's a company in the meeting log that matches our company name
          // For simplicity, we'll just use meetings that have a matching company ID
          // if we found the company info already
          if (companyInfo) {
            const meetings = allLogs.filter(log => log.companyId === companyInfo.id);
            meetingLogs.push(...meetings);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching meeting logs:', error);
    }

    return {
      contact,
      companyInfo,
      companyName,
      pipelineCards,
      proposals,
      meetingLogs
    };
  }
}