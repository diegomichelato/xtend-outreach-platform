import { db } from '../db';
import { spamWords } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ContentQualityCheck {
  score: number;
  issues: ContentIssue[];
  isPassing: boolean;
  hasCriticalIssues: boolean;
}

interface ContentIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  position?: {
    startIndex: number;
    endIndex: number;
  };
}

/**
 * ContentQualityService checks email content for spam triggers and deliverability issues
 */
export class ContentQualityService {
  private commonSpamWords: { [word: string]: number } = {
    // Finance terms
    'cash bonus': 8, 'cash': 3, 'casino': 7, 'cheap': 6, 'collect': 5, 'credit': 4, 
    'credit card': 6, 'discount': 4, 'double your': 8, 'earn': 4, 'earn $': 8, 'earn money': 7,
    'eliminate debt': 8, 'extra cash': 7, 'fast cash': 9, 'financial freedom': 7, 'free grant': 8,
    'free investment': 9, 'free money': 9, 'get paid': 7, 'homebased': 5, 'income': 5, 
    'invest': 4, 'investment': 4, 'loan': 5, 'lottery': 9, 'make $': 8, 'make money': 8,
    'million dollars': 9, 'millionaire': 8, 'money': 5, 'money back': 6, 'mortgage': 5,
    'no fees': 5, 'online biz': 7, 'opportunity': 4, 'price': 4, 'refinance': 6, 'save $': 5,
    'save big': 6, 'save up to': 5, 'serious cash': 7, 'subject to credit': 6, 'they keep': 5,
    'unlimited': 5, 'us dollars': 7, 'why pay more': 6, 'work at home': 5, 'your income': 5,
    
    // Urgency/pressure terms
    'act now': 6, 'apply now': 5, 'buy now': 5, 'call now': 6, 'click here': 6, 'click below': 5,
    'do it today': 5, 'don\'t delete': 7, 'exclusive deal': 6, 'expires': 5, 'get it now': 6,
    'important information': 4, 'instant': 5, 'limited time': 6, 'new customers only': 5,
    'now only': 5, 'offer expires': 6, 'once in lifetime': 7, 'order now': 7, 'special promotion': 5,
    'supplies are limited': 7, 'time limited': 6, 'urgent': 7, 'while stocks last': 6,
    
    // Marketing phrases
    'as seen on': 5, 'bargain': 4, 'best price': 5, 'bonus': 4, 'brand new': 3, 'certified': 3,
    'congratulations': 5, 'dear friend': 6, 'free': 5, 'free access': 6, 'free consultation': 5,
    'free gift': 6, 'free hosting': 7, 'free info': 6, 'free membership': 6, 'free offer': 6,
    'free preview': 5, 'free quote': 5, 'free sample': 5, 'free trial': 5, 'free website': 6,
    'great offer': 5, 'guarantee': 4, 'have you been turned down': 5, 'hello': 3, 'increase sales': 5,
    'info you requested': 5, 'new invention': 4, 'satisfaction': 3, 'winner': 5,
    
    // Medical terms
    'cures': 7, 'lose weight': 7, 'medicine': 6, 'no medical exams': 7, 'no prescription': 8,
    'performance': 5, 'pills': 6, 'prescriptions': 6, 'rolex': 6, 'viagra': 9, 'vicodin': 9,
    'weight loss': 7, 'xanax': 9,
    
    // Questionable claims
    '100% free': 7, '100% satisfied': 6, 'additional income': 5, 'all natural': 5, 'amazing': 4,
    'be your own boss': 7, 'big bucks': 7, 'breakthrough': 5, 'cancel at any time': 5,
    'compare rates': 5, 'competitive rates': 4, 'double your income': 8, 'dramatic results': 6,
    'eliminate bad credit': 7, 'explode your business': 7, 'extra income': 6, 'f r e e': 7,
    'hidden assets': 6, 'incredible deal': 6, 'lower rates': 5, 'lowest price': 5,
    'miracle': 7, 'no catch': 6, 'no experience': 5, 'no obligation': 5, 'no purchase necessary': 4,
    'no questions asked': 6, 'no strings attached': 6, 'not junk': 7, 'obligation': 4,
    'password': 6, 'problem': 4, 'removes': 4, 'reverses': 5, 'risk free': 6, 'serious only': 5,
    'subject to': 4, 'trial': 3, 'unlimited': 5, 'warranty': 3, 'web traffic': 5, 'weekend getaway': 4
  };

