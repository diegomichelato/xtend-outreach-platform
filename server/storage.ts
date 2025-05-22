import { 
  users, type User, type InsertUser,
  creators, type Creator, type InsertCreator,
  contacts, type Contact, type InsertContact,
  contactLists, type ContactList, type InsertContactList,
  contactListEntries, type ContactListEntry, type InsertContactListEntry,
  campaigns, type Campaign, type InsertCampaign,
  emails, type Email, type InsertEmail,
  emailAccounts, type EmailAccount, type InsertEmailAccount,
  creatorEmailAccounts, type CreatorEmailAccount, type InsertCreatorEmailAccount,
  emailTemplates, type DbEmailTemplate, type InsertEmailTemplate,
  outreachLogs, type OutreachLog, type InsertOutreachLog,
  contactNotes, type ContactNote, type InsertContactNote,
  shareableLandingPages, type ShareableLandingPage, type InsertShareableLandingPage,
  proposals, type Proposal, type InsertProposal,
  creatorPricing, type CreatorPricing, type InsertCreatorPricing,
  pipelineCards, type PipelineCard, type InsertPipelineCard,
  companyInformation, type CompanyInformation, type InsertCompanyInformation,
  companyTasks, type CompanyTask, type InsertCompanyTask,
  meetingLogs, type MeetingLog, type InsertMeetingLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, inArray, and } from "drizzle-orm";

export interface ContactFilterParams {
  status?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  lastContactedAfter?: Date;
  lastContactedBefore?: Date;
  country?: string;
  industry?: string;
  type?: string;
  search?: string;
  includeArchived?: boolean;
}

export interface IStorage {
  // AI Helper Methods
  getContacts(): Promise<Contact[]>;
  getCreators(): Promise<Creator[]>;
  getCampaigns(): Promise<Campaign[]>;
  getAllEmails(): Promise<Email[]>;
  getMeetingLogs(): Promise<MeetingLog[]>;
  
  // Creator Pricing operations
  getCreatorPricing(creatorId: number): Promise<CreatorPricing[]>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  getFirstUser(): Promise<User | undefined>; // Helper for demo purposes
  
  // Pipeline Card operations
  getAllPipelineCards(): Promise<PipelineCard[]>;
  getPipelineCard(id: number): Promise<PipelineCard | undefined>;
  createPipelineCard(card: Omit<InsertPipelineCard, 'id'>): Promise<PipelineCard>;
  updatePipelineCard(id: number, cardData: Partial<PipelineCard>): Promise<PipelineCard | undefined>;
  deletePipelineCard(id: number): Promise<boolean>;
  
  // Company Information operations
  getAllCompanyInfo(): Promise<CompanyInformation[]>;
  getCompanyInfo(id: number): Promise<CompanyInformation | undefined>;
  getCompanyInfoByCompanyId(companyId: number): Promise<CompanyInformation | undefined>;
  createCompanyInfo(info: InsertCompanyInformation): Promise<CompanyInformation>;
  updateCompanyInfo(id: number, infoData: Partial<CompanyInformation>): Promise<CompanyInformation | undefined>;
  deleteCompanyInfo(id: number): Promise<boolean>;
  
  // Company Task operations
  getCompanyTasks(companyId: number): Promise<CompanyTask[]>;
  getCompanyTask(id: number): Promise<CompanyTask | undefined>;
  createCompanyTask(task: InsertCompanyTask): Promise<CompanyTask>;
  updateCompanyTask(id: number, taskData: Partial<CompanyTask>): Promise<CompanyTask>;
  completeCompanyTask(id: number): Promise<CompanyTask>;
  deleteCompanyTask(id: number): Promise<void>;
  
  // Meeting Log operations
  getMeetingLogsByCompany(companyId: number): Promise<MeetingLog[]>;
  addMeetingLog(log: InsertMeetingLog): Promise<MeetingLog>;
  
