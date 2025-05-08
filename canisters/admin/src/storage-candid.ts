import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './storage-candid.did';
import { ScrapedData } from './types';

// Storage canister ID
const STORAGE_CANISTER_ID = 'nwy3f-jyaaa-aaaao-a4htq-cai';

// Field mapping for numeric field names
const numericFieldMap = {
  '3_355_830_415': 'id',
  '842_117_339': 'url',
  '5_843_823': 'status',
  '3_457_862_683': 'topic',
  '23_515': 'topicId',
  '338_645_423': 'content',
  '427_265_337': 'source',
  '100_394_802': 'timestamp',
  '2_781_795_542': 'client_id',
  '2_464_455_013': 'scraping_time'
};

// Function to convert numeric field names to human-readable field names
function convertNumericFields(data: any[]): any[] {
  if (!data || data.length === 0) return [];
  
  // Check if data is in numeric format
  const firstItem = data[0];
  const hasNumericFields = Object.keys(firstItem).some(key => key.includes('_'));
  
  if (!hasNumericFields) {
    console.log('[storage-candid] Data already in human-readable format');
    return data;
  }
  
  console.log('[storage-candid] Converting numeric field names to human-readable field names');
  
  return data.map(item => {
    const convertedItem: any = {};
    
    // Convert numeric field names to human-readable field names
    for (const [numericKey, value] of Object.entries(item)) {
      const humanReadableKey = numericFieldMap[numericKey] || numericKey;
      convertedItem[humanReadableKey] = value;
    }
    
    return convertedItem;
  });
}

export async function getScrapedDataDirect(topicId?: string): Promise<ScrapedData[]> {
  console.log('[storage-candid] Fetching data directly from storage canister...');
  
  try {
    // Create an agent to talk to the IC
    const agent = new HttpAgent({ host: 'https://ic0.app' });
    
    // Create an actor to interact with the storage canister
    const storageActor = Actor.createActor(idlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID,
    });
    
    console.log('[storage-candid] Storage actor created successfully');
    
    // Call the getScrapedData method
    const topicIds = topicId ? [topicId] : [];
    const result = await storageActor.getScrapedData(topicIds);
    
    if ('ok' in result) {
      const data = result.ok;
      console.log('[storage-candid] Raw data received:', data);
      
      if (data.length > 0) {
        console.log('[storage-candid] First item raw structure:', JSON.stringify(data[0]));
        
        // Check if the data contains only empty arrays
        const hasData = Object.values(data[0]).some(value => {
          return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined;
        });
        
        if (!hasData) {
          console.log('[storage-candid] Data contains only empty arrays, NOT using sample data');
          return [];
        }
        
        // Convert numeric field names to human-readable field names
        const convertedData = convertNumericFields(data);
        return convertedData;
      } else {
        console.log('[storage-candid] No data received');
        return [];
      }
    } else {
      console.error('[storage-candid] Error retrieving data:', result.err);
      return [];
    }
  } catch (error) {
    console.error('[storage-candid] Error fetching data:', error);
    return [];
  }
}
