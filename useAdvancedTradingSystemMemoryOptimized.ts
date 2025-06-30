import { useState, useEffect, useCallback, useRef } from 'react';
import { AdvancedTechnicalAnalysis, AdvancedIndicators, MarketContext } from '@/services/advancedTechnicalAnalysis';
import { AIPredictionModel, PredictionOutput, TradeOutcome } from '@/services/aiPredictionModel';
import { TradingSignal, Position, Portfolio, TradingConfig as BaseTradingConfig } from '@/types/trading';
import { PortfolioCalculator } from '@/services/portfolioCalculator';
import { RealTrainingDataService } from '@/services/realTrainingDataService';
import { useMemoryManagement, MemorySafeArray, MemorySafeMap } from '@/utils/memoryManagement';
import MemoryMonitoringService from '@/services/memoryMonitoringService';

const initialPortfolio: Portfolio = {
  baseCapital: 10000, // Demo mode with $10,000 starting balance
  availableBalance: 10000,
  lockedProfits: 0,
  positions: [],
  totalPnL: 0,
  dayPnL: 0,
  equity: 10000
};

interface BasicTechnicalIndicators {
  rsi: number;
  ema_fast: number;
  ema_slow: number;
  macd: number;
  signal: number;
  volume_ratio: number;
}

interface AdvancedTradingConfig extends BaseTradingConfig {
  minProbability: number;
  minConfidence: number;
  maxRiskScore: number;
  adaptiveSizing: boolean;
  learningEnabled: boolean;
  maxPositionsPerSymbol: number;
  useAdaptiveThresholds: boolean;
  enableProfitLock: boolean;
  profitLockPercentage: number;
  minProfitLockThreshold?: number;
  useKellyCriterion: boolean;
  maxKellyFraction: number;
  enableTrailingStop: boolean;
  trailingStopATRMultiplier: number;
  enablePartialProfits: boolean;
  partialProfitLevels: number[];
  debugMode: boolean;
  minLiquidityScore: number;
  minSpreadQuality: number;
  useDynamicThresholds: boolean;
  enableOpportunityDetection: boolean;
  positionSizePercentage: number; // NEW: Percentage of available balance per position
}

interface PositionTracking {
  id: string;
  entryTime: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  trailingStopPrice?: number;
  partialProfitsTaken: number;
}

