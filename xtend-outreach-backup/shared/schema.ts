import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, date, decimal, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define a relation helper function to type relations properly
import { relations } from 'drizzle-orm';

// User roles enum
export const UserRole = {
  ADMIN: 'admin',
  CREATOR: 'creator',
  USER: 'user',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// User schema with role and authentication fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default('user'),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  profileImageUrl: text("profile_image_url"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  fullName: true,
  role: true,
  isActive: true,
  lastLogin: true,
  profileImageUrl: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
});

// User sessions for managing logged-in state
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// User activity logs
export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Creator schema
export const creators = pgTable("creators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio"),
  brandVoice: text("brand_voice"),
  profileColor: text("profile_color").default('#4F46E5'),
  initials: text("initials"),
  googleDriveFolder: text("google_drive_folder"),
  pillarUrl: text("pillar_url"),
  demographicsUrl: text("demographics_url"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  userId: integer("user_id").references(() => users.id),
  // Extended fields for creator detail page
  profileImageUrl: text("profile_image_url"),
  audienceData: jsonb("audience_data"),
  platformStats: jsonb("platform_stats"),
  expertiseAndNiche: jsonb("expertise_and_niche"),
  collaborationInfo: jsonb("collaboration_info"),
  socialLinks: jsonb("social_links"),
  metaData: jsonb("meta_data"),
});

export const insertCreatorSchema = createInsertSchema(creators).pick({
  name: true,
  role: true,
  bio: true,
  brandVoice: true,
  profileColor: true,
  initials: true,
  googleDriveFolder: true,
  pillarUrl: true,
  demographicsUrl: true,
  userId: true,
  profileImageUrl: true,
  audienceData: true,
  platformStats: true,
  expertiseAndNiche: true,
  collaborationInfo: true,
  socialLinks: true,
  metaData: true,
});

// Creator Pricing Models
export const creatorPricing = pgTable("creator_pricing", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => creators.id),
  contentType: text("content_type").notNull(), // "youtube", "tiktok", "instagram", etc.
  format: text("format").notNull(), // "long_form", "short_form", "reel", "post", etc.
  basePrice: integer("base_price").notNull(), // Base price in dollars
  usageRights: text("usage_rights"), // Rights included in base price
  revisionLimit: integer("revision_limit"), // Number of included revisions
  deliveryTimeframe: integer("delivery_timeframe"), // Delivery time in days
  exclusivity: boolean("exclusivity").default(false), // Whether exclusivity is included
  featured: boolean("featured").default(false), // Whether this is a featured pricing option
  description: text("description"), // Additional details
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPricingSchema = createInsertSchema(creatorPricing).pick({
  creatorId: true,
  contentType: true,
  format: true,
  basePrice: true,
  usageRights: true,
  revisionLimit: true,
  deliveryTimeframe: true,
  exclusivity: true,
  featured: true,
  description: true,
});

export type CreatorPricing = typeof creatorPricing.$inferSelect;
export type InsertCreatorPricing = z.infer<typeof insertPricingSchema>;

// Creator pricing relation is handled in the main creatorsRelations below

export const creatorPricingRelations = relations(creatorPricing, ({ one }) => ({
  creator: one(creators, {
    fields: [creatorPricing.creatorId],
    references: [creators.id]
  }),
}));

// Contact schema
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  type: text("type"), // Brand or Agency type
  industry: text("industry").notNull(), // Industry now required and placed before firstName
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  company: text("company").notNull(),
  email: text("email").notNull(),
  role: text("role"),
  phone: text("phone"),
  linkedin: text("linkedin"),
  niche: text("niche"),
  country: text("country"),
  businessLinkedin: text("business_linkedin"),
  website: text("website"),
  businessEmail: text("business_email"),
  status: text("status").default("active"),
  tags: text("tags").array(),
  notes: text("notes"),
  lastContacted: timestamp("last_contacted"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
  userId: integer("user_id").references(() => users.id),
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  type: true, // Contact type (Brand/Agency)
  industry: true, // Industry categorization
  firstName: true,
  lastName: true,
  company: true,
  email: true,
  role: true,
  phone: true,
  linkedin: true,
  niche: true,
  country: true,
  businessLinkedin: true,
  website: true,
  businessEmail: true,
  status: true,
  tags: true,
  notes: true,
  lastContacted: true,
  userId: true,
});

// ContactList schema
export const contactLists = pgTable("contact_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactListSchema = createInsertSchema(contactLists).pick({
  name: true,
  description: true,
  userId: true,
});

// ContactListEntry schema
export const contactListEntries = pgTable("contact_list_entries", {
  id: serial("id").primaryKey(),
  contactListId: integer("contact_list_id").references(() => contactLists.id),
  contactId: integer("contact_id").references(() => contacts.id),
});

export const insertContactListEntrySchema = createInsertSchema(contactListEntries).pick({
  contactListId: true,
  contactId: true,
});

// Campaign schema
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  customObjective: text("custom_objective"),
  tone: text("tone").notNull(),
  sequenceCount: integer("sequence_count").notNull(),
  interval: integer("interval").notNull(),
  status: text("status").notNull().default("draft"), // draft, scheduled, active, paused, completed
  creatorId: integer("creator_id").references(() => creators.id),
  contactListId: integer("contact_list_id").references(() => contactLists.id),
  userId: integer("user_id").references(() => users.id),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id), // Email account for this campaign
  createdAt: timestamp("created_at").defaultNow(),
  startDate: timestamp("start_date"),
  progress: integer("progress").default(0),
  openRate: integer("open_rate"),
  responseRate: integer("response_rate"),
  // Email sequence structure
  emailSequence: jsonb("email_sequence"), // Array of email templates with title, description, delay
  // Email delivery configuration
  emailProvider: text("email_provider").default("direct"), // Default is direct SMTP
  // A/B Testing fields
  isAbTest: boolean("is_ab_test").default(false), // Whether this campaign is an A/B test
  abTestType: text("ab_test_type"), // subject, body, sender, time, etc.
  abTestVariantCount: integer("ab_test_variant_count"), // Number of test variants
  abTestWinnerMetric: text("ab_test_winner_metric"), // open, click, reply, conversion
  abTestWinnerVariantId: integer("ab_test_winner_variant_id"), // ID of the winning variant (if decided)
  abTestStatus: text("ab_test_status"), // running, completed, analyzed
  abTestWinnerDecidedAt: timestamp("ab_test_winner_decided_at"), // When the winner was decided
  abTestVariants: jsonb("ab_test_variants"), // Array of test variant details
  abTestDistribution: jsonb("ab_test_distribution"), // How to distribute variants (e.g., equal, weighted)
  abTestSampleSize: integer("ab_test_sample_size"), // Size of each test group
  abTestNotes: text("ab_test_notes"), // Notes on test configuration
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  objective: true,
  customObjective: true,
  tone: true,
  sequenceCount: true,
  interval: true,
  status: true,
  creatorId: true,
  contactListId: true,
  userId: true,
  emailAccountId: true, // Add the email account ID field
  startDate: true,
  emailSequence: true,
  emailProvider: true,
  // A/B Testing fields
  isAbTest: true,
  abTestType: true,
  abTestVariantCount: true,
  abTestWinnerMetric: true,
  abTestStatus: true,
  abTestVariants: true,
  abTestDistribution: true,
  abTestSampleSize: true,
  abTestNotes: true,
});

