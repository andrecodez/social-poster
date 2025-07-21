#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { DatabaseService } from '../services/database.js';
import { AIContentService } from '../services/aiContentService.js';
import type { ContentRequest, GeneratedContent } from '../services/aiContentService.js';
import type { Location } from '../services/brandManager.js';

interface ContentMix {
  name: string;
  educational: number;
  community: number;
  promotional: number;
  seasonal: number;
}

interface ScheduledPost {
  content: GeneratedContent;
  contentType: ContentRequest['contentType'];
  scheduledAt: Date;
  platform: string;
  location: Location;
}

interface PostPlan {
  educational: number;
  community: number;
  promotional: number;
  seasonal: number;
}

const CONTENT_MIXES: ContentMix[] = [
  {
    name: 'Standard Mix (40% edu, 30% community, 20% promo, 10% seasonal)',
    educational: 40,
    community: 30,
    promotional: 20,
    seasonal: 10
  },
  {
    name: 'Educational Focus (60% edu, 20% community, 15% promo, 5% seasonal)',
    educational: 60,
    community: 20,
    promotional: 15,
    seasonal: 5
  },
  {
    name: 'Promotional Push (50% promo, 30% edu, 20% community)',
    educational: 30,
    community: 20,
    promotional: 50,
    seasonal: 0
  },
  {
    name: 'Custom Mix',
    educational: 0,
    community: 0,
    promotional: 0,
    seasonal: 0
  }
];

class ContentScheduler {
  private db: DatabaseService;
  private ai: AIContentService;

  constructor() {
    this.db = new DatabaseService();
    this.ai = new AIContentService();
  }

  async run(): Promise<void> {
    try {
      console.log(chalk.cyan.bold('\n🎯 Social Media Content Scheduler\n'));

      // Step 1: Brand Selection
      const selectedBrand = await this.selectBrand();
      if (!selectedBrand) {
        console.log(chalk.yellow('No brand selected. Exiting...'));
        return;
      }

      // Step 1.5: Location Selection (NEW)
      const selectedLocations = await this.selectLocations(selectedBrand);
      if (!selectedLocations || selectedLocations.length === 0) {
        console.log(chalk.yellow('No locations selected. Exiting...'));
        return;
      }

      // Step 2: Post Configuration
      const config = await this.getPostConfiguration();

      // Step 3: Content Strategy
      const contentMix = await this.selectContentStrategy();
      const postPlan = this.calculatePostPlan(config.postCount, contentMix);

      // Step 4: Display Content Plan
      this.displayContentPlan(postPlan, selectedLocations, config.postCount);

      // Step 5: Generate Content
      const scheduledPosts = await this.generateContent(selectedBrand, selectedLocations, postPlan, config);

      // Step 6: Preview & Approval
      await this.previewContent(scheduledPosts);
      const approved = await this.getApproval();

      if (!approved) {
        console.log(chalk.yellow('\n❌ Content not approved. Exiting...'));
        return;
      }

      // Step 7: Save to Database
      await this.saveScheduledPosts(selectedBrand.id, scheduledPosts);
      
      // Step 8: Success Summary
      this.displaySuccessSummary(selectedBrand, scheduledPosts);

    } catch (error) {
      console.error(chalk.red('\n❌ An error occurred:'), error);
      console.log(chalk.yellow('Please try again or contact support if the issue persists.'));
    } finally {
      await this.db.disconnect();
    }
  }

