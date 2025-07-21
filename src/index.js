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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const postScheduler_1 = __importDefault(require("./schedulers/postScheduler"));
const database_1 = __importDefault(require("./services/database"));
const logger_1 = require("./utils/logger");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.Logger.info('🚀 Starting Social Poster Application...');
            // Start the post scheduler
            postScheduler_1.default.start();
            logger_1.Logger.success('Application started successfully!');
            logger_1.Logger.info('Press Ctrl+C to stop the application');
            // Keep the application running
            process.on('SIGINT', () => __awaiter(this, void 0, void 0, function* () {
                logger_1.Logger.info('Shutting down gracefully...');
                // Stop the scheduler
                postScheduler_1.default.stop();
                // Close database connection
                yield database_1.default.disconnect();
                logger_1.Logger.success('Application stopped');
                process.exit(0);
            }));
        }
        catch (error) {
            logger_1.Logger.error('Failed to start application:', error);
            process.exit(1);
        }
    });
}
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger_1.Logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.Logger.error('Unhandled Rejection at:', promise);
    logger_1.Logger.error('Reason:', reason);
    process.exit(1);
});
main();