// ShareableLandingPage schema 
export const shareableLandingPages = pgTable("shareable_landing_pages", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(), // Public-facing unique ID for the URL
  title: text("title").notNull(),
  description: text("description"),
  projectId: text("project_id"), // Asana project ID (null for list sharing)
  creatorId: integer("creator_id").references(() => creators.id),
  creatorName: text("creator_name"),
  status: text("status").notNull().default("active"), // active, expired, deleted
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id").references(() => users.id),
  viewCount: integer("view_count").default(0),
  metadata: jsonb("metadata"), // Additional project metadata (platform, publish date, etc.)
  isPasswordProtected: boolean("is_password_protected").default(false),
  password: text("password"), // If password protection is enabled
  contactInfo: jsonb("contact_info"), // Contact details for CTA buttons
  content: jsonb("content"), // The actual content to display (creator list or individual project)
  type: text("type").default("creator-project"), // 'creator-project' or 'creator-list'
  
  // Analytics enhancements
  uniqueVisitors: integer("unique_visitors").default(0),
  emailClicks: integer("email_clicks").default(0),
  whatsappClicks: integer("whatsapp_clicks").default(0),
  platformClicks: integer("platform_clicks").default(0),
  mediaKitClicks: integer("media_kit_clicks").default(0),
  visitorIps: jsonb("visitor_ips").default([]), // Store array of IPs
  lastVisitedAt: timestamp("last_visited_at"),
  visitorGeoData: jsonb("visitor_geo_data").default({}), // Store geolocation data
  averageTimeOnPage: integer("average_time_on_page").default(0), // in seconds
  
  // Custom branding
  brandLogo: text("brand_logo"), // URL to logo image
  brandPrimaryColor: text("brand_primary_color").default("#3B82F6"), // Default blue
  brandSecondaryColor: text("brand_secondary_color").default("#1E3A8A"),
  brandFooterText: text("brand_footer_text"),
  
  // Access controls  
  allowedEmails: jsonb("allowed_emails").default([]), // List of allowed email addresses
  requireEmailVerification: boolean("require_email_verification").default(false),
  accessLogs: jsonb("access_logs").default([]), // Log of access events
  
  // Contact form
  enableContactForm: boolean("enable_contact_form").default(false),
  contactFormFields: jsonb("contact_form_fields").default(["name", "email", "message"]),
  contactFormSubmissions: jsonb("contact_form_submissions").default([]),
  notifyOnFormSubmission: boolean("notify_on_form_submission").default(true),
  notificationEmail: text("notification_email"),
});

export const insertShareableLandingPageSchema = createInsertSchema(shareableLandingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
});

// Email Accounts schema
export const emailAccounts = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active, paused, suspended
  provider: text("provider").notNull(), // google, microsoft, smtp, etc.
  dailyLimit: integer("daily_limit").default(100),
  warmupEnabled: boolean("warmup_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id").references(() => users.id),
  // SMTP configuration
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUsername: text("smtp_username"),
  smtpPassword: text("smtp_password"),
  smtpSecure: boolean("smtp_secure").default(true),
  // IMAP configuration 
  imapHost: text("imap_host"),
  imapPort: integer("imap_port"),
  imapUsername: text("imap_username"),
  imapPassword: text("imap_password"),
  imapSecure: boolean("imap_secure").default(true),
  // Usage timestamps for smart rotation
  lastUsedAt: timestamp("last_used_at"),
  lastRotationUsedAt: timestamp("last_rotation_used_at"),
  // Email deliverability settings
  hourlyLimit: integer("hourly_limit").default(25),
  warmupInProgress: boolean("warmup_in_progress").default(false),
  warmupStartDate: timestamp("warmup_start_date"),
  warmupDailyIncrement: integer("warmup_daily_increment").default(5),
  warmupMaxVolume: integer("warmup_max_volume").default(100),
  domainAuthenticated: boolean("domain_authenticated").default(false),
  dkimConfigured: boolean("dkim_configured").default(false),
  spfConfigured: boolean("spf_configured").default(false),
  dmarcConfigured: boolean("dmarc_configured").default(false),
  // Email metrics
  bounceRate: integer("bounce_rate"),
  complaintRate: integer("complaint_rate"),
  openRate: integer("open_rate"),
  clickRate: integer("click_rate"),
  replyRate: integer("reply_rate"),
  healthScore: integer("health_score"), // AI-generated score from 0-100
  healthStatus: text("health_status"), // excellent, good, fair, poor, critical
  lastHealthCheck: timestamp("last_health_check"),
  // Special settings
  testModeOnly: boolean("test_mode_only").default(false),
  notes: text("notes"),
});

export const insertEmailAccountSchema = createInsertSchema(emailAccounts).pick({
  email: true,
  name: true,
  status: true,
  provider: true,
  dailyLimit: true,
  warmupEnabled: true,
  userId: true,
  // SMTP configuration
  smtpHost: true,
  smtpPort: true,
  smtpUsername: true,
  smtpPassword: true,
  smtpSecure: true,
  // IMAP configuration
  imapHost: true,
  imapPort: true,
  imapUsername: true,
  imapPassword: true,
  imapSecure: true,
  // Usage timestamps for rotation
  lastUsedAt: true,
  lastRotationUsedAt: true,
  // Email deliverability settings
  hourlyLimit: true,
  warmupInProgress: true,
  warmupStartDate: true,
  warmupDailyIncrement: true,
  warmupMaxVolume: true,
  domainAuthenticated: true,
  dkimConfigured: true,
  spfConfigured: true,
  dmarcConfigured: true,
  // Email metrics
  bounceRate: true,
  complaintRate: true,
  openRate: true,
  clickRate: true,
  replyRate: true,
  healthScore: true,
  healthStatus: true,
  lastHealthCheck: true,
  // Special settings
  testModeOnly: true,
  notes: true,
});

