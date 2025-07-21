// import { Brand } from '@prisma/client';
import DatabaseService from './database.js';

// Re-export brand interfaces for convenience
export interface Location {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  serviceArea: string[];
  specialties?: string[];
}

export interface PostTemplate {
  structure: string;
  toneGuidelines: string[];
  callToActionExamples: string[];
  hashtagGroups: {
    primary: string[];
    local: string[];
    service: string[];
    trending: string[];
  };
}

export interface BrandVoice {
  tone: string;
  personality: string[];
  avoidWords: string[];
}

export interface BrandData {
  id?: string;
  name: string;
  industry: string;
  description: string;
  targetAudience: string;
  uniqueValueProp: string;
  locations: Location[];
  postTemplate: PostTemplate;
  contentTopics: string[];
  brandVoice: BrandVoice;
}

export interface BrandSummary {
  id: string;
  name: string;
  industry: string;
  locationCount: number;
  contentTopicCount: number;
  createdAt: Date;
}

export class BrandManager {
  /**
   * Get all brands with summary information
   */
  async getAllBrandSummaries(): Promise<BrandSummary[]> {
    try {
      const brands = await DatabaseService.getAllBrands();
      return brands.map(brand => ({
        id: brand.id,
        name: brand.name,
        industry: brand.industry,
        locationCount: Array.isArray(brand.locations) ? brand.locations.length : 0,
        contentTopicCount: Array.isArray(brand.contentTopics) ? brand.contentTopics.length : 0,
        createdAt: brand.createdAt,
      }));
    } catch (error) {
      console.error('❌ Error fetching brand summaries:', error);
      throw new Error('Failed to fetch brand summaries');
    }
  }

  /**
   * Get detailed brand information
   */
  async getBrandDetails(brandId: string): Promise<any | null> {
    try {
      return await DatabaseService.getBrand(brandId);
    } catch (error) {
      console.error(`❌ Error fetching brand details for ${brandId}:`, error);
      throw new Error(`Failed to fetch brand details for ${brandId}`);
    }
  }

  /**
   * Get brand by name (case-insensitive search)
   */
  async findBrandByName(name: string): Promise<any | null> {
    try {
      // First try exact match
      let brand = await DatabaseService.getBrandByName(name);
      
      // If no exact match, try case-insensitive search
      if (!brand) {
        const allBrands = await DatabaseService.getAllBrands();
        brand = allBrands.find(b => 
          b.name.toLowerCase() === name.toLowerCase()
        ) || null;
      }
      
      return brand;
    } catch (error) {
      console.error(`❌ Error finding brand by name ${name}:`, error);
      throw new Error(`Failed to find brand by name: ${name}`);
    }
  }

  /**
   * Validate brand data before creation/update
   */
  validateBrandData(brandData: Partial<BrandData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!brandData.name?.trim()) {
      errors.push('Brand name is required');
    }

    if (!brandData.industry?.trim()) {
      errors.push('Industry is required');
    }

    if (!brandData.description?.trim()) {
      errors.push('Description is required');
    }

    if (!brandData.targetAudience?.trim()) {
      errors.push('Target audience is required');
    }

    if (!brandData.uniqueValueProp?.trim()) {
      errors.push('Unique value proposition is required');
    }

    // Locations validation
    if (!brandData.locations || !Array.isArray(brandData.locations) || brandData.locations.length === 0) {
      errors.push('At least one location is required');
    } else {
      brandData.locations.forEach((location, index) => {
        if (!location.name?.trim()) {
          errors.push(`Location ${index + 1}: Name is required`);
        }
        if (!location.phone?.trim()) {
          errors.push(`Location ${index + 1}: Phone is required`);
        }
        if (!location.address?.trim()) {
          errors.push(`Location ${index + 1}: Address is required`);
        }
        if (!location.city?.trim()) {
          errors.push(`Location ${index + 1}: City is required`);
        }
        if (!location.state?.trim()) {
          errors.push(`Location ${index + 1}: State is required`);
        }
      });
    }

    // Content topics validation
    if (!brandData.contentTopics || !Array.isArray(brandData.contentTopics) || brandData.contentTopics.length === 0) {
      errors.push('At least one content topic is required');
    }

    // Post template validation
    if (!brandData.postTemplate) {
      errors.push('Post template is required');
    } else {
      if (!brandData.postTemplate.structure?.trim()) {
        errors.push('Post template structure is required');
      }
      if (!brandData.postTemplate.toneGuidelines || brandData.postTemplate.toneGuidelines.length === 0) {
        errors.push('Post template tone guidelines are required');
      }
    }

