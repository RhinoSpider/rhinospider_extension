import React, { useState, useEffect } from 'react';
import { Wallet, ExternalLink, Copy, CheckCircle } from 'lucide-react';

// wallet connect component for ICP wallets
const WalletConnect = ({ onConnect, onDisconnect }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    // check if wallet is already connected
    loadWalletFromStorage();
  }, []);

  const loadWalletFromStorage = async () => {
    try {
      const result = await chrome.storage.local.get(['connectedWallet']);
      if (result.connectedWallet) {
        setWalletAddress(result.connectedWallet.address);
        setBalance(result.connectedWallet.balance || '0');
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // check if Plug wallet is available
      if (window.ic && window.ic.plug) {
        const connected = await window.ic.plug.requestConnect({
          whitelist: [
            'hhaip-uiaaa-aaaao-a4khq-cai', // storage
            't3pjp-kqaaa-aaaao-a4ooq-cai', // consumer
          ],
        });

        if (connected) {
          const principal = await window.ic.plug.agent.getPrincipal();
          const address = principal.toString();

          // get ICP balance
          const balanceResult = await window.ic.plug.requestBalance();
          const icpBalance = balanceResult[0]?.amount || 0;

          const walletData = {
            address,
            balance: (icpBalance / 100000000).toFixed(4), // convert e8s to ICP
            provider: 'plug',
            connectedAt: Date.now()
          };

          await chrome.storage.local.set({ connectedWallet: walletData });
          setWalletAddress(address);
          setBalance(walletData.balance);

          if (onConnect) onConnect(walletData);
        }
      } else {
        // if Plug not available, guide user
        window.open('https://plugwallet.ooo/', '_blank');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      alert('Failed to connect wallet. Make sure Plug wallet is installed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await chrome.storage.local.remove(['connectedWallet']);
      setWalletAddress(null);
      setBalance('0');
      if (onDisconnect) onDisconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  if (walletAddress) {
    return (
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-green-400" />
            <span className="text-sm font-medium">Wallet Connected</span>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Disconnect
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between bg-white/5 rounded p-2">
            <span className="text-xs font-mono">{shortenAddress(walletAddress)}</span>
            <button onClick={copyAddress} className="hover:bg-white/10 rounded p-1">
              {copied ? (
                <CheckCircle size={14} className="text-green-400" />
              ) : (
                <Copy size={14} className="text-gray-400" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">ICP Balance:</span>
            <span className="font-medium">{balance} ICP</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={16} className="text-gray-400" />
        <span className="text-sm font-medium">Connect Wallet</span>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Connect your ICP wallet to convert points to $RHINO tokens
      </p>

      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white py-2 px-4 rounded transition-all text-sm font-medium"
      >
        {isConnecting ? 'Connecting...' : 'Connect Plug Wallet'}
      </button>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Don't have Plug?{' '}
        <a
          href="https://plugwallet.ooo/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
        >
          Get it here <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
};

export default WalletConnect;