// Creator Email Account linking schema
export const creatorEmailAccounts = pgTable("creator_email_accounts", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").references(() => creators.id).notNull(),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id).notNull(),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCreatorEmailAccountSchema = createInsertSchema(creatorEmailAccounts).pick({
  creatorId: true,
  emailAccountId: true,
  isPrimary: true,
});

// Email schema
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  contactId: integer("contact_id").references(() => contacts.id),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id),
  sequence: integer("sequence").notNull(), // 1, 2, 3, etc.
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"), // draft, scheduled, sent, opened, clicked, replied, bounced, complained
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  repliedAt: timestamp("replied_at"),
  bouncedAt: timestamp("bounced_at"),
  complaintAt: timestamp("complaint_at"),
  messageId: text("message_id"), // For tracking via ESPs
  deliveryStatus: text("delivery_status"), // delivered, bounced, deferred, etc.
  bounceType: text("bounce_type"), // hard, soft, etc.
  bounceReason: text("bounce_reason"), // mailbox full, blocked, etc.
  ipAddress: text("ip_address"), // Sending server IP
  userAgent: text("user_agent"), // For tracking opens/clicks
  originalScheduleTime: timestamp("original_schedule_time"), // Before time randomization
  randomizedDelay: integer("randomized_delay"), // Random delay in minutes
  hasUnsubscribeLink: boolean("has_unsubscribe_link").default(true),
  hasCompliantFooter: boolean("has_compliant_footer").default(true),
  spamScore: integer("spam_score"), // 0-100 spam score if checked
  spamCheckDetails: jsonb("spam_check_details"), // Details of spam check
  // A/B Testing fields
  abTestVariantId: integer("ab_test_variant_id"), // ID of the A/B test variant
  metadata: jsonb("metadata"), // Additional metadata for tracking and A/B tests
});

export const insertEmailSchema = createInsertSchema(emails).pick({
  campaignId: true,
  contactId: true,
  emailAccountId: true,
  sequence: true,
  subject: true,
  body: true,
  status: true,
  scheduledAt: true,
  sentAt: true,
  openedAt: true,
  clickedAt: true,
  repliedAt: true,
  bouncedAt: true,
  complaintAt: true,
  messageId: true,
  deliveryStatus: true,
  bounceType: true,
  bounceReason: true,
  ipAddress: true,
  userAgent: true,
  originalScheduleTime: true,
  randomizedDelay: true,
  hasUnsubscribeLink: true,
  hasCompliantFooter: true,
  spamScore: true,
  spamCheckDetails: true,
  // A/B Testing fields
  abTestVariantId: true,
  metadata: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Creator = typeof creators.$inferSelect;
export type InsertCreator = z.infer<typeof insertCreatorSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type ContactList = typeof contactLists.$inferSelect;
export type InsertContactList = z.infer<typeof insertContactListSchema>;

export type ContactListEntry = typeof contactListEntries.$inferSelect;
export type InsertContactListEntry = z.infer<typeof insertContactListEntrySchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;

export type CreatorEmailAccount = typeof creatorEmailAccounts.$inferSelect;
export type InsertCreatorEmailAccount = z.infer<typeof insertCreatorEmailAccountSchema>;

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;

export type OutreachLog = typeof outreachLogs.$inferSelect;
export type InsertOutreachLog = z.infer<typeof insertOutreachLogSchema>;

export type ContactNote = typeof contactNotes.$inferSelect;
export type InsertContactNote = z.infer<typeof insertContactNoteSchema>;

export type ShareableLandingPage = typeof shareableLandingPages.$inferSelect;
export type InsertShareableLandingPage = z.infer<typeof insertShareableLandingPageSchema>;

// Table Relations
export const usersRelations = relations(users, ({ many }) => ({
  creators: many(creators),
  contacts: many(contacts),
  campaigns: many(campaigns),
  contactLists: many(contactLists),
  emailAccounts: many(emailAccounts),
  whiteboards: many(whiteboards),
  outreachLogs: many(outreachLogs),
  contactNotes: many(contactNotes),
  shareableLandingPages: many(shareableLandingPages),
}));

export const creatorsRelations = relations(creators, ({ one, many }) => ({
  user: one(users, { fields: [creators.userId], references: [users.id] }),
  campaigns: many(campaigns),
  creatorEmailAccounts: many(creatorEmailAccounts),
  whiteboardCollaborations: many(whiteboardCollaborators),
  whiteboardElements: many(whiteboardElements, { relationName: 'elementCreator' }),
  shareableLandingPages: many(shareableLandingPages),
  pricing: many(creatorPricing),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, { fields: [contacts.userId], references: [users.id] }),
  contactListEntries: many(contactListEntries),
  emails: many(emails),
  outreachLogs: many(outreachLogs),
  contactNotes: many(contactNotes),
}));

export const contactListsRelations = relations(contactLists, ({ one, many }) => ({
  user: one(users, { fields: [contactLists.userId], references: [users.id] }),
  entries: many(contactListEntries),
  campaigns: many(campaigns),
}));

export const contactListEntriesRelations = relations(contactListEntries, ({ one }) => ({
  contact: one(contacts, { fields: [contactListEntries.contactId], references: [contacts.id] }),
  contactList: one(contactLists, { fields: [contactListEntries.contactListId], references: [contactLists.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, { fields: [campaigns.userId], references: [users.id] }),
  creator: one(creators, { fields: [campaigns.creatorId], references: [creators.id] }),
  contactList: one(contactLists, { fields: [campaigns.contactListId], references: [contactLists.id] }),
  emails: many(emails),
  whiteboards: many(whiteboards),
}));

export const emailAccountsRelations = relations(emailAccounts, ({ one, many }) => ({
  user: one(users, { fields: [emailAccounts.userId], references: [users.id] }),
  creatorLinks: many(creatorEmailAccounts),
  emails: many(emails),
}));

export const creatorEmailAccountsRelations = relations(creatorEmailAccounts, ({ one }) => ({
  creator: one(creators, { fields: [creatorEmailAccounts.creatorId], references: [creators.id] }),
  emailAccount: one(emailAccounts, { fields: [creatorEmailAccounts.emailAccountId], references: [emailAccounts.id] }),
}));

export const emailsRelations = relations(emails, ({ one }) => ({
  campaign: one(campaigns, { fields: [emails.campaignId], references: [campaigns.id] }),
  contact: one(contacts, { fields: [emails.contactId], references: [contacts.id] }),
  emailAccount: one(emailAccounts, { fields: [emails.emailAccountId], references: [emailAccounts.id] }),
}));

// Proposals schema
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").default("draft").notNull(), // draft, research, created, sent, accepted, rejected, published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id"),
  // Additional fields for UI display
  contactName: text("contact_name"),
  contactCompany: text("contact_company"),
  contactEmail: text("contact_email"),
  contactIndustry: text("contact_industry"),
  // Research data
  researchData: jsonb("research_data").default({}), // AI research data about the contact/company
  // Creator and pricing fields
  creators: jsonb("creators").default([]), // Selected creators (actually a JSON array in our DB)
  creatorFits: jsonb("creator_fits").default({}), // Custom explanations for each creator
  creatorPricing: jsonb("creator_pricing").default([]), // Selected pricing options
  // Objectives for the proposal
  objectives: text("objectives").array(),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;

// Note: The shareable landing pages schema is already defined elsewhere in the codebase

// Additional schemas for API requests and CSV handling
export const contactCSVSchema = z.object({
  TYPE: z.string().optional(), // Brand or Agency type
  INDUSTRY: z.string().min(1, "Industry is required"), 
  FIRST_NAME: z.string().min(1, "First name is required"),
  LAST_NAME: z.string().optional(),
  COMPANY: z.string().min(1, "Company is required"),
  E_MAIL: z.string().email("Valid email is required"),
  ROLE: z.string().optional(),
  PHONE: z.string().optional(),
  LINKEDIN: z.string().optional(),
  NICHE: z.string().optional(),
  COUNTRY: z.string().optional(),
  BUSINESS_LINKEDIN: z.string().optional(),
  WEBSITE: z.string().optional(),
  BUSINESS_E_MAIL: z.string().optional(),
  // Additional fields that might be in STEM list Excel file
  TITLE: z.string().optional(),
  POSITION: z.string().optional(),
  ORGANIZATION: z.string().optional(),
  SPECIALTY: z.string().optional(),
  SECTOR: z.string().optional(),
  EMAIL: z.string().optional(),
  URL: z.string().optional(),
  BUSINESS_URL: z.string().optional(),
  EDUCATION: z.string().optional(),
  DEPARTMENT: z.string().optional(),
  TEAM: z.string().optional(),
  DIVISION: z.string().optional(),
  NOTES: z.string().optional(),
}).passthrough(); // Allow additional fields to pass through

export type ContactCSV = z.infer<typeof contactCSVSchema>;

export const campaignStatusUpdateSchema = z.object({
  status: z.enum(["draft", "scheduled", "active", "paused", "completed"])
});

export type CampaignStatusUpdate = z.infer<typeof campaignStatusUpdateSchema>;

// Email sequence item schema for the emailSequence field
export const emailSequenceItemSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  description: z.string(),
  delay: z.number().default(0), // Days after the previous email
});

