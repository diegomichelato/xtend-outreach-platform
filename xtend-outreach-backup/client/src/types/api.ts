// Dashboard Stats
export interface DashboardStats {
  activeCampaigns: number;
  campaignsChange: number;
  totalContacts: number;
  contactsChange: number;
  emailsSent: number;
  emailsChange: number;
  openRate: number;
  openRateChange: number;
  responseRate: number;
  responseRateChange: number;
}

// Outreach Metrics
export interface OutreachMetrics {
  timeData: {
    date: string;
    sent: number;
    opens: number;
    replies: number;
  }[];
  distribution: {
    name: string;
    value: number;
  }[];
}

// Deliverability Metrics
export interface DeliverabilityMetrics {
  overallHealth: number;
  healthChange: number;
  domainHealth: {
    name: string;
    status: "success" | "warning" | "error";
    message: string;
  }[];
  spamAnalysis: {
    name: string;
    score: number;
  }[];
}

// AI Monitoring Metrics
export interface AIMonitoringMetrics {
  recentAnalyses: {
    type: string;
    score: number;
    status: "success" | "warning" | "error";
    analysisDate: string;
  }[];
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
} 