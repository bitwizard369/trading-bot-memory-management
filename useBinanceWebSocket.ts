
import { useState, useEffect, useRef, useCallback } from 'react';
import { BinanceWebSocketService, checkBinanceAPIHealth } from '@/services/binanceWebSocket';

interface BinanceDepthEvent {
  e: string;
  E: number;
  s: string;
  U: number;
  u: number;
  b: [string, string][];
  a: [string, string][];
}

interface BinanceTickerEvent {
  e: string; // Event type (24hrTicker)
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w: string; // Weighted average price
  x: string; // Previous day's close price
  c: string; // Current day's close price (last price)
  Q: string; // Close trade's quantity
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade ID
  n: number; // Total number of trades
}

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId: number;
}

interface TickerData {
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  openPrice: number;
}

export const useBinanceWebSocket = (symbol: string = 'btcusdt') => {
  const [isConnected, setIsConnected] = useState(false);
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [], lastUpdateId: 0 });
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [latestUpdate, setLatestUpdate] = useState<BinanceDepthEvent | null>(null);
  const wsService = useRef<BinanceWebSocketService | null>(null);
  const updateCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);

  // Handle ticker updates for accurate pricing
  const handleTickerUpdate = useCallback((data: BinanceTickerEvent) => {
    setTickerData({
      lastPrice: parseFloat(data.c),
      priceChange: parseFloat(data.p),
      priceChangePercent: parseFloat(data.P),
      highPrice: parseFloat(data.h),
      lowPrice: parseFloat(data.l),
      volume: parseFloat(data.v),
      openPrice: parseFloat(data.o)
    });
  }, []);

  // Debounced update handler to prevent excessive re-renders
  const handleDepthUpdate = useCallback((data: BinanceDepthEvent) => {
    const now = Date.now();
    updateCountRef.current++;
    
    // MEMORY FIX: Increased throttling to reduce memory pressure
    if (now - lastUpdateTimeRef.current < 500) { // Max 2 updates per second (was 10)
      return;
    }
    
    lastUpdateTimeRef.current = now;
    setLatestUpdate(data);
    
    // Update order book with memory management
    setOrderBook(prev => {
      const newBids = [...prev.bids];
      const newAsks = [...prev.asks];

      // Process bid updates
      data.b.forEach(([price, quantity]) => {
        const priceNum = parseFloat(price);
        const quantityNum = parseFloat(quantity);
        const index = newBids.findIndex(bid => bid.price === priceNum);
        
        if (quantityNum === 0) {
          if (index !== -1) {
            newBids.splice(index, 1);
          }
        } else {
          if (index !== -1) {
            newBids[index].quantity = quantityNum;
          } else {
            newBids.push({ price: priceNum, quantity: quantityNum });
          }
        }
      });

      // Process ask updates
      data.a.forEach(([price, quantity]) => {
        const priceNum = parseFloat(price);
        const quantityNum = parseFloat(quantity);
        const index = newAsks.findIndex(ask => ask.price === priceNum);
        
        if (quantityNum === 0) {
          if (index !== -1) {
            newAsks.splice(index, 1);
          }
        } else {
          if (index !== -1) {
            newAsks[index].quantity = quantityNum;
          } else {
            newAsks.push({ price: priceNum, quantity: quantityNum });
          }
        }
      });

      // Sort and limit to prevent memory bloat
      newBids.sort((a, b) => b.price - a.price);
      newAsks.sort((a, b) => a.price - b.price);

      return {
        bids: newBids.slice(0, 20), // Strict memory limit
        asks: newAsks.slice(0, 20), // Strict memory limit
        lastUpdateId: data.u
      };
    });

    // Log performance metrics every 100 updates
    if (updateCountRef.current % 100 === 0) {
      console.log(`📊 Performance: ${updateCountRef.current} updates processed`);
    }
  }, []);

  const handleConnectionStatusChange = useCallback((status: boolean) => {
    setIsConnected(status);
    if (!status) {
      console.log('🔌 Connection lost - clearing stale data');
      // Clear stale data when disconnected
      setLatestUpdate(null);
      setTickerData(null);
    }
  }, []);

  const connect = useCallback(() => {
    console.log('🔄 Establishing WebSocket connection...');
    
    // Clean up existing connection
    if (wsService.current) {
      wsService.current.cleanup();
    }
    
    wsService.current = new BinanceWebSocketService(
      symbol,
      handleDepthUpdate,
      handleConnectionStatusChange,
      handleTickerUpdate
    );
    
    wsService.current.connect();
  }, [symbol, handleDepthUpdate, handleConnectionStatusChange, handleTickerUpdate]);

  const disconnect = useCallback(() => {
    console.log('🛑 Manually disconnecting WebSocket...');
    if (wsService.current) {
      wsService.current.cleanup();
      wsService.current = null;
    }
    
    // Reset state
    setOrderBook({ bids: [], asks: [], lastUpdateId: 0 });
    setTickerData(null);
    setLatestUpdate(null);
    updateCountRef.current = 0;
  }, []);

  const checkAPIHealth = useCallback(async () => {
    console.log('🏥 Checking API health...');
    const healthy = await checkBinanceAPIHealth();
    setApiHealthy(healthy);
    
    if (!healthy) {
      console.error('❌ API unhealthy - consider reconnecting');
    }
    
    return healthy;
  }, []);

  useEffect(() => {
    console.log('🚀 Initializing WebSocket connection...');
    
    // Check API health on mount
    checkAPIHealth();

    // Auto-connect with delay to prevent immediate reconnection loops
    const connectTimer = setTimeout(() => {
      connect();
    }, 1000);

    // Cleanup function with proper resource management
    return () => {
      console.log('🧹 Cleaning up WebSocket resources...');
      clearTimeout(connectTimer);
      
      if (wsService.current) {
        wsService.current.cleanup();
        wsService.current = null;
      }
      
      // Reset all state
      setIsConnected(false);
      setOrderBook({ bids: [], asks: [], lastUpdateId: 0 });
      setTickerData(null);
      setLatestUpdate(null);
      setApiHealthy(null);
      updateCountRef.current = 0;
    };
  }, [connect, checkAPIHealth]);

  // Performance monitoring
  useEffect(() => {
    const performanceTimer = setInterval(() => {
      if (updateCountRef.current > 0) {
        console.log(`📈 WebSocket Performance: ${updateCountRef.current} updates, Connected: ${isConnected}`);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(performanceTimer);
  }, [isConnected]);

  return {
    isConnected,
    orderBook,
    tickerData,
    apiHealthy,
    latestUpdate,
    connect,
    disconnect,
    checkAPIHealth,
    // Add performance metrics for debugging
    updateCount: updateCountRef.current,
    connectionStable: isConnected && updateCountRef.current > 0
  };
};