export type EmailSequenceItem = z.infer<typeof emailSequenceItemSchema>;

export const emailSequenceSchema = z.array(emailSequenceItemSchema);
export type EmailSequence = z.infer<typeof emailSequenceSchema>;

// Email template component types
export const emailComponentTypeEnum = z.enum([
  "header",
  "text",
  "image",
  "button",
  "divider",
  "spacer",
  "social",
  "personalization",
  "signature"
]);

export type EmailComponentType = z.infer<typeof emailComponentTypeEnum>;

// Base component schema
export const baseEmailComponentSchema = z.object({
  id: z.string(),
  type: emailComponentTypeEnum,
  position: z.number(),
  settings: z.record(z.string(), z.any()),
});

// Email template schema
export const emailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  preheader: z.string().optional(),
  components: z.array(baseEmailComponentSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.number(),
  creatorId: z.number().optional(),
  isSystem: z.boolean().default(false),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type BaseEmailComponent = z.infer<typeof baseEmailComponentSchema>;
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;

// Enhanced email logs for detailed tracking
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").references(() => emails.id).notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  contactId: integer("contact_id").references(() => contacts.id),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id),
  trackingId: text("tracking_id").notNull().unique(), // Unique tracking ID for open and click tracking
  messageId: text("message_id"), // Original message ID from email headers
  subject: text("subject"),
  sentAt: timestamp("sent_at"),
  // Open tracking
  openCount: integer("open_count").default(0),
  firstOpenedAt: timestamp("first_opened_at"),
  lastOpenedAt: timestamp("last_opened_at"),
  openUserAgent: text("open_user_agent"),
  openIp: text("open_ip"),
  // Click tracking
  clickCount: integer("click_count").default(0),
  firstClickedAt: timestamp("first_clicked_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  clickUserAgent: text("click_user_agent"),
  clickIp: text("click_ip"),
  clickedLinks: text("clicked_links").array(),
  // Reply tracking
  replyCount: integer("reply_count").default(0),
  firstRepliedAt: timestamp("first_replied_at"),
  lastRepliedAt: timestamp("last_replied_at"),
  replySentiment: text("reply_sentiment"), // positive, neutral, negative
  // Privacy controls
  trackingOptOut: boolean("tracking_opt_out").default(false),
  // Device Detection
  deviceType: text("device_type"), // desktop, mobile, tablet
  operatingSystem: text("operating_system"),
  browserName: text("browser_name"),
  // Geolocation (approximate)
  country: text("country"),
  region: text("region"),
  city: text("city"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).pick({
  emailId: true,
  campaignId: true,
  contactId: true,
  emailAccountId: true,
  trackingId: true,
  messageId: true,
  subject: true,
  sentAt: true,
  openCount: true,
  clickCount: true,
  replyCount: true,
  trackingOptOut: true,
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

// Outreach logs schema
export const outreachLogs = pgTable("outreach_logs", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  channel: text("channel").notNull(), // email, status_change, tag_update
  sentAt: timestamp("sent_at").notNull(),
  outcome: text("outcome"), // replied, meeting_scheduled, etc.
});

export const insertOutreachLogSchema = createInsertSchema(outreachLogs).pick({
  contactId: true,
  userId: true,
  emailSubject: true,
  emailBody: true,
  channel: true,
  sentAt: true,
  outcome: true,
});

// Contact notes schema
export const contactNotes = pgTable("contact_notes", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  noteText: text("note_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactNoteSchema = createInsertSchema(contactNotes).pick({
  contactId: true,
  userId: true,
  noteText: true,
});

// Email Templates database schema
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  preheader: text("preheader"),
  content: jsonb("content").notNull(), // Stores an array of components
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id").references(() => users.id),
  creatorId: integer("creator_id").references(() => creators.id),
  isSystem: boolean("is_system").default(false),
  category: text("category"),
  tags: text("tags").array(),
  thumbnail: text("thumbnail"), // URL to a thumbnail preview of the template
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  name: true,
  subject: true,
  preheader: true,
  content: true,
  userId: true,
  creatorId: true,
  isSystem: true,
  category: true,
  tags: true,
  thumbnail: true,
});

export type DbEmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

// Whiteboard schemas
export const whiteboards = pgTable("whiteboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
  elements: jsonb("elements").default([]),
});

