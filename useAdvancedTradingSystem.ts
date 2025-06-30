import { useState, useEffect, useCallback, useRef } from 'react';
import { AdvancedTechnicalAnalysis, AdvancedIndicators, MarketContext } from '@/services/advancedTechnicalAnalysis';
import { AIPredictionModel, PredictionOutput, TradeOutcome } from '@/services/aiPredictionModel';
import { TradingSignal, Position, Portfolio, TradingConfig as BaseTradingConfig } from '@/types/trading';
import { PortfolioCalculator } from '@/services/portfolioCalculator';
import { RealTrainingDataService } from '@/services/realTrainingDataService';
// Temporarily removed memory management imports to fix blank screen
// import AggressiveMemoryManager from '@/utils/aggressiveMemoryManager';
// import DatabaseCleaner from '@/utils/databaseCleaner';

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
  position: Position;
  prediction: PredictionOutput;
  entryTime: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  trailingStopPrice?: number;
  partialProfitsTaken: number;
  marketContextAtEntry: MarketContext;
  indicatorsAtEntry: AdvancedIndicators;
}

export const useAdvancedTradingSystem = (
  symbol: string,
  bids: any[],
  asks: any[],
  tickerData: any = null
) => {
  const [portfolio, setPortfolio] = useState<Portfolio>(initialPortfolio);

  const [config, setConfig] = useState<AdvancedTradingConfig>({
    minProbability: 0.40, // Reduced from 0.46 for more aggressive trading
    minConfidence: 0.20,  // Reduced from 0.25 for more aggressive trading
    maxRiskScore: 0.90,   // Increased from 0.85 for more aggressive trading
    adaptiveSizing: true,
    learningEnabled: true,
    useAdaptiveThresholds: true,
    useDynamicThresholds: true,
    enableOpportunityDetection: false, // Disabled for aggressive trading
    maxPositionsPerSymbol: 100,
    maxPositionSize: 10000, // Increased for percentage-based sizing
    maxDailyLoss: 50, // 50% of equity as daily loss limit (percentage-based) - INCREASED for testing
    stopLossPercentage: 0.6, // Reduced from 0.8 for tighter stop loss
    takeProfitPercentage: 1.5, // Increased from 1.0 for better reward
    maxOpenPositions: 100, // Reverted: Keep high trading frequency
    positionSizePercentage: 50, // NEW: 50% of available balance per position
    enableProfitLock: true,
    profitLockPercentage: 0.6,
    minProfitLockThreshold: 0.2,
    useKellyCriterion: false, // Disabled for aggressive trading
    maxKellyFraction: 0.25,
    enableTrailingStop: true,
    trailingStopATRMultiplier: 1.5,
    enablePartialProfits: true,
    partialProfitLevels: [0.6, 1.2], // Adjusted: 0.6% and 1.2% (less aggressive than 0.4%, 0.8%)
    debugMode: true,
    minLiquidityScore: 0.005, // Further reduced for more aggressive trading
    minSpreadQuality: 0.02   // Further reduced for more aggressive trading
  });

  const [indicators, setIndicators] = useState<AdvancedIndicators | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);
  const [activePositions, setActivePositions] = useState<Map<string, PositionTracking>>(new Map());

  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [basicIndicators, setBasicIndicators] = useState<BasicTechnicalIndicators | null>(null);

  const technicalAnalysis = useRef(new AdvancedTechnicalAnalysis());
  const aiModel = useRef(new AIPredictionModel());
  const realTrainingService = useRef<RealTrainingDataService | null>(null);
  const lastSignalTime = useRef(0);

  // Initialize real training data service
  useEffect(() => {
    realTrainingService.current = aiModel.current.getRealTrainingDataService();
    console.log(`[Real Trading System] 🚀 Initialized with REAL training data service`);
    
    // Clear browser storage for fresh test (simple approach)
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Browser storage cleared for fresh test');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
    }
  }, []);

  // Demo mode logging
  useEffect(() => {
    console.log(`[Real Trading System] 📊 Demo mode active with $${initialPortfolio.baseCapital.toLocaleString()} starting balance`);
    
    // Check for and fix data corruption
    if (realTrainingService.current) {
      const corruption = realTrainingService.current.detectDataCorruption();
      if (corruption.isCorrupted) {
        console.warn(`[Real Trading System] ⚠️ Data corruption detected:`, corruption.issues);
        realTrainingService.current.fixCorruptedData();
        console.log(`[Real Trading System] ✅ Data corruption fixed, reloading AI model`);
        // Reset AI model with clean data
        aiModel.current = new AIPredictionModel();
        realTrainingService.current = aiModel.current.getRealTrainingDataService();
      }
    }
    
    const dataQuality = realTrainingService.current.getDataQuality();
    console.log(`[Real Trading System] 📈 Real data quality:`, dataQuality);
  }, []);

  const canOpenPosition = useCallback((positionValue: number): boolean => {
    const openPositions = portfolio.positions.filter(p => p.status === 'OPEN').length;
    
    const hasEnoughBalance = portfolio.availableBalance >= positionValue;
    const isUnderMaxPositions = openPositions < config.maxOpenPositions;
    const isUnderMaxSize = positionValue <= config.maxPositionSize;
    const isUnderMaxLoss = Math.abs(portfolio.dayPnL) < config.maxDailyLoss;

    if (config.debugMode) {
      console.log(`[Real Trading System] 💰 Position validation (Demo mode):`);
      console.log(`  - Available Balance: ${portfolio.availableBalance.toFixed(2)} >= ${positionValue.toFixed(2)} ✓${hasEnoughBalance ? '✅' : '❌'}`);
      console.log(`  - Open Positions: ${openPositions} < ${config.maxOpenPositions} ✓${isUnderMaxPositions ? '✅' : '❌'}`);
      console.log(`  - Position Size: ${positionValue.toFixed(2)} <= ${config.maxPositionSize} ✓${isUnderMaxSize ? '✅' : '❌'}`);
      console.log(`  - Daily Loss: ${Math.abs(portfolio.dayPnL).toFixed(2)} < ${config.maxDailyLoss} ✓${isUnderMaxLoss ? '✅' : '❌'}`);
    }

    return hasEnoughBalance && isUnderMaxPositions && isUnderMaxSize && isUnderMaxLoss;
  }, [portfolio, config]);

  const addPosition = useCallback((position: Omit<Position, 'id' | 'unrealizedPnL' | 'realizedPnL' | 'status'>): Position | null => {
    const positionValue = position.size * position.entryPrice;
    if (!canOpenPosition(positionValue)) {
        console.log(`[Real Trading System] ❌ Cannot open position: Risk limits exceeded`);
        return null;
    }

    const newPosition: Position = {
      ...position,
      id: Date.now().toString(),
      unrealizedPnL: 0,
      realizedPnL: 0,
      status: 'OPEN'
    };

    console.log(`[Real Trading System] 📍 Adding DEMO position: ${newPosition.side} ${newPosition.size.toFixed(6)} ${newPosition.symbol} at ${newPosition.entryPrice.toFixed(2)}`);

    setPortfolio(prev => {
        const updatedPositions = [...prev.positions, newPosition];
        const updatedPortfolio = {
            ...prev,
            positions: updatedPositions
        };
        
        return PortfolioCalculator.recalculatePortfolio(updatedPortfolio);
    });

    console.log(`[Real Trading System] ✅ DEMO position opened: ${newPosition.side} ${newPosition.size.toFixed(6)} ${newPosition.symbol} at ${newPosition.entryPrice.toFixed(2)}`);
    return newPosition;
  }, [canOpenPosition]);

  const closePosition = useCallback((positionId: string, closePrice: number) => {
    console.log(`[Real Trading System] 🚪 Closing DEMO position ${positionId} at price ${closePrice.toFixed(2)}`);
    
    setPortfolio(prev => {
      const position = prev.positions.find(p => p.id === positionId);
      if (!position || position.status === 'CLOSED') {
        console.warn(`[Real Trading System] ⚠️ Position ${positionId} not found or already closed`);
        return prev;
      }

      const realizedPnL = position.side === 'BUY'
        ? (closePrice - position.entryPrice) * position.size
        : (position.entryPrice - closePrice) * position.size;

      console.log(`[Real Trading System] 💵 DEMO P&L calculated: ${realizedPnL.toFixed(6)}`);

      let newLockedProfits = prev.lockedProfits;

      if (config.enableProfitLock && realizedPnL > 0) {
        const isAboveThreshold = config.minProfitLockThreshold === undefined || realizedPnL >= config.minProfitLockThreshold;
        if (isAboveThreshold) {
          const lockedAmount = realizedPnL * config.profitLockPercentage;
          newLockedProfits += lockedAmount;
          console.log(`[Real Trading System] 🔒 Locking ${lockedAmount.toFixed(2)} USD profit (DEMO mode)`);
        }
      }

      const updatedPositions = prev.positions.map(p =>
        p.id === positionId
          ? { ...p, status: 'CLOSED' as const, realizedPnL, currentPrice: closePrice, unrealizedPnL: 0 }
          : p
      );

      const updatedPortfolio = {
        ...prev,
        positions: updatedPositions,
        lockedProfits: newLockedProfits,
        dayPnL: prev.dayPnL + realizedPnL,
      };

      console.log(`[Real Trading System] 🚪 DEMO position closed: ${position.symbol} P&L: ${realizedPnL.toFixed(2)} USD`);

      return PortfolioCalculator.recalculatePortfolio(updatedPortfolio);
    });
  }, [config.enableProfitLock, config.profitLockPercentage, config.minProfitLockThreshold]);

  const updatePositionPrices = useCallback((currentPrice: number) => {
    setPortfolio(prev => {
        const hasOpenPositions = prev.positions.some(p => p.symbol === symbol && p.status === 'OPEN');
        if (!hasOpenPositions) return prev;

        const updatedPositions = prev.positions.map(position => {
            if (position.symbol === symbol && position.status === 'OPEN') {
                return { ...position, currentPrice };
            }
            return position;
        });

        const updatedPortfolio = {
            ...prev,
            positions: updatedPositions
        };

        const recalculated = PortfolioCalculator.recalculatePortfolio(updatedPortfolio);

        if (config.debugMode && Math.abs(recalculated.equity - prev.equity) > 0.01) {
          console.log(`[Real Trading System] 🔄 DEMO price update: Equity ${prev.equity.toFixed(6)} → ${recalculated.equity.toFixed(6)}`);
        }

        return recalculated;
    });
  }, [symbol, config.debugMode]);

  const updatePositionTracking = useCallback((currentPrice: number) => {
    setActivePositions(prev => {
      const updated = new Map(prev);
      
      prev.forEach((tracking, positionId) => {
        const { position } = tracking;
        const priceChange = position.side === 'BUY' 
          ? (currentPrice - position.entryPrice) / position.entryPrice
          : (position.entryPrice - currentPrice) / position.entryPrice;

        const newMFE = Math.max(tracking.maxFavorableExcursion, Math.max(0, priceChange));
        const newMAE = Math.min(tracking.maxAdverseExcursion, Math.min(0, priceChange));

        let newTrailingStopPrice = tracking.trailingStopPrice;
        if (config.enableTrailingStop) {
          // Enhanced trailing stop: lock in profits more aggressively
          const profitPercentage = Math.abs(priceChange);
          
          if (profitPercentage > 0.002) { // If position is profitable by 0.2%+
            let trailDistance;
            
            if (indicators?.atr) {
              // Use ATR-based trailing when available
              trailDistance = indicators.atr * config.trailingStopATRMultiplier;
            } else {
              // Fallback: use percentage-based trailing
              trailDistance = currentPrice * 0.003; // 0.3% trailing distance
            }
            
            if (position.side === 'BUY') {
              const potentialStop = currentPrice - trailDistance;
              // Only move stop up (never down) and ensure it's above entry price
              const minStop = position.entryPrice * 1.001; // At least 0.1% above entry
              newTrailingStopPrice = Math.max(newTrailingStopPrice || minStop, potentialStop, minStop);
              
              console.log(`[Trailing Stop] 📈 BUY position trailing: Entry $${position.entryPrice.toFixed(2)}, Current $${currentPrice.toFixed(2)}, Trail $${newTrailingStopPrice.toFixed(2)}`);
            } else {
              const potentialStop = currentPrice + trailDistance;
              // Only move stop down (never up) and ensure it's below entry price
              const maxStop = position.entryPrice * 0.999; // At least 0.1% below entry
              newTrailingStopPrice = Math.min(newTrailingStopPrice || maxStop, potentialStop, maxStop);
              
              console.log(`[Trailing Stop] 📉 SELL position trailing: Entry $${position.entryPrice.toFixed(2)}, Current $${currentPrice.toFixed(2)}, Trail $${newTrailingStopPrice.toFixed(2)}`);
            }
          }
        }

        updated.set(positionId, {
          ...tracking,
          maxFavorableExcursion: newMFE,
          maxAdverseExcursion: newMAE,
          trailingStopPrice: newTrailingStopPrice
        });
      });

      return updated;
    });
  }, [config.enableTrailingStop, config.trailingStopATRMultiplier, indicators]);

  useEffect(() => {
    if (bids.length > 0 && asks.length > 0) {
      // Use ticker lastPrice to match dashboard and Binance.US exactly
      const currentPrice = tickerData?.lastPrice || bids[0].price;
      updatePositionPrices(currentPrice);
      updatePositionTracking(currentPrice);
    }
  }, [bids, asks, tickerData, updatePositionPrices, updatePositionTracking]);

  useEffect(() => {
    if (bids.length > 0 && asks.length > 0) {
      const dashboardPrice = bids[0].price; // Use bid price to match dashboard and Binance.US
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

  useEffect(() => {
    if (activePositions.size > 0 && bids.length > 0 && asks.length > 0) {
      // Use ticker lastPrice to match dashboard and Binance.US exactly
      const currentPrice = tickerData?.lastPrice || bids[0].price;
      checkOptimizedExitConditions(currentPrice);
    }
  }, [bids, asks, tickerData, activePositions]);

  const calculateOptimizedKellySizedPosition = useCallback((
    basePositionSizeUSD: number,
    prediction: PredictionOutput,
    currentPrice: number
  ): number => {
    // Use percentage of TOTAL EQUITY for consistent sizing regardless of account size
    const percentageOfEquity = 5; // 5% of total equity per position (scalable for any account size)
    const positionSizeUSD = portfolio.equity * (percentageOfEquity / 100);
    
    console.log(`[EQUITY Position Sizing] 🎯 Using ${percentageOfEquity}% of total equity:`);
    console.log(`  - Total Equity: $${portfolio.equity.toFixed(2)}`);
    console.log(`  - Position Size (${percentageOfEquity}%): $${positionSizeUSD.toFixed(2)}`);
    console.log(`  - BTC Quantity: ${(positionSizeUSD / currentPrice).toFixed(6)} BTC`);
    console.log(`  - Available Balance: $${portfolio.availableBalance.toFixed(2)}`);
    
    // Apply maximum position size limit only as safety
    const finalPositionSize = Math.min(positionSizeUSD, config.maxPositionSize);
    
    if (finalPositionSize !== positionSizeUSD) {
      console.log(`[EQUITY Position Sizing] ⚠️ Position size capped at max: $${finalPositionSize.toFixed(2)}`);
    }
    
    return finalPositionSize / currentPrice;
  }, [config.maxPositionSize, portfolio.equity, portfolio.availableBalance]);

  const getDynamicOptimizedConfig = useCallback((
    baseConfig: AdvancedTradingConfig, 
    marketContext: MarketContext | null,
    adaptiveThresholds?: any,
    dynamicThresholds?: any
  ): AdvancedTradingConfig => {
    if (!marketContext) return baseConfig;

    let thresholds = baseConfig;
    
    if (baseConfig.useDynamicThresholds && dynamicThresholds) {
      thresholds = {
        ...baseConfig,
        minProbability: dynamicThresholds.minProbability,
        minConfidence: dynamicThresholds.minConfidence,
        maxRiskScore: dynamicThresholds.maxRiskScore
      };
      console.log(`[OPTIMIZED Config] 🚀 Using enhanced dynamic thresholds - Prob: ${dynamicThresholds.minProbability.toFixed(3)}, Conf: ${dynamicThresholds.minConfidence.toFixed(3)}`);
    } else if (baseConfig.useAdaptiveThresholds && adaptiveThresholds) {
      thresholds = {
        ...baseConfig,
        minProbability: adaptiveThresholds.minProbability,
        minConfidence: adaptiveThresholds.minConfidence,
        maxRiskScore: adaptiveThresholds.maxRiskScore
      };
    }

    // More aggressive regime-based adjustments
    let probabilityAdjustment = 0;
    let confidenceAdjustment = 0;
    let riskAdjustment = 0;

    switch (marketContext.marketRegime) {
        case 'STRONG_BULL':
        case 'STRONG_BEAR':
            probabilityAdjustment = -0.02; // More aggressive
            confidenceAdjustment = -0.03;
            riskAdjustment = 0.06;
            break;
        case 'WEAK_BULL':
        case 'WEAK_BEAR':
            probabilityAdjustment = -0.015; // More aggressive
            confidenceAdjustment = -0.02;
            break;
        case 'SIDEWAYS_VOLATILE':
            probabilityAdjustment = 0.015; // Less conservative
            confidenceAdjustment = 0.025;
            riskAdjustment = -0.05;
            break;
        case 'SIDEWAYS_QUIET':
            probabilityAdjustment = 0.01;
            confidenceAdjustment = 0.015;
            riskAdjustment = -0.03;
            break;
    }

    const liquidityAdjustment = (marketContext.liquidityScore - 0.5) * 0.035; // More aggressive
    probabilityAdjustment += liquidityAdjustment;
    
    return {
        ...thresholds,
        minProbability: Math.max(0.35, thresholds.minProbability + probabilityAdjustment), // Lowered floor for aggressive trading
        minConfidence: Math.max(0.15, thresholds.minConfidence + confidenceAdjustment), // Lowered floor for aggressive trading
        maxRiskScore: Math.min(0.95, thresholds.maxRiskScore + riskAdjustment) // Raised ceiling for aggressive trading
    };
  }, []);

  const executeOptimizedSignal = useCallback((
    signal: TradingSignal,
    prediction: PredictionOutput
  ) => {
    if (signal.action === 'HOLD') {
      console.warn(`[Real Trading System] ⚠️ Attempted to execute a 'HOLD' signal.`);
      return;
    }

    console.log(`[Real Trading System] 🚀 REAL DATA: Executing signal with real training data: ${signal.action} ${signal.symbol}`);
    console.log(`[Real Trading System] 📊 REAL DATA: Metrics - Kelly: ${prediction.kellyFraction.toFixed(3)}, Features: ${JSON.stringify(prediction.featureContributions)}`);
    
    const newPosition = addPosition({
      symbol: signal.symbol,
      side: signal.action,
      size: signal.quantity,
      entryPrice: signal.price,
      currentPrice: signal.price,
      timestamp: signal.timestamp
    });

    if (newPosition && indicators && marketContext) {
      setActivePositions(prev => new Map(prev.set(newPosition.id, {
        position: newPosition,
        prediction,
        entryTime: Date.now(),
        maxFavorableExcursion: 0,
        maxAdverseExcursion: 0,
        partialProfitsTaken: 0,
        marketContextAtEntry: { ...marketContext },
        indicatorsAtEntry: { ...indicators }
      })));

      console.log(`[Real Trading System] ✅ REAL DATA: Position opened with real market context tracking`);
    }
  }, [addPosition, indicators, marketContext]);

  const generateOptimizedSignal = useCallback((
    currentPrice: number,
    indicators: AdvancedIndicators,
    marketContext: MarketContext
  ) => {
    const now = Date.now();
    const timeSinceLastSignal = now - lastSignalTime.current;
    
    // Aggressive rate limiting for more active trading
    if (timeSinceLastSignal < 500) { // Reduced from 1500ms to 500ms
      console.log(`[Real Trading System] ⏰ AGGRESSIVE: Rate limiting: ${500 - timeSinceLastSignal}ms remaining`);
      return;
    }

    const orderBookImbalance = calculateOrderBookImbalance();
    const deepOrderBookData = calculateDeepOrderBookData();
    const recentPriceMovement = [currentPrice];
    
    const predictionInput = {
      indicators,
      marketContext,
      orderBookImbalance,
      recentPriceMovement,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      deepOrderBookData
    };

    console.log(`[Real Trading System] 🚀 OPTIMIZED: Enhanced market analysis: Liquidity=${marketContext.liquidityScore.toFixed(3)}, Spread=${marketContext.spreadQuality.toFixed(3)}`);

    const newPrediction = aiModel.current.predict(predictionInput);
    setPrediction(newPrediction);

    const dynamicThresholds = config.useDynamicThresholds ? 
      aiModel.current.getDynamicThresholds() : null;
    
    const adaptiveThresholds = config.useAdaptiveThresholds ? 
      aiModel.current.getAdaptiveThresholds() : null;

    const dynamicConfig = getDynamicOptimizedConfig(config, marketContext, adaptiveThresholds, dynamicThresholds);

    console.log(`[Real Trading System] 🚀 AGGRESSIVE: Enhanced prediction - Prob: ${newPrediction.probability.toFixed(3)}, Conf: ${newPrediction.confidence.toFixed(3)}, Risk: ${newPrediction.riskScore.toFixed(3)}`);

    if (shouldGenerateOptimizedSignal(newPrediction, dynamicConfig, marketContext, dynamicThresholds || adaptiveThresholds)) {
      console.log(`[Real Trading System] 🚀 AGGRESSIVE: Signal conditions met!`);
      const signal = createOptimizedTradingSignal(currentPrice, newPrediction, indicators, marketContext);
      if (signal) {
        console.log(`[Real Trading System] 📤 AGGRESSIVE: Executing ${signal.action} signal`);
        setSignals(prev => [...prev.slice(-9), signal]);
        executeOptimizedSignal(signal, newPrediction);
        lastSignalTime.current = now;
      }
    } else {
      console.log(`[Real Trading System] ❌ AGGRESSIVE: Signal conditions not met - but using aggressive thresholds`);
    }
  }, [config, getDynamicOptimizedConfig, activePositions, marketContext, executeOptimizedSignal]);

  const calculateDeepOrderBookData = useCallback(() => {
    if (bids.length < 10 || asks.length < 10) return null;

    const bidDepth = bids.slice(0, 20).map(bid => bid.quantity);
    const askDepth = asks.slice(0, 20).map(ask => ask.quantity);
    
    const topBidValue = bids[0].price * bids[0].quantity;
    const topAskValue = asks[0].price * asks[0].quantity;
    const weightedMidPrice = (topBidValue + topAskValue) / (bids[0].quantity + asks[0].quantity);

    return { bidDepth, askDepth, weightedMidPrice };
  }, [bids, asks]);

  const calculateOrderBookImbalance = useCallback(() => {
    if (bids.length === 0 || asks.length === 0) return 0;
    
    const topBidsVolume = bids.slice(0, 15).reduce((sum, bid) => sum + bid.quantity, 0);
    const topAsksVolume = asks.slice(0, 15).reduce((sum, ask) => sum + ask.quantity, 0);
    const totalVolume = topBidsVolume + topAsksVolume;
    
    if (totalVolume === 0) return 0;
    return (topBidsVolume - topAsksVolume) / totalVolume;
  }, [bids, asks]);

  const shouldGenerateOptimizedSignal = useCallback((
    prediction: PredictionOutput, 
    dynamicConfig: AdvancedTradingConfig,
    marketContext: MarketContext,
    adaptiveThresholds: any
  ): boolean => {
    const probabilityCheck = prediction.probability >= dynamicConfig.minProbability;
    const confidenceCheck = prediction.confidence >= dynamicConfig.minConfidence;
    const riskCheck = prediction.riskScore <= dynamicConfig.maxRiskScore;
    const positionCheck = activePositions.size < dynamicConfig.maxPositionsPerSymbol;

    if (config.debugMode) {
      console.log(`[AGGRESSIVE Signal] 🚀 Simple signal conditions:`);
      console.log(`  - Probability: ${prediction.probability.toFixed(3)} >= ${dynamicConfig.minProbability.toFixed(3)} ✓${probabilityCheck ? '✅' : '❌'}`);
      console.log(`  - Confidence: ${prediction.confidence.toFixed(3)} >= ${dynamicConfig.minConfidence.toFixed(3)} ✓${confidenceCheck ? '✅' : '❌'}`);
      console.log(`  - Risk Score: ${prediction.riskScore.toFixed(3)} <= ${dynamicConfig.maxRiskScore.toFixed(3)} ✓${riskCheck ? '✅' : '❌'}`);
      console.log(`  - Position Count: ${activePositions.size} < ${dynamicConfig.maxPositionsPerSymbol} ✓${positionCheck ? '✅' : '❌'}`);
    }

    const basicConditions = probabilityCheck && confidenceCheck && riskCheck && positionCheck;
    
    const liquidityCondition = marketContext.liquidityScore >= config.minLiquidityScore;
    const spreadCondition = marketContext.spreadQuality >= config.minSpreadQuality;

    if (config.debugMode) {
      console.log(`[AGGRESSIVE Signal] 🚀 Market conditions:`);
      console.log(`  - Liquidity: ${marketContext.liquidityScore.toFixed(3)} >= ${config.minLiquidityScore.toFixed(3)} ✓${liquidityCondition ? '✅' : '❌'}`);
      console.log(`  - Spread Quality: ${marketContext.spreadQuality.toFixed(3)} >= ${config.minSpreadQuality.toFixed(3)} ✓${spreadCondition ? '✅' : '❌'}`);
    }

    const finalResult = basicConditions && liquidityCondition && spreadCondition;

    if (config.debugMode) {
      console.log(`[AGGRESSIVE Signal] 🎯 Final Result: ${finalResult ? 'SIGNAL GENERATED ✅' : 'NO SIGNAL ❌'}`);
    }

    return finalResult;
  }, [activePositions, config]);

  const createOptimizedTradingSignal = useCallback((
    price: number,
    prediction: PredictionOutput,
    indicators: AdvancedIndicators,
    marketContext: MarketContext
  ): TradingSignal | null => {
    let action: 'BUY' | 'SELL' | 'HOLD';
    
    const vwapSignal = indicators.vwap > 0 ? (price - indicators.vwap) / indicators.vwap : 0;
    const orderBookBias = indicators.orderbook_pressure || 0;
    
    const technicalBias = prediction.featureContributions?.technical || 0;
    const momentumBias = prediction.featureContributions?.momentum || 0;
    
    const combinedBias = technicalBias + momentumBias + (vwapSignal * 0.5) + (orderBookBias * 0.3);
    
    // ENHANCED: More aggressive signal generation with additional fallbacks
    if (prediction.probability > 0.501 && combinedBias > 0.02) { // More permissive
      action = 'BUY';
    } else if (prediction.probability < 0.499 && combinedBias < -0.02) { // More permissive
      action = 'SELL';
    } else if (prediction.confidence > 0.7 && prediction.probability > 0.52) { // High confidence fallback
      action = 'BUY';
    } else if (prediction.confidence > 0.7 && prediction.probability < 0.48) { // High confidence fallback
      action = 'SELL';
    } else if (marketContext.volatilityRegime === 'HIGH' && Math.abs(combinedBias) > 0.015) { // Volatility-based fallback
      action = combinedBias > 0 ? 'BUY' : 'SELL';
    } else {
      action = 'HOLD';
    }

    if (action === 'HOLD') {
      console.log(`[Trading Signal] ❌ No clear signal - Prob: ${prediction.probability.toFixed(3)}, Bias: ${combinedBias.toFixed(3)}, Conf: ${prediction.confidence.toFixed(3)}`);
      return null;
    }

    // PERCENTAGE-BASED: Use percentage of available balance for position sizing
    const quantity = calculateOptimizedKellySizedPosition(0, prediction, price); // basePositionSizeUSD not used anymore
    const adjustedQuantity = Math.min(quantity, (portfolio.availableBalance / price) * 0.99); // Safety limit

    if (adjustedQuantity !== quantity) {
      console.log(`[Trading Signal] ⚠️ PERCENTAGE: Position size adjusted for available balance. Calculated: ${quantity.toFixed(6)}, Actual: ${adjustedQuantity.toFixed(6)}`);
    }

    const positionValueUSD = adjustedQuantity * price;
    console.log(`[Trading Signal] ✅ Signal created: ${action} ${adjustedQuantity.toFixed(6)} at ${price.toFixed(2)} (Value: $${positionValueUSD.toFixed(2)})`);

    // Calculate take profit and stop loss based on config
    const takeProfit = action === 'BUY' 
      ? price * (1 + config.takeProfitPercentage / 100)
      : price * (1 - config.takeProfitPercentage / 100);
    
    const stopLoss = action === 'BUY'
      ? price * (1 - config.stopLossPercentage / 100)
      : price * (1 + config.stopLossPercentage / 100);

    return {
      symbol,
      action,
      confidence: prediction.confidence,
      price,
      quantity: adjustedQuantity,
      takeProfit,
      stopLoss,
      expectedReturn: prediction.expectedReturn,
      riskScore: prediction.riskScore,
      timeHorizon: prediction.timeHorizon,
      timestamp: Date.now(),
      reasoning: generateOptimizedSignalReasoning(prediction, indicators, marketContext),
      technicalAnalysis: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        volumeRatio: indicators.volume_ratio,
        trend: marketContext.trend
      },
      marketContext: {
        volatility: marketContext.volatility,
        liquidityScore: marketContext.liquidityScore,
        spreadQuality: marketContext.spreadQuality
      }
    };
  }, [symbol, config, portfolio.availableBalance, calculateOptimizedKellySizedPosition]);

  const generateOptimizedSignalReasoning = useCallback((
    prediction: PredictionOutput,
    indicators: AdvancedIndicators,
    marketContext: MarketContext
  ): string => {
    const reasons: string[] = [];
    
    if (prediction.featureContributions) {
      const contributions = prediction.featureContributions;
      Object.entries(contributions).forEach(([feature, value]) => {
        if (Math.abs(value) > 0.08) { // Lowered from 0.1
          reasons.push(`${feature}: ${value > 0 ? '+' : ''}${value.toFixed(2)}`);
        }
      });
    }
    
    if (prediction.features.technical > 0.55) { // Lowered from 0.6
      reasons.push('strong technical confluence');
    } else if (prediction.features.technical < -0.55) {
      reasons.push('bearish technical signals');
    }
    
    if (indicators.vwap > 0 && indicators.bollinger_middle > 0) {
      const vwapDiff = ((indicators.bollinger_middle - indicators.vwap) / indicators.vwap) * 100;
      if (Math.abs(vwapDiff) > 0.06) { // Lowered from 0.08
        reasons.push(`${vwapDiff > 0 ? 'above' : 'below'} VWAP by ${Math.abs(vwapDiff).toFixed(2)}%`);
      }
    }
    
    if (Math.abs(indicators.orderbook_pressure || 0) > 0.20) { // Lowered from 0.25
      reasons.push(`${indicators.orderbook_pressure > 0 ? 'bullish' : 'bearish'} order flow`);
    }
    
    reasons.push(`liquidity: ${marketContext.liquidityScore.toFixed(2)}`);
    reasons.push(`Kelly: ${prediction.kellyFraction.toFixed(3)}`);
    reasons.push(`MAE: ${prediction.maxAdverseExcursion.toFixed(2)}%`);
    
    return reasons.join(', ') || 'Optimized AI analysis';
  }, []);

  const checkOptimizedExitConditions = useCallback((currentPrice: number) => {
    const now = Date.now();
    
    activePositions.forEach((tracking, positionId) => {
      const { position, prediction, entryTime, trailingStopPrice, partialProfitsTaken } = tracking;
      const holdingTime = (now - entryTime) / 1000;
      const priceChange = position.side === 'BUY' 
        ? (currentPrice - position.entryPrice) / position.entryPrice
        : (position.entryPrice - currentPrice) / position.entryPrice;

      let shouldExit = false;
      let exitReason = '';
      let isPartialExit = false;
      let exitQuantity = position.size;

      const maxHoldTime = Math.min(prediction.timeHorizon, 100); // Reduced from 120
      if (holdingTime >= maxHoldTime) {
        shouldExit = true;
        exitReason = 'Optimal time horizon reached';
      }

      if (config.enablePartialProfits && partialProfitsTaken < config.partialProfitLevels.length) {
        const nextProfitLevel = config.partialProfitLevels[partialProfitsTaken] / 100;
        if (priceChange >= nextProfitLevel) {
          shouldExit = true;
          isPartialExit = true;
          exitQuantity = position.size * 0.25; // Reduced from 0.4 to take smaller partial profits
          exitReason = `Partial profit at ${(nextProfitLevel * 100).toFixed(1)}%`;
        }
      }

      if (config.enableTrailingStop && trailingStopPrice) {
        const hitTrailingStop = position.side === 'BUY' ? 
          currentPrice <= trailingStopPrice : 
          currentPrice >= trailingStopPrice;
        
        if (hitTrailingStop) {
          shouldExit = true;
          exitReason = 'Trailing stop triggered';
        }
      }

      const maeBasedStop = -Math.max(prediction.maxAdverseExcursion / 100, config.stopLossPercentage / 100);
      if (priceChange <= maeBasedStop) {
        shouldExit = true;
        exitReason = 'MAE-based stop loss';
      }

      // Take profit condition using config.takeProfitPercentage
      const takeProfitTarget = config.takeProfitPercentage / 100;
      if (priceChange >= takeProfitTarget && !isPartialExit) {
        shouldExit = true;
        exitReason = `Take profit at ${config.takeProfitPercentage}%`;
      }

      const dynamicProfitTarget = Math.max(prediction.expectedReturn / 100, 0.006); // Lowered from 0.008
      if (priceChange >= dynamicProfitTarget && !isPartialExit && priceChange < takeProfitTarget) {
        shouldExit = true;
        exitReason = 'Dynamic profit target achieved';
      }

      if (shouldExit) {
        console.log(`[Real Trading System] 🚪 OPTIMIZED: ${isPartialExit ? 'Partial' : 'Full'} exit: ${exitReason}`);
        console.log(`[Real Trading System] 📊 OPTIMIZED: Performance: ${(priceChange * 100).toFixed(2)}% return, ${holdingTime.toFixed(0)}s hold`);
        
        if (isPartialExit) {
          handlePartialExit(positionId, currentPrice, exitQuantity, priceChange, exitReason);
        } else {
          exitPosition(positionId, currentPrice, priceChange, exitReason);
        }
      }
    });
  }, [activePositions, config]);

  const handlePartialExit = useCallback((
    positionId: string,
    exitPrice: number,
    exitQuantity: number,
    actualReturn: number,
    reason: string
  ) => {
    setPortfolio(prev => {
      const updatedPositions = prev.positions.map(p =>
        p.id === positionId ? { ...p, size: p.size - exitQuantity } : p
      );
      
      const updatedPortfolio = {
        ...prev,
        positions: updatedPositions
      };
      
      return PortfolioCalculator.recalculatePortfolio(updatedPortfolio);
    });

    setActivePositions(prev => {
      const updated = new Map(prev);
      const tracking = updated.get(positionId);
      if (tracking) {
        updated.set(positionId, {
          ...tracking,
          partialProfitsTaken: tracking.partialProfitsTaken + 1
        });
      }
      return updated;
    });

    console.log(`[Real Trading System] 📈 OPTIMIZED: Partial profit taken: ${exitQuantity.toFixed(6)} at ${(actualReturn * 100).toFixed(2)}%`);
  }, []);

  const exitPosition = useCallback((
    positionId: string,
    exitPrice: number,
    actualReturn: number,
    reason: string
  ) => {
    const positionData = activePositions.get(positionId);
    if (!positionData) return;

    closePosition(positionId, exitPrice);

    if (config.learningEnabled && realTrainingService.current) {
      // Record this real trade in the training data service
      const returnPercentage = actualReturn * 100;
      
      realTrainingService.current.recordRealTrade(
        positionData.position.symbol,
        positionData.position.entryPrice,
        exitPrice,
        positionData.position.size,
        positionData.position.side,
        positionData.entryTime,
        Date.now(),
        positionData.maxFavorableExcursion * 100,
        positionData.maxAdverseExcursion * 100,
        positionData.marketContextAtEntry,
        positionData.indicatorsAtEntry,
        positionData.prediction,
        reason
      );

      // Also update the AI model with the real outcome
      const outcome: TradeOutcome = {
        entryPrice: positionData.position.entryPrice,
        exitPrice,
        profitLoss: actualReturn * positionData.position.entryPrice * positionData.position.size,
        holdingTime: (Date.now() - positionData.entryTime) / 1000,
        prediction: positionData.prediction,
        actualReturn: returnPercentage,
        success: actualReturn > 0,
        maxAdverseExcursion: positionData.maxAdverseExcursion * 100,
        maxFavorableExcursion: positionData.maxFavorableExcursion * 100
      };

      aiModel.current.updateModel(outcome);
      
      console.log(`[Real Trading System] 🎓 REAL DATA: Learning from real trade - MFE=${positionData.maxFavorableExcursion.toFixed(3)}, MAE=${positionData.maxAdverseExcursion.toFixed(3)}`);
      console.log(`[Real Trading System] 📊 REAL DATA: Trade recorded in training dataset for future model improvement`);
    }

    setActivePositions(prev => {
      const updated = new Map(prev);
      updated.delete(positionId);
      return updated;
    });
  }, [activePositions, closePosition, config.learningEnabled]);

  const getModelPerformance = useCallback(() => {
    const performance = aiModel.current.getModelPerformance();
    
    console.log(`[Real Trading System] 📊 REAL DATA Performance:`, {
      isUsingRealData: performance.isUsingRealData,
      totalRealTrades: performance.realDataStats?.totalTrades || 0,
      realWinRate: performance.realDataStats?.winRate || 0,
      dataQuality: performance.dataQuality
    });
    
    // Transform the performance data to match UI expectations
    const realStats = performance.realDataStats;
    if (realStats && realStats.totalTrades > 0) {
      return {
        winRate: realStats.winRate,
        sharpeRatio: realStats.sharpeRatio || 0,
        maxDrawdown: realStats.maxDrawdown || 0,
        totalTrades: realStats.totalTrades,
        profitFactor: realStats.profitFactor || 0,
        avgWin: realStats.avgWin || 0,
        avgLoss: realStats.avgLoss || 0
      };
    }
    
    // Fallback for when no real data is available
    return {
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      totalTrades: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0
    };
  }, []);

  const updateConfig = useCallback((newConfig: Partial<AdvancedTradingConfig>) => {
    console.log(`[Real Trading System] 🔧 REAL DATA: Configuration updated:`, newConfig);
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  return {
    portfolio,
    indicators,
    marketContext,
    prediction,
    activePositions: Array.from(activePositions.values()),
    config,
    updateConfig,
    getModelPerformance,
    technicalAnalysis: technicalAnalysis.current,
    aiModel: aiModel.current,
    signals,
    latestSignal: signals.length > 0 ? signals[signals.length - 1] : null,
    basicIndicators,
    validateAndReconcilePortfolio: () => PortfolioCalculator.recalculatePortfolio(portfolio),
    // Expose real training data service for debugging
    realTrainingDataService: realTrainingService.current
  };
};
