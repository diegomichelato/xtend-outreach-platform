import { pool } from '../db';

/**
 * Landing Page Service
 * This service handles direct SQL operations for landing pages to bypass ORM issues
 */

/**
 * Create a shareable landing page via direct SQL query
 * This ensures the unique_id field is properly set
 */
export async function createLandingPage(data: any) {
  const uniqueId = `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  const query = `
    INSERT INTO shareable_landing_pages (
      unique_id, 
      title, 
      description, 
      status,
      content,
      type,
      expires_at,
      is_password_protected,
      brand_primary_color,
      brand_secondary_color,
      brand_footer_text
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING id, unique_id;
  `;
  
  try {
    console.log(`Creating landing page with unique_id: ${uniqueId}`);
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(query, [
        uniqueId, 
        data.title || 'Untitled Proposal', 
        data.description || 'No description provided', 
        'active',
        JSON.stringify(data.content || {}),
        data.type || 'creator-project',
        data.expiresAt || null,
        data.isPasswordProtected || false,
        data.brandPrimaryColor || '#3B82F6',
        data.brandSecondaryColor || '#1E3A8A',
        data.brandFooterText || 'This proposal is confidential.'
      ]);
      
      if (!result || !result.rows || result.rows.length === 0) {
        throw new Error('Failed to create landing page');
      }
      
      return { 
        ...result.rows[0],
        uniqueId: result.rows[0].unique_id
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in createLandingPage:', error);
    throw error;
  }
}

/**
 * Update a proposal's status and link it to a landing page
 */
export async function updateProposalWithLandingPage(proposalId: number, landingPageId: number, landingPageUrl: string) {
  const query = `
    UPDATE proposals 
    SET 
      status = 'published',
      landing_page_id = $1,
      landing_page_url = $2
    WHERE id = $3
    RETURNING id, name, status, landing_page_id, landing_page_url;
  `;
  
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(query, [
        landingPageId,
        landingPageUrl,
        proposalId
      ]);
      
      if (!result || !result.rows || result.rows.length === 0) {
        throw new Error('Failed to update proposal');
      }
      
      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in updateProposalWithLandingPage:', error);
    throw error;
  }
}