export const insertWhiteboardSchema = createInsertSchema(whiteboards).pick({
  name: true,
  campaignId: true,
  userId: true,
  elements: true,
});

export const whiteboardCollaborators = pgTable("whiteboard_collaborators", {
  id: serial("id").primaryKey(),
  whiteboardId: integer("whiteboard_id").references(() => whiteboards.id).notNull(),
  creatorId: integer("creator_id").references(() => creators.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
});

export const insertWhiteboardCollaboratorSchema = createInsertSchema(whiteboardCollaborators).pick({
  whiteboardId: true,
  creatorId: true,
});

export const whiteboardElements = pgTable("whiteboard_elements", {
  id: serial("id").primaryKey(),
  whiteboardId: integer("whiteboard_id").references(() => whiteboards.id).notNull(),
  elementId: text("element_id").notNull(), // Client-side generated unique ID
  type: text("type").notNull(), // note, emailOutline, audience, persona
  position: jsonb("position").notNull(), // { x: number, y: number }
  content: text("content"),
  title: text("title"),
  color: text("color"),
  createdBy: integer("created_by").references(() => creators.id),
  createdAt: timestamp("created_at").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
});

export const insertWhiteboardElementSchema = createInsertSchema(whiteboardElements).pick({
  whiteboardId: true,
  elementId: true,
  type: true,
  position: true,
  content: true,
  title: true,
  color: true,
  createdBy: true,
});

// Additional types for whiteboard schemas
export type Whiteboard = typeof whiteboards.$inferSelect;
export type InsertWhiteboard = z.infer<typeof insertWhiteboardSchema>;

export type WhiteboardCollaborator = typeof whiteboardCollaborators.$inferSelect;
export type InsertWhiteboardCollaborator = z.infer<typeof insertWhiteboardCollaboratorSchema>;

export type WhiteboardElement = typeof whiteboardElements.$inferSelect;
export type InsertWhiteboardElement = z.infer<typeof insertWhiteboardElementSchema>;

// Whiteboard Relations
export const whiteboardsRelations = relations(whiteboards, ({ one, many }) => ({
  user: one(users, { fields: [whiteboards.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [whiteboards.campaignId], references: [campaigns.id] }),
  collaborators: many(whiteboardCollaborators),
  elements: many(whiteboardElements),
}));

export const whiteboardCollaboratorsRelations = relations(whiteboardCollaborators, ({ one }) => ({
  whiteboard: one(whiteboards, { fields: [whiteboardCollaborators.whiteboardId], references: [whiteboards.id] }),
  creator: one(creators, { fields: [whiteboardCollaborators.creatorId], references: [creators.id] }),
}));

export const whiteboardElementsRelations = relations(whiteboardElements, ({ one }) => ({
  whiteboard: one(whiteboards, { fields: [whiteboardElements.whiteboardId], references: [whiteboards.id] }),
  elementCreator: one(creators, { fields: [whiteboardElements.createdBy], references: [creators.id] }),
}));

// Email Template Relations
export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  user: one(users, { fields: [emailTemplates.userId], references: [users.id] }),
  creator: one(creators, { fields: [emailTemplates.creatorId], references: [creators.id] }),
}));

// Outreach Log Relations
// Email Delivery Events schema for tracking bounces, complaints, etc.
export const emailDeliveryEvents = pgTable("email_delivery_events", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").references(() => emails.id),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id).notNull(),
  eventType: text("event_type").notNull(), // bounce, complaint, unsubscribe, delivered, etc.
  timestamp: timestamp("timestamp").defaultNow(),
  messageId: text("message_id"), // Original message ID for tracking
  metadata: jsonb("metadata"), // Additional info from the ESP
  ipAddress: text("ip_address"), // Sending IP
  userAgent: text("user_agent"), // User agent if relevant
  eventSource: text("event_source").notNull(), // smartlead, smtp, webhook, etc.
  processed: boolean("processed").default(false), // Whether this has been processed for metrics
});

export const insertEmailDeliveryEventSchema = createInsertSchema(emailDeliveryEvents).pick({
  emailId: true,
  emailAccountId: true,
  eventType: true,
  timestamp: true,
  messageId: true,
  metadata: true,
  ipAddress: true, 
  userAgent: true,
  eventSource: true,
  processed: true,
});

export type EmailDeliveryEvent = typeof emailDeliveryEvents.$inferSelect;
export type InsertEmailDeliveryEvent = z.infer<typeof insertEmailDeliveryEventSchema>;

export const emailDeliveryEventsRelations = relations(emailDeliveryEvents, ({ one }) => ({
  email: one(emails, { fields: [emailDeliveryEvents.emailId], references: [emails.id] }),
  emailAccount: one(emailAccounts, { fields: [emailDeliveryEvents.emailAccountId], references: [emailAccounts.id] }),
}));

export const outreachLogsRelations = relations(outreachLogs, ({ one }) => ({
  contact: one(contacts, { fields: [outreachLogs.contactId], references: [contacts.id] }),
  user: one(users, { fields: [outreachLogs.userId], references: [users.id] }),
}));

