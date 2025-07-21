"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static formatTime() {
        return new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    static info(message) {
        console.log(`[${this.formatTime()}] ℹ️  ${message}`);
    }
    static success(message) {
        console.log(`[${this.formatTime()}] ✅ ${message}`);
    }
    static error(message, error) {
        console.error(`[${this.formatTime()}] ❌ ${message}`);
        if (error) {
            console.error(error);
        }
    }
    static warn(message) {
        console.warn(`[${this.formatTime()}] ⚠️  ${message}`);
    }
    static debug(message) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${this.formatTime()}] 🐛 ${message}`);
        }
    }
}
exports.Logger = Logger;
