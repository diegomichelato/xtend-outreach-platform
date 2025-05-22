import dns from 'dns';
import { promisify } from 'util';
import { db } from '../db';
import { domainVerifications, insertDomainVerificationSchema } from '@shared/schema';
import { and, eq } from 'drizzle-orm';

// Promisify DNS methods
const resolveTxt = promisify(dns.resolveTxt);
const lookup = promisify(dns.lookup);

/**
 * DomainVerificationService handles checking and validating SPF, DKIM, and DMARC records for email domains
 */
export class DomainVerificationService {
  
  /**
   * Verifies a domain's SPF, DKIM, and DMARC records
   * @param domain - The domain to verify
   * @returns The verification results
   */
  async verifyDomain(domain: string) {
    try {
      // Get or create domain verification record
      let domainRecord = await this.getDomainVerification(domain);
      
      if (!domainRecord) {
        domainRecord = await this.createDomainVerification(domain);
      }
      
      // Check SPF, DKIM, and DMARC records
      const spfResult = await this.checkSpfRecord(domain);
      const dmarcResult = await this.checkDmarcRecord(domain);
      
      // DKIM requires a selector name which might be provided by email service or configured separately
      const dkimResult = domainRecord.authSelectorName 
        ? await this.checkDkimRecord(domain, domainRecord.authSelectorName)
        : { status: 'not_checked', record: null, error: 'DKIM selector name not configured' };
      
      // Update domain verification record
      await this.updateDomainVerification(domain, {
        spfStatus: spfResult.status,
        spfRecord: spfResult.record,
        recommendedSpfRecord: spfResult.recommended,
        dkimStatus: dkimResult.status,
        dkimRecord: dkimResult.record,
        recommendedDkimRecord: dkimResult.recommended,
        dmarcStatus: dmarcResult.status,
        dmarcRecord: dmarcResult.record,
        recommendedDmarcRecord: dmarcResult.recommended,
        lastChecked: new Date(),
        errors: [...(spfResult.error ? [spfResult.error] : []), 
                 ...(dkimResult.error ? [dkimResult.error] : []),
                 ...(dmarcResult.error ? [dmarcResult.error] : [])]
      });
      
      // Return updated domain verification
      return await this.getDomainVerification(domain);
    } catch (error) {
      console.error(`Error verifying domain ${domain}:`, error);
      throw new Error(`Failed to verify domain: ${error.message}`);
    }
  }
  
  /**
   * Checks SPF record for a domain
   * @param domain - The domain to check
   * @returns The SPF verification result
   */
  async checkSpfRecord(domain: string) {
    try {
      const records = await resolveTxt(domain);
      const spfRecords = records.filter(record => 
        record[0].toLowerCase().startsWith('v=spf1')
      );
      
      if (spfRecords.length === 0) {
        return {
          status: 'invalid',
          record: null,
          recommended: 'v=spf1 include:_spf.gmail.com include:_spf.google.com ~all',
          error: 'No SPF record found'
        };
      }
      
      if (spfRecords.length > 1) {
        return {
          status: 'invalid',
          record: spfRecords.map(r => r[0]).join('; '),
          recommended: 'v=spf1 include:_spf.gmail.com include:_spf.google.com ~all',
          error: 'Multiple SPF records found (only one is allowed)'
        };
      }
      
      const spfRecord = spfRecords[0][0];
      
      // Check if the record includes Gmail/Google's SPF
      const includesMailProviders = spfRecord.includes('include:_spf.gmail.com') || 
                                   spfRecord.includes('include:_spf.google.com');
      
      if (!includesMailProviders) {
        return {
          status: 'invalid',
          record: spfRecord,
          recommended: this.mergeSpfRecord(spfRecord, 'include:_spf.gmail.com'),
          error: 'SPF record does not include mail provider'
        };
      }
      
      return {
        status: 'valid',
        record: spfRecord,
        recommended: null,
        error: null
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return {
          status: 'invalid',
          record: null,
          recommended: 'v=spf1 include:_spf.smartlead.io ~all',
          error: 'Domain not found or has no TXT records'
        };
      }
      
      return {
        status: 'failed',
        record: null,
        recommended: 'v=spf1 include:_spf.smartlead.io ~all',
        error: `Error checking SPF record: ${error.message}`
      };
    }
  }
  
