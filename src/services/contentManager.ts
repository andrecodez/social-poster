// src/services/contentManager.ts

import { PrismaClient } from '@prisma/client';
import { AIContentService, ContentRequest, GeneratedContent } from './aiContentService';
import { Logger } from '../utils/logger';

export interface ContentPlan {
  brandId: string;
  locationId?: string;
  platform: string;
  scheduledAt: Date;
  contentType: ContentRequest['contentType'];
  customPrompt?: string;
}

export interface WeeklyContentPlan {
  brandId: string;
  startDate: Date;
  platforms: string[];
  postsPerWeek: number;
}

export class ContentManager {
  private prisma: PrismaClient;
  private aiService: AIContentService;

  constructor() {
    this.prisma = new PrismaClient();
    this.aiService = new AIContentService();
  }

  /**
   * Generate and schedule a single piece of content
   */
  async createScheduledContent(plan: ContentPlan): Promise<void> {
    try {
      Logger.info(`Creating scheduled content for ${plan.brandId} - ${plan.platform}`);

      // Generate content using AI
      const content = await this.aiService.generateContent({
        brandId: plan.brandId,
        locationId: plan.locationId,
        platform: plan.platform as any,
        contentType: plan.contentType,
        customPrompt: plan.customPrompt
      });

      // Create the full post content
      const fullContent = this.formatPostContent(content);

      // Save to database
      await this.prisma.post.create({
        data: {
          accountId: this.getAccountId(plan.brandId, plan.locationId),
          platform: plan.platform,
          content: fullContent,
          scheduledAt: plan.scheduledAt,
          status: 'scheduled',
          metadata: JSON.stringify({
            brandId: plan.brandId,
            locationId: plan.locationId,
            contentType: plan.contentType,
            generatedContent: content,
            customPrompt: plan.customPrompt
          })
        }
      });

      Logger.info(`Successfully created scheduled content for ${plan.brandId}`);
      
    } catch (error) {
      Logger.error(`Failed to create scheduled content for ${plan.brandId}:`, error);
      throw error;
    }
  }

  /**
   * Generate weekly content for all brands and locations
   */
  async generateWeeklyContent(): Promise<void> {
    const DatabaseService = await import('./database.js');
    const allBrands = await DatabaseService.default.getAllBrands();
    const brandIds = allBrands.map(brand => brand.id);
    const platforms = ['facebook', 'instagram', 'linkedin'];
    
    Logger.info('Starting weekly content generation for all brands');

    for (const brandId of brandIds) {
      try {
        await this.generateBrandWeeklyContent({
          brandId,
          startDate: this.getNextMonday(),
          platforms,
          postsPerWeek: 1 // One post per week as requested
        });
      } catch (error) {
        Logger.error(`Failed to generate weekly content for ${brandId}:`, error);
      }
    }

    Logger.info('Completed weekly content generation');
  }

  /**
   * Generate weekly content for a specific brand
   */
  async generateBrandWeeklyContent(plan: WeeklyContentPlan): Promise<void> {
    const BrandManager = await import('./brandManager.js');
    const brandContext = await BrandManager.default.getBrandContext(plan.brandId);
    
    if (!brandContext) {
      throw new Error(`Brand not found in database for: ${plan.brandId}`);
    }

    const { brand, locations } = brandContext;
    Logger.info(`Generating weekly content for ${brand.name}`);

    // For each location of this brand
    for (const location of locations) {
      // For each platform
      for (const platform of plan.platforms) {
        // Schedule one post per week
        const scheduledAt = this.getRandomTimeInWeek(plan.startDate);
        const contentType = this.getRandomContentType();

        await this.createScheduledContent({
          brandId: plan.brandId,
          locationId: location.id,
          platform,
          scheduledAt,
          contentType
        });

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    Logger.info(`Completed weekly content generation for ${brand.name}`);
  }

  /**
   * Generate content drafts for review (not scheduled)
   */
  async generateContentDrafts(brandId: string, count: number = 5): Promise<Array<{content: GeneratedContent, metadata: any}>> {
    const BrandManager = await import('./brandManager.js');
    const brandContext = await BrandManager.default.getBrandContext(brandId);
    
    if (!brandContext) {
      throw new Error(`Brand not found in database for: ${brandId}`);
    }

    const { brand, locations } = brandContext;
    const drafts: Array<{content: GeneratedContent, metadata: any}> = [];
    const platforms = ['facebook', 'instagram', 'linkedin'];
    const contentTypes: ContentRequest['contentType'][] = ['educational', 'promotional', 'community', 'seasonal'];

    for (let i = 0; i < count; i++) {
      const location = locations[Math.floor(Math.random() * locations.length)];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

      try {
        const content = await this.aiService.generateContent({
          brandId,
          locationId: location.id,
          platform: platform as any,
          contentType
        });

        drafts.push({
          content,
          metadata: {
            brandId,
            locationId: location.id,
            locationName: location.name,
            platform,
            contentType,
            generatedAt: new Date().toISOString()
          }
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        Logger.error(`Failed to generate draft ${i + 1} for ${brandId}:`, error);
      }
    }

    return drafts;
  }

  /**
   * Approve and schedule a draft
   */
  async scheduleDraft(
    brandId: string, 
    locationId: string, 
    content: GeneratedContent, 
    platform: string, 
    scheduledAt: Date
  ): Promise<void> {
    const fullContent = this.formatPostContent(content);

    await this.prisma.post.create({
      data: {
        accountId: this.getAccountId(brandId, locationId),
        platform,
        content: fullContent,
        scheduledAt,
        status: 'scheduled',
        metadata: JSON.stringify({
          brandId,
          locationId,
          generatedContent: content,
          approvedAt: new Date().toISOString()
        })
      }
    });

    logger.info(`Scheduled approved draft for ${brandId} - ${platform}`);
  }

  private formatPostContent(content: GeneratedContent): string {
    const parts = [
      content.caption,
      '',
      content.callToAction,
      '',
      content.hashtags.join(' ')
    ];

    return parts.join('\n').trim();
  }

  private getAccountId(brandId: string, locationId?: string): string {
    // Create a unique account ID based on brand and location
    return locationId ? `${brandId}-${locationId}` : brandId;
  }

  private getNextMonday(): Date {
    const date = new Date();
    const day = date.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day; // If Sunday, next day. Otherwise, days until next Monday
    
    date.setDate(date.getDate() + daysUntilMonday);
    date.setHours(9, 0, 0, 0); // Set to 9 AM
    
    return date;
  }

  private getRandomTimeInWeek(startDate: Date): Date {
    const date = new Date(startDate);
    
    // Random day of the week (0-6)
    const randomDay = Math.floor(Math.random() * 7);
    date.setDate(date.getDate() + randomDay);
    
    // Random hour between 9 AM and 5 PM
    const randomHour = Math.floor(Math.random() * 8) + 9;
    date.setHours(randomHour);
    
    // Random minute
    const randomMinute = Math.floor(Math.random() * 60);
    date.setMinutes(randomMinute);
    
    return date;
  }

  private getRandomContentType(): ContentRequest['contentType'] {
    const types: ContentRequest['contentType'][] = ['educational', 'promotional', 'community', 'seasonal'];
    return types[Math.floor(Math.random() * types.length)];
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}