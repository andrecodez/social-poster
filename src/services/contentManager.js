"use strict";
// src/services/contentManager.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentManager = void 0;
const client_1 = require("@prisma/client");
const aiContentService_1 = require("./aiContentService");
const logger_1 = require("../utils/logger");
class ContentManager {
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.aiService = new aiContentService_1.AIContentService();
    }
    /**
     * Generate and schedule a single piece of content
     */
    createScheduledContent(plan) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.info(`Creating scheduled content for ${plan.brandId} - ${plan.platform}`);
                // Generate content using AI
                const content = yield this.aiService.generateContent({
                    brandId: plan.brandId,
                    locationId: plan.locationId,
                    platform: plan.platform,
                    contentType: plan.contentType,
                    customPrompt: plan.customPrompt
                });
                // Create the full post content
                const fullContent = this.formatPostContent(content);
                // Save to database
                yield this.prisma.post.create({
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
                logger_1.logger.info(`Successfully created scheduled content for ${plan.brandId}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create scheduled content for ${plan.brandId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Generate weekly content for all brands and locations
     */
    generateWeeklyContent() {
        return __awaiter(this, void 0, void 0, function* () {
            const brands = ['comfortKeepers', 'advancedCare', 'amtran'];
            const platforms = ['facebook', 'instagram', 'linkedin'];
            logger_1.logger.info('Starting weekly content generation for all brands');
            for (const brandId of brands) {
                try {
                    yield this.generateBrandWeeklyContent({
                        brandId,
                        startDate: this.getNextMonday(),
                        platforms,
                        postsPerWeek: 1 // One post per week as requested
                    });
                }
                catch (error) {
                    logger_1.logger.error(`Failed to generate weekly content for ${brandId}:`, error);
                }
            }
            logger_1.logger.info('Completed weekly content generation');
        });
    }
    /**
     * Generate weekly content for a specific brand
     */
    generateBrandWeeklyContent(plan) {
        return __awaiter(this, void 0, void 0, function* () {
            const { brandConfigs } = yield Promise.resolve().then(() => __importStar(require('../config/brands')));
            const brand = brandConfigs[plan.brandId];
            if (!brand) {
                throw new Error(`Brand config not found for: ${plan.brandId}`);
            }
            logger_1.logger.info(`Generating weekly content for ${brand.name}`);
            // For each location of this brand
            for (const location of brand.locations) {
                // For each platform
                for (const platform of plan.platforms) {
                    // Schedule one post per week
                    const scheduledAt = this.getRandomTimeInWeek(plan.startDate);
                    const contentType = this.getRandomContentType();
                    yield this.createScheduledContent({
                        brandId: plan.brandId,
                        locationId: location.id,
                        platform,
                        scheduledAt,
                        contentType
                    });
                    // Small delay to avoid overwhelming the API
                    yield new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            logger_1.logger.info(`Completed weekly content generation for ${brand.name}`);
        });
    }
    /**
     * Generate content drafts for review (not scheduled)
     */
    generateContentDrafts(brandId_1) {
        return __awaiter(this, arguments, void 0, function* (brandId, count = 5) {
            const { brandConfigs } = yield Promise.resolve().then(() => __importStar(require('../config/brands')));
            const brand = brandConfigs[brandId];
            if (!brand) {
                throw new Error(`Brand config not found for: ${brandId}`);
            }
            const drafts = [];
            const platforms = ['facebook', 'instagram', 'linkedin'];
            const contentTypes = ['educational', 'promotional', 'community', 'seasonal'];
            for (let i = 0; i < count; i++) {
                const location = brand.locations[Math.floor(Math.random() * brand.locations.length)];
                const platform = platforms[Math.floor(Math.random() * platforms.length)];
                const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
                try {
                    const content = yield this.aiService.generateContent({
                        brandId,
                        locationId: location.id,
                        platform: platform,
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
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (error) {
                    logger_1.logger.error(`Failed to generate draft ${i + 1} for ${brandId}:`, error);
                }
            }
            return drafts;
        });
    }
    /**
     * Approve and schedule a draft
     */
    scheduleDraft(brandId, locationId, content, platform, scheduledAt) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullContent = this.formatPostContent(content);
            yield this.prisma.post.create({
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
            logger_1.logger.info(`Scheduled approved draft for ${brandId} - ${platform}`);
        });
    }
    formatPostContent(content) {
        const parts = [
            content.caption,
            '',
            content.callToAction,
            '',
            content.hashtags.join(' ')
        ];
        return parts.join('\n').trim();
    }
    getAccountId(brandId, locationId) {
        // Create a unique account ID based on brand and location
        return locationId ? `${brandId}-${locationId}` : brandId;
    }
    getNextMonday() {
        const date = new Date();
        const day = date.getDay();
        const daysUntilMonday = day === 0 ? 1 : 8 - day; // If Sunday, next day. Otherwise, days until next Monday
        date.setDate(date.getDate() + daysUntilMonday);
        date.setHours(9, 0, 0, 0); // Set to 9 AM
        return date;
    }
    getRandomTimeInWeek(startDate) {
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
    getRandomContentType() {
        const types = ['educational', 'promotional', 'community', 'seasonal'];
        return types[Math.floor(Math.random() * types.length)];
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prisma.$disconnect();
        });
    }
}
exports.ContentManager = ContentManager;