  /**
   * Checks DKIM record for a domain
   * @param domain - The domain to check
   * @param selector - The DKIM selector name
   * @returns The DKIM verification result
   */
  async checkDkimRecord(domain: string, selector: string) {
    try {
      const dkimDomain = `${selector}._domainkey.${domain}`;
      const records = await resolveTxt(dkimDomain);
      
      if (records.length === 0) {
        return {
          status: 'invalid',
          record: null,
          recommended: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDGMjj8MVaESl30KSPYdLaEreSYzvOVh15u9YKAmTLgk1ecr4BCRq3Vkg3Xa2QrEQWbIvQj9FNqBYJaffzuSD6kGa+LHYqsqmpmW1+5CmFUxfmRkRXxjM8zKF8IzBWX1s0wYDjKMrWxXZJyJbWQ6rK/GBmLNNSt7xmqF/vwvWvTjwIDAQAB',
          error: 'No DKIM record found'
        };
      }
      
      const dkimRecord = records[0][0];
      
      // Simple validation: check for v=DKIM1 and p= (public key)
      if (!dkimRecord.includes('v=DKIM1') || !dkimRecord.includes('p=')) {
        return {
          status: 'invalid',
          record: dkimRecord,
          recommended: 'v=DKIM1; k=rsa; p=[Your Public Key]',
          error: 'Invalid DKIM record format'
        };
      }
      
      return {
        status: 'valid',
        record: dkimRecord,
        recommended: null,
        error: null
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return {
          status: 'invalid',
          record: null,
          recommended: 'v=DKIM1; k=rsa; p=[Your Public Key]',
          error: `DKIM record not found for selector "${selector}"`
        };
      }
      
      return {
        status: 'failed',
        record: null,
        recommended: 'v=DKIM1; k=rsa; p=[Your Public Key]',
        error: `Error checking DKIM record: ${error.message}`
      };
    }
  }
  
  /**
   * Checks DMARC record for a domain
   * @param domain - The domain to check
   * @returns The DMARC verification result
   */
  async checkDmarcRecord(domain: string) {
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const records = await resolveTxt(dmarcDomain);
      
      if (records.length === 0) {
        return {
          status: 'invalid',
          record: null,
          recommended: 'v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:dmarc@yourdomain.com; pct=100',
          error: 'No DMARC record found'
        };
      }
      
      const dmarcRecord = records[0][0];
      
      // Simple validation: check for v=DMARC1 and p= (policy)
      if (!dmarcRecord.includes('v=DMARC1') || !dmarcRecord.includes('p=')) {
        return {
          status: 'invalid',
          record: dmarcRecord,
          recommended: 'v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:dmarc@yourdomain.com; pct=100',
          error: 'Invalid DMARC record format'
        };
      }
      
      return {
        status: 'valid',
        record: dmarcRecord,
        recommended: null,
        error: null
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return {
          status: 'invalid',
          record: null,
          recommended: 'v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:dmarc@yourdomain.com; pct=100',
          error: 'DMARC record not found'
        };
      }
      
      return {
        status: 'failed',
        record: null,
        recommended: 'v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:dmarc@yourdomain.com; pct=100',
        error: `Error checking DMARC record: ${error.message}`
      };
    }
  }
  
  /**
   * Gets a domain verification record
   * @param domain - The domain to get verification for
   * @returns The domain verification record
   */
  async getDomainVerification(domain: string) {
    const [record] = await db
      .select()
      .from(domainVerifications)
      .where(eq(domainVerifications.domain, domain));
    
    return record;
  }
  
  /**
   * Creates a new domain verification record
   * @param domain - The domain to create verification for
   * @returns The created domain verification record
   */
  async createDomainVerification(domain: string) {
    const [record] = await db
      .insert(domainVerifications)
      .values({
        domain,
        spfStatus: 'not_checked',
        dkimStatus: 'not_checked',
        dmarcStatus: 'not_checked',
        lastChecked: new Date(),
        errors: []
      })
      .returning();
    
    return record;
  }
  
  /**
   * Updates a domain verification record
   * @param domain - The domain to update verification for
   * @param data - The data to update
   * @returns The updated domain verification record
   */
  async updateDomainVerification(domain: string, data: Partial<any>) {
    const [record] = await db
      .update(domainVerifications)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(domainVerifications.domain, domain))
      .returning();
    
    return record;
  }
  
  /**
   * Extracts the domain from an email address
   * @param email - The email address
   * @returns The domain part of the email
   */
  extractDomainFromEmail(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : '';
  }
  
  /**
   * Merges a new mechanism into an existing SPF record
   * @param existingRecord - The existing SPF record
   * @param newMechanism - The new mechanism to add
   * @returns The merged SPF record
   */
  mergeSpfRecord(existingRecord: string, newMechanism: string): string {
    // Parse the existing record
    const parts = existingRecord.split(' ');
    const prefix = parts[0]; // Should be "v=spf1"
    
    // Find the qualifier (all, ~all, ?all, -all)
    const allIndex = parts.findIndex(p => 
      p === 'all' || p === '~all' || p === '?all' || p === '-all'
    );
    
    if (allIndex === -1) {
      // No "all" qualifier found, append the new mechanism and "~all"
      return `${existingRecord} ${newMechanism} ~all`;
    }
    
    const allQualifier = parts[allIndex];
    
    // Remove the all qualifier
    parts.splice(allIndex, 1);
    
    // Add the new mechanism and the all qualifier back
    return [...parts, newMechanism, allQualifier].join(' ');
  }
}

export const domainVerificationService = new DomainVerificationService();