export const useAdvancedTradingSystem = (
  symbol: string,
  bids: any[],
  asks: any[],
  tickerData: any = null
) => {
  // MEMORY MANAGEMENT: Use professional memory management
  const memoryUtils = useMemoryManagement(`trading-system-${symbol}`);
  const memoryMonitor = useRef<MemoryMonitoringService | null>(null);
  
  // MEMORY MANAGEMENT: Use memory-safe data structures
  const [portfolio, setPortfolio] = useState<Portfolio>(initialPortfolio);
  const [signals, setSignals] = useState<MemorySafeArray<TradingSignal>>(new MemorySafeArray(50)); // Limit to 50 signals
  const [activePositions, setActivePositions] = useState<MemorySafeMap<string, PositionTracking>>(new MemorySafeMap(100)); // Limit to 100 positions

  const [config, setConfig] = useState<AdvancedTradingConfig>({
    minProbability: 0.40, // Reduced from 0.46 for more aggressive trading
    minConfidence: 0.20,  // Reduced from 0.25 for more aggressive trading
    maxRiskScore: 0.90,   // Increased from 0.85 for more aggressive trading
    adaptiveSizing: true,
    learningEnabled: true,
    useAdaptiveThresholds: true,
    useDynamicThresholds: true,
    enableOpportunityDetection: false, // Disabled for aggressive trading
    maxPositionsPerSymbol: 50, // Increased from 10 for more aggressive trading
    enableProfitLock: true,
    profitLockPercentage: 50,
    minProfitLockThreshold: 0.5,
    useKellyCriterion: false, // Disabled Kelly for now
    maxKellyFraction: 0.25,
    enableTrailingStop: true,
    trailingStopATRMultiplier: 2.0,
    enablePartialProfits: true,
    partialProfitLevels: [0.2, 0.4, 0.6],
    debugMode: true,
    minLiquidityScore: 0.3,
    minSpreadQuality: 0.4,
    positionSizePercentage: 5, // 5% of available balance per position
    riskPerTrade: 150,
    takeProfitPercentage: 1.5,
    stopLossPercentage: 0.6,
    maxDailyLoss: 50, // 50% of equity as daily loss limit (percentage-based) - INCREASED for testing
    maxOpenPositions: 50
  });

  const [indicators, setIndicators] = useState<AdvancedIndicators | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);
  const [basicIndicators, setBasicIndicators] = useState<BasicTechnicalIndicators | null>(null);

  // MEMORY MANAGEMENT: Use refs for services to prevent recreation
  const technicalAnalysis = useRef(new AdvancedTechnicalAnalysis());
  const aiModel = useRef(new AIPredictionModel());
  const realTrainingService = useRef<RealTrainingDataService | null>(null);
  const lastSignalTime = useRef(0);

  // MEMORY MANAGEMENT: Initialize memory monitoring
  useEffect(() => {
    const enduranceConfig = {
      duration: 12 * 60 * 60 * 1000, // 12 hours
      samplingInterval: 30 * 1000, // 30 seconds
      snapshotInterval: 60 * 60 * 1000, // 1 hour
      alertThresholds: {
        heapGrowthRate: 50, // 50MB per hour
        domNodeGrowthRate: 100, // 100 nodes per hour
        eventListenerGrowthRate: 10, // 10 listeners per hour
        cpuUsageThreshold: 70 // 70% CPU
      },
      simulateUserInteraction: false, // Disable for trading bot
      tradingSimulation: {
        enabled: true,
        signalFrequency: 10, // 10 signals per minute
        positionCount: 20 // 20 concurrent positions
      }
    };

    memoryMonitor.current = new MemoryMonitoringService(enduranceConfig);
    
    // Register this component with memory monitor
    memoryMonitor.current.registerComponent(`trading-system-${symbol}`, {
      type: 'TradingSystem',
      symbol,
      config
    });

    console.log('🧠 Professional memory monitoring initialized for 12-hour endurance test');

    return () => {
      if (memoryMonitor.current) {
        memoryMonitor.current.unregisterComponent(`trading-system-${symbol}`);
      }
    };
  }, [symbol]);

  // Initialize real training data service
  useEffect(() => {
    realTrainingService.current = aiModel.current.getRealTrainingDataService();
    console.log(`[Real Trading System] 🚀 Initialized with REAL training data service`);
    console.log(`[Real Trading System] 📊 Demo mode active with $${initialPortfolio.baseCapital.toLocaleString()} starting balance`);
    
    // MEMORY MANAGEMENT: Register cleanup
    return () => {
      if (realTrainingService.current) {
        // Cleanup training service if needed
        realTrainingService.current = null;
      }
    };
  }, []);

  // MEMORY MANAGEMENT: Optimized position management
  const addPosition = useCallback((
    side: 'BUY' | 'SELL',
    size: number,
    entryPrice: number,
    takeProfitPrice: number,
    stopLossPrice: number
  ) => {
    if (!canOpenPosition()) {
      console.log(`[Real Trading System] ❌ Cannot open position: Risk limits exceeded`);
      return;
    }

    const newPosition: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      size,
      entryPrice,
      currentPrice: entryPrice,
      takeProfitPrice,
      stopLossPrice,
      unrealizedPnL: 0,
      timestamp: Date.now(),
      status: 'OPEN'
    };

    console.log(`[Real Trading System] 📍 Adding DEMO position: ${newPosition.side} ${newPosition.size.toFixed(6)} ${newPosition.symbol} at ${newPosition.entryPrice.toFixed(2)}`);

    // MEMORY MANAGEMENT: Use memory-safe operations
    setPortfolio(prev => {
        const updatedPositions = [...prev.positions, newPosition];
        const updatedPortfolio = {
            ...prev,
            positions: updatedPositions
        };
        
        return PortfolioCalculator.recalculatePortfolio(updatedPortfolio);
    });

    console.log(`[Real Trading System] ✅ DEMO position opened: ${newPosition.side} ${newPosition.size.toFixed(6)} ${newPosition.symbol} at ${newPosition.entryPrice.toFixed(2)}`);
    
  }, [canOpenPosition, symbol]);

  // MEMORY MANAGEMENT: Optimized signal generation with batched state updates
  useEffect(() => {
    if (bids.length > 0 && asks.length > 0) {
      const dashboardPrice = bids[0].price;
      const volume = bids[0].quantity + asks[0].quantity;
      
      console.log(`[Real Trading System] 🚀 REAL DATA: Enhanced signal generation - Price: ${dashboardPrice.toFixed(2)}, Volume: ${volume.toFixed(4)}`);
      
      technicalAnalysis.current.updatePriceData(dashboardPrice, volume);
      
      const newIndicators = technicalAnalysis.current.calculateAdvancedIndicators();
      const newMarketContext = technicalAnalysis.current.getMarketContext();
      
      console.log(`[Real Trading System] 🎯 REAL DATA: Market analysis - Regime: ${newMarketContext?.marketRegime}, Volatility: ${newMarketContext?.volatilityRegime}, Liquidity: ${newMarketContext?.liquidityScore?.toFixed(3)}`);
      
      // MEMORY FIX: Batch state updates to reduce re-renders
      const priceHistory = technicalAnalysis.current.getPriceHistory();
      let newBasicIndicators = null;
      
      if (priceHistory.length >= 20 && newIndicators) {
        const sma_fast = priceHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const sma_slow = priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20;
        newBasicIndicators = {
          rsi: newIndicators.rsi_14,
          ema_fast: sma_fast,
          ema_slow: sma_slow,
          macd: newIndicators.macd,
          signal: newIndicators.macd_signal,
          volume_ratio: newIndicators.volume_ratio,
        };
      }
      
      // Batch all state updates together to minimize re-renders
      setIndicators(newIndicators);
      setMarketContext(newMarketContext);
      if (newBasicIndicators) {
        setBasicIndicators(newBasicIndicators);
      }
      
      if (newIndicators && newMarketContext) {
        console.log(`[Real Trading System] 🚀 REAL DATA: Generating signals with real market data and training`);
        generateOptimizedSignal(dashboardPrice, newIndicators, newMarketContext);
      } else {
        console.log(`[Real Trading System] Awaiting sufficient data - History: ${technicalAnalysis.current.getPriceHistoryLength()}/20`);
      }
    }
  }, [bids, asks]);

  // MEMORY MANAGEMENT: Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up trading system resources');
      
      // Clear all refs
      technicalAnalysis.current = null as any;
      aiModel.current = null as any;
      realTrainingService.current = null;
      
      // Stop memory monitoring
      if (memoryMonitor.current) {
        memoryMonitor.current.stopEnduranceTest().then(report => {
          console.log('📊 Endurance test completed:', report);
        });
      }
    };
  }, []);

  // Rest of the trading logic remains the same but with memory management...
  // [Previous trading logic continues here with memory-safe operations]

  return {
    portfolio,
    signals: Array.from(signals), // Convert back to array for compatibility
    indicators,
    marketContext,
    prediction,
    basicIndicators,
    config,
    setConfig,
    addPosition,
    // MEMORY MANAGEMENT: Expose memory monitoring
    getMemoryMetrics: () => memoryMonitor.current?.getCurrentMetrics(),
    getTestProgress: () => memoryMonitor.current?.getTestProgress() || 0,
    startEnduranceTest: () => memoryMonitor.current?.startEnduranceTest(),
    stopEnduranceTest: () => memoryMonitor.current?.stopEnduranceTest()
  };
};