  private async selectBrand(): Promise<any | null> {
    try {
      const brands = await this.db.getAllBrands();
      
      if (brands.length === 0) {
        console.log(chalk.red('❌ No brands found in database. Please add brands first.'));
        return null;
      }

      const choices = brands.map(brand => {
        const locations = Array.isArray(brand.locations) ? brand.locations : [];
        const locationCount = locations.length;
        const locationText = locationCount === 1 ? '1 location' : `${locationCount} locations`;
        
        return {
          name: `${brand.name} (${locationText})`,
          value: brand
        };
      });

      const { selectedBrand } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedBrand',
          message: 'Select a brand:',
          choices
        }
      ]);

      return selectedBrand;
    } catch (error) {
      console.error(chalk.red('Error fetching brands:'), error);
      throw error;
    }
  }

  private async selectLocations(brand: any): Promise<Location[]> {
    const locations: Location[] = Array.isArray(brand.locations) ? brand.locations : [];

    if (locations.length === 0) {
      console.log(chalk.red('❌ No locations found for this brand. Please add locations first.'));
      return [];
    }

    if (locations.length === 1) {
      console.log(chalk.cyan(`📍 Using location: ${locations[0].name}`));
      return locations;
    }

    console.log(chalk.cyan('\n📍 Available Locations:'));
    locations.forEach((loc, index) => {
      console.log(`  ${index + 1}. ${loc.name} - ${loc.city}, ${loc.state} - ${loc.phone}`);
    });

    const choices = [
      { name: 'All locations', value: 'all' },
      ...locations.map(loc => ({
        name: `${loc.name} (${loc.city}, ${loc.state})`,
        value: loc
      }))
    ];

    const { locationChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'locationChoice',
        message: 'Select locations for content generation:',
        choices
      }
    ]);

    if (locationChoice === 'all') {
      console.log(chalk.green(`✅ Selected all ${locations.length} locations`));
      return locations;
    } else {
      console.log(chalk.green(`✅ Selected: ${locationChoice.name}`));
      return [locationChoice];
    }
  }

  private async getPostConfiguration(): Promise<{ postCount: number; weeks: number }> {
    const answers: any = await inquirer.prompt([
      {
        type: 'number',
        name: 'postCount',
        message: 'How many posts per location would you like to schedule?',
        default: 6,
        validate: (input: number) => {
          if (input < 1 || input > 50) {
            return 'Please enter a number between 1 and 50';
          }
          return true;
        }
      },
      {
        type: 'number',
        name: 'weeks',
        message: 'Over how many weeks?',
        default: 4,
        validate: (input: number) => {
          if (input < 1 || input > 12) {
            return 'Please enter a number between 1 and 12 weeks';
          }
          return true;
        }
      }
    ]);

    return { postCount: answers.postCount, weeks: answers.weeks };
  }

  private async selectContentStrategy(): Promise<ContentMix> {
    const { strategyChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'strategyChoice',
        message: 'Choose content strategy:',
        choices: CONTENT_MIXES.map((mix, index) => ({
          name: mix.name,
          value: index
        }))
      }
    ]);

    if (strategyChoice === 3) { // Custom Mix
      return await this.getCustomMix();
    }

    return CONTENT_MIXES[strategyChoice];
  }

  private async getCustomMix(): Promise<ContentMix> {
    console.log(chalk.cyan('\n📊 Custom Content Mix (percentages must add up to 100)'));
    
    const answers: any = await inquirer.prompt([
      {
        type: 'number',
        name: 'educational',
        message: 'Educational content percentage:',
        default: 40,
        validate: (input: number) => input >= 0 && input <= 100 ? true : 'Enter 0-100'
      },
      {
        type: 'number',
        name: 'community',
        message: 'Community content percentage:',
        default: 30,
        validate: (input: number) => input >= 0 && input <= 100 ? true : 'Enter 0-100'
      },
      {
        type: 'number',
        name: 'promotional',
        message: 'Promotional content percentage:',
        default: 20,
        validate: (input: number) => input >= 0 && input <= 100 ? true : 'Enter 0-100'
      },
      {
        type: 'number',
        name: 'seasonal',
        message: 'Seasonal content percentage:',
        default: 10,
        validate: (input: number) => input >= 0 && input <= 100 ? true : 'Enter 0-100'
      }
    ]);

    const { educational, community, promotional, seasonal } = answers;
    const total = educational + community + promotional + seasonal;
    if (total !== 100) {
      console.log(chalk.red(`❌ Percentages add up to ${total}%, not 100%. Please try again.`));
      return await this.getCustomMix();
    }

    return {
      name: 'Custom Mix',
      educational,
      community,
      promotional,
      seasonal
    };
  }

  private calculatePostPlan(totalPosts: number, contentMix: ContentMix): PostPlan {
    const educational = Math.round((totalPosts * contentMix.educational) / 100);
    const community = Math.round((totalPosts * contentMix.community) / 100);
    const promotional = Math.round((totalPosts * contentMix.promotional) / 100);
    const seasonal = Math.round((totalPosts * contentMix.seasonal) / 100);

    // Adjust for rounding errors - prioritize educational content
    const calculatedTotal = educational + community + promotional + seasonal;
    const difference = totalPosts - calculatedTotal;
    
    return {
      educational: educational + Math.max(0, difference),
      community,
      promotional,
      seasonal
    };
  }

  private displayContentPlan(plan: PostPlan, locations: Location[], postsPerLocation: number): void {
    const totalPosts = (plan.educational + plan.community + plan.promotional + plan.seasonal) * locations.length;
    
    console.log(chalk.cyan('\n📋 Content Plan:'));
    console.log(chalk.bold(`   📊 ${postsPerLocation} posts per location × ${locations.length} locations = ${totalPosts} total posts`));
    console.log();
    if (plan.educational > 0) console.log(chalk.blue(`   • ${plan.educational} Educational posts per location (${plan.educational * locations.length} total)`));
    if (plan.community > 0) console.log(chalk.green(`   • ${plan.community} Community posts per location (${plan.community * locations.length} total)`));
    if (plan.promotional > 0) console.log(chalk.magenta(`   • ${plan.promotional} Promotional posts per location (${plan.promotional * locations.length} total)`));
    if (plan.seasonal > 0) console.log(chalk.yellow(`   • ${plan.seasonal} Seasonal posts per location (${plan.seasonal * locations.length} total)`));
    console.log();

    console.log(chalk.cyan('📍 Target Locations:'));
    locations.forEach(loc => {
      console.log(chalk.gray(`   • ${loc.name} (${loc.city}, ${loc.state}) - ${loc.phone}`));
    });
    console.log(chalk.gray(`   Each location will receive ${postsPerLocation} posts`));
    console.log();
  }

  private async generateContent(brand: any, locations: Location[], plan: PostPlan, config: { weeks: number }): Promise<ScheduledPost[]> {
    console.log(chalk.cyan('🤖 Generating content... (this may take a minute)\n'));

    const contentTypes: Array<{ type: ContentRequest['contentType']; count: number }> = [
      { type: 'educational', count: plan.educational },
      { type: 'community', count: plan.community },
      { type: 'promotional', count: plan.promotional },
      { type: 'seasonal', count: plan.seasonal }
    ];

    const postsPerLocation = Object.values(plan).reduce((sum, count) => sum + count, 0);
    const totalPosts = postsPerLocation * locations.length;
    const scheduledPosts: ScheduledPost[] = [];
    
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('Progress') + ' |{bar}| {percentage}% | {value}/{total} posts',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    progressBar.start(totalPosts, 0);

    const schedules = this.generateScheduleTimes(totalPosts, config.weeks);
    let scheduleIndex = 0;

    // Generate posts for each location
    for (const location of locations) {
      for (const { type, count } of contentTypes) {
        for (let i = 0; i < count; i++) {
          try {
            const content = await this.ai.generateContent({
              brandId: brand.id,
              locationId: location.id,
              platform: 'facebook', // Default platform
              contentType: type
            });

            scheduledPosts.push({
              content,
              contentType: type,
              scheduledAt: schedules[scheduleIndex],
              platform: 'facebook',
              location: location
            });

            scheduleIndex++;
            progressBar.update(scheduleIndex);

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            console.error(chalk.red(`\n❌ Failed to generate ${type} post ${i + 1} for ${location.name}:`), error);
            // Continue with next post
          }
        }
      }
    }

    progressBar.stop();
    console.log(chalk.green(`\n✅ Successfully generated ${scheduledPosts.length} posts!\n`));
    
    return scheduledPosts;
  }

  private generateScheduleTimes(postCount: number, weeks: number): Date[] {
    const schedules: Date[] = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    
    // Calculate days between posts
    const totalDays = weeks * 7;
    const daysBetweenPosts = totalDays / postCount;
    
    // Preferred posting times (9-11 AM, 2-4 PM)
    const preferredHours = [9, 10, 11, 14, 15, 16];
    
    for (let i = 0; i < postCount; i++) {
      const daysFromNow = Math.floor(i * daysBetweenPosts) + 1; // Start tomorrow
      const postDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
      
      // Prefer weekdays (Monday = 1, Friday = 5)
      while (postDate.getDay() === 0 || postDate.getDay() === 6) {
        postDate.setDate(postDate.getDate() + 1);
      }
      
      // Set random preferred hour
      const randomHour = preferredHours[Math.floor(Math.random() * preferredHours.length)];
      const randomMinute = Math.floor(Math.random() * 60);
      
      postDate.setHours(randomHour, randomMinute, 0, 0);
      
      schedules.push(postDate);
    }
    
    // Sort by date to ensure chronological order
    return schedules.sort((a, b) => a.getTime() - b.getTime());
  }

  private async previewContent(posts: ScheduledPost[]): Promise<void> {
    console.log(chalk.cyan.bold('📝 Generated Content Preview:\n'));

    posts.forEach((post, index) => {
      const typeEmojis: Record<string, string> = {
        educational: '📚',
        community: '👥',
        promotional: '🎯',
        seasonal: '🎄',
        testimonial: '⭐'
      };

      const emoji = typeEmojis[post.contentType] || '📄';
      const typeText = post.contentType.charAt(0).toUpperCase() + post.contentType.slice(1);
      const dateText = post.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      console.log(chalk.bold(`${index + 1}. ${emoji} ${typeText} - ${dateText} (for ${post.location.name})`));
      
      // Show preview of caption (first 100 characters)
      const preview = post.content.caption.length > 100 
        ? post.content.caption.substring(0, 100) + '...'
        : post.content.caption;
      
      console.log(chalk.gray(`   "${preview}"`));
      console.log(chalk.blue(`   ${post.content.hashtags.slice(0, 5).join(' ')} +${Math.max(0, post.content.hashtags.length - 5)} more`));
      console.log();
    });
  }

  private async getApproval(): Promise<boolean> {
    const { approved } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'approved',
        message: 'Approve and schedule these posts?',
        default: true
      }
    ]);

    return approved;
  }

  private async saveScheduledPosts(brandId: string, posts: ScheduledPost[]): Promise<void> {
    console.log(chalk.cyan('\n💾 Saving posts to database...'));

    // We need to add a createPost method to the database service
    // For now, let's use Prisma directly
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // First, get the first account (assuming we have at least one)
      const account = await prisma.account.findFirst();
      if (!account) {
        throw new Error('No social media accounts found. Please add an account first.');
      }

      const savedPosts = [];
      for (const post of posts) {
        const fullContent = `${post.content.caption}\n\n${post.content.hashtags.join(' ')}\n\n${post.content.callToAction}`;
        
        const savedPost = await prisma.post.create({
          data: {
            accountId: account.id,
            brandId: brandId,
            platform: post.platform,
            content: fullContent,
            status: 'scheduled',
            scheduledAt: post.scheduledAt,
            metadata: JSON.stringify({
              contentType: post.contentType,
              originalContent: post.content,
              seoKeywords: post.content.seoKeywords,
              location: post.location.name
            })
          }
        });
        savedPosts.push(savedPost);
      }

      await prisma.$disconnect();
      console.log(chalk.green(`✅ Successfully saved ${savedPosts.length} posts to database!`));
    } catch (error) {
      console.error(chalk.red('❌ Error saving posts to database:'), error);
      throw error;
    }
  }

  private displaySuccessSummary(brand: any, posts: ScheduledPost[]): void {
    const firstPost = posts[0];
    const lastPost = posts[posts.length - 1];

    console.log(chalk.green.bold('\n🎉 Success! Your content is ready!\n'));
    console.log(chalk.cyan(`✅ Successfully scheduled ${posts.length} posts for ${brand.name}!`));
    
    if (firstPost) {
      console.log(chalk.blue(`📊 Next post goes live: ${firstPost.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })} at ${firstPost.scheduledAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })} (for ${firstPost.location.name})`));
    }
    
    if (lastPost) {
      console.log(chalk.blue(`📅 Final post: ${lastPost.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })} at ${lastPost.scheduledAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })} (for ${lastPost.location.name})`));
    }
    
    console.log(chalk.green('💾 All posts saved to database with \'scheduled\' status'));
    console.log(chalk.yellow('\n🚀 The scheduler will automatically post them at the scheduled times!'));
  }
}

// Run the scheduler
async function main() {
  const scheduler = new ContentScheduler();
  await scheduler.run();
}

// Check if this file is being run directly
if (process.argv[1]?.endsWith('scheduleContent.ts') || process.argv[1]?.endsWith('scheduleContent.js')) {
  main().catch(console.error);
}

export default ContentScheduler; 