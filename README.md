# Xtend Outreach Platform

A cutting-edge SaaS platform revolutionizing creator video inventory management through intelligent marketing and collaboration technologies, with enhanced AI-driven research and proposal generation capabilities.

## Core Technologies

- React.js with TypeScript frontend
- PostgreSQL with Drizzle ORM
- Zod schema validation
- AI-driven company and creator ecosystem analysis
- Tailwind CSS with Shadcn UI components
- Enhanced cross-device authentication
- Proposal generation and landing page publishing
- Intelligent company research system
- Gmail App Password support for secure email integration
- Advanced email deliverability tracking
- Sales pipeline with company information management

## Getting Started

### Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Configure your database connection in `.env` file
4. Start the development server with `npm run dev`

### Required Environment Variables

Set the following in your `.env` file:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Email Configuration

For email functionality:

1. Go to Email Accounts section in the platform
2. Add your SMTP email accounts
3. For Gmail accounts with 2FA, follow the App Password setup guide

## Development

- Run `npm run dev` to start the development server
- Run `npm run db:push` to update the database schema
- Run `npm run build` to build for production

## Key Features

### Email Outreach

- Manage email sender accounts with Gmail App Password support
- Create and manage contact lists
- Design multi-step email campaigns with personalized templates
- Schedule emails with optimal sending times
- Track email deliverability and engagement metrics

### Proposal Generation

- Create professional proposals for potential clients and creators
- Automated AI-powered company research
- Generate branded landing pages for proposals
- Download proposals as PDF documents
- Easily share proposals via shareable links

### Sales Pipeline

- Track leads across different stages of the sales funnel
- Organize prospects by industry verticals
- Store detailed company information
- Log meeting notes and follow-up tasks
- Generate reports on pipeline performance

### AI Integration

- Utilize OpenAI and Anthropic models for content generation
- AI-assisted company research
- Intelligent email content suggestions
- Creator relationship management with AI insights
- Sentiment analysis for communication optimization

## License

All rights reserved. This project is proprietary and confidential.