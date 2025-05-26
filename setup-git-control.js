/**
 * Git Version Control Setup Script
 * --------------------------------
 * This script provides instructions and commands to set up Git version control
 * for your SaaS platform when you download it locally.
 * 
 * Run this script with: node setup-git-control.js
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project info
const PROJECT_NAME = "xtend-creators";
const MAIN_BRANCH = "main";

// Git configuration helpers
async function createGitReadme() {
  const readmeContent = `# Xtend Creators - O.S.

A cutting-edge SaaS platform revolutionizing creator video inventory management through intelligent marketing and collaboration technologies, with enhanced AI-driven research and proposal generation capabilities.

## Core Technologies

- React.js with TypeScript frontend
- PostgreSQL with Drizzle ORM
- Zod schema validation
- AI-driven company and creator ecosystem analysis
- Tailwind CSS for adaptive layouts
- Enhanced cross-device authentication
- Proposal generation and landing page publishing
- Intelligent company research system
- Advanced analytics and reporting
- Sales pipeline with company information management

## Getting Started

### Installation

1. Clone this repository
2. Run \`npm install\` to install dependencies
3. Configure your database connection in \`.env\` file
4. Start the development server with \`npm run dev\`

### Required Environment Variables

Set the following in your \`.env\` file:

\`\`\`
DATABASE_URL=postgresql://username:password@hostname:port/database
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
\`\`\`

## License

All rights reserved. This project is proprietary and confidential.`;

  fs.writeFileSync('README.md', readmeContent);
  console.log('✅ Created README.md file for Git repository');
}

async function displaySetupInstructions() {
  console.log(`
============================================================
     GIT VERSION CONTROL SETUP FOR XTEND CREATORS
============================================================

Follow these steps to set up Git version control for your project:

1️⃣ DOWNLOAD YOUR PROJECT
   Use the download-platform.js script to download your project as a ZIP file.
   
   $ node download-platform.js

2️⃣ LOCAL SETUP
   Extract the ZIP file to a local directory.
   
   $ mkdir ~/projects/${PROJECT_NAME}
   $ cd ~/projects/${PROJECT_NAME}
   $ unzip path/to/xtend-creators.zip

3️⃣ INITIALIZE GIT REPOSITORY
   Navigate to your project directory and run:
   
   $ git init
   $ git checkout -b ${MAIN_BRANCH}
   $ git add .
   $ git commit -m "Initial commit"

4️⃣ CONNECT TO REMOTE REPOSITORY (Optional)
   Create a repository on GitHub, GitLab, or Bitbucket, then:
   
   $ git remote add origin https://github.com/yourusername/${PROJECT_NAME}.git
   $ git push -u origin ${MAIN_BRANCH}

5️⃣ ADVANCED GIT WORKFLOW
   - Create feature branches:
     $ git checkout -b feature/new-feature
     
   - Commit changes:
     $ git add .
     $ git commit -m "Add new feature"
     
   - Merge changes:
     $ git checkout ${MAIN_BRANCH}
     $ git merge feature/new-feature
     
   - Push changes:
     $ git push origin ${MAIN_BRANCH}

============================================================

This script has created a README.md file for your Git repository.
Your .gitignore file is already set up to exclude unnecessary files.

The entire platform is now ready for Git version control!
============================================================
`);
}

// Main function
async function main() {
  try {
    console.log('Setting up Git version control preparation...\n');
    
    // Create README.md for Git repository
    await createGitReadme();
    
    // Check if .gitignore exists
    if (!fs.existsSync('.gitignore')) {
      console.log('Creating .gitignore file...');
      const gitignoreContent = `# Dependencies
node_modules/
.pnp/
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel
.turbo

# Replit-specific files
.config/
.replit
replit.nix
replit_zip_error_log.txt
*replit*

# Database
*.db
*.sqlite
.data/

# API Keys
.env.local

# Logs
logs/
*.log

# Editor directories and files
.idea/
.vscode/
*.swp
*.swo

# Package manager
yarn.lock

# Cache
.cache/`;
      fs.writeFileSync('.gitignore', gitignoreContent);
      console.log('✅ Created .gitignore file');
    } else {
      console.log('✅ .gitignore file already exists');
    }
    
    // Display setup instructions
    await displaySetupInstructions();
    
    console.log('\nGit version control preparation completed successfully! 🚀');
    console.log('Use the instructions above to set up Git version control when you download your project locally.');
  } catch (error) {
    console.error('Error setting up Git version control preparation:', error);
    process.exit(1);
  }
}

main();