# Interactive CLI Content Scheduler

## Overview

The Interactive CLI Content Scheduler is a powerful tool that guides you through scheduling social media posts for your brands with AI-generated content.

## Quick Start

```bash
npm run schedule-content
```

## Features

### 🎯 Brand Selection
- View all available brands from your database
- See location count for each brand
- Easy navigation with arrow keys

### 📊 Content Strategy Options

**Standard Mix** (Recommended for most brands)
- 40% Educational content
- 30% Community content  
- 20% Promotional content
- 10% Seasonal content

**Educational Focus** (For thought leadership)
- 60% Educational content
- 20% Community content
- 15% Promotional content
- 5% Seasonal content

**Promotional Push** (For sales campaigns)
- 50% Promotional content
- 30% Educational content
- 20% Community content
- 0% Seasonal content

**Custom Mix** (Define your own percentages)
- Set custom percentages for each content type
- Must total 100%

### 🤖 AI Content Generation
- Generates content using your brand's voice and guidelines
- Uses existing brand data from database
- Includes hashtags, call-to-actions, and SEO keywords
- Progress tracking during generation

### 📅 Smart Scheduling
- Spaces posts evenly over specified weeks
- Prefers weekdays (Monday-Friday)
- Optimal posting times (9-11 AM, 2-4 PM)
- Adds randomization to avoid patterns
- Avoids conflicts with existing scheduled posts

### 📝 Content Preview
- Shows detailed preview of all generated content
- Content type indicators with emojis
- Scheduled date/time for each post
- Caption previews and hashtag counts
- Approval step before saving

## User Flow Example

```
🎯 Social Media Content Scheduler

? Select a brand:
❯ Comfort Keepers (7 locations)
  H&M Medical Transport (1 location)  
  Advanced Care (1 location)

? How many posts would you like to schedule? 6

? Over how many weeks? 4

? Choose content strategy:
❯ Standard Mix (40% edu, 30% community, 20% promo, 10% seasonal)
  Educational Focus (60% edu, 20% community, 15% promo, 5% seasonal)
  Promotional Push (50% promo, 30% edu, 20% community)
  Custom Mix

📋 Content Plan:
   • 2 Educational posts
   • 2 Community posts
   • 1 Promotional post
   • 1 Seasonal post

🤖 Generating content... (this may take a minute)
Progress |████████████████████| 100% | 6/6 posts

📝 Generated Content Preview:

1. 📚 Educational - Jan 23, 10:30 AM
   "Winter safety tips for seniors: Keep walkways clear of ice and snow..."
   #ComfortKeepers #WinterSafety #SeniorCare +8 more
   
2. 👥 Community - Jan 26, 2:15 PM  
   "Meet Sarah, our compassionate caregiver in Phoenix! With 5 years..."
   #ComfortKeepers #Phoenix #CaregiverSpotlight +6 more

[... shows all 6 posts ...]

? Approve and schedule these posts? (Y/n) Y

✅ Successfully scheduled 6 posts for Comfort Keepers!
📊 Next post goes live: Tuesday, Jan 23 at 10:30 AM
📅 Final post: Monday, Feb 19 at 2:15 PM
💾 All posts saved to database with 'scheduled' status

🎉 Your content is ready! The scheduler will automatically post them.
```

## Technical Details

### Database Integration
- Uses existing `DatabaseService` for brand management
- Integrates with `AIContentService` for content generation
- Saves posts with 'scheduled' status for automatic posting
- Links posts to brands and accounts in database

### Content Types Supported
- **Educational**: Tips, advice, industry insights
- **Community**: Team spotlights, customer stories, local events
- **Promotional**: Services, special offers, testimonials
- **Seasonal**: Holiday content, seasonal tips

### Error Handling
- Graceful handling of AI service failures
- Database connection error recovery
- User cancellation support
- Validation for all user inputs
- Rollback on partial failures

### Requirements
- Node.js environment
- Existing brand data in database
- OpenAI API key configured
- At least one social media account configured

## Configuration

The scheduler uses your existing:
- Brand profiles from database
- AI content service configuration
- Social media account settings
- Post scheduler infrastructure

## Troubleshooting

### Common Issues

**"No brands found in database"**
- Run `npm run list-brands` to check available brands
- Add brands using your existing brand management tools

**"No social media accounts found"**
- Ensure you have at least one account configured in the database
- Check the `accounts` table in your database

**AI content generation failures**
- Verify OpenAI API key is set in environment variables
- Check network connectivity
- Review API usage limits

**TypeScript compilation warnings**
- The CLI works despite some TypeScript warnings
- These are related to inquirer type definitions and don't affect functionality

## Future Enhancements

Planned improvements:
- Batch operations for multiple brands
- Command-line arguments to skip interactive mode
- Export/import of content plans
- Platform-specific content optimization
- Integration with additional AI providers
- Advanced scheduling rules

## Support

For issues or feature requests:
1. Check existing brand and account configuration
2. Verify all dependencies are installed
3. Test with `npm run list-brands` first
4. Review console output for specific error messages

The CLI is designed to be user-friendly while providing powerful content scheduling capabilities for your social media automation system. 