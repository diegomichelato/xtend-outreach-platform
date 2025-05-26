import nodemailer from "nodemailer";
import { google } from "googleapis";
import { logger } from "../utils/logger";

interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  body: string;
}

interface EmailProvider {
  type: "smtp" | "gmail" | "microsoft365";
  config: {
    host?: string;
    port?: number;
    secure?: boolean;
    auth: {
      user: string;
      pass?: string;
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
    };
  };
}

// Load email providers from environment variables or database
const emailProviders: Record<string, EmailProvider> = {
  default: {
    type: "smtp",
    config: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    },
  },
  gmail: {
    type: "gmail",
    config: {
      auth: {
        user: process.env.GMAIL_USER || "",
        clientId: process.env.GMAIL_CLIENT_ID || "",
        clientSecret: process.env.GMAIL_CLIENT_SECRET || "",
        refreshToken: process.env.GMAIL_REFRESH_TOKEN || "",
      },
    },
  },
};

async function createGmailTransport() {
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    emailProviders.gmail.config.auth.clientId,
    emailProviders.gmail.config.auth.clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: emailProviders.gmail.config.auth.refreshToken,
  });

  try {
    const accessToken = await oauth2Client.getAccessToken();

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: emailProviders.gmail.config.auth.user,
        clientId: emailProviders.gmail.config.auth.clientId,
        clientSecret: emailProviders.gmail.config.auth.clientSecret,
        refreshToken: emailProviders.gmail.config.auth.refreshToken,
        accessToken: accessToken?.token || "",
      },
    });
  } catch (error) {
    logger.error("Failed to create Gmail transport:", error);
    throw error;
  }
}

async function getTransport(fromAccount: string) {
  const provider = emailProviders[fromAccount] || emailProviders.default;

  switch (provider.type) {
    case "gmail":
      return createGmailTransport();
    case "smtp":
    default:
      return nodemailer.createTransport(provider.config);
  }
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transport = await getTransport(options.from);

    const info = await transport.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.body,
      headers: {
        "X-Entity-Ref-ID": `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    logger.info("Email sent successfully:", info.messageId);
  } catch (error) {
    logger.error("Failed to send email:", error);
    throw error;
  }
}

export async function verifyEmailProvider(
  provider: EmailProvider
): Promise<boolean> {
  try {
    const transport = await (provider.type === "gmail"
      ? createGmailTransport()
      : nodemailer.createTransport(provider.config));

    await transport.verify();
    return true;
  } catch (error) {
    logger.error("Failed to verify email provider:", error);
    return false;
  }
}

export async function addEmailProvider(
  name: string,
  provider: EmailProvider
): Promise<void> {
  try {
    // Verify the provider works before adding it
    const isValid = await verifyEmailProvider(provider);
    if (!isValid) {
      throw new Error("Failed to verify email provider");
    }

    emailProviders[name] = provider;
    logger.info(`Email provider '${name}' added successfully`);
  } catch (error) {
    logger.error(`Failed to add email provider '${name}':`, error);
    throw error;
  }
} 