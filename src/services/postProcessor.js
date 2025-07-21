"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostProcessor = void 0;
class PostProcessor {
    constructor() {
        // Platform-specific content limits
        this.platformLimits = {
            facebook: { textLimit: 2000, imageRequired: false },
            instagram: { textLimit: 2200, imageRequired: true },
            linkedin: { textLimit: 3000, imageRequired: false },
            x: { textLimit: 280, imageRequired: false },
            twitter: { textLimit: 280, imageRequired: false },
            tiktok: { textLimit: 150, imageRequired: true },
        };
    }
    /**
     * Process a single post with comprehensive validation and error handling
     */
    processPost(post) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                console.log(`\n🚀 Processing post ${post.id} for ${post.account.platform}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                // 1. Validate post content
                const validation = this.validatePost(post);
                if (!validation.isValid) {
                    const errorMsg = `Validation failed: ${validation.errors.join(', ')}`;
                    console.log(`❌ ${errorMsg}`);
                    return { success: false, error: errorMsg };
                }
                console.log('✅ Post validation passed');
                // 2. Log post details
                this.logPostDetails(post);
                // 3. Process based on platform
                const result = yield this.processForPlatform(post);
                const processingTime = Date.now() - startTime;
                console.log(`⏱️  Processing completed in ${processingTime}ms`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                return result;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const processingTime = Date.now() - startTime;
                console.error(`❌ Error processing post ${post.id} after ${processingTime}ms:`, errorMessage);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                return { success: false, error: errorMessage };
            }
        });
    }
    /**
     * Validate post content based on platform requirements
     */
    validatePost(post) {
        const errors = [];
        const platform = post.account.platform.toLowerCase();
        const limits = this.platformLimits[platform];
        if (!limits) {
            errors.push(`Unsupported platform: ${post.account.platform}`);
            return { isValid: false, errors };
        }
        // Check content length
        if (post.content.length > limits.textLimit) {
            errors.push(`Content too long: ${post.content.length}/${limits.textLimit} characters`);
        }
        // Check if content is not empty
        if (!post.content.trim()) {
            errors.push('Content cannot be empty');
        }
        // Check image requirements
        if (limits.imageRequired && !post.imageUrl) {
            errors.push(`${post.account.platform} requires an image`);
        }
        // Validate image URL if provided
        if (post.imageUrl && !this.isValidImageUrl(post.imageUrl)) {
            errors.push('Invalid image URL format');
        }
        // Check for API key
        if (!post.account.apiKey || post.account.apiKey.trim() === '') {
            errors.push('Missing API key for account');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Check if image URL is valid
     */
    isValidImageUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            return validExtensions.some(ext => parsedUrl.pathname.toLowerCase().endsWith(ext));
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Log detailed post information
     */
    logPostDetails(post) {
        console.log(`📋 Post ID: ${post.id}`);
        console.log(`🏢 Account: ${post.account.name} (${post.account.platform})`);
        console.log(`📅 Scheduled: ${post.scheduledAt.toLocaleString()}`);
        console.log(`📝 Content (${post.content.length} chars): ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`);
        if (post.imageUrl) {
            console.log(`🖼️  Image: ${post.imageUrl}`);
        }
        if (post.retryCount > 0) {
            console.log(`🔄 Retry attempt: ${post.retryCount}`);
            console.log(`⚠️  Last error: ${post.lastError}`);
        }
    }
    /**
     * Process post for specific platform
     */
    processForPlatform(post) {
        return __awaiter(this, void 0, void 0, function* () {
            const platform = post.account.platform.toLowerCase();
            // Add small delay between posts to avoid rate limiting
            yield this.addProcessingDelay();
            switch (platform) {
                case 'facebook':
                    return yield this.postToFacebook(post);
                case 'instagram':
                    return yield this.postToInstagram(post);
                case 'linkedin':
                    return yield this.postToLinkedIn(post);
                case 'x':
                case 'twitter':
                    return yield this.postToX(post);
                case 'tiktok':
                    return yield this.postToTikTok(post);
                default:
                    return { success: false, error: `Unsupported platform: ${post.account.platform}` };
            }
        });
    }
    /**
     * Add small delay between posts to prevent rate limiting
     */
    addProcessingDelay() {
        return __awaiter(this, void 0, void 0, function* () {
            // Random delay between 2-5 seconds to avoid rate limits
            const delay = Math.floor(Math.random() * 3000) + 2000;
            yield new Promise(resolve => setTimeout(resolve, delay));
        });
    }
    // Enhanced platform-specific posting methods
    postToFacebook(post) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📘 Posting to Facebook...');
            try {
                // TODO: Implement Facebook API call
                // For now, simulate with enhanced logging
                console.log('  • Preparing Facebook post payload');
                console.log('  • Authenticating with Facebook API');
                console.log('  • Uploading image (if provided)');
                console.log('  • Publishing post');
                // Simulate API call delay
                yield new Promise(resolve => setTimeout(resolve, 1500));
                console.log('✅ Successfully posted to Facebook');
                return {
                    success: true,
                    details: 'Mock Facebook post completed successfully'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Facebook API error: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        });
    }
    postToInstagram(post) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📷 Posting to Instagram...');
            try {
                // Instagram requires an image
                if (!post.imageUrl) {
                    return { success: false, error: 'Instagram posts require an image' };
                }
                console.log('  • Preparing Instagram media');
                console.log('  • Authenticating with Instagram Basic Display API');
                console.log('  • Creating media container');
                console.log('  • Publishing media');
                yield new Promise(resolve => setTimeout(resolve, 2000));
                console.log('✅ Successfully posted to Instagram');
                return {
                    success: true,
                    details: 'Mock Instagram post completed successfully'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Instagram API error: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        });
    }
    postToLinkedIn(post) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('💼 Posting to LinkedIn...');
            try {
                console.log('  • Preparing LinkedIn share');
                console.log('  • Authenticating with LinkedIn API');
                if (post.imageUrl) {
                    console.log('  • Uploading media asset');
                }
                console.log('  • Creating UGC post');
                yield new Promise(resolve => setTimeout(resolve, 1800));
                console.log('✅ Successfully posted to LinkedIn');
                return {
                    success: true,
                    details: 'Mock LinkedIn post completed successfully'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `LinkedIn API error: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        });
    }
    postToX(post) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🐦 Posting to X (Twitter)...');
            try {
                // Check character limit for X
                if (post.content.length > 280) {
                    return { success: false, error: 'Content exceeds X character limit (280)' };
                }
                console.log('  • Preparing X (Twitter) post');
                console.log('  • Authenticating with X API v2');
                if (post.imageUrl) {
                    console.log('  • Uploading media');
                }
                console.log('  • Publishing tweet');
                yield new Promise(resolve => setTimeout(resolve, 1200));
                console.log('✅ Successfully posted to X (Twitter)');
                return {
                    success: true,
                    details: 'Mock X (Twitter) post completed successfully'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `X API error: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        });
    }
    postToTikTok(post) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🎵 Posting to TikTok...');
            try {
                // TikTok requires video content
                if (!post.imageUrl) {
                    return { success: false, error: 'TikTok posts require video content' };
                }
                console.log('  • Preparing TikTok video upload');
                console.log('  • Authenticating with TikTok API');
                console.log('  • Uploading video content');
                console.log('  • Setting video metadata');
                console.log('  • Publishing video');
                yield new Promise(resolve => setTimeout(resolve, 3000));
                console.log('✅ Successfully posted to TikTok');
                return {
                    success: true,
                    details: 'Mock TikTok post completed successfully'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `TikTok API error: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        });
    }
}
exports.PostProcessor = PostProcessor;
exports.default = new PostProcessor();
