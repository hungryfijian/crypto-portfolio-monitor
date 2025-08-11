// crypto-monitor.js - 24/7 Background Monitoring
const https = require('https');

// Configuration - Update these values
const CONFIG = {
  SHEETS_URL: 'https://script.google.com/macros/s/AKfycbydqPyO7H0AHPHMtEvgkBe_KF5Qy1L7nxG0uj9yCoqY7YSteIfTz7rqt-dM86UTmE3Z/exec',
  EMAIL: 'nandslab@gmail.com',
  CHECK_INTERVAL: 30000, // 30 seconds
  PORTFOLIO: [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      holdings: 6.84722883,
      targets: [
        { level: 1, price: 10500, percentage: 30, description: 'First profit target (2.5x)' },
        { level: 2, price: 25200, percentage: 40, description: 'Second profit target (6.0x)' },
        { level: 3, price: 33600, percentage: 30, description: 'Final profit target (8.0x)' }
      ]
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      holdings: 147.26348532,
      targets: [
        { level: 1, price: 900, percentage: 30, description: 'First profit target (5.0x)' },
        { level: 2, price: 1600, percentage: 40, description: 'Second profit target (8.8x)' },
        { level: 3, price: 2200, percentage: 30, description: 'Final profit target (12.1x)' }
      ]
    },
    {
      symbol: 'LINK',
      name: 'Chainlink',
      holdings: 763.90533,
      targets: [
        { level: 1, price: 67, percentage: 30, description: 'First profit target (3.0x)' },
        { level: 2, price: 112, percentage: 40, description: 'Second profit target (5.0x)' },
        { level: 3, price: 134, percentage: 30, description: 'Final profit target (6.0x)' }
      ]
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      holdings: 12189.717104,
      targets: [
        { level: 1, price: 2.40, percentage: 30, description: 'First profit target (3.0x)' },
        { level: 2, price: 3.20, percentage: 40, description: 'Second profit target (4.0x)' },
        { level: 3, price: 4.00, percentage: 30, description: 'Final profit target (5.0x)' }
      ]
    },
    {
      symbol: 'AAVE',
      name: 'Aave',
      holdings: 8.307386,
      targets: [
        { level: 1, price: 740, percentage: 30, description: 'First profit target (2.4x)' },
        { level: 2, price: 1230, percentage: 40, description: 'Second profit target (4.0x)' },
        { level: 3, price: 1540, percentage: 30, description: 'Final profit target (5.0x)' }
      ]
    },
    {
      symbol: 'XRP',
      name: 'XRP',
      holdings: 287.525101,
      targets: [
        { level: 1, price: 9.50, percentage: 100, description: 'Bull run target (3.0x) - Full position' }
      ]
    },
    {
      symbol: 'THETA',
      name: 'Theta Network',
      holdings: 456.3849,
      targets: [
        { level: 1, price: 4.30, percentage: 100, description: 'Bull run target (5.0x) - Full position' }
      ]
    },
    {
      symbol: 'VET',
      name: 'VeChain',
      holdings: 11087.888,
      targets: [
        { level: 1, price: 0.10, percentage: 100, description: 'Bull run target (4.0x) - Full position' }
      ]
    },
    {
      symbol: 'DOT',
      name: 'Polkadot',
      holdings: 37.87584,
      targets: [
        { level: 1, price: 16.00, percentage: 100, description: 'Bull run target (4.0x) - Full position' }
      ]
    },
    {
      symbol: 'ATOM',
      name: 'Cosmos',
      holdings: 17.94921,
      targets: [
        { level: 1, price: 23.00, percentage: 100, description: 'Bull run target (5.0x) - Full position' }
      ]
    }
  ]
};

