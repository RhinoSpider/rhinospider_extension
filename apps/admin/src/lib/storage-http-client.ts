import { ScrapedData } from '../types';

// Field mapping for numeric field names
const numericFieldMap: Record<string, string> = {
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
function convertNumericFields<T>(data: T[] | null | undefined): T[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
  // Check if data is in numeric format
  const firstItem = data[0];
  if (!firstItem) return [];
  
  const hasNumericFields = Object.keys(firstItem as object).some(key => key.includes('_'));
  
  if (!hasNumericFields) {
    console.log('[storage-http-client] Data already in human-readable format');
    return data;
  }
  
  console.log('[storage-http-client] Converting numeric field names to human-readable field names');
  
  return data.map(item => {
    const convertedItem: Record<string, any> = {};
    
    // Convert numeric field names to human-readable field names
    if (item && typeof item === 'object') {
      for (const [numericKey, value] of Object.entries(item as object)) {
        const humanReadableKey = numericFieldMap[numericKey] || numericKey;
        convertedItem[humanReadableKey] = value;
      }
    }
    
    return convertedItem as unknown as T;
  });
}

export async function getScrapedData(topicIds?: string[]): Promise<ScrapedData[]> {
  try {
    console.log('[storage-http-client] Getting scraped data for topics:', topicIds || 'all topics');
    
    try {
      // Try the direct HTTP API first
      console.log('[storage-http-client] Trying direct HTTP API...');
      
      // Use the correct URL format for the raw IC API
      const directResponse = await fetch('https://ic0.app/api/v2/canister/nwy3f-jyaaa-aaaao-a4htq-cai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_type: 'query',
          sender: '2vxsx-fae',  // Anonymous principal
          canister_id: 'nwy3f-jyaaa-aaaao-a4htq-cai',
          method_name: 'getScrapedData',
          arg: 'DIDL\x00\x01\x71\x01\x00\x00', // Empty vec argument in Candid
        }),
      });
      
      if (directResponse.ok) {
        const directResult = await directResponse.json();
        console.log('[storage-http-client] Direct API result:', directResult);
        
        if (directResult.reply) {
          try {
            // Decode the reply
            const decodedData = JSON.parse(atob(directResult.reply.arg));
            console.log('[storage-http-client] Decoded data:', decodedData);
            
            // Handle both formats: variant {ok, err} or direct array
            if (decodedData.ok) {
              // It's a variant type with ok field
              const data = decodedData.ok;
              console.log('[storage-http-client] Raw data from direct API (variant format):', data);
              
              // Convert numeric field names to human-readable field names
              const convertedData = convertNumericFields<ScrapedData>(data);
              console.log('[storage-http-client] Converted data from direct API:', convertedData);
              
              return convertedData;
            } else if (Array.isArray(decodedData)) {
              // It's a direct array
              console.log('[storage-http-client] Raw data from direct API (array format):', decodedData);
              
              // Convert numeric field names to human-readable field names
              const convertedData = convertNumericFields<ScrapedData>(decodedData);
              console.log('[storage-http-client] Converted data from direct API:', convertedData);
              
              return convertedData;
            } else {
              console.log('[storage-http-client] Unexpected data format:', decodedData);
              return [];
            }
          } catch (decodeError) {
            console.error('[storage-http-client] Error decoding response:', decodeError);
          }
        }
      }
      console.log('[storage-http-client] Direct API failed, no data available');
    } catch (directError) {
      console.error('[storage-http-client] Error with direct API call:', directError);
      console.log('[storage-http-client] No fallback to sample data - returning empty array');
      return [];
    }
    
    // If we reach here, something went wrong but wasn't caught by the try/catch
    console.error('[storage-http-client] Failed to get data from storage canister');
    return [];
  } catch (error) {
    console.error('[storage-http-client] Error:', error);
    // Return empty array on error
    return [];
  }
}
