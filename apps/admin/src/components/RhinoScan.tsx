import React, { useEffect, useState, useRef } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Types
interface RhinoScanStats {
  totalNodes: bigint;
  activeNodes: bigint;
  totalDataVolumeKB: bigint;
  countriesCount: bigint;
  nodesByCountry: Array<[string, bigint]>;
  recentActivity: Array<{
    principal: any;
    country: string | null;
    region: string | null;
    city: string | null;
    lastActive: bigint;
    dataVolumeKB: bigint;
  }>;
}

interface GeographicDistribution {
  country: string;
  region: string | null;
  nodeCount: bigint;
  dataVolumeKB: bigint;
  coordinates: { lat: number; lng: number } | null;
}

// Country coordinates for countries without specific node coordinates
const countryCoordinates: { [key: string]: [number, number] } = {
  'United States': [39.8283, -98.5795],
  'Canada': [56.1304, -106.3468],
  'United Kingdom': [55.3781, -3.4360],
  'Germany': [51.1657, 10.4515],
  'France': [46.2276, 2.2137],
  'Japan': [36.2048, 138.2529],
  'China': [35.8617, 104.1954],
  'India': [20.5937, 78.9629],
  'Brazil': [-14.2350, -51.9253],
  'Australia': [-25.2744, 133.7751],
  'Russia': [61.5240, 105.3188],
  'South Korea': [35.9078, 127.7669],
  'Mexico': [23.6345, -102.5528],
  'Spain': [40.4637, -3.7492],
  'Italy': [41.8719, 12.5674],
  'Netherlands': [52.1326, 5.2913],
  'Singapore': [1.3521, 103.8198],
  'Hong Kong': [22.3193, 114.1694],
  'Switzerland': [46.8182, 8.2275],
  'Sweden': [60.1282, 18.6435],
};

