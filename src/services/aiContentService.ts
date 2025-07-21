// src/services/aiContentService.ts

import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import BrandManager from './brandManager.js';
import type { Location, PostTemplate, BrandVoice } from './brandManager.js';

export interface ContentRequest {
  brandId: string;
  locationId?: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok';
  contentType: 'educational' | 'promotional' | 'community' | 'seasonal' | 'testimonial';
  customPrompt?: string;
}

export interface GeneratedContent {
  caption: string;
  hashtags: string[];
  imagePrompt?: string;
  callToAction: string;
  seoKeywords: string[];
}

export class AIContentService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    // Get brand context from database
    const brandContext = await BrandManager.getBrandContext(request.brandId);
    if (!brandContext) {
      throw new Error(`Brand not found in database for ID: ${request.brandId}`);
    }

    const { brand, locations, contentTopics, brandVoice, postTemplate } = brandContext;
    
    const location = request.locationId 
      ? locations.find(l => l.id === request.locationId)
      : locations[0];

    const prompt = this.buildPrompt({
      brand,
      locations,
      contentTopics,
      brandVoice,
      postTemplate
    }, location, request);
    
    try {
      Logger.info(`Generating content for ${brand.name} - ${request.platform} - ${request.contentType}`);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional social media content creator specializing in local business marketing. Create engaging, authentic content that drives local engagement and follows SEO best practices."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No content generated from OpenAI');
      }

      return this.parseAIResponse(response, { brand, brandVoice, postTemplate }, location);
      
    } catch (error) {
      Logger.error('Failed to generate AI content:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`AI content generation failed: ${errorMessage}`);
    }
  }

  private buildPrompt(brandData: {
    brand: any;
    locations: Location[];
    contentTopics: string[];
    brandVoice: BrandVoice;
    postTemplate: PostTemplate;
  }, location: Location | undefined, request: ContentRequest): string {
    
    const { brand, contentTopics, brandVoice, postTemplate } = brandData;
    const locationInfo = location ? {
      name: location.name,
      phone: location.phone,
      serviceArea: location.serviceArea.join(', '),
      specialties: location.specialties?.join(', ') || 'N/A'
    } : null;

    return `
Create a ${request.platform} post for ${brand.name} following these specifications:

BRAND CONTEXT:
- Business: ${brand.name}
- Industry: ${brand.industry}
- Description: ${brand.description}
- Target Audience: ${brand.targetAudience}
- Unique Value Prop: ${brand.uniqueValueProp}
- Brand Voice: ${brandVoice.tone} (${brandVoice.personality.join(', ')})
- Avoid these words: ${brandVoice.avoidWords.join(', ')}

${locationInfo ? `
LOCATION DETAILS:
- Location: ${locationInfo.name}
- Phone: ${locationInfo.phone}
- Service Areas: ${locationInfo.serviceArea}
- Specialties: ${locationInfo.specialties}
` : ''}

POST REQUIREMENTS:
- Platform: ${request.platform}
- Content Type: ${request.contentType}
- Structure: ${postTemplate.structure}
- Tone Guidelines: ${postTemplate.toneGuidelines.join(', ')}
- Post Length: ${this.getPlatformLength(request.platform)}

CONTENT TOPICS TO CONSIDER:
${contentTopics.map(topic => `- ${topic}`).join('\n')}

HASHTAG REQUIREMENTS:
- Include 3-5 primary hashtags: ${postTemplate.hashtagGroups.primary.join(', ')}
- Include 2-3 local hashtags: ${postTemplate.hashtagGroups.local.join(', ')}
- Include 2-3 service hashtags: ${postTemplate.hashtagGroups.service.join(', ')}
- Include 1-2 trending hashtags: ${postTemplate.hashtagGroups.trending.join(', ')}
- Total hashtags: 8-13 maximum

CALL TO ACTION EXAMPLES:
${postTemplate.callToActionExamples.map(cta => `- ${cta}`).join('\n')}

${request.customPrompt ? `
CUSTOM REQUIREMENTS:
${request.customPrompt}
` : ''}

Please provide your response in this exact JSON format:
{
  "caption": "The main post content without hashtags",
  "callToAction": "Specific call to action phrase",
  "hashtags": ["array", "of", "hashtags", "including", "the", "#"],
  "imagePrompt": "Detailed prompt for image generation (optional)",
  "seoKeywords": ["array", "of", "relevant", "SEO", "keywords"]
}
`;
  }

  private getPlatformLength(platform: string): string {
    const lengths = {
      facebook: '150-300 characters',
      instagram: '125-150 characters',
      linkedin: '200-400 characters',
      twitter: '200-280 characters',
      tiktok: '100-150 characters'
    };
    return lengths[platform as keyof typeof lengths] || '150-300 characters';
  }

  private parseAIResponse(response: string, brandData: {
    brand: any;
    brandVoice: BrandVoice;
    postTemplate: PostTemplate;
  }, location?: Location): GeneratedContent {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.caption || !parsed.hashtags || !parsed.callToAction) {
        throw new Error('Missing required fields in AI response');
      }

      // Ensure hashtags are properly formatted
      const hashtags = parsed.hashtags.map((tag: string) => 
        tag.startsWith('#') ? tag : `#${tag}`
      );

      // Add location-specific phone number to CTA if available
      let callToAction = parsed.callToAction;
      if (location?.phone && !callToAction.includes(location.phone)) {
        callToAction += ` Call ${location.phone}`;
      }

      return {
        caption: parsed.caption,
        hashtags: hashtags,
        imagePrompt: parsed.imagePrompt || undefined,
        callToAction: callToAction,
        seoKeywords: parsed.seoKeywords || []
      };

    } catch (error) {
      Logger.error('Failed to parse AI response:', error);
      Logger.error('Raw AI response:', response);
      
      // Fallback: create basic content
      return this.createFallbackContent(brandData, location);
    }
  }

  private createFallbackContent(brandData: {
    brand: any;
    brandVoice: BrandVoice;
    postTemplate: PostTemplate;
  }, location?: Location): GeneratedContent {
    
    const { brand, postTemplate } = brandData;
    const primaryHashtags = postTemplate.hashtagGroups.primary.slice(0, 3);
    const localHashtags = postTemplate.hashtagGroups.local.slice(0, 2);
    const serviceHashtags = postTemplate.hashtagGroups.service.slice(0, 2);

    return {
      caption: `Quality ${brand.industry.toLowerCase()} services you can trust. ${brand.description}`,
      hashtags: [...primaryHashtags, ...localHashtags, ...serviceHashtags],
      callToAction: location?.phone 
        ? `${postTemplate.callToActionExamples[0]} ${location.phone}`
        : postTemplate.callToActionExamples[0],
      seoKeywords: [brand.name, brand.industry, location?.city || 'Tampa']
    };
  }

  // Helper method to generate content for all locations of a brand
  async generateWeeklyContentBatch(brandId: string, platform: string = 'facebook'): Promise<{locationId: string, content: GeneratedContent}[]> {
    // Get brand context from database
    const brandContext = await BrandManager.getBrandContext(brandId);
    if (!brandContext) {
      throw new Error(`Brand not found in database for ID: ${brandId}`);
    }

    const { brand, locations } = brandContext;
    const contentTypes: ContentRequest['contentType'][] = ['educational', 'promotional', 'community'];
    const results: {locationId: string, content: GeneratedContent}[] = [];

    for (const location of locations) {
      const randomContentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      
      try {
        const content = await this.generateContent({
          brandId,
          locationId: location.id,
          platform: platform as any,
          contentType: randomContentType
        });

        results.push({
          locationId: location.id,
          content
        });

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        Logger.error(`Failed to generate content for location ${location.id}:`, error);
      }
    }

    return results;
  }
}