  private capitalsThreshold = 0.3; // 30% text in CAPITALS
  private exclamationThreshold = 3; // Max 3 exclamation marks
  private linkThreshold = 5; // Max 5 links
  private personalizationTokenPattern = /{{.+?}}/g;
  
  /**
   * Check email content for spam triggers and quality issues
   * @param subject - The email subject
   * @param body - The email body (HTML or plaintext)
   * @returns The content quality check results
   */
  async checkEmailContent(subject: string, body: string): Promise<ContentQualityCheck> {
    const issues: ContentIssue[] = [];
    let totalScore = 0;
    
    // Load spam words from database
    let dbSpamWords = await this.getSpamWords();
    
    // If database has no spam words, use the default list
    const spamWordsList = dbSpamWords.length > 0 
      ? Object.fromEntries(dbSpamWords.map(word => [word.word, word.score]))
      : this.commonSpamWords;
    
    // Check subject line
    const subjectIssues = this.checkSubjectLine(subject, spamWordsList);
    issues.push(...subjectIssues.issues);
    totalScore += subjectIssues.score;
    
    // Check body content
    const bodyIssues = this.checkBodyContent(body, spamWordsList);
    issues.push(...bodyIssues.issues);
    totalScore += bodyIssues.score;
    
    // Check for personalization tokens
    const personalizationIssue = this.checkPersonalization(subject, body);
    if (personalizationIssue) {
      issues.push(personalizationIssue);
      totalScore += 5; // Missing personalization is a moderate issue
    }
    
    // Check image-to-text ratio (for HTML content)
    if (body.includes('<img') || body.includes('background=')) {
      const imageIssue = this.checkImageToTextRatio(body);
      if (imageIssue) {
        issues.push(imageIssue);
        totalScore += imageIssue.severity === 'high' ? 8 : 4;
      }
    }
    
    // Check for compliance elements
    const complianceIssues = this.checkComplianceElements(body);
    issues.push(...complianceIssues);
    totalScore += complianceIssues.length * 10; // Missing compliance elements are critical
    
    const hasCriticalIssues = issues.some(issue => issue.severity === 'critical');
    
    return {
      score: totalScore,
      issues,
      isPassing: totalScore < 25 && !hasCriticalIssues,
      hasCriticalIssues
    };
  }
  
  /**
   * Check subject line for spam triggers
   * @param subject - The email subject
   * @param spamWordsList - Dictionary of spam words and their scores
   * @returns The subject check results
   */
  private checkSubjectLine(subject: string, spamWordsList: { [word: string]: number }) {
    const issues: ContentIssue[] = [];
    let score = 0;
    
    // Check for all caps
    const upperCaseRatio = this.getUpperCaseRatio(subject);
    if (upperCaseRatio > this.capitalsThreshold) {
      issues.push({
        type: 'caps_in_subject',
        severity: upperCaseRatio > 0.5 ? 'high' : 'medium',
        message: `Too many capital letters in subject (${Math.round(upperCaseRatio * 100)}%)`,
        recommendation: 'Reduce use of capital letters in subject line'
      });
      score += upperCaseRatio * 10;
    }
    
    // Check for exclamation marks
    const exclamationCount = (subject.match(/!/g) || []).length;
    if (exclamationCount > this.exclamationThreshold) {
      issues.push({
        type: 'exclamation_in_subject',
        severity: exclamationCount > 5 ? 'high' : 'medium',
        message: `Too many exclamation marks in subject (${exclamationCount})`,
        recommendation: 'Use at most 1-2 exclamation marks in subject line'
      });
      score += exclamationCount * 2;
    }
    
    // Check for spam trigger words
    const spamTriggers = this.findSpamWords(subject.toLowerCase(), spamWordsList);
    
    if (spamTriggers.length > 0) {
      const totalWordScore = spamTriggers.reduce((total, word) => total + spamWordsList[word], 0);
      score += totalWordScore;
      
      issues.push({
        type: 'spam_words_in_subject',
        severity: totalWordScore > 15 ? 'high' : totalWordScore > 8 ? 'medium' : 'low',
        message: `Potential spam trigger words in subject: ${spamTriggers.join(', ')}`,
        recommendation: 'Replace or remove spam trigger words from subject line'
      });
    }
    
    return { score, issues };
  }
  
