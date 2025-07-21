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
exports.DatabaseService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DatabaseService {
    /**
     * Get all posts that are scheduled to be posted now or in the past
     */
    getScheduledPosts() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                const posts = yield prisma.post.findMany({
                    where: {
                        status: 'scheduled',
                        scheduledAt: {
                            lte: now,
                        },
                    },
                    include: {
                        account: true, // Include account info for posting
                    },
                    orderBy: {
                        scheduledAt: 'asc',
                    },
                });
                return posts;
            }
            catch (error) {
                console.error('Error fetching scheduled posts:', error);
                return [];
            }
        });
    }
    /**
     * Update a post status to posted
     */
    markPostAsPosted(postId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.post.update({
                    where: { id: postId },
                    data: {
                        status: 'posted',
                    },
                });
                console.log(`✅ Post ${postId} marked as posted`);
            }
            catch (error) {
                console.error(`❌ Error marking post ${postId} as posted:`, error);
            }
        });
    }
    /**
     * Update a post status to failed with error message
     */
    markPostAsFailed(postId, error) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.post.update({
                    where: { id: postId },
                    data: {
                        status: 'failed',
                    },
                });
                console.log(`❌ Post ${postId} marked as failed: ${error}`);
            }
            catch (dbError) {
                console.error(`❌ Error marking post ${postId} as failed:`, dbError);
            }
        });
    }
    /**
     * Close database connection
     */
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.$disconnect();
        });
    }
}
exports.DatabaseService = DatabaseService;
exports.default = new DatabaseService();