  // Proposal operations
  getAllProposals(): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, proposalData: Partial<Proposal>): Promise<Proposal>;
  updateCompanyInformation(companyId: number, infoData: Partial<CompanyInformation>): Promise<CompanyInformation>;
  addCompanyCampaign(companyId: number, campaignId: number): Promise<CompanyInformation>;
  addCompanyProposal(companyId: number, proposalId: number): Promise<CompanyInformation>;
  addInventorySent(companyId: number, inventoryItem: any): Promise<CompanyInformation>;
  
  // Meeting Log operations
  getMeetingLogs(companyId: number): Promise<MeetingLog[]>;
  getMeetingLog(id: number): Promise<MeetingLog | undefined>;
  getAllMeetingLogs(): Promise<MeetingLog[]>;
  createMeetingLog(log: InsertMeetingLog): Promise<MeetingLog>;
  updateMeetingLog(id: number, logData: Partial<MeetingLog>): Promise<MeetingLog>;
  deleteMeetingLog(id: number): Promise<void>;
  
  // AI Agent specific operations
  findCompanyByName(companyName: string): Promise<CompanyInformation | undefined>;
  getPipelineCards(): Promise<PipelineCard[]>;
  getProposals(): Promise<Proposal[]>;
  
  // Company Task operations
  getCompanyTasks(companyId: number): Promise<CompanyTask[]>;
  getCompanyTask(id: number): Promise<CompanyTask | undefined>;
  createCompanyTask(task: InsertCompanyTask): Promise<CompanyTask>;
  updateCompanyTask(id: number, taskData: Partial<CompanyTask>): Promise<CompanyTask>;
  completeCompanyTask(id: number): Promise<CompanyTask>;
  deleteCompanyTask(id: number): Promise<void>;
  deleteProposal(id: number): Promise<boolean>;
  
  // Creator operations
  getCreator(id: number): Promise<Creator | undefined>;
  createCreator(creator: InsertCreator): Promise<Creator>;
  updateCreator(id: number, creatorData: Partial<Creator>): Promise<Creator>;
  deleteCreator(id: number): Promise<boolean>;
  getAllCreators(): Promise<Creator[]>;
  
  // Contact operations
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contactData: Partial<Contact>): Promise<Contact>;
  deleteContact(id: number): Promise<boolean>;
  archiveContact(id: number): Promise<Contact>;
  restoreContact(id: number): Promise<Contact>;
  getAllContacts(): Promise<Contact[]>;
  getContactsByEmail(email: string): Promise<Contact[]>;
  searchContacts(query: string): Promise<Contact[]>;
  getContactsByFilter(filterParams: ContactFilterParams): Promise<Contact[]>;
  getRecentContacts(limit?: number): Promise<Contact[]>;
  getUniqueIndustries(): Promise<string[]>;
  
  // ContactList operations
  getContactList(id: number): Promise<ContactList | undefined>;
  createContactList(contactList: InsertContactList): Promise<ContactList>;
  updateContactList(id: number, contactListData: Partial<ContactList>): Promise<ContactList>;
  deleteContactList(id: number): Promise<boolean>;
  getAllContactLists(): Promise<ContactList[]>;
  addContactToList(contactId: number, listId: number): Promise<boolean>;
  removeContactFromList(contactId: number, listId: number): Promise<boolean>;
  getContactsInList(listId: number): Promise<Contact[]>;
  getContactListsForContact(contactId: number): Promise<ContactList[]>;
  
  // Campaign operations
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaignData: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: number): Promise<boolean>;
  getAllCampaigns(): Promise<Campaign[]>;
  getRecentCampaigns(limit?: number): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;
  getCampaignsByStatus(status: string): Promise<Campaign[]>;
  
  // Email operations
  getEmail(id: number): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: number, emailData: Partial<Email>): Promise<Email>;
  deleteEmail(id: number): Promise<boolean>;
  getEmailsByCampaign(campaignId: number): Promise<Email[]>;
  getEmailsByContact(contactId: number): Promise<Email[]>;
  getScheduledEmails(): Promise<Email[]>;
  
  // EmailAccount operations
  getEmailAccount(id: number): Promise<EmailAccount | undefined>;
  getEmailAccountByEmail(email: string): Promise<EmailAccount | undefined>;
  createEmailAccount(emailAccount: InsertEmailAccount): Promise<EmailAccount>;
  updateEmailAccount(id: number, emailAccountData: Partial<EmailAccount>): Promise<EmailAccount>;
  deleteEmailAccount(id: number): Promise<boolean>;
  getAllEmailAccounts(): Promise<EmailAccount[]>;
  getActiveEmailAccounts(): Promise<EmailAccount[]>;
  
  // EmailTemplate operations
  getEmailTemplate(id: number): Promise<DbEmailTemplate | undefined>;
  createEmailTemplate(emailTemplate: InsertEmailTemplate): Promise<DbEmailTemplate>;
  updateEmailTemplate(id: number, emailTemplateData: Partial<DbEmailTemplate>): Promise<DbEmailTemplate>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  getAllEmailTemplates(): Promise<DbEmailTemplate[]>;
  getSystemEmailTemplates(): Promise<DbEmailTemplate[]>;
  
  // OutreachLog operations
  createOutreachLog(outreachLog: InsertOutreachLog): Promise<OutreachLog>;
  getOutreachLog(id: number): Promise<OutreachLog | undefined>;
  getOutreachLogsByContactId(contactId: number): Promise<OutreachLog[]>;
  getOutreachLogsByDateRange(startDate: Date, endDate: Date): Promise<OutreachLog[]>;
  getAllOutreachLogs(): Promise<OutreachLog[]>;
  
  // ContactNote operations
  createContactNote(contactNote: InsertContactNote): Promise<ContactNote>;
  getContactNote(id: number): Promise<ContactNote | undefined>;
  getContactNotes(): Promise<ContactNote[]>;
  getContactNotesByContactId(contactId: number): Promise<ContactNote[]>;
  
  // ShareableLandingPage operations
  createShareableLandingPage(page: InsertShareableLandingPage): Promise<ShareableLandingPage>;
  getShareableLandingPage(id: number): Promise<ShareableLandingPage | undefined>;
  getShareableLandingPageByUniqueId(uniqueId: string): Promise<ShareableLandingPage | undefined>;
  updateShareableLandingPage(id: number, pageData: Partial<ShareableLandingPage>): Promise<ShareableLandingPage>;
  deleteShareableLandingPage(id: number): Promise<boolean>;
  getAllShareableLandingPages(): Promise<ShareableLandingPage[]>;
  getUserShareableLandingPages(userId: number): Promise<ShareableLandingPage[]>;
  getCreatorShareableLandingPages(creatorId: number): Promise<ShareableLandingPage[]>;
  incrementShareableLandingPageViewCount(id: number): Promise<void>;
  
  // Company Information operations
  findCompanyByName(companyName: string): Promise<CompanyInformation | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private userId = 1;
  
  private creators: Map<number, Creator> = new Map();
  private creatorId = 1;
  
  private creatorPricing: Map<number, CreatorPricing> = new Map();
  private creatorPricingId = 1;
  
  private contacts: Map<number, Contact> = new Map();
  private contactId = 1;
  
  private contactLists: Map<number, ContactList> = new Map();
  private contactListId = 1;
  
  private contactListEntries: Map<number, ContactListEntry> = new Map();
  private contactListEntryId = 1;
  
  private campaigns: Map<number, Campaign> = new Map();
  private campaignId = 1;
  
  private emails: Map<number, Email> = new Map();
  private emailId = 1;
  
  private emailAccounts: Map<number, EmailAccount> = new Map();
  private emailAccountId = 1;
  
  private creatorEmailAccounts: Map<number, CreatorEmailAccount> = new Map();
  private creatorEmailAccountId = 1;
  
  private emailTemplates: Map<number, DbEmailTemplate> = new Map();
  private emailTemplateId = 1;
  
  private outreachLogs: Map<number, OutreachLog> = new Map();
  private outreachLogId = 1;
  
  private contactNotes: Map<number, ContactNote> = new Map();
  private contactNoteId = 1;
  
  private shareableLandingPages: Map<number, ShareableLandingPage> = new Map();
  private shareableLandingPageId = 1;
  
  private proposals: Map<number, Proposal> = new Map();
  private proposalId = 1;
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async getFirstUser(): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    return users.length > 0 ? users[0] : undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    // Convert the insertUser to a full User object
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    // Update the user object
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Creator operations
  async getCreator(id: number): Promise<Creator | undefined> {
    return this.creators.get(id);
  }
  
  async createCreator(insertCreator: InsertCreator): Promise<Creator> {
    const id = this.creatorId++;
    const lastUpdated = new Date();
    // Convert the insertCreator to a full Creator object
    const creator: Creator = { 
      ...insertCreator, 
      id, 
      lastUpdated,
      // Ensure required fields have default values
      bio: insertCreator.bio || null,
      brandVoice: insertCreator.brandVoice || null,
      profileColor: insertCreator.profileColor || '#4F46E5',
      initials: insertCreator.initials || null,
      googleDriveFolder: insertCreator.googleDriveFolder || null,
      pillarUrl: insertCreator.pillarUrl || null,
      demographicsUrl: insertCreator.demographicsUrl || null,
      userId: insertCreator.userId || null
    };
    this.creators.set(id, creator);
    return creator;
  }
  
  async updateCreator(id: number, creatorData: Partial<Creator>): Promise<Creator> {
    const creator = await this.getCreator(id);
    if (!creator) {
      throw new Error(`Creator with ID ${id} not found`);
    }
    
    // Update the last updated timestamp
    const lastUpdated = new Date();
    const updatedCreator = { ...creator, ...creatorData, lastUpdated };
    this.creators.set(id, updatedCreator);
    return updatedCreator;
  }
  
  async deleteCreator(id: number): Promise<boolean> {
    const creator = await this.getCreator(id);
    if (!creator) {
      return false; // Creator not found to delete
    }
    
    // Delete the creator from the collection
    return this.creators.delete(id);
  }
  
  async getAllCreators(): Promise<Creator[]> {
    return Array.from(this.creators.values());
  }
  
  async getCreatorPricing(creatorId: number): Promise<CreatorPricing[]> {
    try {
      // In a real implementation, we would fetch from the creatorPricing table
      // For now, we'll return example data based on the creator ID
      const now = new Date();
      
      // Example pricing data structure for this creator
      return [
        {
          id: 100 + creatorId,
          creatorId,
          contentType: 'youtube',
          format: 'long_form',
          basePrice: 5000,
          usageRights: '30 days, brand channels only',
          revisionLimit: 2,
          deliveryTimeframe: 14,
          exclusivity: true,
          featured: true,
          description: '10-15 minute dedicated product review',
          createdAt: now
        },
        {
          id: 200 + creatorId,
          creatorId,
          contentType: 'youtube',
          format: 'short_form',
          basePrice: 3000,
          usageRights: '14 days, brand social only',
          revisionLimit: 1,
          deliveryTimeframe: 7,
          exclusivity: false,
          featured: false,
          description: '30-60 second dedicated product feature',
          createdAt: now
        },
        {
          id: 300 + creatorId,
          creatorId,
          contentType: 'instagram',
          format: 'post',
          basePrice: 1200,
          usageRights: '7 days, brand social only',
          revisionLimit: 1,
          deliveryTimeframe: 5,
          exclusivity: false,
          featured: false,
          description: 'Product feature in grid post',
          createdAt: now
        },
        {
          id: 400 + creatorId,
          creatorId,
          contentType: 'instagram',
          format: 'reel',
          basePrice: 2200,
          usageRights: '14 days, brand social only',
          revisionLimit: 1,
          deliveryTimeframe: 7,
          exclusivity: false,
          featured: true,
          description: '15-30 second dedicated product reel',
          createdAt: now
        }
      ];
    } catch (error) {
      console.error("Error fetching creator pricing:", error);
      return [];
    }
  }

  // Contact operations
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.contactId++;
    const now = new Date();
    // Set default values for new fields
    const contact: Contact = { 
      ...insertContact, 
      id,
      createdAt: now,
      updatedAt: now,
      status: insertContact.status || 'active',
      type: insertContact.type || 'Brand', // Ensure type is set with a default
      tags: insertContact.tags || [],
      archivedAt: null,
    };
    
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: number, contactData: Partial<Contact>): Promise<Contact> {
    const contact = await this.getContact(id);
    if (!contact) {
      throw new Error(`Contact with ID ${id} not found`);
    }
    
    // Update the timestamp
    const updatedAt = new Date();
    const updatedContact = { ...contact, ...contactData, updatedAt };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async archiveContact(id: number): Promise<Contact> {
    const contact = await this.getContact(id);
    if (!contact) {
      throw new Error(`Contact with ID ${id} not found`);
    }
    
    // Set archive timestamp and status
    const archivedAt = new Date();
    const updatedContact = { ...contact, status: 'archived', archivedAt };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async restoreContact(id: number): Promise<Contact> {
    const contact = await this.getContact(id);
    if (!contact) {
      throw new Error(`Contact with ID ${id} not found`);
    }
    
    // Reset archive timestamp and status
    const updatedContact = { ...contact, status: 'active', archivedAt: null };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContactsByFilter(filterParams: ContactFilterParams): Promise<Contact[]> {
    let contacts = Array.from(this.contacts.values());
    
    // Filter by status if provided
    if (filterParams.status) {
      contacts = contacts.filter(contact => contact.status === filterParams.status);
    }
    
    // Filter by tags if provided
    if (filterParams.tags && filterParams.tags.length > 0) {
      contacts = contacts.filter(contact => 
        contact.tags && filterParams.tags!.some(tag => contact.tags!.includes(tag))
      );
    }
    
    // Filter by created date range
    if (filterParams.createdAfter) {
      contacts = contacts.filter(contact => 
        contact.createdAt && contact.createdAt >= filterParams.createdAfter!
      );
    }
    
    if (filterParams.createdBefore) {
      contacts = contacts.filter(contact => 
        contact.createdAt && contact.createdAt <= filterParams.createdBefore!
      );
    }
    
    // Filter by last contacted date range
    if (filterParams.lastContactedAfter) {
      contacts = contacts.filter(contact => 
        contact.lastContacted && contact.lastContacted >= filterParams.lastContactedAfter!
      );
    }
    
    if (filterParams.lastContactedBefore) {
      contacts = contacts.filter(contact => 
        contact.lastContacted && contact.lastContacted <= filterParams.lastContactedBefore!
      );
    }
    
    // Filter by country
    if (filterParams.country) {
      contacts = contacts.filter(contact => 
        contact.country === filterParams.country
      );
    }
    
    // Filter by industry
    if (filterParams.industry) {
      contacts = contacts.filter(contact => 
        contact.industry === filterParams.industry
      );
    }
    
    // Filter by type
    if (filterParams.type) {
      contacts = contacts.filter(contact => 
        contact.type === filterParams.type
      );
    }
    
    // Filter by search query
    if (filterParams.search) {
      const searchLower = filterParams.search.toLowerCase();
      contacts = contacts.filter(contact => 
        (contact.firstName && contact.firstName.toLowerCase().includes(searchLower)) ||
        (contact.lastName && contact.lastName.toLowerCase().includes(searchLower)) ||
        (contact.company && contact.company.toLowerCase().includes(searchLower)) ||
        (contact.email && contact.email.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter out archived contacts unless explicitly included
    if (!filterParams.includeArchived) {
      contacts = contacts.filter(contact => 
        contact.status !== 'archived'
      );
    }
    
    return contacts;
  }

  async searchContacts(query: string): Promise<Contact[]> {
    return this.getContactsByFilter({ search: query });
  }

  async getRecentContacts(limit: number = 10): Promise<Contact[]> {
    const contacts = Array.from(this.contacts.values())
      .filter(contact => contact.status !== 'archived')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Sort by created date, newest first
      });
    
    return contacts.slice(0, limit);
  }

  async getUniqueIndustries(): Promise<string[]> {
    const contacts = Array.from(this.contacts.values());
    const industries = new Set<string>();
    
    contacts.forEach(contact => {
      if (contact.industry) {
        industries.add(contact.industry);
      }
    });
    
    return Array.from(industries);
  }
  
  async getContactsByEmail(email: string): Promise<Contact[]> {
    // Find contacts with the matching email (case-insensitive)
    const lowercaseEmail = email.toLowerCase();
    return Array.from(this.contacts.values())
      .filter(contact => contact.email.toLowerCase() === lowercaseEmail);
  }

  // ContactList operations
  async getContactList(id: number): Promise<ContactList | undefined> {
    return this.contactLists.get(id);
  }

  async createContactList(insertContactList: InsertContactList): Promise<ContactList> {
    const id = this.contactListId++;
    const now = new Date();
    const contactList: ContactList = { 
      ...insertContactList, 
      id,
      createdAt: now
    };
    
    this.contactLists.set(id, contactList);
    return contactList;
  }

  async updateContactList(id: number, contactListData: Partial<ContactList>): Promise<ContactList> {
    const contactList = await this.getContactList(id);
    if (!contactList) {
      throw new Error(`ContactList with ID ${id} not found`);
    }
    
    const updatedContactList = { ...contactList, ...contactListData };
    this.contactLists.set(id, updatedContactList);
    return updatedContactList;
  }

  async deleteContactList(id: number): Promise<boolean> {
    // Delete all entries for this list first
    const entriesToDelete = Array.from(this.contactListEntries.values())
      .filter(entry => entry.listId === id);
    
    for (const entry of entriesToDelete) {
      this.contactListEntries.delete(entry.id);
    }
    
    // Then delete the list itself
    return this.contactLists.delete(id);
  }

  async getAllContactLists(): Promise<ContactList[]> {
    return Array.from(this.contactLists.values());
  }

  async addContactToList(contactId: number, listId: number): Promise<boolean> {
    // Check if contact and list exist
    const contact = await this.getContact(contactId);
    const list = await this.getContactList(listId);
    
    if (!contact || !list) {
      return false;
    }
    
    // Check if entry already exists
    const existingEntry = Array.from(this.contactListEntries.values())
      .find(entry => entry.contactId === contactId && entry.listId === listId);
    
    if (existingEntry) {
      return true; // Already in the list
    }
    
    // Create new entry
    const id = this.contactListEntryId++;
    const entry: ContactListEntry = {
      id,
      contactId,
      listId
    };
    
    this.contactListEntries.set(id, entry);
    return true;
  }

  async removeContactFromList(contactId: number, listId: number): Promise<boolean> {
    // Find the entry
    const entry = Array.from(this.contactListEntries.values())
      .find(entry => entry.contactId === contactId && entry.listId === listId);
    
    if (!entry) {
      return false; // Not in the list
    }
    
    // Remove the entry
    return this.contactListEntries.delete(entry.id);
  }

  async getContactsInList(listId: number): Promise<Contact[]> {
    // Find all entries for this list
    const entries = Array.from(this.contactListEntries.values())
      .filter(entry => entry.listId === listId);
    
    // Get the contacts from the entries
    const contacts: Contact[] = [];
    for (const entry of entries) {
      const contact = await this.getContact(entry.contactId);
      if (contact) {
        contacts.push(contact);
      }
    }
    
    return contacts;
  }

  async getContactListsForContact(contactId: number): Promise<ContactList[]> {
    // Find all entries for this contact
    const entries = Array.from(this.contactListEntries.values())
      .filter(entry => entry.contactId === contactId);
    
    // Get the lists from the entries
    const lists: ContactList[] = [];
    for (const entry of entries) {
      const list = await this.getContactList(entry.listId);
      if (list) {
        lists.push(list);
      }
    }
    
    return lists;
  }

  // Campaign operations
  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = this.campaignId++;
    const now = new Date();
    
    // Set default values
    const campaign: Campaign = {
      id,
      name: insertCampaign.name,
      objective: insertCampaign.objective,
      tone: insertCampaign.tone,
      sequenceCount: insertCampaign.sequenceCount,
      interval: insertCampaign.interval,
      status: insertCampaign.status || 'draft',
      createdAt: now,
      progress: 0,
      userId: insertCampaign.userId || null,
      creatorId: insertCampaign.creatorId || null,
      contactListId: insertCampaign.contactListId || null,
      customObjective: insertCampaign.customObjective || null,
      totalContacts: insertCampaign.totalContacts || 0,
      sentEmails: insertCampaign.sentEmails || 0,
      deliveredEmails: insertCampaign.deliveredEmails || 0,
      openedEmails: insertCampaign.openedEmails || 0,
      clickedEmails: insertCampaign.clickedEmails || 0,
      repliedEmails: insertCampaign.repliedEmails || 0,
      bouncedEmails: insertCampaign.bouncedEmails || 0,
      abTestEnabled: insertCampaign.abTestEnabled || false,
      abTestVariant: insertCampaign.abTestVariant || null,
      abTestMetric: insertCampaign.abTestMetric || null,
      abTestSplitPercentage: insertCampaign.abTestSplitPercentage || null,
      abTestNotes: insertCampaign.abTestNotes || null
    };
    
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: number, campaignData: Partial<Campaign>): Promise<Campaign> {
    const campaign = await this.getCampaign(id);
    if (!campaign) {
      throw new Error(`Campaign with ID ${id} not found`);
    }
    
    const updatedCampaign = { ...campaign, ...campaignData };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    // Delete all emails for this campaign first
    const emailsToDelete = Array.from(this.emails.values())
      .filter(email => email.campaignId === id);
    
    for (const email of emailsToDelete) {
      this.emails.delete(email.id);
    }
    
    // Then delete the campaign itself
    return this.campaigns.delete(id);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getRecentCampaigns(limit: number = 5): Promise<Campaign[]> {
    const campaigns = Array.from(this.campaigns.values())
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Sort by created date, newest first
      });
    
    return campaigns.slice(0, limit);
  }

  async getActiveCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values())
      .filter(campaign => campaign.status === 'active');
  }

  async getCampaignsByStatus(status: string): Promise<Campaign[]> {
    return Array.from(this.campaigns.values())
      .filter(campaign => campaign.status === status);
  }

  // Email operations
  async getEmail(id: number): Promise<Email | undefined> {
    return this.emails.get(id);
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = this.emailId++;
    
    // Set default values
    const email: Email = {
      id,
      body: insertEmail.body,
      subject: insertEmail.subject,
      sequence: insertEmail.sequence,
      status: insertEmail.status || 'draft',
      metadata: insertEmail.metadata || {},
      campaignId: insertEmail.campaignId || null,
      contactId: insertEmail.contactId || null,
      emailAccountId: insertEmail.emailAccountId || null,
      sentAt: insertEmail.sentAt || null,
      scheduledAt: insertEmail.scheduledAt || null,
      deliveredAt: insertEmail.deliveredAt || null,
      openedAt: insertEmail.openedAt || null,
      clickedAt: insertEmail.clickedAt || null,
      repliedAt: insertEmail.repliedAt || null,
      bouncedAt: insertEmail.bouncedAt || null,
      bounceType: insertEmail.bounceType || null,
      bounceReason: insertEmail.bounceReason || null,
      createdAt: new Date(),
      trackingPixelId: insertEmail.trackingPixelId || null,
      trackingLinkId: insertEmail.trackingLinkId || null,
      trackingPixelOpened: insertEmail.trackingPixelOpened || false,
      trackingLinkClicked: insertEmail.trackingLinkClicked || false,
      abTestVariantId: insertEmail.abTestVariantId || null
    };
    
    this.emails.set(id, email);
    return email;
  }

  async updateEmail(id: number, emailData: Partial<Email>): Promise<Email> {
    const email = await this.getEmail(id);
    if (!email) {
      throw new Error(`Email with ID ${id} not found`);
    }
    
    const updatedEmail = { ...email, ...emailData };
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }

  async deleteEmail(id: number): Promise<boolean> {
    return this.emails.delete(id);
  }

  async getEmailsByCampaign(campaignId: number): Promise<Email[]> {
    return Array.from(this.emails.values())
      .filter(email => email.campaignId === campaignId);
  }

  async getEmailsByContact(contactId: number): Promise<Email[]> {
    return Array.from(this.emails.values())
      .filter(email => email.contactId === contactId);
  }

  async getScheduledEmails(): Promise<Email[]> {
    const now = new Date();
    
    return Array.from(this.emails.values())
      .filter(email => 
        email.status === 'scheduled' && 
        email.scheduledAt !== null && 
        email.scheduledAt <= now
      );
  }

  // EmailAccount operations
  async getEmailAccount(id: number): Promise<EmailAccount | undefined> {
    return this.emailAccounts.get(id);
  }

  async getEmailAccountByEmail(email: string): Promise<EmailAccount | undefined> {
    return Array.from(this.emailAccounts.values())
      .find(account => account.email === email);
  }

  async createEmailAccount(insertEmailAccount: InsertEmailAccount): Promise<EmailAccount> {
    const id = this.emailAccountId++;
    
    // Set default values
    const emailAccount: EmailAccount = {
      id,
      name: insertEmailAccount.name,
      email: insertEmailAccount.email,
      status: insertEmailAccount.status || 'inactive',
      provider: insertEmailAccount.provider,
      userId: insertEmailAccount.userId || null,
      smtpHost: insertEmailAccount.smtpHost,
      smtpPort: insertEmailAccount.smtpPort,
      smtpUsername: insertEmailAccount.smtpUsername,
      smtpPassword: insertEmailAccount.smtpPassword,
      smtpSecure: insertEmailAccount.smtpSecure,
      imapHost: insertEmailAccount.imapHost || null,
      imapPort: insertEmailAccount.imapPort || null,
      imapUsername: insertEmailAccount.imapUsername || null,
      imapPassword: insertEmailAccount.imapPassword || null,
      imapSecure: insertEmailAccount.imapSecure || true,
      createdAt: new Date(),
      notes: insertEmailAccount.notes || null,
      dailyLimit: insertEmailAccount.dailyLimit || 100,
      warmupEnabled: insertEmailAccount.warmupEnabled || false,
      lastUsedAt: insertEmailAccount.lastUsedAt || null,
      lastRotationUsedAt: insertEmailAccount.lastRotationUsedAt || null,
      hourlyLimit: insertEmailAccount.hourlyLimit || 25,
      warmupInProgress: insertEmailAccount.warmupInProgress || false,
      warmupStartDate: insertEmailAccount.warmupStartDate || null,
      warmupDailyIncrement: insertEmailAccount.warmupDailyIncrement || 5,
      warmupMaxVolume: insertEmailAccount.warmupMaxVolume || 100,
      domainAuthenticated: insertEmailAccount.domainAuthenticated || false,
      dkimConfigured: insertEmailAccount.dkimConfigured || false,
      spfConfigured: insertEmailAccount.spfConfigured || false,
      dmarcConfigured: insertEmailAccount.dmarcConfigured || false,
      bounceRate: insertEmailAccount.bounceRate || null,
      complaintRate: insertEmailAccount.complaintRate || null,
      openRate: insertEmailAccount.openRate || null,
      clickRate: insertEmailAccount.clickRate || null,
      replyRate: insertEmailAccount.replyRate || null,
      healthScore: insertEmailAccount.healthScore || null,
      healthStatus: insertEmailAccount.healthStatus || null,
      lastHealthCheck: insertEmailAccount.lastHealthCheck || null,
      testModeOnly: insertEmailAccount.testModeOnly || false
    };
    
    this.emailAccounts.set(id, emailAccount);
    return emailAccount;
  }

  async updateEmailAccount(id: number, emailAccountData: Partial<EmailAccount>): Promise<EmailAccount> {
    const emailAccount = await this.getEmailAccount(id);
    if (!emailAccount) {
      throw new Error(`EmailAccount with ID ${id} not found`);
    }
    
    const updatedEmailAccount = { ...emailAccount, ...emailAccountData };
    this.emailAccounts.set(id, updatedEmailAccount);
    return updatedEmailAccount;
  }

  async deleteEmailAccount(id: number): Promise<boolean> {
    // Delete all emails for this account first
    const emailsToDelete = Array.from(this.emails.values())
      .filter(email => email.emailAccountId === id);
    
    for (const email of emailsToDelete) {
      this.emails.delete(email.id);
    }
    
    // Remove any creator-account associations
    const creatorAccountsToDelete = Array.from(this.creatorEmailAccounts.values())
      .filter(account => account.emailAccountId === id);
    
    for (const account of creatorAccountsToDelete) {
      this.creatorEmailAccounts.delete(account.id);
    }
    
    // Then delete the account itself
    return this.emailAccounts.delete(id);
  }

  async getAllEmailAccounts(): Promise<EmailAccount[]> {
    return Array.from(this.emailAccounts.values());
  }

  async getActiveEmailAccounts(): Promise<EmailAccount[]> {
    return Array.from(this.emailAccounts.values())
      .filter(account => account.status === 'active');
  }

  // EmailTemplate operations
  async getEmailTemplate(id: number): Promise<DbEmailTemplate | undefined> {
    return this.emailTemplates.get(id);
  }

  async createEmailTemplate(insertEmailTemplate: InsertEmailTemplate): Promise<DbEmailTemplate> {
    const id = this.emailTemplateId++;
    const now = new Date();
    
    // Set default values
    const emailTemplate: DbEmailTemplate = {
      id,
      name: insertEmailTemplate.name,
      subject: insertEmailTemplate.subject,
      content: insertEmailTemplate.content,
      createdAt: now,
      updatedAt: now,
      userId: insertEmailTemplate.userId || null,
      creatorId: insertEmailTemplate.creatorId || null,
      tags: insertEmailTemplate.tags || null,
      preheader: insertEmailTemplate.preheader || null,
      isSystem: insertEmailTemplate.isSystem || false,
      category: insertEmailTemplate.category || null,
      thumbnail: insertEmailTemplate.thumbnail || null
    };
    
    this.emailTemplates.set(id, emailTemplate);
    return emailTemplate;
  }

  async updateEmailTemplate(id: number, emailTemplateData: Partial<DbEmailTemplate>): Promise<DbEmailTemplate> {
    const emailTemplate = await this.getEmailTemplate(id);
    if (!emailTemplate) {
      throw new Error(`EmailTemplate with ID ${id} not found`);
    }
    
    const updatedAt = new Date();
    const updatedEmailTemplate = { ...emailTemplate, ...emailTemplateData, updatedAt };
    this.emailTemplates.set(id, updatedEmailTemplate);
    return updatedEmailTemplate;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    return this.emailTemplates.delete(id);
  }

  async getAllEmailTemplates(): Promise<DbEmailTemplate[]> {
    return Array.from(this.emailTemplates.values());
  }

  async getSystemEmailTemplates(): Promise<DbEmailTemplate[]> {
    return Array.from(this.emailTemplates.values())
      .filter(template => template.isSystem === true);
  }

  // OutreachLog operations
  async createOutreachLog(insertOutreachLog: InsertOutreachLog): Promise<OutreachLog> {
    const id = this.outreachLogId++;
    
    // Set default values
    const outreachLog: OutreachLog = {
      id,
      contactId: insertOutreachLog.contactId,
      sentAt: insertOutreachLog.sentAt,
      channel: insertOutreachLog.channel,
      userId: insertOutreachLog.userId || null,
      emailSubject: insertOutreachLog.emailSubject || null,
      emailBody: insertOutreachLog.emailBody || null,
      outcome: insertOutreachLog.outcome || null
    };
    
    this.outreachLogs.set(id, outreachLog);
    return outreachLog;
  }

  async getOutreachLog(id: number): Promise<OutreachLog | undefined> {
    return this.outreachLogs.get(id);
  }

  async getOutreachLogsByContactId(contactId: number): Promise<OutreachLog[]> {
    return Array.from(this.outreachLogs.values())
      .filter(log => log.contactId === contactId);
  }

  async getOutreachLogsByDateRange(startDate: Date, endDate: Date): Promise<OutreachLog[]> {
    return Array.from(this.outreachLogs.values())
      .filter(log => log.sentAt >= startDate && log.sentAt <= endDate);
  }

  async getAllOutreachLogs(): Promise<OutreachLog[]> {
    return Array.from(this.outreachLogs.values());
  }

  // ContactNote operations
  async createContactNote(insertContactNote: InsertContactNote): Promise<ContactNote> {
    const id = this.contactNoteId++;
    
    // Set default values
    const contactNote: ContactNote = {
      id,
      contactId: insertContactNote.contactId,
      noteText: insertContactNote.noteText,
      createdAt: new Date(),
      userId: insertContactNote.userId || null
    };
    
    this.contactNotes.set(id, contactNote);
    return contactNote;
  }

  async getContactNote(id: number): Promise<ContactNote | undefined> {
    return this.contactNotes.get(id);
  }

  async getContactNotes(): Promise<ContactNote[]> {
    return Array.from(this.contactNotes.values());
  }

  async getContactNotesByContactId(contactId: number): Promise<ContactNote[]> {
    return Array.from(this.contactNotes.values())
      .filter(note => note.contactId === contactId);
  }

  // ShareableLandingPage operations
  async createShareableLandingPage(insertPage: InsertShareableLandingPage): Promise<ShareableLandingPage> {
    const id = this.shareableLandingPageId++;
    const now = new Date();
    
    // Generate a unique ID for the page
    const uniqueId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    // Set default values
    const page: ShareableLandingPage = {
      id,
      title: insertPage.title,
      uniqueId,
      createdAt: now,
      updatedAt: now,
      status: insertPage.status || 'draft',
      viewCount: 0,
      userId: insertPage.userId || null,
      creatorId: insertPage.creatorId || null,
      type: insertPage.type || null,
      description: insertPage.description || null,
      content: insertPage.content || {},
      isPasswordProtected: insertPage.isPasswordProtected || false,
      password: insertPage.password || null,
      expiresAt: insertPage.expiresAt || null,
      brandPrimaryColor: insertPage.brandPrimaryColor || '#4F46E5',
      brandSecondaryColor: insertPage.brandSecondaryColor || '#1E3A8A',
      brandFooterText: insertPage.brandFooterText || 'This proposal is confidential.',
      uniqueVisitors: 0,
      emailClicks: 0,
      whatsappClicks: 0,
      contactInfo: insertPage.contactInfo || null,
      projectId: insertPage.projectId || null,
      creatorName: insertPage.creatorName || null,
      metadata: insertPage.metadata || {}
    };
    
    this.shareableLandingPages.set(id, page);
    return page;
  }

  async getShareableLandingPage(id: number): Promise<ShareableLandingPage | undefined> {
    return this.shareableLandingPages.get(id);
  }

  async getShareableLandingPageByUniqueId(uniqueId: string): Promise<ShareableLandingPage | undefined> {
    return Array.from(this.shareableLandingPages.values())
      .find(page => page.uniqueId === uniqueId);
  }

  async updateShareableLandingPage(id: number, pageData: Partial<ShareableLandingPage>): Promise<ShareableLandingPage> {
    const page = await this.getShareableLandingPage(id);
    if (!page) {
      throw new Error(`ShareableLandingPage with ID ${id} not found`);
    }
    
    const updatedAt = new Date();
    const updatedPage = { ...page, ...pageData, updatedAt };
    this.shareableLandingPages.set(id, updatedPage);
    return updatedPage;
  }

  async deleteShareableLandingPage(id: number): Promise<boolean> {
    return this.shareableLandingPages.delete(id);
  }

  async getAllShareableLandingPages(): Promise<ShareableLandingPage[]> {
    return Array.from(this.shareableLandingPages.values());
  }

  async getUserShareableLandingPages(userId: number): Promise<ShareableLandingPage[]> {
    return Array.from(this.shareableLandingPages.values())
      .filter(page => page.userId === userId);
  }

  async getCreatorShareableLandingPages(creatorId: number): Promise<ShareableLandingPage[]> {
    return Array.from(this.shareableLandingPages.values())
      .filter(page => page.creatorId === creatorId);
  }

  async incrementShareableLandingPageViewCount(id: number): Promise<void> {
    const page = await this.getShareableLandingPage(id);
    if (page) {
      page.viewCount += 1;
      this.shareableLandingPages.set(id, page);
    }
  }

  // Proposal operations
  async getAllProposals(): Promise<Proposal[]> {
    return Array.from(this.proposals.values());
  }
  
  async getProposal(id: number): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }
  
  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const id = this.proposalId++;
    const now = new Date();
    
    // Set default values
    const proposal: Proposal = {
      id,
      name: insertProposal.name,
      status: insertProposal.status || 'draft',
      createdAt: now,
      updatedAt: now,
      contactId: insertProposal.contactId,
      userId: insertProposal.userId || null,
      researchData: insertProposal.researchData || null,
      emailContent: insertProposal.emailContent || null,
      notes: insertProposal.notes || null,
      sentAt: null,
      value: insertProposal.value || null,
      requirements: insertProposal.requirements || null,
      followupDate: insertProposal.followupDate || null,
      contactName: insertProposal.contactName || null,
      contactCompany: insertProposal.contactCompany || null,
      contactEmail: insertProposal.contactEmail || null,
      contactIndustry: insertProposal.contactIndustry || null,
      creators: insertProposal.creators || [],
      creatorFits: insertProposal.creatorFits || {},
      creatorPricing: insertProposal.creatorPricing || []
    };
    
    this.proposals.set(id, proposal);
    return proposal;
  }
  
  async updateProposal(id: number, proposalData: Partial<Proposal>): Promise<Proposal> {
    const proposal = await this.getProposal(id);
    if (!proposal) {
      throw new Error(`Proposal with ID ${id} not found`);
    }
    
    const updatedAt = new Date();
    const updatedProposal = { ...proposal, ...proposalData, updatedAt };
    this.proposals.set(id, updatedProposal);
    return updatedProposal;
  }
  
  async deleteProposal(id: number): Promise<boolean> {
    return this.proposals.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  // Temporary storage for data that doesn't need to be persisted in the database
  private temporaryData: Map<string, any> = new Map();
  // Method to update creator video with creator ID
  async updateCreatorVideo(videoId: string, updateData: { creatorId: number }) {
    console.log(`Connecting video ${videoId} to creator ${updateData.creatorId}`);
    // For this implementation, we're storing the creator connection in memory
    // In a real database implementation, this would update the record in the database
    
    // Update the creator video cache to include the creator ID
    const existingVideos = global.creatorVideos || [];
    const updatedVideos = existingVideos.map(video => {
      if (video.id === videoId) {
        return {
          ...video,
          creatorId: updateData.creatorId,
          hasMatchingProfile: true,
          creatorProfileUrl: `/creators/${updateData.creatorId}`
        };
      }
      return video;
    });
    
    // Update global cache
    global.creatorVideos = updatedVideos;
    
    return true;
  }
  // Implementation of creator-related methods using the database
  // Method to get temporary data
  getTemporaryData(key: string): any {
    return this.temporaryData.get(key);
  }
  
  async getCreators(): Promise<Creator[]> {
    return this.getAllCreators();
  }
  
  async getAllCreators(): Promise<Creator[]> {
    try {
      const { db } = await import('./db');
      const { creators } = await import('@shared/schema');
      
      // Implement robust error handling with retries
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          const result = await db.select().from(creators);
          console.log(`Successfully fetched ${result.length} creators from database`);
          return result;
        } catch (err) {
          lastError = err;
          console.warn(`Attempt ${attempts + 1}/${maxAttempts} to fetch creators failed:`, err);
          attempts++;
          
          // Wait before retry (exponential backoff)
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempts)));
          }
        }
      }
      
      // Return fallback creator list if database connection fails
      // This ensures the proposal workflow can continue even with database issues
      console.error('All attempts to fetch creators failed. Using fallback data:', lastError);
      
      // Return Tyler Blanchard as a fallback creator so the proposal workflow can continue
      return [{
        id: 11,
        name: "Tyler Blanchard",
        email: "tyler@example.com",
        role: "Content Creator",
        bio: "Tech and lifestyle creator specializing in AI and finance content",
        brandVoice: "Tech-savvy, approachable, educational",
        pillarUrl: "https://pillartalent.co/u/tylerblanchard",
        profileImageUrl: "/tyler-profile.jpg",
        profileColor: "#3b82f6",
        initials: "TB",
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    } catch (error) {
      console.error('Error in getAllCreators method:', error);
      return [];
    }
  }
  
  async getCreator(id: number): Promise<Creator | undefined> {
    try {
      const { db } = await import('./db');
      const { creators } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [result] = await db.select().from(creators).where(eq(creators.id, id));
      return result;
    } catch (error) {
      console.error(`Error fetching creator ${id} from database:`, error);
      return undefined;
    }
  }
  
  async getCreatorByName(name: string): Promise<Creator | undefined> {
    try {
      const { db } = await import('./db');
      const { creators } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [result] = await db.select().from(creators).where(eq(creators.name, name));
      return result;
    } catch (error) {
      console.error(`Error fetching creator with name ${name} from database:`, error);
      return undefined;
    }
  }

  async getCreatorPricing(creatorId: number): Promise<CreatorPricing[]> {
    try {
      const { db } = await import('./db');
      const { creatorPricing } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // First, try to get pricing data from the database
      let result = [];
      try {
        result = await db.select().from(creatorPricing).where(eq(creatorPricing.creatorId, creatorId));
      } catch (dbError) {
        console.warn(`Database error fetching pricing for creator ${creatorId}, using fallback:`, dbError);
      }
      
      // If no pricing data is found in the database, return default pricing options
      if (result.length === 0) {
        console.log(`No pricing data found for creator ${creatorId}, generating default pricing options`);
        return this.generateDefaultPricing(creatorId);
      }
      
      return result;
    } catch (error) {
      console.error(`Error in getCreatorPricing for creator ${creatorId}:`, error);
      // Even if there's an error, return default pricing so the UI doesn't break
      return this.generateDefaultPricing(creatorId);
    }
  }
  
  // Helper method to generate default pricing for creators
  private generateDefaultPricing(creatorId: number): CreatorPricing[] {
    // Create a unique timestamp for IDs
    const timestamp = Date.now();
    
    return [
      {
        id: timestamp + 1,
        creatorId,
        contentType: 'youtube',
        format: 'long_form',
        basePrice: 3500,
        usageRights: '30 days, brand channel only',
        revisionLimit: 2,
        deliveryTimeframe: 14,
        exclusivity: false,
        featured: true,
        description: 'Full 10-15 minute video with dedicated product segment',
        createdAt: new Date()
      },
      {
        id: timestamp + 2,
        creatorId,
        contentType: 'tiktok',
        format: 'short_form',
        basePrice: 1800,
        usageRights: '14 days, brand social only',
        revisionLimit: 1,
        deliveryTimeframe: 7,
        exclusivity: false,
        featured: false,
        description: '30-60 second dedicated product feature',
        createdAt: new Date()
      },
      {
        id: timestamp + 3,
        creatorId,
        contentType: 'instagram',
        format: 'post',
        basePrice: 1200,
        usageRights: '7 days, brand social only',
        revisionLimit: 1,
        deliveryTimeframe: 5,
        exclusivity: false,
        featured: false,
        description: 'Product feature in grid post',
        createdAt: new Date()
      },
      {
        id: timestamp + 4,
        creatorId,
        contentType: 'instagram',
        format: 'reel',
        basePrice: 2200,
        usageRights: '14 days, brand social only',
        revisionLimit: 1,
        deliveryTimeframe: 7,
        exclusivity: false,
        featured: true,
        description: '15-30 second dedicated product reel',
        createdAt: new Date()
      }
    ];
  }
  
  async addCreatorEmailAccount(creatorId: number, emailAccountId: number, isPrimary: boolean = false): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const { creatorEmailAccounts } = await import('@shared/schema');
      
      // Insert the association
      const result = await db.insert(creatorEmailAccounts).values({
        creatorId,
        emailAccountId,
        isPrimary
      }).returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Error associating creator ${creatorId} with email account ${emailAccountId}:`, error);
      return false;
    }
  }
  
  // For other methods, let's use the memory storage implementation temporarily
  // This allows us to focus on just fixing the creator functionality
  private memStorage = new MemStorage();
  
  // Delegate methods to the memory storage
  async getUser(id: number) { return this.memStorage.getUser(id); }
  async getUserByUsername(username: string) { return this.memStorage.getUserByUsername(username); }
  async createUser(userData: InsertUser) { return this.memStorage.createUser(userData); }
  async getFirstUser() { return this.memStorage.getFirstUser(); }
  async updateUser(id: number, userData: Partial<User>) { return this.memStorage.updateUser(id, userData); }
  async deleteUser(id: number) { return this.memStorage.deleteUser(id); }
  async createCreator(creatorData: InsertCreator): Promise<Creator> {
    try {
      const { db } = await import('./db');
      const { creators } = await import('@shared/schema');
      
      const [result] = await db.insert(creators).values(creatorData).returning();
      return result;
    } catch (error) {
      console.error('Error creating creator in database:', error);
      // Fall back to memory storage if database operation fails
      return this.memStorage.createCreator(creatorData);
    }
  }
  
  async updateCreator(id: number, creatorData: Partial<Creator>): Promise<Creator | undefined> {
    try {
      const { db } = await import('./db');
      const { creators } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [result] = await db.update(creators)
        .set(creatorData)
        .where(eq(creators.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error(`Error updating creator ${id} in database:`, error);
      // Fall back to memory storage if database operation fails
      return this.memStorage.updateCreator(id, creatorData);
    }
  }
  
  async deleteCreator(id: number): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const { creators } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const result = await db.delete(creators).where(eq(creators.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting creator ${id} from database:`, error);
      // Fall back to memory storage if database operation fails
      return this.memStorage.deleteCreator(id);
    }
  }
  
  // Contact methods
  async getAllContacts() { return this.memStorage.getAllContacts(); }
  async getContact(id: number) { return this.memStorage.getContact(id); }
  async createContact(contactData: InsertContact) { return this.memStorage.createContact(contactData); }
  async bulkCreateContacts(contactsData: InsertContact[]) { return this.memStorage.bulkCreateContacts(contactsData); }
  async updateContact(id: number, contactData: Partial<Contact>) { return this.memStorage.updateContact(id, contactData); }
  async archiveContact(id: number) { return this.memStorage.archiveContact(id); }
  async restoreContact(id: number) { return this.memStorage.restoreContact(id); }
  async getContactsByFilter(filterParams: ContactFilterParams) { return this.memStorage.getContactsByFilter(filterParams); }
  async getContactsByEmail(email: string) { return this.memStorage.getContactsByEmail(email); }
  async deleteContact(id: number) { return this.memStorage.deleteContact(id); }
  
  // Contact List methods
  async getAllContactLists() { return this.memStorage.getAllContactLists(); }
  async getContactList(id: number) { return this.memStorage.getContactList(id); }
  async createContactList(listData: InsertContactList) { return this.memStorage.createContactList(listData); }
  async updateContactList(id: number, listData: Partial<ContactList>) { return this.memStorage.updateContactList(id, listData); }
  async deleteContactList(id: number) { return this.memStorage.deleteContactList(id); }
  
  // Contact List Membership methods
  async getContactListMemberships(contactListId: number) { return this.memStorage.getContactListMemberships(contactListId); }
  async getContactMemberships(contactId: number) { return this.memStorage.getContactMemberships(contactId); }
  async addContactToList(contactId: number, contactListId: number) { return this.memStorage.addContactToList(contactId, contactListId); }
  async removeContactFromList(contactId: number, contactListId: number) { return this.memStorage.removeContactFromList(contactId, contactListId); }
  async bulkAddContactsToList(contactIds: number[], contactListId: number) { return this.memStorage.bulkAddContactsToList(contactIds, contactListId); }
  async bulkRemoveContactsFromList(contactIds: number[], contactListId: number) { return this.memStorage.bulkRemoveContactsFromList(contactIds, contactListId); }
  
  // Campaign methods
  async getAllCampaigns() { return this.memStorage.getAllCampaigns(); }
  async getCampaign(id: number) { return this.memStorage.getCampaign(id); }
  async createCampaign(campaignData: InsertCampaign) { return this.memStorage.createCampaign(campaignData); }
  async updateCampaign(id: number, campaignData: Partial<Campaign>) { return this.memStorage.updateCampaign(id, campaignData); }
  async deleteCampaign(id: number) { return this.memStorage.deleteCampaign(id); }
  async getRecentCampaigns(limit = 5) { return this.memStorage.getRecentCampaigns(limit); }
  
  // Email methods
  async createEmail(emailData: InsertEmail) { return this.memStorage.createEmail(emailData); }
  async getEmail(id: number) { return this.memStorage.getEmail(id); }
  async updateEmail(id: number, emailData: Partial<Email>) { return this.memStorage.updateEmail(id, emailData); }
  async deleteEmail(id: number) { return this.memStorage.deleteEmail(id); }
  async getContactEmails(contactId: number) { return this.memStorage.getContactEmails(contactId); }
  async getCampaignEmails(campaignId: number) { return this.memStorage.getCampaignEmails(campaignId); }
  async getEmailsByCampaignAndContact(campaignId: number, contactId: number) { return this.memStorage.getEmailsByCampaignAndContact(campaignId, contactId); }
  
  // Email Account methods
  async getAllEmailAccounts() { return this.memStorage.getAllEmailAccounts(); }
  async getEmailAccount(id: number) { return this.memStorage.getEmailAccount(id); }
  async getEmailAccountByEmail(email: string) { return this.memStorage.getEmailAccountByEmail(email); }
  async createEmailAccount(accountData: InsertEmailAccount) { return this.memStorage.createEmailAccount(accountData); }
  async updateEmailAccount(id: number, accountData: Partial<EmailAccount>) { return this.memStorage.updateEmailAccount(id, accountData); }
  async deleteEmailAccount(id: number) { return this.memStorage.deleteEmailAccount(id); }
  async getCreatorEmailAccounts(creatorId: number) { 
    try {
      const { db } = await import('./db');
      const { creatorEmailAccounts, emailAccounts } = await import('@shared/schema');
      const { eq, sql } = await import('drizzle-orm');
      
      // Get the associations between creator and email accounts
      const associations = await db.select().from(creatorEmailAccounts)
        .where(eq(creatorEmailAccounts.creatorId, creatorId));
      
      if (associations.length === 0) {
        return [];
      }
      
      // Get all the email account IDs associated with this creator
      const emailAccountIds = associations.map(assoc => assoc.emailAccountId);
      
      // Get the email accounts
      const accounts = await db.select().from(emailAccounts)
        .where(sql`${emailAccounts.id} IN (${emailAccountIds.join(',')})`);
      
      return accounts;
    } catch (error) {
      console.error(`Error fetching email accounts for creator ${creatorId}:`, error);
      // Fallback to memory storage
      return this.memStorage.getCreatorEmailAccounts(creatorId);
    }
  }
  async getCreatorPrimaryEmailAccount(creatorId: number) { return this.memStorage.getCreatorPrimaryEmailAccount(creatorId); }
  async setCreatorPrimaryEmailAccount(creatorId: number, emailAccountId: number) { return this.memStorage.setCreatorPrimaryEmailAccount(creatorId, emailAccountId); }
  
  async getCreatorCampaigns(creatorId: number) {
    try {
      const { db } = await import('./db');
      const { campaigns } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Check if creatorId column exists in the campaigns table
      try {
        const result = await db.select().from(campaigns).where(eq(campaigns.creatorId, creatorId));
        return result;
      } catch (innerError) {
        console.error(`Database schema issue: ${innerError}`);
        // If there's a column error, fall back to empty array
        return [];
      }
    } catch (error) {
      console.error(`Error fetching campaigns for creator ${creatorId}:`, error);
      // Fallback to empty array
      return [];
    }
  }
  
  // Proposal methods
  async getAllProposals() { return this.memStorage.getAllProposals(); }
  async getProposal(id: number) { return this.memStorage.getProposal(id); }
  async createProposal(proposalData: InsertProposal) { return this.memStorage.createProposal(proposalData); }
  async updateProposal(id: number, proposalData: Partial<Proposal>) { return this.memStorage.updateProposal(id, proposalData); }
  async deleteProposal(id: number) { return this.memStorage.deleteProposal(id); }
  
  // Shareable Landing Page methods
  async getAllShareableLandingPages() { 
    try {
      const { db } = await import('./db');
      const { shareableLandingPages } = await import('@shared/schema');
      
      const result = await db.select().from(shareableLandingPages);
      return result;
    } catch (error) {
      console.error('Error fetching landing pages from database:', error);
      return [];
    }
  }
  
  async getShareableLandingPage(id: number) {
    try {
      const { db } = await import('./db');
      const { shareableLandingPages } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [result] = await db.select().from(shareableLandingPages).where(eq(shareableLandingPages.id, id));
      return result;
    } catch (error) {
      console.error(`Error fetching landing page ${id} from database:`, error);
      return undefined;
    }
  }
  
  async getShareableLandingPageByUniqueId(uniqueId: string) {
    try {
      const { db } = await import('./db');
      const { shareableLandingPages } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [result] = await db.select().from(shareableLandingPages).where(eq(shareableLandingPages.uniqueId, uniqueId));
      return result;
    } catch (error) {
      console.error(`Error fetching landing page by uniqueId ${uniqueId} from database:`, error);
      return undefined;
    }
  }
  
  async createShareableLandingPage(landingPageData: any) {
    try {
      const { db } = await import('./db');
      const { shareableLandingPages } = await import('@shared/schema');
      
      // Convert camelCase to snake_case for the database
      let dbLandingPageData: any = {};
      
      // Handle the unique_id specifically
      if (!landingPageData.unique_id) {
        // Use direct database column name
        dbLandingPageData.unique_id = `page_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      } else {
        dbLandingPageData.unique_id = landingPageData.unique_id;
      }
      
      // Copy the rest of the fields
      Object.keys(landingPageData).forEach(key => {
        if (key !== 'unique_id') {
          dbLandingPageData[key] = landingPageData[key];
        }
      });
      
      console.log('Database insert data prepared:', {
        ...dbLandingPageData,
        content: '[Content Object]' // Don't log the full content
      });
      
      const [result] = await db.insert(shareableLandingPages).values(dbLandingPageData).returning();
      return result;
    } catch (error) {
      console.error('Error creating landing page in database:', error);
      throw error;
    }
  }
  
  async updateShareableLandingPage(id: number, landingPageData: any) {
    try {
      const { db } = await import('./db');
      const { shareableLandingPages } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [result] = await db.update(shareableLandingPages)
        .set(landingPageData)
        .where(eq(shareableLandingPages.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error(`Error updating landing page ${id} in database:`, error);
      throw error;
    }
  }
  
  // Creator Video operations
  async updateCreatorVideo(videoId: string, updateData: { creatorId: number }) {
    console.log(`Updating creator video ${videoId} with creator ID ${updateData.creatorId}`);
    
    try {
      // In-memory storage doesn't persist this connection, so we'll
      // make a note of it for the AsanaService to include when fetching videos
      const connectionKey = `video_${videoId}_creator`;
      this.temporaryData.set(connectionKey, updateData.creatorId);
      
      console.log(`Successfully stored connection: video ${videoId} -> creator ${updateData.creatorId}`);
      return true;
    } catch (error) {
      console.error(`Error updating creator video ${videoId}:`, error);
      throw error;
    }
  }
  
  // Pipeline Card operations
  async getAllPipelineCards(): Promise<PipelineCard[]> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      
      const cards = await db.select().from(pipelineCards);
      return cards;
    } catch (error) {
      console.error('Error fetching pipeline cards:', error);
      return [];
    }
  }
  
  async getPipelineCardsByVertical(vertical: string): Promise<PipelineCard[]> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const cards = await db.select().from(pipelineCards)
        .where(eq(pipelineCards.vertical, vertical));
      return cards;
    } catch (error) {
      console.error(`Error fetching pipeline cards for vertical ${vertical}:`, error);
      return [];
    }
  }
  
  async getPipelineCard(id: number): Promise<PipelineCard | undefined> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [card] = await db.select().from(pipelineCards)
        .where(eq(pipelineCards.id, id));
      return card;
    } catch (error) {
      console.error(`Error fetching pipeline card with ID ${id}:`, error);
      return undefined;
    }
  }
  
  async createPipelineCard(data: Omit<PipelineCard, 'id'>): Promise<PipelineCard> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      
      const [newCard] = await db.insert(pipelineCards)
        .values(data)
        .returning();
      return newCard;
    } catch (error) {
      console.error('Error creating pipeline card:', error);
      throw error;
    }
  }
  
  async updatePipelineCard(id: number, data: Partial<PipelineCard>): Promise<PipelineCard> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [updatedCard] = await db.update(pipelineCards)
        .set(data)
        .where(eq(pipelineCards.id, id))
        .returning();
      return updatedCard;
    } catch (error) {
      console.error(`Error updating pipeline card with ID ${id}:`, error);
      throw error;
    }
  }
  
  async movePipelineCard(id: number, targetStage: string): Promise<PipelineCard> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Get the current card to include history
      const card = await this.getPipelineCard(id);
      if (!card) {
        throw new Error(`Pipeline card with ID ${id} not found`);
      }
      
      // Build history array for tracking stage transitions
      const history = card.history ? [...card.history] : [];
      history.push({
        from: card.currentStage,
        to: targetStage,
        timestamp: new Date().toISOString()
      });
      
      const [updatedCard] = await db.update(pipelineCards)
        .set({
          currentStage: targetStage,
          history: history,
          updatedAt: new Date()
        })
        .where(eq(pipelineCards.id, id))
        .returning();
      return updatedCard;
    } catch (error) {
      console.error(`Error moving pipeline card with ID ${id}:`, error);
      throw error;
    }
  }
  
  async deletePipelineCard(id: number): Promise<void> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(pipelineCards)
        .where(eq(pipelineCards.id, id));
    } catch (error) {
      console.error(`Error deleting pipeline card with ID ${id}:`, error);
      throw error;
    }
  }
  
  // Company Information operations
  async getCompanyInformation(companyId: number): Promise<CompanyInformation | undefined> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [info] = await db.select().from(companyInformation)
        .where(eq(companyInformation.companyId, companyId));
      return info;
    } catch (error) {
      console.error(`Error fetching company information for company ID ${companyId}:`, error);
      return undefined;
    }
  }
  
  async createCompanyInformation(data: Omit<CompanyInformation, 'id'>): Promise<CompanyInformation> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      
      const [newInfo] = await db.insert(companyInformation)
        .values(data)
        .returning();
      return newInfo;
    } catch (error) {
      console.error('Error creating company information:', error);
      throw error;
    }
  }
  
  async updateCompanyInformation(companyId: number, data: Partial<CompanyInformation>): Promise<CompanyInformation> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [updatedInfo] = await db.update(companyInformation)
        .set(data)
        .where(eq(companyInformation.companyId, companyId))
        .returning();
      return updatedInfo;
    } catch (error) {
      console.error(`Error updating company information for company ID ${companyId}:`, error);
      throw error;
    }
  }
  
  async getPipelineCardsByStage(stage: string): Promise<PipelineCard[]> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const cards = await db.select().from(pipelineCards)
        .where(eq(pipelineCards.currentStage, stage));
      return cards;
    } catch (error) {
      console.error(`Error fetching pipeline cards for stage ${stage}:`, error);
      return [];
    }
  }
  
  // Company Tasks operations
  async getCompanyTasks(companyId: number): Promise<CompanyTask[]> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const tasks = await db.select().from(companyTasks)
        .where(eq(companyTasks.companyId, companyId));
      return tasks;
    } catch (error) {
      console.error(`Error fetching tasks for company ID ${companyId}:`, error);
      return [];
    }
  }
  
  async getCompanyTask(id: number): Promise<CompanyTask | undefined> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [task] = await db.select().from(companyTasks)
        .where(eq(companyTasks.id, id));
      return task;
    } catch (error) {
      console.error(`Error fetching task with ID ${id}:`, error);
      return undefined;
    }
  }
  
  async createCompanyTask(data: Omit<CompanyTask, 'id'>): Promise<CompanyTask> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      
      const [newTask] = await db.insert(companyTasks)
        .values(data)
        .returning();
      return newTask;
    } catch (error) {
      console.error('Error creating company task:', error);
      throw error;
    }
  }
  
  async updateCompanyTask(id: number, data: Partial<CompanyTask>): Promise<CompanyTask> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [updatedTask] = await db.update(companyTasks)
        .set(data)
        .where(eq(companyTasks.id, id))
        .returning();
      return updatedTask;
    } catch (error) {
      console.error(`Error updating task with ID ${id}:`, error);
      throw error;
    }
  }
  
  async deleteCompanyTask(id: number): Promise<void> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(companyTasks)
        .where(eq(companyTasks.id, id));
    } catch (error) {
      console.error(`Error deleting task with ID ${id}:`, error);
      throw error;
    }
  }
  
  // AI Helper Methods for system-wide data access
  async getContacts(): Promise<Contact[]> {
    try {
      const { db } = await import('./db');
      const { contacts } = await import('@shared/schema');
      
      // Simplified query to avoid errors with specific columns
      const result = await db.select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        company: contacts.company,
        industry: contacts.industry,
        createdAt: contacts.createdAt
      })
      .from(contacts)
      .limit(50);
      
      return result;
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }
  
  async getCreators(): Promise<Creator[]> {
    try {
      const { db } = await import('./db');
      const { creators } = await import('@shared/schema');
      
      const result = await db.select()
        .from(creators)
        .limit(20); // Limit to prevent large data loads
      
      return result;
    } catch (error) {
      console.error('Error getting creators:', error);
      return [];
    }
  }
  
  async getCampaigns(): Promise<Campaign[]> {
    try {
      const { db } = await import('./db');
      const { campaigns } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      const result = await db.select()
        .from(campaigns)
        .orderBy(desc(campaigns.createdAt))
        .limit(20); // Limit to prevent large data loads
      
      return result;
    } catch (error) {
      console.error('Error getting campaigns:', error);
      return [];
    }
  }
  
  async getAllEmails(): Promise<Email[]> {
    try {
      const { db } = await import('./db');
      const { emails } = await import('@shared/schema');
      
      // Remove the desc function that's causing SQL errors
      const result = await db.select()
        .from(emails)
        .limit(30); // Limit to prevent large data loads
      
      return result;
    } catch (error) {
      console.error('Error getting emails:', error);
      return [];
    }
  }
  
  // Meeting Logs operations
  async getMeetingLogs(): Promise<MeetingLog[]>;
  async getMeetingLogs(companyId: number): Promise<MeetingLog[]> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const logs = await db.select().from(meetingLogs)
        .where(eq(meetingLogs.companyId, companyId));
      return logs;
    } catch (error) {
      console.error(`Error fetching meeting logs for company ID ${companyId}:`, error);
      return [];
    }
  }
  
  async getMeetingLog(id: number): Promise<MeetingLog | undefined> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [log] = await db.select().from(meetingLogs)
        .where(eq(meetingLogs.id, id));
      return log;
    } catch (error) {
      console.error(`Error fetching meeting log with ID ${id}:`, error);
      return undefined;
    }
  }
  
  async createMeetingLog(data: Omit<MeetingLog, 'id'>): Promise<MeetingLog> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      
      const [newLog] = await db.insert(meetingLogs)
        .values(data)
        .returning();
      return newLog;
    } catch (error) {
      console.error('Error creating meeting log:', error);
      throw error;
    }
  }
  
  async updateMeetingLog(id: number, data: Partial<MeetingLog>): Promise<MeetingLog> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [updatedLog] = await db.update(meetingLogs)
        .set(data)
        .where(eq(meetingLogs.id, id))
        .returning();
      return updatedLog;
    } catch (error) {
      console.error(`Error updating meeting log with ID ${id}:`, error);
      throw error;
    }
  }
  
  async deleteMeetingLog(id: number): Promise<void> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(meetingLogs)
        .where(eq(meetingLogs.id, id));
    } catch (error) {
      console.error(`Error deleting meeting log with ID ${id}:`, error);
      throw error;
    }
  }
  
  // Helper method to check if a db entity exists
  async entityExists(tableName: string, id: number, idField: string = 'id'): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      // Use raw SQL to check existence by tableName and id
      const query = sql`SELECT EXISTS(SELECT 1 FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(idField)} = ${id})`;
      const result = await db.execute(query);
      
      return result[0] && result[0].exists === true;
    } catch (error) {
      console.error(`Error checking if entity exists in table ${tableName} with ${idField}=${id}:`, error);
      return false;
    }
  }
  
  async getPipelineCardsByCreator(creatorId: number): Promise<PipelineCard[]> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const cards = await db.select().from(pipelineCards)
        .where(eq(pipelineCards.creatorId, creatorId));
      return cards;
    } catch (error) {
      console.error(`Error fetching pipeline cards for creator ${creatorId}:`, error);
      return [];
    }
  }
  
  async getPipelineCard(id: number): Promise<PipelineCard | undefined> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [card] = await db.select().from(pipelineCards)
        .where(eq(pipelineCards.id, id));
      return card;
    } catch (error) {
      console.error(`Error fetching pipeline card ${id}:`, error);
      return undefined;
    }
  }
  
  async createPipelineCard(card: InsertPipelineCard): Promise<PipelineCard> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      
      const [newCard] = await db.insert(pipelineCards)
        .values(card)
        .returning();
      return newCard;
    } catch (error) {
      console.error('Error creating pipeline card:', error);
      throw new Error(`Failed to create pipeline card: ${error.message}`);
    }
  }
  
  async updatePipelineCard(id: number, cardData: Partial<PipelineCard>): Promise<PipelineCard> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Update the timestamp
      cardData.lastUpdated = new Date();
      
      const [updatedCard] = await db.update(pipelineCards)
        .set(cardData)
        .where(eq(pipelineCards.id, id))
        .returning();
      return updatedCard;
    } catch (error) {
      console.error(`Error updating pipeline card ${id}:`, error);
      throw new Error(`Failed to update pipeline card: ${error.message}`);
    }
  }
  
  async deletePipelineCard(id: number): Promise<void> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(pipelineCards)
        .where(eq(pipelineCards.id, id));
    } catch (error) {
      console.error(`Error deleting pipeline card ${id}:`, error);
      throw new Error(`Failed to delete pipeline card: ${error.message}`);
    }
  }
  
  async moveCardToStage(id: number, stage: string, userId: number): Promise<PipelineCard> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // First get the existing card
      const [card] = await db.select().from(pipelineCards)
        .where(eq(pipelineCards.id, id));
      
      if (!card) {
        throw new Error(`Pipeline card with ID ${id} not found`);
      }
      
      // Create a history entry
      const historyEntry = {
        stage,
        previousStage: card.currentStage,
        timestamp: new Date().toISOString(),
        userId
      };
      
      // Update the card with the new stage and add the history entry
      const history = Array.isArray(card.history) ? [...card.history, historyEntry] : [historyEntry];
      
      const [updatedCard] = await db.update(pipelineCards)
        .set({
          currentStage: stage,
          lastUpdated: new Date(),
          history
        })
        .where(eq(pipelineCards.id, id))
        .returning();
      
      // TODO: Send Discord notification here
      
      return updatedCard;
    } catch (error) {
      console.error(`Error moving pipeline card ${id} to stage ${stage}:`, error);
      throw new Error(`Failed to move pipeline card: ${error.message}`);
    }
  }
  
  // Company Information operations
  async getCompanyInformation(companyId: number): Promise<CompanyInformation | undefined> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [info] = await db.select().from(companyInformation)
        .where(eq(companyInformation.companyId, companyId));
      return info;
    } catch (error) {
      console.error(`Error fetching company information for company ${companyId}:`, error);
      return undefined;
    }
  }
  
  async createCompanyInformation(info: InsertCompanyInformation): Promise<CompanyInformation> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      
      const [newInfo] = await db.insert(companyInformation)
        .values(info)
        .returning();
      return newInfo;
    } catch (error) {
      console.error('Error creating company information:', error);
      throw new Error(`Failed to create company information: ${error.message}`);
    }
  }
  
  async updateCompanyInformation(companyId: number, infoData: Partial<CompanyInformation>): Promise<CompanyInformation> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Update the timestamp
      infoData.updatedAt = new Date();
      
      const [updatedInfo] = await db.update(companyInformation)
        .set(infoData)
        .where(eq(companyInformation.companyId, companyId))
        .returning();
      return updatedInfo;
    } catch (error) {
      console.error(`Error updating company information for company ${companyId}:`, error);
      throw new Error(`Failed to update company information: ${error.message}`);
    }
  }
  
  async addCompanyCampaign(companyId: number, campaignId: number): Promise<CompanyInformation> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // First get the existing info
      const [info] = await db.select().from(companyInformation)
        .where(eq(companyInformation.companyId, companyId));
      
      if (!info) {
        throw new Error(`Company information for company ${companyId} not found`);
      }
      
      // Update the campaigns array
      const campaigns = Array.isArray(info.campaigns) ? 
        (info.campaigns as any[]).includes(campaignId) ? 
          info.campaigns : 
          [...info.campaigns, campaignId] : 
        [campaignId];
      
      const [updatedInfo] = await db.update(companyInformation)
        .set({
          campaigns,
          updatedAt: new Date()
        })
        .where(eq(companyInformation.companyId, companyId))
        .returning();
      
      return updatedInfo;
    } catch (error) {
      console.error(`Error adding campaign ${campaignId} to company ${companyId}:`, error);
      throw new Error(`Failed to add campaign to company: ${error.message}`);
    }
  }
  
  async addCompanyProposal(companyId: number, proposalId: number): Promise<CompanyInformation> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // First get the existing info
      const [info] = await db.select().from(companyInformation)
        .where(eq(companyInformation.companyId, companyId));
      
      if (!info) {
        throw new Error(`Company information for company ${companyId} not found`);
      }
      
      // Update the proposals array
      const proposals = Array.isArray(info.proposals) ? 
        (info.proposals as any[]).includes(proposalId) ? 
          info.proposals : 
          [...info.proposals, proposalId] : 
        [proposalId];
      
      const [updatedInfo] = await db.update(companyInformation)
        .set({
          proposals,
          updatedAt: new Date()
        })
        .where(eq(companyInformation.companyId, companyId))
        .returning();
      
      return updatedInfo;
    } catch (error) {
      console.error(`Error adding proposal ${proposalId} to company ${companyId}:`, error);
      throw new Error(`Failed to add proposal to company: ${error.message}`);
    }
  }
  
  async addInventorySent(companyId: number, inventoryItem: any): Promise<CompanyInformation> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // First get the existing info
      const [info] = await db.select().from(companyInformation)
        .where(eq(companyInformation.companyId, companyId));
      
      if (!info) {
        throw new Error(`Company information for company ${companyId} not found`);
      }
      
      // Update the inventorySent array with a timestamp
      const item = {
        ...inventoryItem,
        sentAt: new Date().toISOString()
      };
      
      const inventorySent = Array.isArray(info.inventorySent) ? 
        [...info.inventorySent, item] : 
        [item];
      
      const [updatedInfo] = await db.update(companyInformation)
        .set({
          inventorySent,
          updatedAt: new Date()
        })
        .where(eq(companyInformation.companyId, companyId))
        .returning();
      
      return updatedInfo;
    } catch (error) {
      console.error(`Error adding inventory to company ${companyId}:`, error);
      throw new Error(`Failed to add inventory to company: ${error.message}`);
    }
  }
  
  // Meeting Log operations
  async getMeetingLogs(companyId: number): Promise<MeetingLog[]> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      const logs = await db.select().from(meetingLogs)
        .where(eq(meetingLogs.companyId, companyId))
        .orderBy(desc(meetingLogs.meetingDate));
      return logs;
    } catch (error) {
      console.error(`Error fetching meeting logs for company ${companyId}:`, error);
      return [];
    }
  }
  
  async getMeetingLog(id: number): Promise<MeetingLog | undefined> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [log] = await db.select().from(meetingLogs)
        .where(eq(meetingLogs.id, id));
      return log;
    } catch (error) {
      console.error(`Error fetching meeting log ${id}:`, error);
      return undefined;
    }
  }
  
  async createMeetingLog(log: InsertMeetingLog): Promise<MeetingLog> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      
      const [newLog] = await db.insert(meetingLogs)
        .values(log)
        .returning();
      return newLog;
    } catch (error) {
      console.error('Error creating meeting log:', error);
      throw new Error(`Failed to create meeting log: ${error.message}`);
    }
  }
  
  async updateMeetingLog(id: number, logData: Partial<MeetingLog>): Promise<MeetingLog> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Update the timestamp
      logData.updatedAt = new Date();
      
      const [updatedLog] = await db.update(meetingLogs)
        .set(logData)
        .where(eq(meetingLogs.id, id))
        .returning();
      return updatedLog;
    } catch (error) {
      console.error(`Error updating meeting log ${id}:`, error);
      throw new Error(`Failed to update meeting log: ${error.message}`);
    }
  }
  
  async deleteMeetingLog(id: number): Promise<void> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(meetingLogs)
        .where(eq(meetingLogs.id, id));
    } catch (error) {
      console.error(`Error deleting meeting log ${id}:`, error);
      throw new Error(`Failed to delete meeting log: ${error.message}`);
    }
  }
  
  // Pipeline Card operations
  async getAllPipelineCards(): Promise<PipelineCard[]> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      const cards = await db.select().from(pipelineCards)
        .orderBy(desc(pipelineCards.updatedAt));
      return cards;
    } catch (error) {
      console.error('Error fetching all pipeline cards:', error);
      return [];
    }
  }
  
  async getPipelineCard(id: number): Promise<PipelineCard | undefined> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [card] = await db.select().from(pipelineCards)
        .where(eq(pipelineCards.id, id));
      return card;
    } catch (error) {
      console.error(`Error fetching pipeline card ${id}:`, error);
      return undefined;
    }
  }
  
  async createPipelineCard(cardData: Omit<InsertPipelineCard, 'id'>): Promise<PipelineCard> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      
      // Set default timestamps
      const now = new Date();
      
      const [newCard] = await db.insert(pipelineCards)
        .values({
          ...cardData,
          updatedAt: now,
          createdAt: now
        })
        .returning();
      return newCard;
    } catch (error) {
      console.error('Error creating pipeline card:', error);
      throw new Error(`Failed to create pipeline card: ${error.message}`);
    }
  }
  
  async updatePipelineCard(id: number, cardData: Partial<PipelineCard>): Promise<PipelineCard | undefined> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Update timestamp
      cardData.updatedAt = new Date();
      
      const [updatedCard] = await db.update(pipelineCards)
        .set(cardData)
        .where(eq(pipelineCards.id, id))
        .returning();
      return updatedCard;
    } catch (error) {
      console.error(`Error updating pipeline card ${id}:`, error);
      return undefined;
    }
  }
  
  async deletePipelineCard(id: number): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(pipelineCards)
        .where(eq(pipelineCards.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting pipeline card ${id}:`, error);
      return false;
    }
  }
  
  // Company Information operations
  async getAllCompanyInfo(): Promise<CompanyInformation[]> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      const info = await db.select().from(companyInformation)
        .orderBy(desc(companyInformation.updatedAt));
      return info;
    } catch (error) {
      console.error('Error fetching all company information:', error);
      return [];
    }
  }
  
  async findCompanyByName(companyName: string): Promise<CompanyInformation | undefined> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq, or, ilike } = await import('drizzle-orm');
      
      // Look up company information by name using case-insensitive search
      const [info] = await db.select()
        .from(companyInformation)
        .where(ilike(companyInformation.notes as any, `%${companyName}%`));
      
      return info;
    } catch (error) {
      console.error('Error finding company by name:', error);
      return [];
    }
  }
  
  async getCompanyInfo(id: number): Promise<CompanyInformation | undefined> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [info] = await db.select().from(companyInformation)
        .where(eq(companyInformation.id, id));
      return info;
    } catch (error) {
      console.error(`Error fetching company information ${id}:`, error);
      return undefined;
    }
  }
  
  async getCompanyInfoByCompanyId(companyId: number): Promise<CompanyInformation | undefined> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [info] = await db.select().from(companyInformation)
        .where(eq(companyInformation.companyId, companyId));
      return info;
    } catch (error) {
      console.error(`Error fetching company information for company ${companyId}:`, error);
      return undefined;
    }
  }
  
  async createCompanyInfo(infoData: InsertCompanyInformation): Promise<CompanyInformation> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      
      const [newInfo] = await db.insert(companyInformation)
        .values(infoData)
        .returning();
      return newInfo;
    } catch (error) {
      console.error('Error creating company information:', error);
      throw new Error(`Failed to create company information: ${error.message}`);
    }
  }
  
  async updateCompanyInfo(id: number, infoData: Partial<CompanyInformation>): Promise<CompanyInformation | undefined> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Update timestamp
      infoData.updatedAt = new Date();
      
      const [updatedInfo] = await db.update(companyInformation)
        .set(infoData)
        .where(eq(companyInformation.id, id))
        .returning();
      return updatedInfo;
    } catch (error) {
      console.error(`Error updating company information ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteCompanyInfo(id: number): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(companyInformation)
        .where(eq(companyInformation.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting company information ${id}:`, error);
      return false;
    }
  }
  
  // Meeting Log operations
  async getMeetingLogsByCompany(companyId: number): Promise<MeetingLog[]> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      const logs = await db.select().from(meetingLogs)
        .where(eq(meetingLogs.companyId, companyId))
        .orderBy(desc(meetingLogs.meetingDate));
      return logs;
    } catch (error) {
      console.error(`Error fetching meeting logs for company ${companyId}:`, error);
      return [];
    }
  }
  
  async getAllMeetingLogs(): Promise<MeetingLog[]> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      const logs = await db.select()
        .from(meetingLogs)
        .orderBy(desc(meetingLogs.meetingDate));
      
      return logs;
    } catch (error) {
      console.error('Error fetching all meeting logs:', error);
      return [];
    }
  }
  
  async addMeetingLog(logData: InsertMeetingLog): Promise<MeetingLog> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      
      const [newLog] = await db.insert(meetingLogs)
        .values(logData)
        .returning();
      return newLog;
    } catch (error) {
      console.error('Error adding meeting log:', error);
      throw new Error(`Failed to add meeting log: ${error.message}`);
    }
  }
  
  // Company Task operations
  async getCompanyTasks(companyId: number): Promise<CompanyTask[]> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');
      
      const tasks = await db.select().from(companyTasks)
        .where(eq(companyTasks.companyId, companyId))
        .orderBy(desc(companyTasks.createdAt));
      return tasks;
    } catch (error) {
      console.error(`Error fetching company tasks for company ${companyId}:`, error);
      return [];
    }
  }
  
  async getCompanyTask(id: number): Promise<CompanyTask | undefined> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [task] = await db.select().from(companyTasks)
        .where(eq(companyTasks.id, id));
      return task;
    } catch (error) {
      console.error(`Error fetching company task ${id}:`, error);
      return undefined;
    }
  }
  
  async createCompanyTask(task: InsertCompanyTask): Promise<CompanyTask> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      
      const [newTask] = await db.insert(companyTasks)
        .values(task)
        .returning();
      return newTask;
    } catch (error) {
      console.error('Error creating company task:', error);
      throw new Error(`Failed to create company task: ${error.message}`);
    }
  }
  
  async updateCompanyTask(id: number, taskData: Partial<CompanyTask>): Promise<CompanyTask> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Update the timestamp
      taskData.updatedAt = new Date();
      
      const [updatedTask] = await db.update(companyTasks)
        .set(taskData)
        .where(eq(companyTasks.id, id))
        .returning();
      return updatedTask;
    } catch (error) {
      console.error(`Error updating company task ${id}:`, error);
      throw new Error(`Failed to update company task: ${error.message}`);
    }
  }
  
  async completeCompanyTask(id: number): Promise<CompanyTask> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [completedTask] = await db.update(companyTasks)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(companyTasks.id, id))
        .returning();
      return completedTask;
    } catch (error) {
      console.error(`Error completing company task ${id}:`, error);
      throw new Error(`Failed to complete company task: ${error.message}`);
    }
  }
  
  async deleteCompanyTask(id: number): Promise<void> {
    try {
      const { db } = await import('./db');
      const { companyTasks } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.delete(companyTasks)
        .where(eq(companyTasks.id, id));
    } catch (error) {
      console.error(`Error deleting company task ${id}:`, error);
      throw new Error(`Failed to delete company task: ${error.message}`);
    }
  }

  // AI CRM Agent specific methods
  async getAllMeetingLogs(): Promise<MeetingLog[]> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      return await db.select().from(meetingLogs).orderBy(desc(meetingLogs.createdAt));
    } catch (error) {
      console.error('Error getting all meeting logs:', error);
      return [];
    }
  }

  async getMeetingLogsByCompany(companyId: number): Promise<MeetingLog[]> {
    try {
      const { db } = await import('./db');
      const { meetingLogs } = await import('@shared/schema');
      const { desc, eq } = await import('drizzle-orm');
      
      return await db.select()
        .from(meetingLogs)
        .where(eq(meetingLogs.companyId, companyId))
        .orderBy(desc(meetingLogs.createdAt));
    } catch (error) {
      console.error(`Error getting meeting logs for company ${companyId}:`, error);
      return [];
    }
  }

  async findCompanyByName(companyName: string): Promise<CompanyInformation | undefined> {
    try {
      const { db } = await import('./db');
      const { companyInformation } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      const companies = await db.select()
        .from(companyInformation)
        .where(sql`LOWER(${companyInformation.name}) = LOWER(${companyName})`);
      
      return companies.length > 0 ? companies[0] : undefined;
    } catch (error) {
      console.error(`Error finding company by name ${companyName}:`, error);
      return undefined;
    }
  }

  async getPipelineCards(): Promise<PipelineCard[]> {
    try {
      const { db } = await import('./db');
      const { pipelineCards } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      return await db.select().from(pipelineCards).orderBy(desc(pipelineCards.updatedAt));
    } catch (error) {
      console.error('Error getting pipeline cards:', error);
      return [];
    }
  }

  async getProposals(): Promise<Proposal[]> {
    try {
      const { db } = await import('./db');
      const { proposals } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');
      
      return await db.select().from(proposals).orderBy(desc(proposals.createdAt));
    } catch (error) {
      console.error('Error getting proposals:', error);
      return [];
    }
  }
}

// Use DatabaseStorage to ensure we load creators from the database
export const storage = new DatabaseStorage();