  /**
   * Check email body for spam triggers and quality issues
   * @param body - The email body content
   * @param spamWordsList - Dictionary of spam words and their scores
   * @returns The body check results
   */
  private checkBodyContent(body: string, spamWordsList: { [word: string]: number }) {
    const issues: ContentIssue[] = [];
    let score = 0;
    
    // Strip HTML tags for text analysis
    const textContent = this.stripHtml(body);
    
    // Check for all caps
    const upperCaseRatio = this.getUpperCaseRatio(textContent);
    if (upperCaseRatio > this.capitalsThreshold) {
      issues.push({
        type: 'caps_in_body',
        severity: upperCaseRatio > 0.5 ? 'high' : 'medium',
        message: `Too many capital letters in body (${Math.round(upperCaseRatio * 100)}%)`,
        recommendation: 'Reduce use of capital letters in email content'
      });
      score += upperCaseRatio * 8;
    }
    
    // Check for exclamation marks
    const exclamationCount = (textContent.match(/!/g) || []).length;
    if (exclamationCount > this.exclamationThreshold * 2) {
      issues.push({
        type: 'exclamation_in_body',
        severity: exclamationCount > 8 ? 'high' : 'medium',
        message: `Too many exclamation marks in body (${exclamationCount})`,
        recommendation: 'Reduce use of exclamation marks in email content'
      });
      score += exclamationCount;
    }
    
    // Check for spam trigger words
    const spamTriggers = this.findSpamWords(textContent.toLowerCase(), spamWordsList);
    
    if (spamTriggers.length > 0) {
      const totalWordScore = spamTriggers.reduce((total, word) => total + spamWordsList[word], 0);
      score += totalWordScore;
      
      issues.push({
        type: 'spam_words_in_body',
        severity: totalWordScore > 25 ? 'high' : totalWordScore > 15 ? 'medium' : 'low',
        message: `Potential spam trigger words in body: ${spamTriggers.join(', ')}`,
        recommendation: 'Replace or remove spam trigger words from email content'
      });
    }
    
    // Check for too many links
    const linkCount = (body.match(/<a[^>]*href/gi) || []).length;
    if (linkCount > this.linkThreshold) {
      issues.push({
        type: 'too_many_links',
        severity: linkCount > 10 ? 'high' : 'medium',
        message: `Too many links in email body (${linkCount})`,
        recommendation: 'Reduce the number of links in your email'
      });
      score += linkCount;
    }
    
    return { score, issues };
  }
  
  /**
   * Check if email includes personalization tokens
   * @param subject - The email subject
   * @param body - The email body
   * @returns A content issue if personalization is missing, null otherwise
   */
  private checkPersonalization(subject: string, body: string): ContentIssue | null {
    const hasPersonalizationToken = 
      this.personalizationTokenPattern.test(subject) || 
      this.personalizationTokenPattern.test(body);
    
    if (!hasPersonalizationToken) {
      return {
        type: 'missing_personalization',
        severity: 'medium',
        message: 'Email lacks personalization tokens',
        recommendation: 'Add personalization using {{first_name}} or other contact attributes'
      };
    }
    
    return null;
  }
  
