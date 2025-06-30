import React, { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
}

const SystemHealthDebugPanel = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">System Logs</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('info')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'info' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'warning' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              Warning
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'error' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800'
              }`}
            >
              Error
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No logs available</div>
          ) : (
            logs
              .filter((log) => filter === 'all' || log.level === filter)
              .map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${getLogColor(log.level)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm">{log.message}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {log.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full uppercase">
                      {log.level}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800">API Status</h3>
            <p className="text-green-600">Operational</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800">Database</h3>
            <p className="text-green-600">Connected</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800">WebSocket</h3>
            <p className="text-yellow-600">Reconnecting...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthDebugPanel;
