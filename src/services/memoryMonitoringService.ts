export interface MemoryMetrics {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  domNodeCount: number;
  eventListenerCount: number;
  cpuUsage: number;
  componentCount: number;
  webSocketConnections: number;
  activeTimers: number;
}

class MemoryMonitoringService {
  private metrics: MemoryMetrics = {
    timestamp: Date.now(),
    heapUsed: 0,
    heapTotal: 0,
    heapLimit: 0,
    domNodeCount: 0,
    eventListenerCount: 0,
    cpuUsage: 0,
    componentCount: 0,
    webSocketConnections: 0,
    activeTimers: 0
  };

  private updateMetrics() {
    const memory = (performance as any).memory || {};
    const domNodes = document.querySelectorAll('*').length;
    
    this.metrics = {
      timestamp: Date.now(),
      heapUsed: memory.usedJSHeapSize || 0,
      heapTotal: memory.totalJSHeapSize || 0,
      heapLimit: memory.jsHeapSizeLimit || 0,
      domNodeCount: domNodes,
      eventListenerCount: this.getEventListenerCount(),
      cpuUsage: this.getCPUUsage(),
      componentCount: this.getComponentCount(),
      webSocketConnections: this.getWebSocketCount(),
      activeTimers: this.getActiveTimers()
    };
  }

  private getEventListenerCount(): number {
    // In a real implementation, this would track actual event listeners
    return 25;
  }

  private getCPUUsage(): number {
    // In a real implementation, this would use performance.now() to measure CPU time
    return Math.random() * 100;
  }

  private getComponentCount(): number {
    // In a real implementation, this would track React components
    return 15;
  }

  private getWebSocketCount(): number {
    // In a real implementation, this would track WebSocket connections
    return 1;
  }

  private getActiveTimers(): number {
    // In a real implementation, this would track setTimeout/setInterval
    return 5;
  }

  public getCurrentMetrics(): MemoryMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }
}

export const memoryMonitoringService = new MemoryMonitoringService();
export default memoryMonitoringService;