  /**
   * Check image-to-text ratio in email body
   * @param body - The email body HTML
   * @returns A content issue if the image ratio is too high, null otherwise
   */
  private checkImageToTextRatio(body: string): ContentIssue | null {
    // Count images
    const imgTags = (body.match(/<img[^>]*>/gi) || []).length;
    
    // Estimate text content length
    const textLength = this.stripHtml(body).length;
    
    // Calculate a rough estimate of the ratio (this is very simplistic)
    // In a production app, you'd want a more sophisticated analysis
    if (imgTags > 3 && textLength / imgTags < 200) {
      return {
        type: 'high_image_ratio',
        severity: 'high',
        message: 'Email has a high image-to-text ratio',
        recommendation: 'Add more text content or reduce the number of images'
      };
    } else if (imgTags > 1 && textLength / imgTags < 300) {
      return {
        type: 'image_text_balance',
        severity: 'medium',
        message: 'Email may have an unbalanced image-to-text ratio',
        recommendation: 'Consider adding more text content to balance images'
      };
    }
    
    return null;
  }
  
  /**
   * Check for required compliance elements (unsubscribe link, physical address)
   * @param body - The email body HTML
   * @returns Array of compliance issues
   */
  private checkComplianceElements(body: string): ContentIssue[] {
    const issues: ContentIssue[] = [];
    
    // Check for unsubscribe link
    const hasUnsubscribe = 
      body.toLowerCase().includes('unsubscribe') || 
      body.toLowerCase().includes('opt-out') ||
      body.toLowerCase().includes('opt out') ||
      body.toLowerCase().includes('stop receiving');
    
    if (!hasUnsubscribe) {
      issues.push({
        type: 'missing_unsubscribe',
        severity: 'critical',
        message: 'Email is missing an unsubscribe link',
        recommendation: 'Add an unsubscribe link in the email footer'
      });
    }
    
    // Check for physical address (very simple check)
    const hasAddress = 
      /\b\d{1,5}\s+[a-zA-Z\s]+,\s+[a-zA-Z\s]+,\s+[A-Z]{2}\s+\d{5}\b/.test(body) || // US address pattern
      body.toLowerCase().includes('address:') ||
      body.toLowerCase().includes('our address');
    
    if (!hasAddress) {
      issues.push({
        type: 'missing_physical_address',
        severity: 'critical',
        message: 'Email is missing a physical mailing address',
        recommendation: 'Add your physical mailing address in the email footer'
      });
    }
    
    return issues;
  }
  
  /**
   * Strip HTML tags from content
   * @param html - HTML content
   * @returns Plain text content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Calculate ratio of uppercase characters to total characters
   * @param text - The text to analyze
   * @returns Ratio of uppercase characters (0-1)
   */
  private getUpperCaseRatio(text: string): number {
    if (!text || text.length === 0) return 0;
    
    // Only count letters, not whitespace or symbols
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;
    
    const upperCaseLetters = letters.replace(/[^A-Z]/g, '');
    return upperCaseLetters.length / letters.length;
  }
  
  /**
   * Find spam trigger words in text
   * @param text - The text to analyze
   * @param spamWordsList - Dictionary of spam words
   * @returns Array of spam words found
   */
  private findSpamWords(text: string, spamWordsList: { [word: string]: number }): string[] {
    const found: string[] = [];
    
    for (const word of Object.keys(spamWordsList)) {
      if (text.includes(word)) {
        found.push(word);
      }
    }
    
    return found;
  }
  
  /**
   * Get spam words from database
   * @returns Array of spam words with scores
   */
  private async getSpamWords() {
    try {
      return await db
        .select()
        .from(spamWords)
        .where(eq(spamWords.active, true));
    } catch (error) {
      console.error('Error fetching spam words:', error);
      return [];
    }
  }
}

export const contentQualityService = new ContentQualityService();