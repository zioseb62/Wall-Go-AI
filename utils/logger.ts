
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: any;
}

class SystemLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 50;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  constructor() {
    this.info("Logger inizializzato", {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      online: navigator.onLine
    });
  }

  private addLog(level: LogLevel, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      details: details instanceof Error ? { name: details.name, message: details.message, stack: details.stack } : details
    };
    
    this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
    try { try { console[level]('[WallGo ' + level.toUpperCase() + '] ' + message, details || ''); } catch (e) {} } catch (e) {}
    this.notify();
  }

  info(msg: string, details?: any) { this.addLog('info', msg, details); }
  warn(msg: string, details?: any) { this.addLog('warn', msg, details); }
  error(msg: string, details?: any) { this.addLog('error', msg, details); }
  debug(msg: string, details?: any) { this.addLog('debug', msg, details); }

  getLogs() { return this.logs; }

  subscribe(callback: (logs: LogEntry[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }

  clear() {
    this.logs = [];
    this.notify();
  }

  getRawText() {
    return this.logs
      .map(l => `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`)
      .join('\n');
  }
}

export const Logger = new SystemLogger();
