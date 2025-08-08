import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import '../styles/rhinoscan.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Country coordinates for countries without specific node coordinates
const countryCoordinates = {
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

export const RhinoScan = () => {
  const [stats, setStats] = useState(null);
  const [geoData, setGeoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

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

      // Create agent with anonymous identity for query calls
      const agent = new HttpAgent({
        host: 'https://ic0.app',
      });

      // Consumer canister ID
      const consumerCanisterId = 'tgyl5-yyaaa-aaaaj-az4wq-cai';
      
      // Create actor with the consumer canister interface
      const idlFactory = ({ IDL }) => {
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
        consumerActor.getRhinoScanStats(),
        consumerActor.getNodeGeography(),
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
      let coords = null;
      
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
          <div class="rhinoscan-popup">
            <h3>${geo.country}</h3>
            ${geo.region ? `<p>Region: ${geo.region}</p>` : ''}
            <p>Nodes: <strong>${geo.nodeCount}</strong></p>
            <p>Data: <strong>${formatDataSize(Number(geo.dataVolumeKB))}</strong></p>
          </div>
        `);

        marker.addTo(map);
      }
    });

    mapRef.current = map;
  };

  const formatDataSize = (kb) => {
    if (kb < 1024) return `${kb} KB`;
    if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(2)} MB`;
    return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(Number(num));
  };

  const formatTimeAgo = (timestamp) => {
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
      <div className="rhinoscan-container">
        <div className="rhinoscan-loading">
          <div className="spinner"></div>
          <p>Loading RhinoScan data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rhinoscan-container">
        <div className="rhinoscan-error">
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rhinoscan-container">
      <div className="rhinoscan-header">
        <h1>RhinoScan</h1>
        <p>DePIN Explorer - Node Distribution & Contributions</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Nodes</div>
          <div className="stat-value">{stats ? formatNumber(stats.totalNodes) : '0'}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Active (24h)</div>
          <div className="stat-value active">{stats ? formatNumber(stats.activeNodes) : '0'}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Data Indexed</div>
          <div className="stat-value">{stats ? formatDataSize(Number(stats.totalDataVolumeKB)) : '0 KB'}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Countries</div>
          <div className="stat-value">{stats ? formatNumber(stats.countriesCount) : '0'}</div>
        </div>
      </div>

      {/* Map */}
      <div className="map-container">
        <div className="map-header">
          <h2>Geographic Distribution</h2>
        </div>
        <div ref={mapContainerRef} className="map-view" />
      </div>

      {/* Country Leaderboard */}
      <div className="leaderboard-container">
        <h2>Top Countries by Nodes</h2>
        <div className="leaderboard">
          {stats?.nodesByCountry.slice(0, 10).map(([country, count], index) => (
            <div key={country} className="leaderboard-item">
              <div className="leaderboard-rank">#{index + 1}</div>
              <div className="leaderboard-country">{country}</div>
              <div className="leaderboard-count">{formatNumber(count)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Links */}
      <div className="verification-container">
        <h3>Data Verification</h3>
        <div className="verification-links">
          <div className="verification-item">
            <span>Storage Canister:</span>
            <a 
              href="https://dashboard.internetcomputer.org/canister/hhaip-uiaaa-aaaao-a4khq-cai"
              target="_blank"
              rel="noopener noreferrer"
            >
              hhaip-uiaaa...
            </a>
          </div>
          <div className="verification-item">
            <span>Consumer Canister:</span>
            <a 
              href="https://dashboard.internetcomputer.org/canister/tgyl5-yyaaa-aaaaj-az4wq-cai"
              target="_blank"
              rel="noopener noreferrer"
            >
              tgyl5-yyaaa...
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};