import React, { useState, useEffect } from 'react';
import { getAdminActor } from '../lib/admin';
import { NodeCharacteristics } from '../types';
import { Principal } from '@dfinity/principal';

export const Nodes: React.FC = () => {
  const [nodes, setNodes] = useState<NodeCharacteristics[]>([]);
  const [newNode, setNewNode] = useState<NodeCharacteristics>({
    ipAddress: '',
    region: '',
    percentageNodes: 0,
    randomizationMode: 'none',
  });
  const [newNodePrincipal, setNewNodePrincipal] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminActor = getAdminActor();
      const result = await adminActor.getRegisteredNodes(); // Assuming this function exists
      if ('ok' in result) {
        setNodes(result.ok);
      } else {
        setError(result.err);
      }
    } catch (err) {
      console.error("Failed to fetch nodes:", err);
      setError("Failed to fetch nodes.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNode = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminActor = getAdminActor();
      const principal = Principal.fromText(newNodePrincipal);
      const result = await adminActor.registerNode(principal, newNode);
      if ('ok' in result) {
        console.log("Node registered successfully!");
        fetchNodes();
        setNewNode({ ipAddress: '', region: '', percentageNodes: 0, randomizationMode: 'none' });
        setNewNodePrincipal('');
      } else {
        setError(result.err);
      }
    } catch (err) {
      console.error("Failed to register node:", err);
      setError("Failed to register node.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Registered Nodes</h1>
        <button
          onClick={handleRegisterNode}
          disabled={loading}
          className="px-4 py-2 bg-[#B692F6] text-[#131217] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register New Node'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-400 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-[#360D68] rounded-lg shadow-lg overflow-hidden p-6">
        <h2 className="text-xl font-bold text-white mb-4">Add New Node</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Node Principal ID</label>
            <input
              type="text"
              value={newNodePrincipal}
              onChange={(e) => setNewNodePrincipal(e.target.value)}
              className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
              placeholder="e.g., 2vxsx-fae"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">IP Address</label>
            <input
              type="text"
              value={newNode.ipAddress}
              onChange={(e) => setNewNode({ ...newNode, ipAddress: e.target.value })}
              className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
              placeholder="e.g., 192.168.1.1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Region</label>
            <input
              type="text"
              value={newNode.region}
              onChange={(e) => setNewNode({ ...newNode, region: e.target.value })}
              className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
              placeholder="e.g., US-East, EU-West"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Percentage Nodes</label>
            <input
              type="number"
              value={newNode.percentageNodes}
              onChange={(e) => setNewNode({ ...newNode, percentageNodes: parseInt(e.target.value) })}
              className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
              placeholder="e.g., 100"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Randomization Mode</label>
            <select
              value={newNode.randomizationMode}
              onChange={(e) => setNewNode({ ...newNode, randomizationMode: e.target.value })}
              className="w-full bg-[#131217] border border-[#2C2B33] rounded-lg p-2 text-white"
            >
              <option value="none">None</option>
              <option value="shuffle">Shuffle</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#360D68] rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#131217]">
            <thead className="bg-[#131217]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Principal ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Percentage Nodes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Randomization Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B692F6] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131217]">
              {nodes.map(([principal, characteristics], index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {principal.toText()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {characteristics.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {characteristics.region}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {characteristics.percentageNodes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {characteristics.randomizationMode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#B692F6]">
                    <button className="hover:text-white transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
