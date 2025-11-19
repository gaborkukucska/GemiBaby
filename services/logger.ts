
import { LogEntry, LogLevel } from '../types';

type LogListener = (entry: LogEntry) => void;

class LoggerService {
  private listeners: LogListener[] = [];
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  public log(level: LogLevel, message: string, source: string = 'System', details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      level,
      message,
      source,
      details
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.listeners.forEach(l => l(entry));
    
    // Also output to console for devtools
    const style = level === 'ERROR' ? 'color: #ef4444' : level === 'WARN' ? 'color: #f59e0b' : 'color: #38bdf8';
    console.log(`%c[${source}] ${message}`, style, details || '');
  }

  public info(msg: string, source?: string, details?: any) { this.log('INFO', msg, source, details); }
  public warn(msg: string, source?: string, details?: any) { this.log('WARN', msg, source, details); }
  public error(msg: string, source?: string, details?: any) { this.log('ERROR', msg, source, details); }
  public debug(msg: string, source?: string, details?: any) { this.log('DEBUG', msg, source, details); }
  public system(msg: string, source?: string, details?: any) { this.log('SYSTEM', msg, source, details); }

  public subscribe(listener: LogListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getHistory() {
    return this.logs;
  }
}

export const logger = new LoggerService();
