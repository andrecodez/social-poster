"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostScheduler = void 0;
const cron = __importStar(require("node-cron"));
const database_1 = __importDefault(require("../services/database"));
const postProcessor_1 = __importDefault(require("../services/postProcessor"));
class PostScheduler {
    constructor() {
        this.cronJob = null;
        this.isProcessing = false;
        this.lastProcessedTime = null;
        this.postingQueue = new Set(); // Track posts being processed
        this.config = {
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
    }
    /**
     * Start the scheduler - runs every minute to check for scheduled posts
     */
    start() {
        console.log('🔄 Starting enhanced post scheduler...');
        console.log('📊 Configuration:');
        console.log(`  • Max retries: ${this.config.maxRetries}`);
        console.log(`  • Rate limit delay: ${this.config.rateLimitDelayMs / 1000}s`);
        console.log(`  • Duplicate prevention: ${this.config.duplicatePreventionMinutes} minutes`);
        // Run every minute: '* * * * *'
        this.cronJob = cron.schedule('* * * * *', () => __awaiter(this, void 0, void 0, function* () {
            if (this.isProcessing) {
                console.log('⏳ Previous job still processing, skipping this cycle...');
                return;
            }
            this.isProcessing = true;
            try {
                yield this.processScheduledPosts();
                yield this.handleDeadLetterQueue();
            }
            finally {
                this.isProcessing = false;
                this.lastProcessedTime = new Date();
            }
        }));
        console.log('✅ Enhanced scheduler started! Checking for posts every minute...');
    }
    /**
     * Stop the scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.destroy();
            console.log('🛑 Enhanced scheduler stopped');
        }
    }
    /**
     * Process all scheduled posts with smart batching and retry logic
     */
    processScheduledPosts() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const scheduledPosts = yield database_1.default.getScheduledPosts();
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
                const postsToProcess = scheduledPosts.filter(post => !this.postingQueue.has(post.id.toString()));
                if (postsToProcess.length === 0) {
                    console.log('⏳ All found posts are currently being processed');
                    return;
                }
                // Smart batching: Group posts by platform and apply scheduling intelligence
                const batchedPosts = yield this.smartBatchPosts(postsToProcess);
                console.log(`🧠 Smart batching resulted in ${batchedPosts.length} posts ready for processing`);
                for (const post of batchedPosts) {
                    yield this.processPostWithRetry(post);
                }
                console.log(`✅ Finished processing batch\n`);
            }
            catch (error) {
                console.error('❌ Error in processScheduledPosts:', error);
            }
        });
    }
    /**
     * Smart batching logic to optimize posting schedule
     */
    smartBatchPosts(posts) {
        return __awaiter(this, void 0, void 0, function* () {
            const batchedPosts = [];
            const now = new Date();
            const currentHour = now.getHours();
            for (const post of posts) {
                // 1. Check if it's an optimal posting window
                if (!this.isOptimalPostingTime(post.account.platform, currentHour)) {
                    console.log(`⏰ Post ${post.id} skipped - outside optimal posting window for ${post.account.platform}`);
                    continue;
                }
                // 2. Check for duplicate prevention
                const isDuplicate = yield this.checkForRecentDuplicates(post);
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
        });
    }
    /**
     * Check if current time is optimal for posting to specific platform
     */
    isOptimalPostingTime(platform, currentHour) {
        const windows = this.config.optimalPostingWindows[platform.toLowerCase()];
        if (!windows)
            return true; // If no windows defined, allow any time
        return windows.some(window => currentHour >= window.start && currentHour <= window.end);
    }
    /**
     * Check for recent duplicate posts on the same platform
     */
    checkForRecentDuplicates(post) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recentPosts = yield database_1.default.getRecentlyProcessedPosts(post.platform || post.account.platform, this.config.duplicatePreventionMinutes);
                // Simple content similarity check (could be enhanced with more sophisticated algorithms)
                return recentPosts.some(recentPost => this.calculateContentSimilarity(post.content, recentPost.content) > 0.8);
            }
            catch (error) {
                console.error('Error checking for duplicates:', error);
                return false; // If check fails, allow posting
            }
        });
    }
    /**
     * Simple content similarity calculation
     */
    calculateContentSimilarity(content1, content2) {
        const words1 = content1.toLowerCase().split(/\s+/);
        const words2 = content2.toLowerCase().split(/\s+/);
        const commonWords = words1.filter(word => words2.includes(word));
        const totalWords = Math.max(words1.length, words2.length);
        return totalWords > 0 ? commonWords.length / totalWords : 0;
    }
    /**
     * Check if rate limiting should be applied
     */
    shouldRateLimit() {
        if (!this.lastProcessedTime)
            return false;
        const timeSinceLastPost = Date.now() - this.lastProcessedTime.getTime();
        return timeSinceLastPost < this.config.rateLimitDelayMs;
    }
    /**
     * Process a single post with comprehensive retry logic
     */
    processPostWithRetry(post) {
        return __awaiter(this, void 0, void 0, function* () {
            const postKey = post.id.toString();
            this.postingQueue.add(postKey);
            try {
                console.log(`\n🎯 Processing post ${post.id} (attempt ${post.retryCount + 1})`);
                const result = yield postProcessor_1.default.processPost(post);
                if (result.success) {
                    yield database_1.default.markPostAsPosted(post.id);
                    console.log(`✅ Post ${post.id} successfully posted`);
                }
                else {
                    yield this.handlePostFailure(post, result.error || 'Unknown error');
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                yield this.handlePostFailure(post, errorMessage);
            }
            finally {
                this.postingQueue.delete(postKey);
            }
        });
    }
    /**
     * Handle post processing failure with smart retry logic
     */
    handlePostFailure(post, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentRetryCount = post.retryCount || 0;
            if (currentRetryCount >= this.config.maxRetries) {
                console.log(`💀 Post ${post.id} exceeded max retries (${this.config.maxRetries}), marking as failed`);
                yield database_1.default.markPostAsFailed(post.id, `Max retries exceeded: ${error}`);
            }
            else {
                console.log(`🔄 Post ${post.id} failed, scheduling retry ${currentRetryCount + 1}/${this.config.maxRetries}`);
                yield database_1.default.scheduleRetry(post.id, error, currentRetryCount);
            }
        });
    }
    /**
     * Handle dead letter queue - posts that have exceeded max retries
     */
    handleDeadLetterQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deadLetterPosts = yield database_1.default.getDeadLetterPosts();
                if (deadLetterPosts.length > 0) {
                    console.log(`\n💀 Processing ${deadLetterPosts.length} dead letter post(s)`);
                    for (const post of deadLetterPosts) {
                        yield database_1.default.markDeadLetterAsFailed(post.id);
                    }
                }
            }
            catch (error) {
                console.error('❌ Error processing dead letter queue:', error);
            }
        });
    }
    /**
     * Manual trigger for testing - process posts immediately
     */
    triggerNow() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🚀 Manually triggering enhanced post processing...');
            this.isProcessing = true;
            try {
                yield this.processScheduledPosts();
                yield this.handleDeadLetterQueue();
            }
            finally {
                this.isProcessing = false;
            }
        });
    }
    /**
     * Get scheduler status and statistics
     */
    getStatus() {
        return {
            isRunning: this.cronJob !== null,
            isProcessing: this.isProcessing,
            lastProcessedTime: this.lastProcessedTime,
            queueSize: this.postingQueue.size,
            config: this.config,
        };
    }
}
exports.PostScheduler = PostScheduler;
exports.default = new PostScheduler();
