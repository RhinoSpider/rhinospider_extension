import React, { useState, useEffect } from 'react';
// Using native HTML elements instead of Antd to avoid dependency issues
import { Principal } from '@dfinity/principal';
import { addAuthorizedPrincipalToStorage, removeAuthorizedPrincipalFromStorage, getStorageActor, getScrapedDataDirect } from '../lib/admin';
import { getIdentity } from '../lib/auth';



const StorageAuthorization: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [currentPrincipal, setCurrentPrincipal] = useState<string>('');
  const [customPrincipal, setCustomPrincipal] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [canisterInfo, setCanisterInfo] = useState<string>('');
  const [testingDirectAccess, setTestingDirectAccess] = useState(false);
  const [directAccessResult, setDirectAccessResult] = useState<string>('');

  useEffect(() => {
    const fetchCurrentPrincipal = async () => {
      try {
        const identity = await getIdentity();
        if (identity) {
          const principal = identity.getPrincipal().toString();
          setCurrentPrincipal(principal);
          
          // Get storage canister info for debugging
          try {
            const storageActor = await getStorageActor();
            // Safely get methods without TypeScript errors
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(storageActor))
              .filter(name => name !== 'constructor' && typeof storageActor[name as keyof typeof storageActor] === 'function');
            setCanisterInfo(`Storage canister connected. Available methods: ${methods.join(', ')}`);
          } catch (error) {
            console.error('Error connecting to storage canister:', error);
            setCanisterInfo(`Error connecting to storage canister: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error) {
        console.error('Error fetching current principal:', error);
        setStatusMessage({type: 'error', text: `Error fetching principal: ${error instanceof Error ? error.message : String(error)}`});
      }
    };

    fetchCurrentPrincipal();
  }, []);

  const handleAddCurrentPrincipal = async () => {
    if (!currentPrincipal) {
      setStatusMessage({type: 'error', text: 'No current principal available'});
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      console.log('[StorageAuthorization] Adding current principal to storage canister:', currentPrincipal);
      // Validate principal format before proceeding
      try {
        Principal.fromText(currentPrincipal);
      } catch (validationError) {
        throw new Error(`Invalid principal format: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
      }
      
      await addAuthorizedPrincipalToStorage(currentPrincipal);
      console.log('[StorageAuthorization] Successfully added current principal');
      setStatusMessage({type: 'success', text: 'Successfully added your principal to storage canister'});
    } catch (error) {
      console.error('[StorageAuthorization] Error adding current principal:', error);
      setStatusMessage({type: 'error', text: `Failed to add principal: ${error instanceof Error ? error.message : String(error)}`});
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomPrincipal = async () => {
    if (!customPrincipal) {
      setStatusMessage({type: 'error', text: 'Please enter a principal ID'});
      return;
    }

    // Validate principal format
    try {
      Principal.fromText(customPrincipal);
    } catch (error) {
      setStatusMessage({type: 'error', text: 'Invalid principal format'});
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      console.log('[StorageAuthorization] Adding custom principal to storage canister:', customPrincipal);
      await addAuthorizedPrincipalToStorage(customPrincipal);
      console.log('[StorageAuthorization] Successfully added custom principal');
      setStatusMessage({type: 'success', text: `Successfully added principal ${customPrincipal} to storage canister`});
      setCustomPrincipal(''); // Clear the input
    } catch (error) {
      console.error('[StorageAuthorization] Error adding custom principal:', error);
      setStatusMessage({type: 'error', text: `Failed to add principal: ${error instanceof Error ? error.message : String(error)}`});
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePrincipal = async (principalId: string) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      console.log('[StorageAuthorization] Removing principal from storage canister:', principalId);
      // Validate principal format
      try {
        Principal.fromText(principalId);
      } catch (validationError) {
        throw new Error(`Invalid principal format: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
      }
      
      await removeAuthorizedPrincipalFromStorage(principalId);
      console.log('[StorageAuthorization] Successfully removed principal');
      setStatusMessage({type: 'success', text: `Successfully removed principal ${principalId} from storage canister`});
      if (principalId === customPrincipal) {
        setCustomPrincipal(''); // Clear the input if we just removed it
      }
    } catch (error) {
      console.error('[StorageAuthorization] Error removing principal:', error);
      setStatusMessage({type: 'error', text: `Failed to remove principal: ${error instanceof Error ? error.message : String(error)}`});
    } finally {
      setLoading(false);
    }
  };

  // Function to test direct access to the storage canister
  const testDirectStorageAccess = async () => {
    setTestingDirectAccess(true);
    setDirectAccessResult('');
    setStatusMessage(null);
    try {
      // Try to fetch data directly from the storage canister
      const data = await getScrapedDataDirect();
      console.log('Direct storage access result:', data);
      
      if (data.length === 0) {
        setDirectAccessResult('Successfully connected to storage canister, but no data was found.');
      } else {
        setDirectAccessResult(`Successfully retrieved ${data.length} items from storage canister!`);
        // Log the data in a more readable format
        console.table(data.map(item => ({
          id: item.id,
          topic: item.topic,
          url: item.url.substring(0, 30) + '...',
          timestamp: new Date(Number(item.timestamp) / 1000000).toLocaleString(),
          status: item.status
        })));
      }
      
      setStatusMessage({type: 'success', text: 'Direct storage access test successful'});
    } catch (error) {
      console.error('Error testing direct storage access:', error);
      setDirectAccessResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatusMessage({type: 'error', text: `Direct storage access test failed: ${error instanceof Error ? error.message : String(error)}`});
    } finally {
      setTestingDirectAccess(false);
    }
  };

  return (
    <div className="bg-[#1C1B23] rounded-lg p-4">
      {statusMessage && (
        <div className={`p-3 mb-4 rounded-md ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {statusMessage.text}
        </div>
      )}
      
      {canisterInfo && (
        <div className="p-3 mb-4 rounded-md bg-gray-700 text-gray-200 text-xs font-mono">
          {canisterInfo}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Current Principal</h3>
        <div className="bg-gray-800 p-3 rounded-md text-gray-300 font-mono break-all">
          {currentPrincipal || 'Not available'}
        </div>
        
        <button 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAddCurrentPrincipal} 
          disabled={loading || !currentPrincipal}
        >
          {loading ? 'Adding...' : 'Add Your Principal to Storage Canister'}
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Add Custom Principal</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <input 
            className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter Principal ID" 
            value={customPrincipal} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomPrincipal(e.target.value)}
            disabled={loading}
          />
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAddCustomPrincipal}
            disabled={loading || !customPrincipal}
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
          {customPrincipal && (
            <button 
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleRemovePrincipal(customPrincipal)}
              disabled={loading}
            >
              {loading ? 'Removing...' : 'Remove'}
            </button>
          )}
        </div>
      </div>

      {currentPrincipal && (
        <button 
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleRemovePrincipal(currentPrincipal)}
          disabled={loading}
        >
          {loading ? 'Removing...' : 'Remove Your Principal from Storage Canister'}
        </button>
      )}

      {/* Direct Storage Access Test */}
      <div className="mt-8 pt-6 border-t border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Test Direct Storage Access</h3>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={testDirectStorageAccess}
          disabled={testingDirectAccess}
        >
          {testingDirectAccess ? 'Testing...' : 'Test Direct Storage Access'}
        </button>
        
        {directAccessResult && (
          <div className="mt-4 p-4 bg-gray-800 rounded-md">
            <h4 className="text-md font-medium text-white mb-2">Test Result:</h4>
            <p className="text-gray-300">{directAccessResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageAuthorization;
