import * as cron from 'node-cron';
import DatabaseService from '../services/database';
import PostProcessor from '../services/postProcessor';

interface SchedulingConfig {
  maxRetries: number;
  rateLimitDelayMs: number;
  duplicatePreventionMinutes: number;
  optimalPostingWindows: { [platform: string]: { start: number; end: number }[] };
}

export class PostScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isProcessing = false;
  private lastProcessedTime: Date | null = null;
  private postingQueue: Set<string> = new Set(); // Track posts being processed

  private config: SchedulingConfig = {
    maxRetries: 5,
    rateLimitDelayMs: 120000, // 2 minutes between posts
    duplicatePreventionMinutes: 30,
    optimalPostingWindows: {
      facebook: [{ start: 9, end: 10 }, { start: 15, end: 16 }, { start: 20, end: 21 }],
      instagram: [{ start: 11, end: 13 }, { start: 17, end: 19 }, { start: 21, end: 22 }],
      linkedin: [{ start: 8, end: 10 }, { start: 12, end: 14 }, { start: 17, end: 18 }],
      x: [{ start: 9, end: 10 }, { start: 12, end: 13 }, { start: 17, end: 18 }, { start: 20, end: 21 }],
      twitter: [{ start: 9, end: 10 }, { start: 12, end: 13 }, { start: 17, end: 18 }, { start: 20, end: 21 }],
      tiktok: [{ start: 18, end: 20 }, { start: 21, end: 23 }],
    },
  };

  /**
   * Start the scheduler - runs every minute to check for scheduled posts
   */
  start(): void {
    console.log('🔄 Starting enhanced post scheduler...');
    console.log('📊 Configuration:');
    console.log(`  • Max retries: ${this.config.maxRetries}`);
    console.log(`  • Rate limit delay: ${this.config.rateLimitDelayMs / 1000}s`);
    console.log(`  • Duplicate prevention: ${this.config.duplicatePreventionMinutes} minutes`);
    
    // Run every minute: '* * * * *'
    this.cronJob = cron.schedule('* * * * *', async () => {
      if (this.isProcessing) {
        console.log('⏳ Previous job still processing, skipping this cycle...');
        return;
      }

      this.isProcessing = true;
      try {
        await this.processScheduledPosts();
        await this.handleDeadLetterQueue();
      } finally {
        this.isProcessing = false;
        this.lastProcessedTime = new Date();
      }
    });

    console.log('✅ Enhanced scheduler started! Checking for posts every minute...');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.destroy();
      console.log('🛑 Enhanced scheduler stopped');
    }
  }

  /**
   * Process all scheduled posts with smart batching and retry logic
   */
  private async processScheduledPosts(): Promise<void> {
    try {
      const scheduledPosts = await DatabaseService.getScheduledPosts();
      
      if (scheduledPosts.length === 0) {
        // Don't log every minute if there are no posts - only log every 10 minutes
        const minutes = new Date().getMinutes();
        if (minutes % 10 === 0) {
          console.log('📭 No scheduled posts found');
        }
        return;
      }

      console.log(`\n📬 Found ${scheduledPosts.length} scheduled post(s) to process`);

      // Filter out posts that are already being processed
      const postsToProcess = scheduledPosts.filter(post => 
        !this.postingQueue.has(post.id.toString())
      );

      if (postsToProcess.length === 0) {
        console.log('⏳ All found posts are currently being processed');
        return;
      }

      // Smart batching: Group posts by platform and apply scheduling intelligence
      const batchedPosts = await this.smartBatchPosts(postsToProcess);
      
      console.log(`🧠 Smart batching resulted in ${batchedPosts.length} posts ready for processing`);

      for (const post of batchedPosts) {
        await this.processPostWithRetry(post);
      }

      console.log(`✅ Finished processing batch\n`);
    } catch (error) {
      console.error('❌ Error in processScheduledPosts:', error);
    }
  }

  /**
   * Smart batching logic to optimize posting schedule
   */
  private async smartBatchPosts(posts: any[]): Promise<any[]> {
    const batchedPosts: any[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    for (const post of posts) {
      // 1. Check if it's an optimal posting window
      if (!this.isOptimalPostingTime(post.account.platform, currentHour)) {
        console.log(`⏰ Post ${post.id} skipped - outside optimal posting window for ${post.account.platform}`);
        continue;
      }

      // 2. Check for duplicate prevention
      const isDuplicate = await this.checkForRecentDuplicates(post);
      if (isDuplicate) {
        console.log(`🚫 Post ${post.id} skipped - similar post recently processed`);
        continue;
      }

      // 3. Apply rate limiting
      if (this.shouldRateLimit()) {
        console.log(`🐌 Rate limiting applied - delaying post processing`);
        break; // Process remaining posts in next cycle
      }

      batchedPosts.push(post);
    }

    return batchedPosts;
  }

  /**
   * Check if current time is optimal for posting to specific platform
   */
  private isOptimalPostingTime(platform: string, currentHour: number): boolean {
    const windows = this.config.optimalPostingWindows[platform.toLowerCase()];
    if (!windows) return true; // If no windows defined, allow any time

    return windows.some(window => 
      currentHour >= window.start && currentHour <= window.end
    );
  }

  /**
   * Check for recent duplicate posts on the same platform
   */
  private async checkForRecentDuplicates(post: any): Promise<boolean> {
    try {
      const recentPosts = await DatabaseService.getRecentlyProcessedPosts(
        post.platform || post.account.platform,
        this.config.duplicatePreventionMinutes
      );

      // Simple content similarity check (could be enhanced with more sophisticated algorithms)
      return recentPosts.some(recentPost => 
        this.calculateContentSimilarity(post.content, recentPost.content) > 0.8
      );
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false; // If check fails, allow posting
    }
  }

  /**
   * Simple content similarity calculation
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    const words1 = content1.toLowerCase().split(/\s+/);
    const words2 = content2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Check if rate limiting should be applied
   */
  private shouldRateLimit(): boolean {
    if (!this.lastProcessedTime) return false;
    
    const timeSinceLastPost = Date.now() - this.lastProcessedTime.getTime();
    return timeSinceLastPost < this.config.rateLimitDelayMs;
  }

  /**
   * Process a single post with comprehensive retry logic
   */
  private async processPostWithRetry(post: any): Promise<void> {
    const postKey = post.id.toString();
    this.postingQueue.add(postKey);

    try {
      console.log(`\n🎯 Processing post ${post.id} (attempt ${post.retryCount + 1})`);
      
      const result = await PostProcessor.processPost(post);
      
      if (result.success) {
        await DatabaseService.markPostAsPosted(post.id);
        console.log(`✅ Post ${post.id} successfully posted`);
      } else {
        await this.handlePostFailure(post, result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handlePostFailure(post, errorMessage);
    } finally {
      this.postingQueue.delete(postKey);
    }
  }

  /**
   * Handle post processing failure with smart retry logic
   */
  private async handlePostFailure(post: any, error: string): Promise<void> {
    const currentRetryCount = post.retryCount || 0;
    
    if (currentRetryCount >= this.config.maxRetries) {
      console.log(`💀 Post ${post.id} exceeded max retries (${this.config.maxRetries}), marking as failed`);
      await DatabaseService.markPostAsFailed(post.id, `Max retries exceeded: ${error}`);
    } else {
      console.log(`🔄 Post ${post.id} failed, scheduling retry ${currentRetryCount + 1}/${this.config.maxRetries}`);
      await DatabaseService.scheduleRetry(post.id, error, currentRetryCount);
    }
  }

  /**
   * Handle dead letter queue - posts that have exceeded max retries
   */
  private async handleDeadLetterQueue(): Promise<void> {
    try {
      const deadLetterPosts = await DatabaseService.getDeadLetterPosts();
      
      if (deadLetterPosts.length > 0) {
        console.log(`\n💀 Processing ${deadLetterPosts.length} dead letter post(s)`);
        
        for (const post of deadLetterPosts) {
          await DatabaseService.markDeadLetterAsFailed(post.id);
        }
      }
    } catch (error) {
      console.error('❌ Error processing dead letter queue:', error);
    }
  }

  /**
   * Manual trigger for testing - process posts immediately
   */
  async triggerNow(): Promise<void> {
    console.log('🚀 Manually triggering enhanced post processing...');
    this.isProcessing = true;
    try {
      await this.processScheduledPosts();
      await this.handleDeadLetterQueue();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get scheduler status and statistics
   */
  getStatus(): any {
    return {
      isRunning: this.cronJob !== null,
      isProcessing: this.isProcessing,
      lastProcessedTime: this.lastProcessedTime,
      queueSize: this.postingQueue.size,
      config: this.config,
    };
  }
}

export default new PostScheduler();