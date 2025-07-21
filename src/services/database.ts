import { PrismaClient, Post, Account } from '@prisma/client';

const prisma = new PrismaClient();

// Type for Post with Account relation
type PostWithAccount = Post & { account: Account };

export class DatabaseService {
  // ============================================
  // POST OPERATIONS (existing)
  // ============================================
  
  /**
   * Get all posts that are scheduled to be posted now or in the past
   * Includes posts ready for retry
   */
  async getScheduledPosts(): Promise<PostWithAccount[]> {
    try {
      const now = new Date();
      const posts = await prisma.post.findMany({
        where: {
          OR: [
            // Regular scheduled posts
            {
              status: 'scheduled',
              scheduledAt: {
                lte: now,
              },
            },
            // Posts ready for retry
            {
              status: 'retrying',
              nextRetryAt: {
                lte: now,
              },
            },
          ],
        },
        include: {
          account: true, // Include account info for posting
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });
      
      return posts;
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      return [];
    }
  }

  /**
   * Update a post status to posted
   */
  async markPostAsPosted(postId: number): Promise<void> {
    try {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'posted',
          postedAt: new Date(),
          processedAt: new Date(),
        },
      });
      console.log(`✅ Post ${postId} marked as posted`);
    } catch (error) {
      console.error(`❌ Error marking post ${postId} as posted:`, error);
    }
  }

  /**
   * Update a post status to failed with error message
   */
  async markPostAsFailed(postId: number, error: string): Promise<void> {
    try {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'failed',
          lastError: error,
          processedAt: new Date(),
        },
      });
      console.log(`❌ Post ${postId} marked as failed: ${error}`);
    } catch (dbError) {
      console.error(`❌ Error marking post ${postId} as failed:`, dbError);
    }
  }

  /**
   * Schedule a post for retry with exponential backoff
   */
  async scheduleRetry(postId: number, error: string, retryCount: number): Promise<void> {
    try {
      // Exponential backoff: 1min, 5min, 15min, 1hr, 6hr
      const backoffMinutes = [1, 5, 15, 60, 360];
      const nextRetryMinutes = backoffMinutes[Math.min(retryCount, backoffMinutes.length - 1)];
      const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000);

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'retrying',
          retryCount: retryCount + 1,
          lastError: error,
          nextRetryAt,
          processedAt: new Date(),
        },
      });
      
      console.log(`🔄 Post ${postId} scheduled for retry ${retryCount + 1} in ${nextRetryMinutes} minutes at ${nextRetryAt.toLocaleString()}`);
    } catch (dbError) {
      console.error(`❌ Error scheduling retry for post ${postId}:`, dbError);
    }
  }

  /**
   * Get posts that have exceeded max retry attempts for dead letter processing
   */
  async getDeadLetterPosts(): Promise<PostWithAccount[]> {
    try {
      const posts = await prisma.post.findMany({
        where: {
          status: 'retrying',
          retryCount: {
            gte: 5, // Max retry attempts
          },
        },
        include: {
          account: true,
        },
      });
      
      return posts;
    } catch (error) {
      console.error('Error fetching dead letter posts:', error);
      return [];
    }
  }

  /**
   * Mark dead letter posts as permanently failed
   */
  async markDeadLetterAsFailed(postId: number): Promise<void> {
    try {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'failed',
          processedAt: new Date(),
        },
      });
      console.log(`💀 Post ${postId} marked as permanently failed after max retries`);
    } catch (error) {
      console.error(`❌ Error marking dead letter post ${postId} as failed:`, error);
    }
  }

  // ============================================
  // BRAND OPERATIONS
  // ============================================

  /**
   * Create a new brand
   */
  async createBrand(brandData: {
    id?: string;
    name: string;
    industry: string;
    description: string;
    targetAudience: string;
    uniqueValueProp: string;
    locations: any;
    postTemplate: any;
    contentTopics: any;
    brandVoice: any;
  }): Promise<any> {
    try {
      const brand = await prisma.brand.create({
        data: brandData,
      });
      console.log(`✅ Brand created: ${brand.name} (${brand.id})`);
      return brand;
    } catch (error) {
      console.error('❌ Error creating brand:', error);
      throw error;
    }
  }

  /**
   * Get a brand by ID
   */
  async getBrand(id: string): Promise<any | null> {
    try {
      const brand = await prisma.brand.findUnique({
        where: { id },
      });
      return brand;
    } catch (error) {
      console.error(`❌ Error fetching brand ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a brand by name
   */
  async getBrandByName(name: string): Promise<any | null> {
    try {
      const brand = await prisma.brand.findUnique({
        where: { name },
      });
      return brand;
    } catch (error) {
      console.error(`❌ Error fetching brand by name ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get all brands
   */
  async getAllBrands(): Promise<any[]> {
    try {
      const brands = await prisma.brand.findMany({
        orderBy: {
          name: 'asc',
        },
      });
      return brands;
    } catch (error) {
      console.error('❌ Error fetching all brands:', error);
      throw error;
    }
  }

  /**
   * Update a brand
   */
  async updateBrand(id: string, updates: Partial<{
    name: string;
    industry: string;
    description: string;
    targetAudience: string;
    uniqueValueProp: string;
    locations: any;
    postTemplate: any;
    contentTopics: any;
    brandVoice: any;
  }>): Promise<any> {
    try {
      const brand = await prisma.brand.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Brand updated: ${brand.name} (${brand.id})`);
      return brand;
    } catch (error) {
      console.error(`❌ Error updating brand ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a brand
   */
  async deleteBrand(id: string): Promise<void> {
    try {
      // First, update all posts to remove brand association
      await prisma.post.updateMany({
        where: { brandId: id },
        data: { brandId: null },
      });

      // Then delete the brand
      await prisma.brand.delete({
        where: { id },
      });
      console.log(`✅ Brand deleted: ${id}`);
    } catch (error) {
      console.error(`❌ Error deleting brand ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get posts for a specific brand
   */
  async getPostsByBrand(brandId: string, limit?: number): Promise<PostWithAccount[]> {
    try {
      const posts = await prisma.post.findMany({
        where: { brandId },
        include: {
          account: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
      return posts;
    } catch (error) {
      console.error(`❌ Error fetching posts for brand ${brandId}:`, error);
      throw error;
    }
  }

  /**
   * Get brand statistics
   */
  async getBrandStats(brandId: string): Promise<{
    totalPosts: number;
    postedCount: number;
    scheduledCount: number;
    failedCount: number;
  }> {
    try {
      const [totalPosts, postedCount, scheduledCount, failedCount] = await Promise.all([
        prisma.post.count({ where: { brandId } }),
        prisma.post.count({ where: { brandId, status: 'posted' } }),
        prisma.post.count({ where: { brandId, status: 'scheduled' } }),
        prisma.post.count({ where: { brandId, status: 'failed' } }),
      ]);

      return {
        totalPosts,
        postedCount,
        scheduledCount,
        failedCount,
      };
    } catch (error) {
      console.error(`❌ Error fetching brand stats for ${brandId}:`, error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

// Export both the class and a default instance
export const databaseService = new DatabaseService();
export default databaseService;