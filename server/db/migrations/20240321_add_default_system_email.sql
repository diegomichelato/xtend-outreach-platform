-- A# Email Configuration
SMTP_HOST=smtp.xtend.company
SMTP_PORT=587
SMTP_USER=info@xtend.company
SMTP_PASSWORD=Qovenant+IPOin2030.++
SMTP_SECURE=true

# For Gmail accounts (if using Gmail)
GMAIL_APP_PASSWORD=your-gmail-app-password-heredd default system email account
INSERT INTO email_accounts (
  email,
  name,
  status,
  provider,
  daily_limit,
  warmup_enabled,
  smtp_host,
  smtp_port,
  smtp_username,
  smtp_secure,
  domain_authenticated,
  dkim_configured,
  spf_configured,
  dmarc_configured,
  test_mode_only,
  notes
) VALUES (
  'info@xtend.company',
  'Xtend System',
  'active',
  'smtp',
  1000, -- Higher limit for system emails
  false, -- No warmup needed for system account
  'smtp.xtend.company',
  587,
  'info@xtend.company',
  true,
  true, -- Assuming domain is authenticated
  true, -- Assuming DKIM is configured
  true, -- Assuming SPF is configured
  true, -- Assuming DMARC is configured
  false,
  'Default system email account for all automated communications'
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  daily_limit = EXCLUDED.daily_limit,
  notes = EXCLUDED.notes;

-- Update environment variables in the settings table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    INSERT INTO settings (key, value)
    VALUES 
      ('DEFAULT_FROM_EMAIL', 'info@xtend.company'),
      ('DEFAULT_FROM_NAME', 'Xtend Creators')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END IF;
END $$; 