// Contact Note Relations
// Domain Verification schema for SPF, DKIM, DMARC
export const domainVerifications = pgTable("domain_verifications", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  spfStatus: text("spf_status").default("not_checked"), // not_checked, pending, valid, invalid, failed
  dkimStatus: text("dkim_status").default("not_checked"), // not_checked, pending, valid, invalid, failed
  dmarcStatus: text("dmarc_status").default("not_checked"), // not_checked, pending, valid, invalid, failed
  spfRecord: text("spf_record"), // Current SPF record
  recommendedSpfRecord: text("recommended_spf_record"), // Recommended SPF
  dkimRecord: text("dkim_record"), // Current DKIM record
  recommendedDkimRecord: text("recommended_dkim_record"), // Recommended DKIM
  dmarcRecord: text("dmarc_record"), // Current DMARC record
  recommendedDmarcRecord: text("recommended_dmarc_record"), // Recommended DMARC
  lastChecked: timestamp("last_checked"),
  authSelectorName: text("auth_selector_name"), // DKIM selector name
  errors: text("errors").array(), // Array of error messages
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDomainVerificationSchema = createInsertSchema(domainVerifications).pick({
  domain: true,
  spfStatus: true,
  dkimStatus: true,
  dmarcStatus: true,
  spfRecord: true,
  recommendedSpfRecord: true,
  dkimRecord: true,
  recommendedDkimRecord: true,
  dmarcRecord: true,
  recommendedDmarcRecord: true,
  lastChecked: true,
  authSelectorName: true,
  errors: true,
});

export type DomainVerification = typeof domainVerifications.$inferSelect;
export type InsertDomainVerification = z.infer<typeof insertDomainVerificationSchema>;

// Spam Word Dictionary for content checking
export const spamWords = pgTable("spam_words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  category: text("category").notNull(), // finance, gambling, medicines, etc.
  score: integer("score").notNull().default(1), // 1-10 for severity
  active: boolean("active").default(true),
});

export const insertSpamWordSchema = createInsertSchema(spamWords).pick({
  word: true,
  category: true,
  score: true,
  active: true,
});

export type SpamWord = typeof spamWords.$inferSelect;
export type InsertSpamWord = z.infer<typeof insertSpamWordSchema>;

export const contactNotesRelations = relations(contactNotes, ({ one }) => ({
  contact: one(contacts, { fields: [contactNotes.contactId], references: [contacts.id] }),
  user: one(users, { fields: [contactNotes.userId], references: [users.id] }),
}));

// AI Email Content Analysis Results
export const emailContentAnalysis = pgTable("email_content_analysis", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  score: integer("score").notNull(), // 0-100 score for deliverability
  spamRisk: integer("spam_risk").notNull(), // 0-100 risk level
  deliverabilityRating: text("deliverability_rating").notNull(), // excellent, good, fair, poor, critical
  spamTriggers: text("spam_triggers").array(), // Array of spam trigger words found
  imageToTextRatio: text("image_to_text_ratio"), // e.g. "70:30" for 70% text, 30% images
  linkCount: integer("link_count"), // Number of links found
  textLength: integer("text_length"), // Length of text content in chars
  hasAttachment: boolean("has_attachment").default(false),
  excessiveCapitals: boolean("excessive_capitals").default(false),
  excessivePunctuation: boolean("excessive_punctuation").default(false),
  improvementSuggestions: text("improvement_suggestions").array(),
  isPhishy: boolean("is_phishy").default(false),
  analysisDate: timestamp("analysis_date").defaultNow(),
  createdById: integer("created_by_id").references(() => users.id),
  aiModel: text("ai_model"), // Which AI model performed the analysis
  aiVersion: text("ai_version"), // Version of the AI model
  metadata: jsonb("metadata"), // Additional analysis data
});

export const insertEmailContentAnalysisSchema = createInsertSchema(emailContentAnalysis).pick({
  subject: true,
  content: true,
  score: true,
  spamRisk: true,
  deliverabilityRating: true,
  spamTriggers: true,
  imageToTextRatio: true,
  linkCount: true,
  textLength: true,
  hasAttachment: true,
  excessiveCapitals: true,
  excessivePunctuation: true,
  improvementSuggestions: true,
  isPhishy: true,
  createdById: true,
  aiModel: true,
  aiVersion: true,
  metadata: true,
});

export type EmailContentAnalysis = typeof emailContentAnalysis.$inferSelect;
export type InsertEmailContentAnalysis = z.infer<typeof insertEmailContentAnalysisSchema>;

// AI Account Health Analysis
export const accountHealthAnalysis = pgTable("account_health_analysis", {
  id: serial("id").primaryKey(),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id).notNull(),
  healthScore: integer("health_score").notNull(), // 0-100 score
  overallRating: text("overall_rating").notNull(), // excellent, good, fair, poor, critical
  bounceRateAnalysis: text("bounce_rate_analysis"),
  complaintRateAnalysis: text("complaint_rate_analysis"),
  openRateAnalysis: text("open_rate_analysis"),
  clickRateAnalysis: text("click_rate_analysis"),
  replyRateAnalysis: text("reply_rate_analysis"),
  authenticationAnalysis: text("authentication_analysis"), // SPF, DKIM, DMARC analysis
  sendingPatternAnalysis: text("sending_pattern_analysis"),
  riskFactors: text("risk_factors").array(),
  recommendations: text("recommendations").array(),
  priorityActions: text("priority_actions").array(),
  analysisDate: timestamp("analysis_date").defaultNow(),
  aiModel: text("ai_model"),
  aiVersion: text("ai_version"),
  metadata: jsonb("metadata"),
});

export const insertAccountHealthAnalysisSchema = createInsertSchema(accountHealthAnalysis).pick({
  emailAccountId: true,
  healthScore: true,
  overallRating: true,
  bounceRateAnalysis: true,
  complaintRateAnalysis: true,
  openRateAnalysis: true,
  clickRateAnalysis: true,
  replyRateAnalysis: true,
  authenticationAnalysis: true,
  sendingPatternAnalysis: true,
  riskFactors: true,
  recommendations: true,
  priorityActions: true,
  aiModel: true,
  aiVersion: true,
  metadata: true,
});

export type AccountHealthAnalysis = typeof accountHealthAnalysis.$inferSelect;
export type InsertAccountHealthAnalysis = z.infer<typeof insertAccountHealthAnalysisSchema>;

// The proper schemas for Pipeline Cards, Company Information, Tasks, and Meeting Logs are defined further down in the file

// We're updating/enhancing the existing company-related schemas rather than creating duplicates

// AI-Guided A/B Testing for Deliverability
export const deliverabilityTests = pgTable("deliverability_tests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id).notNull(),
  status: text("status").notNull().default("draft"), // draft, running, completed, failed
  testVariables: text("test_variables").array(), // What's being tested: subject_line, from_name, send_time, content
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  sampleSize: integer("sample_size").default(100),
  metadata: jsonb("metadata"), // Configuration details
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliverabilityTestVariants = pgTable("deliverability_test_variants", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").references(() => deliverabilityTests.id).notNull(),
  variantName: text("variant_name").notNull(), // e.g., "Version A", "Version B"
  subjectLine: text("subject_line"),
  fromName: text("from_name"),
  sendTime: timestamp("send_time"),
  content: text("content"),
  deliveryRate: integer("delivery_rate"), // Percentage delivered
  inboxRate: integer("inbox_rate"), // Percentage in inbox vs spam
  openRate: integer("open_rate"), // Percentage opened
  clickRate: integer("click_rate"), // Percentage clicked
  bounceRate: integer("bounce_rate"), // Percentage bounced
  complaintRate: integer("complaint_rate"), // Percentage complained
  isWinner: boolean("is_winner").default(false),
  metadata: jsonb("metadata"), // Additional testing data
});