    // Brand voice validation
    if (!brandData.brandVoice) {
      errors.push('Brand voice is required');
    } else {
      if (!brandData.brandVoice.tone?.trim()) {
        errors.push('Brand voice tone is required');
      }
      if (!brandData.brandVoice.personality || brandData.brandVoice.personality.length === 0) {
        errors.push('Brand voice personality traits are required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new brand with validation
   */
  async createBrand(brandData: BrandData): Promise<any> {
    const validation = this.validateBrandData(brandData);
    
    if (!validation.isValid) {
      const errorMessage = `Brand validation failed:\n${validation.errors.join('\n')}`;
      console.error('❌ Brand validation failed:', validation.errors);
      throw new Error(errorMessage);
    }

    // Check if brand name already exists
    const existingBrand = await this.findBrandByName(brandData.name);
    if (existingBrand) {
      throw new Error(`Brand with name "${brandData.name}" already exists`);
    }

    try {
      const brand = await DatabaseService.createBrand(brandData);
      console.log(`✅ Brand created successfully: ${brand.name}`);
      return brand;
    } catch (error) {
      console.error('❌ Error creating brand:', error);
      throw new Error(`Failed to create brand: ${brandData.name}`);
    }
  }

  /**
   * Update an existing brand with validation
   */
  async updateBrand(brandId: string, updates: Partial<BrandData>): Promise<any> {
    // Check if brand exists
    const existingBrand = await this.getBrandDetails(brandId);
    if (!existingBrand) {
      throw new Error(`Brand with ID "${brandId}" not found`);
    }

    // Merge existing data with updates for validation
    const mergedData = {
      ...existingBrand,
      ...updates,
    };

    const validation = this.validateBrandData(mergedData);
    if (!validation.isValid) {
      const errorMessage = `Brand validation failed:\n${validation.errors.join('\n')}`;
      console.error('❌ Brand validation failed:', validation.errors);
      throw new Error(errorMessage);
    }

    // Check if new name conflicts with existing brands (if name is being updated)
    if (updates.name && updates.name !== existingBrand.name) {
      const nameConflict = await this.findBrandByName(updates.name);
      if (nameConflict && nameConflict.id !== brandId) {
        throw new Error(`Brand with name "${updates.name}" already exists`);
      }
    }

    try {
      const brand = await DatabaseService.updateBrand(brandId, updates);
      console.log(`✅ Brand updated successfully: ${brand.name}`);
      return brand;
    } catch (error) {
      console.error(`❌ Error updating brand ${brandId}:`, error);
      throw new Error(`Failed to update brand: ${brandId}`);
    }
  }

  /**
   * Delete a brand with safety checks
   */
  async deleteBrand(brandId: string): Promise<void> {
    // Check if brand exists
    const existingBrand = await this.getBrandDetails(brandId);
    if (!existingBrand) {
      throw new Error(`Brand with ID "${brandId}" not found`);
    }

    // Check for associated posts
    const brandStats = await DatabaseService.getBrandStats(brandId);
    if (brandStats.totalPosts > 0) {
      console.log(`⚠️  Warning: Brand "${existingBrand.name}" has ${brandStats.totalPosts} associated posts that will be unlinked`);
    }

    try {
      await DatabaseService.deleteBrand(brandId);
      console.log(`✅ Brand deleted successfully: ${existingBrand.name}`);
    } catch (error) {
      console.error(`❌ Error deleting brand ${brandId}:`, error);
      throw new Error(`Failed to delete brand: ${existingBrand.name}`);
    }
  }

  /**
   * Get brand context for AI content generation
   */
  async getBrandContext(brandId: string): Promise<{
    brand: any;
    locations: Location[];
    contentTopics: string[];
    brandVoice: BrandVoice;
    postTemplate: PostTemplate;
  } | null> {
    try {
      const brand = await this.getBrandDetails(brandId);
      if (!brand) {
        return null;
      }

      return {
        brand,
        locations: brand.locations as Location[],
        contentTopics: brand.contentTopics as string[],
        brandVoice: brand.brandVoice as BrandVoice,
        postTemplate: brand.postTemplate as PostTemplate,
      };
    } catch (error) {
      console.error(`❌ Error fetching brand context for ${brandId}:`, error);
      throw new Error(`Failed to fetch brand context for ${brandId}`);
    }
  }

  /**
   * Search brands by keyword
   */
  async searchBrands(keyword: string): Promise<any[]> {
    try {
      const allBrands = await DatabaseService.getAllBrands();
      const searchTerm = keyword.toLowerCase();

      return allBrands.filter(brand => 
        brand.name.toLowerCase().includes(searchTerm) ||
        brand.industry.toLowerCase().includes(searchTerm) ||
        brand.description.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error(`❌ Error searching brands with keyword "${keyword}":`, error);
      throw new Error(`Failed to search brands with keyword: ${keyword}`);
    }
  }
}

export default new BrandManager(); 