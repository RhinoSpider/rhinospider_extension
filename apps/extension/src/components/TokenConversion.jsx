import React, { useState, useEffect } from 'react';
import { Coins, ArrowRight, Info, AlertCircle } from 'lucide-react';

// token conversion component with fee structure
const TokenConversion = ({ points, walletConnected }) => {
  const [convertAmount, setConvertAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionHistory, setConversionHistory] = useState([]);
  const [showFeeInfo, setShowFeeInfo] = useState(false);

  // conversion rate: 1000 points = 1 RHINO token
  const CONVERSION_RATE = 1000;
  const EARLY_WITHDRAWAL_FEE = 0.05; // 5%
  const FEE_PERIOD_DAYS = 30;

  useEffect(() => {
    loadConversionHistory();
  }, []);

  const loadConversionHistory = async () => {
    try {
      const result = await chrome.storage.local.get(['conversionHistory']);
      if (result.conversionHistory) {
        setConversionHistory(result.conversionHistory);
      }
    } catch (error) {
      console.error('Error loading conversion history:', error);
    }
  };

  const calculateConversion = () => {
    const pointsToConvert = parseFloat(convertAmount) || 0;
    if (pointsToConvert <= 0) return { tokens: 0, fee: 0, net: 0 };

    const tokensGross = pointsToConvert / CONVERSION_RATE;

    // check if fee applies (earned within last 30 days)
    // for now we assume all points are recent, can be improved later
    const fee = tokensGross * EARLY_WITHDRAWAL_FEE;
    const tokensNet = tokensGross - fee;

    return {
      tokens: tokensGross.toFixed(4),
      fee: fee.toFixed(4),
      net: tokensNet.toFixed(4)
    };
  };

  const handleConvert = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    const pointsToConvert = parseFloat(convertAmount);
    if (!pointsToConvert || pointsToConvert <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (pointsToConvert > points) {
      alert('Insufficient points');
      return;
    }

    setIsConverting(true);
    try {
      const conversion = calculateConversion();

      // TODO: call canister to actually do the conversion
      // for now just simulate it
      const conversionRecord = {
        id: Date.now().toString(),
        points: pointsToConvert,
        tokensGross: parseFloat(conversion.tokens),
        fee: parseFloat(conversion.fee),
        tokensNet: parseFloat(conversion.net),
        timestamp: Date.now(),
        status: 'pending' // would be 'completed' after blockchain confirmation
      };

      const updatedHistory = [conversionRecord, ...conversionHistory].slice(0, 10);
      await chrome.storage.local.set({ conversionHistory: updatedHistory });
      setConversionHistory(updatedHistory);

      // clear input
      setConvertAmount('');

      alert(`Conversion initiated! You'll receive ${conversion.net} RHINO tokens (${conversion.fee} fee applied).`);
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Conversion failed. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const conversion = calculateConversion();

  return (
    <div className="space-y-4">
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-yellow-400" />
            <span className="text-sm font-medium">Convert Points</span>
          </div>
          <button
            onClick={() => setShowFeeInfo(!showFeeInfo)}
            className="text-gray-400 hover:text-white"
          >
            <Info size={14} />
          </button>
        </div>

        {showFeeInfo && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
            <div className="flex gap-2">
              <AlertCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-300 mb-1">
                  Conversion rate: 1,000 points = 1 RHINO token
                </p>
                <p className="text-blue-300">
                  Early withdrawal fee: 5% if converted within 30 days of earning
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Points to Convert
            </label>
            <div className="relative">
              <input
                type="number"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                disabled={!walletConnected}
              />
              <button
                onClick={() => setConvertAmount(points.toString())}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-400 hover:text-purple-300"
                disabled={!walletConnected}
              >
                MAX
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Available: {points.toLocaleString()} points
            </div>
          </div>

          {parseFloat(convertAmount) > 0 && (
            <div className="bg-white/5 rounded p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Tokens (gross):</span>
                <span>{conversion.tokens} RHINO</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Early withdrawal fee (5%):</span>
                <span>-{conversion.fee} RHINO</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-white/10">
                <span>You'll receive:</span>
                <span className="text-green-400">{conversion.net} RHINO</span>
              </div>
            </div>
          )}

          <button
            onClick={handleConvert}
            disabled={!walletConnected || isConverting || !convertAmount || parseFloat(convertAmount) <= 0}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 px-4 rounded transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            {isConverting ? 'Converting...' : (
              <>
                Convert to RHINO <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {conversionHistory.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Recent Conversions</h4>
          <div className="space-y-2">
            {conversionHistory.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex justify-between items-center text-xs bg-white/5 rounded p-2"
              >
                <div>
                  <div className="font-medium">
                    {record.points.toLocaleString()} pts → {record.tokensNet.toFixed(4)} RHINO
                  </div>
                  <div className="text-gray-500">
                    {new Date(record.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  record.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {record.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenConversion;