export const insertDeliverabilityTestSchema = createInsertSchema(deliverabilityTests).pick({
  name: true,
  emailAccountId: true,
  status: true,
  testVariables: true,
  startDate: true,
  endDate: true,
  sampleSize: true,
  metadata: true,
  createdById: true,
});

export const insertDeliverabilityTestVariantSchema = createInsertSchema(deliverabilityTestVariants).pick({
  testId: true,
  variantName: true,
  subjectLine: true,
  fromName: true,
  sendTime: true,
  content: true,
  deliveryRate: true,
  inboxRate: true,
  openRate: true,
  clickRate: true,
  bounceRate: true,
  complaintRate: true,
  isWinner: true,
  metadata: true,
});

export type DeliverabilityTest = typeof deliverabilityTests.$inferSelect;
export type InsertDeliverabilityTest = z.infer<typeof insertDeliverabilityTestSchema>;
export type DeliverabilityTestVariant = typeof deliverabilityTestVariants.$inferSelect;
export type InsertDeliverabilityTestVariant = z.infer<typeof insertDeliverabilityTestVariantSchema>;

// Inbox Placement Predictions
export const inboxPlacementPredictions = pgTable("inbox_placement_predictions", {
  id: serial("id").primaryKey(),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  recipientDomains: text("recipient_domains").array(), // e.g., gmail.com, yahoo.com, etc.
  inboxPlacementScore: integer("inbox_placement_score").notNull(), // 0-100 score
  gmailInboxProbability: integer("gmail_inbox_probability"), // 0-100 percentage
  outlookInboxProbability: integer("outlook_inbox_probability"), // 0-100 percentage
  yahooInboxProbability: integer("yahoo_inbox_probability"), // 0-100 percentage
  otherInboxProbability: integer("other_inbox_probability"), // 0-100 percentage
  blockingFactors: text("blocking_factors").array(), // Factors that may cause blocking
  filteringFactors: text("filtering_factors").array(), // Factors that may cause filtering
  improvementSuggestions: text("improvement_suggestions").array(),
  predictionDate: timestamp("prediction_date").defaultNow(),
  createdById: integer("created_by_id").references(() => users.id),
  aiModel: text("ai_model"),
  aiVersion: text("ai_version"),
  metadata: jsonb("metadata"),
});

export const insertInboxPlacementPredictionSchema = createInsertSchema(inboxPlacementPredictions).pick({
  emailAccountId: true,
  subject: true,
  content: true,
  recipientDomains: true,
  inboxPlacementScore: true,
  gmailInboxProbability: true,
  outlookInboxProbability: true,
  yahooInboxProbability: true,
  otherInboxProbability: true,
  blockingFactors: true,
  filteringFactors: true,
  improvementSuggestions: true,
  createdById: true,
  aiModel: true,
  aiVersion: true,
  metadata: true,
});

export type InboxPlacementPrediction = typeof inboxPlacementPredictions.$inferSelect;
export type InsertInboxPlacementPrediction = z.infer<typeof insertInboxPlacementPredictionSchema>;

// AI Reputation Monitoring Alerts
export const reputationAlerts = pgTable("reputation_alerts", {
  id: serial("id").primaryKey(),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id).notNull(),
  alertType: text("alert_type").notNull(), // bounce_rate, complaint_rate, blacklist, etc.
  severity: text("severity").notNull(), // info, warning, critical
  message: text("message").notNull(),
  detectedValue: text("detected_value"), // e.g., "10%" for bounce rate
  threshold: text("threshold"), // e.g., "5%" for bounce rate
  timestamp: timestamp("timestamp").defaultNow(),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: integer("resolved_by_id").references(() => users.id),
  metadata: jsonb("metadata"),
});

export const insertReputationAlertSchema = createInsertSchema(reputationAlerts).pick({
  emailAccountId: true,
  alertType: true,
  severity: true,
  message: true,
  detectedValue: true,
  threshold: true,
  isResolved: true,
  resolvedAt: true,
  resolvedById: true,
  metadata: true,
});

export type ReputationAlert = typeof reputationAlerts.$inferSelect;
export type InsertReputationAlert = z.infer<typeof insertReputationAlertSchema>;

// Relations for new tables
export const emailContentAnalysisRelations = relations(emailContentAnalysis, ({ one }) => ({
  createdBy: one(users, { fields: [emailContentAnalysis.createdById], references: [users.id] }),
}));

export const accountHealthAnalysisRelations = relations(accountHealthAnalysis, ({ one }) => ({
  emailAccount: one(emailAccounts, { fields: [accountHealthAnalysis.emailAccountId], references: [emailAccounts.id] }),
}));

export const deliverabilityTestsRelations = relations(deliverabilityTests, ({ one, many }) => ({
  emailAccount: one(emailAccounts, { fields: [deliverabilityTests.emailAccountId], references: [emailAccounts.id] }),
  createdBy: one(users, { fields: [deliverabilityTests.createdById], references: [users.id] }),
  variants: many(deliverabilityTestVariants),
}));

export const deliverabilityTestVariantsRelations = relations(deliverabilityTestVariants, ({ one }) => ({
  test: one(deliverabilityTests, { fields: [deliverabilityTestVariants.testId], references: [deliverabilityTests.id] }),
}));

// Email logs relations
export const emailLogRelations = relations(emailLogs, ({ one }) => ({
  email: one(emails, { fields: [emailLogs.emailId], references: [emails.id] }),
  campaign: one(campaigns, { fields: [emailLogs.campaignId], references: [campaigns.id] }),
  contact: one(contacts, { fields: [emailLogs.contactId], references: [contacts.id] }),
  emailAccount: one(emailAccounts, { fields: [emailLogs.emailAccountId], references: [emailAccounts.id] }),
}));

export const inboxPlacementPredictionsRelations = relations(inboxPlacementPredictions, ({ one }) => ({
  emailAccount: one(emailAccounts, { fields: [inboxPlacementPredictions.emailAccountId], references: [emailAccounts.id] }),
  createdBy: one(users, { fields: [inboxPlacementPredictions.createdById], references: [users.id] }),
}));