// Store triggered alerts to avoid duplicates
let triggeredAlerts = new Set();

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Fetch current prices from CoinGecko
async function fetchPrices() {
  try {
    console.log(`[${new Date().toISOString()}] Fetching prices...`);
    
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana,chainlink,cardano,aave,ripple,theta-token,vechain,polkadot,cosmos&vs_currencies=usd&include_24hr_change=true';
    
    const data = await makeRequest(url);
    
    const priceMap = {
      'ETH': data.ethereum?.usd || 0,
      'SOL': data.solana?.usd || 0,
      'LINK': data.chainlink?.usd || 0,
      'ADA': data.cardano?.usd || 0,
      'AAVE': data.aave?.usd || 0,
      'XRP': data.ripple?.usd || 0,
      'THETA': data['theta-token']?.usd || 0,
      'VET': data.vechain?.usd || 0,
      'DOT': data.polkadot?.usd || 0,
      'ATOM': data.cosmos?.usd || 0
    };
    
    console.log('Current prices:', priceMap);
    return priceMap;
    
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {};
  }
}

// Check profit targets and send alerts
async function checkProfitTargets(prices) {
  for (const coin of CONFIG.PORTFOLIO) {
    const currentPrice = prices[coin.symbol];
    if (!currentPrice) continue;
    
    for (const target of coin.targets) {
      if (currentPrice >= target.price) {
        const alertId = `${coin.symbol}-${target.level}-${target.price}`;
        
        // Skip if already triggered
        if (triggeredAlerts.has(alertId)) continue;
        
        const profitValue = (coin.holdings * target.percentage / 100) * currentPrice;
        
        console.log(`🚀 PROFIT TARGET HIT: ${coin.symbol} reached $${currentPrice} (Target: $${target.price})`);
        
        await sendAlert({
          coin: coin.symbol,
          coinName: coin.name,
          currentPrice,
          target,
          profitValue,
          holdings: coin.holdings
        });
        
        // Mark as triggered
        triggeredAlerts.add(alertId);
      }
    }
  }
}

// Send alert to Google Sheets
async function sendAlert(alertData) {
  if (!CONFIG.SHEETS_URL || CONFIG.SHEETS_URL.includes('YOUR_GOOGLE')) {
    console.log('⚠️ Google Sheets URL not configured - skipping email alert');
    return;
  }
  
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      coin: alertData.coin,
      currentPrice: alertData.currentPrice,
      targetPrice: alertData.target.price,
      targetLevel: alertData.target.level,
      targetDescription: alertData.target.description,
      profitValue: alertData.profitValue,
      message: `🚀 PROFIT ALERT: ${alertData.coinName} (${alertData.coin}) reached $${alertData.currentPrice.toFixed(4)}!\n\nTarget: ${alertData.target.description}\nAction: Sell ${alertData.target.percentage}% of position (${(alertData.holdings * alertData.target.percentage / 100).toFixed(4)} ${alertData.coin})\nProfit Value: $${alertData.profitValue.toFixed(2)}`,
      email: CONFIG.EMAIL
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    };
    
    await makeRequest(CONFIG.SHEETS_URL, options);
    console.log('✅ Alert sent to Google Sheets successfully');
    
  } catch (error) {
    console.error('❌ Failed to send alert to Google Sheets:', error);
  }
}

// Main monitoring loop
async function startMonitoring() {
  console.log('🚀 Starting 24/7 Crypto Portfolio Monitor...');
  console.log(`📧 Email alerts will be sent to: ${CONFIG.EMAIL}`);
  console.log(`📊 Monitoring ${CONFIG.PORTFOLIO.length} coins`);
  console.log(`⏰ Check interval: ${CONFIG.CHECK_INTERVAL / 1000} seconds`);
  console.log('=' .repeat(50));
  
  // Initial check
  const prices = await fetchPrices();
  await checkProfitTargets(prices);
  
  // Set up interval for continuous monitoring
  setInterval(async () => {
    const prices = await fetchPrices();
    await checkProfitTargets(prices);
  }, CONFIG.CHECK_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping crypto monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping crypto monitor...');
  process.exit(0);
});

// Start monitoring if run directly
if (require.main === module) {
  startMonitoring();
}

module.exports = { startMonitoring, fetchPrices, checkProfitTargets };
