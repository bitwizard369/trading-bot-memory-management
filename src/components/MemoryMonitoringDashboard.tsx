import React from 'react';
import type { MemoryMetrics } from '../services/memoryMonitoringService';
import { memoryMonitoringService } from '../services/memoryMonitoringService';

interface Props {}

const MemoryMonitoringDashboard = ({}: Props) => {
  const [metrics, setMetrics] = React.useState<MemoryMetrics>({
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
  });

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(memoryMonitoringService.getCurrentMetrics());
    };

    // Update metrics immediately and every 2 seconds
    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Memory Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-600">Heap Used</h3>
            <p className="text-3xl font-bold text-gray-800">
              {(metrics.heapUsed / (1024 * 1024)).toFixed(2)} MB
            </p>
            <p className="text-sm text-gray-500">
              of {(metrics.heapLimit / (1024 * 1024)).toFixed(2)} MB limit
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-600">DOM Nodes</h3>
            <p className="text-3xl font-bold text-gray-800">{metrics.domNodeCount}</p>
            <p className="text-sm text-gray-500">Active elements</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-600">CPU Usage</h3>
            <p className="text-3xl font-bold text-gray-800">{metrics.cpuUsage.toFixed(1)}%</p>
            <p className="text-sm text-gray-500">Current utilization</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">System Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-600">Components</h3>
            <p className="text-3xl font-bold text-gray-800">{metrics.componentCount}</p>
            <p className="text-sm text-gray-500">Active React components</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-600">Event Listeners</h3>
            <p className="text-3xl font-bold text-gray-800">{metrics.eventListenerCount}</p>
            <p className="text-sm text-gray-500">Registered handlers</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-600">WebSocket</h3>
            <p className="text-3xl font-bold text-gray-800">{metrics.webSocketConnections}</p>
            <p className="text-sm text-gray-500">Active connections</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-600">Timers</h3>
            <p className="text-3xl font-bold text-gray-800">{metrics.activeTimers}</p>
            <p className="text-sm text-gray-500">Active intervals/timeouts</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Memory Usage Chart</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="w-full h-full p-4">
            <div className="relative w-full h-full">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200"></div>
              <div 
                className="absolute bottom-0 left-0 bg-blue-500 h-1" 
                style={{ 
                  width: `${(metrics.heapUsed / metrics.heapLimit) * 100}%`,
                  transition: 'width 0.3s ease-in-out'
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Memory Alerts</h2>
        <div className="space-y-4">
          {metrics.heapUsed / metrics.heapLimit > 0.8 && (
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-red-800">Critical Memory Usage</h3>
                <p className="text-red-600">Memory usage is above 80% of heap limit</p>
              </div>
              <span className="px-3 py-1 text-red-800 text-sm font-semibold bg-red-100 rounded-full">
                Critical
              </span>
            </div>
          )}
          {metrics.cpuUsage > 80 && (
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-yellow-800">High CPU Usage</h3>
                <p className="text-yellow-600">CPU usage is above 80%</p>
              </div>
              <span className="px-3 py-1 text-yellow-800 text-sm font-semibold bg-yellow-100 rounded-full">
                Warning
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryMonitoringDashboard;