export const RhinoScan: React.FC = () => {
  const [stats, setStats] = useState<RhinoScanStats | null>(null);
  const [geoData, setGeoData] = useState<GeographicDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (geoData.length > 0 && mapContainerRef.current && !mapRef.current) {
      initializeMap();
    }
  }, [geoData]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const authClient = await AuthClient.create();
      const identity = authClient.getIdentity();
      
      const agent = new HttpAgent({
        identity,
        host: process.env.DFX_NETWORK === 'local' 
          ? 'http://localhost:4943' 
          : 'https://ic0.app',
      });

      if (process.env.DFX_NETWORK === 'local') {
        await agent.fetchRootKey();
      }

      // Consumer canister ID
      const consumerCanisterId = 'tgyl5-yyaaa-aaaaj-az4wq-cai';
      
      // Create actor with the consumer canister interface
      const idlFactory = ({ IDL }: any) => {
        const NodeActivity = IDL.Record({
          principal: IDL.Principal,
          country: IDL.Opt(IDL.Text),
          region: IDL.Opt(IDL.Text),
          city: IDL.Opt(IDL.Text),
          lastActive: IDL.Int,
          dataVolumeKB: IDL.Nat,
        });

        const RhinoScanStats = IDL.Record({
          totalNodes: IDL.Nat,
          activeNodes: IDL.Nat,
          totalDataVolumeKB: IDL.Nat,
          countriesCount: IDL.Nat,
          nodesByCountry: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat)),
          recentActivity: IDL.Vec(NodeActivity),
        });

        const GeographicDistribution = IDL.Record({
          country: IDL.Text,
          region: IDL.Opt(IDL.Text),
          nodeCount: IDL.Nat,
          dataVolumeKB: IDL.Nat,
          coordinates: IDL.Opt(IDL.Record({
            lat: IDL.Float64,
            lng: IDL.Float64,
          })),
        });

        return IDL.Service({
          getRhinoScanStats: IDL.Func([], [RhinoScanStats], ['query']),
          getNodeGeography: IDL.Func([], [IDL.Vec(GeographicDistribution)], ['query']),
        });
      };

      const consumerActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: consumerCanisterId,
      });

      // Fetch data
      const [statsData, geoDistribution] = await Promise.all([
        consumerActor.getRhinoScanStats() as Promise<RhinoScanStats>,
        consumerActor.getNodeGeography() as Promise<GeographicDistribution[]>,
      ]);

      setStats(statsData);
      setGeoData(geoDistribution);
    } catch (err) {
      console.error('Error loading RhinoScan data:', err);
      setError('Failed to load RhinoScan data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([20, 0], 2);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Add markers for each country
    geoData.forEach((geo) => {
      let coords: [number, number] | null = null;
      
      if (geo.coordinates) {
        coords = [geo.coordinates.lat, geo.coordinates.lng];
      } else if (countryCoordinates[geo.country]) {
        coords = countryCoordinates[geo.country];
      }

      if (coords) {
        const marker = L.circleMarker(coords, {
          radius: Math.min(20, Math.max(5, Number(geo.nodeCount) * 2)),
          fillColor: '#B692F6',
          color: '#360D68',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        });

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 10px 0; font-weight: bold;">${geo.country}</h3>
            ${geo.region ? `<p style="margin: 5px 0;">Region: ${geo.region}</p>` : ''}
            <p style="margin: 5px 0;">Nodes: <strong>${geo.nodeCount}</strong></p>
            <p style="margin: 5px 0;">Data Volume: <strong>${formatDataSize(Number(geo.dataVolumeKB))}</strong></p>
          </div>
        `);

        marker.addTo(map);
      }
    });

    mapRef.current = map;
  };

  const formatDataSize = (kb: number): string => {
    if (kb < 1024) return `${kb} KB`;
    if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(2)} MB`;
    return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
  };

  const formatNumber = (num: bigint): string => {
    return new Intl.NumberFormat().format(Number(num));
  };

  const formatTimeAgo = (timestamp: bigint): string => {
    const now = Date.now() * 1_000_000; // Convert to nanoseconds
    const diff = now - Number(timestamp);
    const seconds = Math.floor(diff / 1_000_000_000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading RhinoScan data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">RhinoScan</h1>
        <p className="text-gray-400">DePIN Explorer - Node Distribution & Contribution Analytics</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#360D68] rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Total Nodes</div>
          <div className="text-3xl font-bold text-white">
            {stats ? formatNumber(stats.totalNodes) : '0'}
          </div>
        </div>
        
        <div className="bg-[#360D68] rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Active Nodes (24h)</div>
          <div className="text-3xl font-bold text-green-400">
            {stats ? formatNumber(stats.activeNodes) : '0'}
          </div>
        </div>
        
        <div className="bg-[#360D68] rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Total Data Indexed</div>
          <div className="text-3xl font-bold text-white">
            {stats ? formatDataSize(Number(stats.totalDataVolumeKB)) : '0 KB'}
          </div>
        </div>
        
        <div className="bg-[#360D68] rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Countries/Regions</div>
          <div className="text-3xl font-bold text-white">
            {stats ? formatNumber(stats.countriesCount) : '0'}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-[#1E1E2E] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Geographic Distribution</h2>
        </div>
        <div ref={mapContainerRef} style={{ height: '500px', width: '100%' }} />
      </div>

      {/* Country Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1E1E2E] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Top Countries by Nodes</h2>
          <div className="space-y-3">
            {stats?.nodesByCountry.slice(0, 10).map(([country, count], index) => (
              <div key={country} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-400 w-6">#{index + 1}</span>
                  <span className="text-white">{country}</span>
                </div>
                <span className="text-[#B692F6] font-semibold">{formatNumber(count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#1E1E2E] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats?.recentActivity.map((activity, index) => (
              <div key={index} className="border-b border-gray-700 pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white text-sm">
                      {activity.city ? `${activity.city}, ` : ''}
                      {activity.region ? `${activity.region}, ` : ''}
                      {activity.country || 'Unknown'}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {formatDataSize(Number(activity.dataVolumeKB))} contributed
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs">
                    {formatTimeAgo(activity.lastActive)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Links */}
      <div className="bg-[#1E1E2E] rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Data Verification</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Storage Canister:</span>
            <a 
              href={`https://dashboard.internetcomputer.org/canister/hhaip-uiaaa-aaaao-a4khq-cai`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B692F6] hover:underline"
            >
              hhaip-uiaaa-aaaao-a4khq-cai
            </a>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Consumer Canister:</span>
            <a 
              href={`https://dashboard.internetcomputer.org/canister/tgyl5-yyaaa-aaaaj-az4wq-cai`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B692F6] hover:underline"
            >
              tgyl5-yyaaa-aaaaj-az4wq-cai
            </a>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Extension:</span>
            <a 
              href="https://chrome.google.com/webstore/detail/rhinospider"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B692F6] hover:underline"
            >
              Chrome Web Store
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};