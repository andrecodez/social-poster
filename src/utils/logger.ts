export class Logger {
    private static formatTime(): string {
      return new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  
    static info(message: string): void {
      console.log(`[${this.formatTime()}] ℹ️  ${message}`);
    }
  
    static success(message: string): void {
      console.log(`[${this.formatTime()}] ✅ ${message}`);
    }
  
    static error(message: string, error?: any): void {
      console.error(`[${this.formatTime()}] ❌ ${message}`);
      if (error) {
        console.error(error);
      }
    }
  
    static warn(message: string): void {
      console.warn(`[${this.formatTime()}] ⚠️  ${message}`);
    }
  
    static debug(message: string): void {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${this.formatTime()}] 🐛 ${message}`);
      }
    }
  }