export const reputationAlertsRelations = relations(reputationAlerts, ({ one }) => ({
  emailAccount: one(emailAccounts, { fields: [reputationAlerts.emailAccountId], references: [emailAccounts.id] }),
  resolvedBy: one(users, { fields: [reputationAlerts.resolvedById], references: [users.id] }),
}));

export const shareableLandingPagesRelations = relations(shareableLandingPages, ({ one }) => ({
  user: one(users, { fields: [shareableLandingPages.userId], references: [users.id] }),
  creator: one(creators, { fields: [shareableLandingPages.creatorId], references: [creators.id] }),
}));

// Pipeline Card schema for sales pipeline management
export const pipelineCards = pgTable("pipeline_cards", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  description: text("description"),
  value: decimal("value"),
  currency: text("currency").default("USD").notNull(),
  probability: integer("probability").default(20).notNull(),
  stage: text("stage").notNull().default("lead"),
  status: text("status").default("active").notNull(), // active, stalled, archived
  source: text("source"), // website, referral, outreach, event
  product: text("product"),
  assignedTo: integer("assigned_to").references(() => users.id),
  expectedCloseDate: timestamp("expected_close_date"),
  lastActivityAt: timestamp("last_activity_at"),
  nextStep: text("next_step"),
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPipelineCardSchema = createInsertSchema(pipelineCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PipelineCard = typeof pipelineCards.$inferSelect;
export type InsertPipelineCard = z.infer<typeof insertPipelineCardSchema>;

// Company Information module schema
export const companyInformation = pgTable("company_information", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => contacts.id).notNull().unique(), // Reference to company in contacts table
  campaigns: jsonb("campaigns").default([]), // Array of campaign IDs associated with this company
  proposals: jsonb("proposals").default([]), // Array of proposal IDs associated with this company
  inventorySent: jsonb("inventory_sent").default([]), // Array of inventory items sent to the company
  meetingLogs: jsonb("meeting_logs").default([]), // Array of meeting log objects
  tasks: jsonb("tasks").default([]), // Array of task IDs associated with this company
  notes: jsonb("notes").default([]), // Array of note objects
  emailThreads: jsonb("email_threads").default([]), // Array of email thread IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id").references(() => users.id), // User associated with this information
});

export const insertCompanyInformationSchema = createInsertSchema(companyInformation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CompanyInformation = typeof companyInformation.$inferSelect;
export type InsertCompanyInformation = z.infer<typeof insertCompanyInformationSchema>;

// Company task schema
export const companyTasks = pgTable("company_tasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => contacts.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: text("status").default("pending").notNull(), // pending, in-progress, completed, cancelled
  priority: text("priority").default("medium"), // low, medium, high, urgent
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertCompanyTaskSchema = createInsertSchema(companyTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type CompanyTask = typeof companyTasks.$inferSelect;
export type InsertCompanyTask = z.infer<typeof insertCompanyTaskSchema>;

// Meeting logs schema
export const meetingLogs = pgTable("meeting_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => contacts.id).notNull(),
  title: text("title").notNull(),
  meetingDate: timestamp("meeting_date").notNull(),
  attendees: jsonb("attendees").default([]), // Array of attendee objects (name, email, role)
  notes: text("notes"),
  followUpActions: jsonb("follow_up_actions").default([]), // Array of follow-up action items
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingLogSchema = createInsertSchema(meetingLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MeetingLog = typeof meetingLogs.$inferSelect;
export type InsertMeetingLog = z.infer<typeof insertMeetingLogSchema>;

// Define relations for pipeline cards
export const pipelineCardRelations = relations(pipelineCards, ({ one }) => ({
  assignee: one(users, {
    fields: [pipelineCards.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [pipelineCards.createdBy],
    references: [users.id],
  }),
}));

// Define relations for company information
export const companyInformationRelations = relations(companyInformation, ({ one }) => ({
  company: one(contacts, {
    fields: [companyInformation.companyId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [companyInformation.userId],
    references: [users.id],
  }),
}));

// Define relations for company tasks
export const companyTaskRelations = relations(companyTasks, ({ one }) => ({
  company: one(contacts, {
    fields: [companyTasks.companyId],
    references: [contacts.id],
  }),
  assignee: one(users, {
    fields: [companyTasks.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [companyTasks.createdBy],
    references: [users.id],
  }),
}));

// Define relations for meeting logs
export const meetingLogRelations = relations(meetingLogs, ({ one }) => ({
  company: one(contacts, {
    fields: [meetingLogs.companyId],
    references: [contacts.id],
  }),
  creator: one(users, {
    fields: [meetingLogs.createdBy],
    references: [users.id],
  }),
}));

// Activity schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // campaign, email, contact, proposal
  action: text("action").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"),
  userId: integer("user_id").references(() => users.id),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  type: true,
  action: true,
  description: true,
  metadata: true,
  userId: true,
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Notification schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // info, success, warning, error
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
  metadata: jsonb("metadata"),
  userId: integer("user_id").references(() => users.id),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  title: true,
  message: true,
  type: true,
  metadata: true,
  userId: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Email Campaign Schema
export const EmailCampaign = z.object({
  id: z.number(),
  userId: z.number(),
  fromAccount: z.string(),
  subject: z.string(),
  body: z.string(),
  scheduledTime: z.date().nullable(),
  status: z.enum(["draft", "scheduled", "sending", "completed", "failed"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EmailCampaign = z.infer<typeof EmailCampaign>;

// Email Sequence Schema
export const EmailSequence = z.object({
  id: z.number(),
  userId: z.number(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EmailSequence = z.infer<typeof EmailSequence>;

// Email Sequence Step Schema
export const EmailSequenceStep = z.object({
  id: z.number(),
  sequenceId: z.number(),
  subject: z.string(),
  body: z.string(),
  delay: z.number(),
  delayUnit: z.enum(["hours", "days"]),
  order: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EmailSequenceStep = z.infer<typeof EmailSequenceStep>;

// Email Tracking Schema
export const EmailTracking = z.object({
  id: z.number(),
  campaignId: z.number(),
  recipientEmail: z.string(),
  status: z.enum(["sent", "opened", "clicked", "replied", "bounced"]),
  openedAt: z.date().nullable(),
  clickedAt: z.date().nullable(),
  repliedAt: z.date().nullable(),
  bouncedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EmailTracking = z.infer<typeof EmailTracking>;

// Update Database type to include new tables
export interface Database {
  // ... existing tables ...
  emailCampaigns: EmailCampaign;
  emailSequences: EmailSequence;
  emailSequenceSteps: EmailSequenceStep;
  emailTracking: EmailTracking;
}


