// Helper function to convert raw storage data to ScrapedData format
export function convertStorageDataToScrapedData(rawData: any[]): any[] {
  if (!rawData || !Array.isArray(rawData)) {
    console.warn('[storage-adapter] Raw data is not an array:', rawData);
    return [];
  }
  
  return rawData.map((item: any) => {
    try {
      // Map the numeric field IDs to their corresponding field names
      return {
        id: item['23_515'] || '',
        url: item['5_843_823'] || '',
        topic: item['338_645_423'] || '',
        source: item['842_117_339'] || '',
        content: item['427_265_337'] || '',
        timestamp: item['2_781_795_542'] ? Number(item['2_781_795_542']) : 0,
        client_id: item['3_355_830_415'] ? item['3_355_830_415'].toString() : '',
        status: item['100_394_802'] || 'completed',
        scraping_time: item['3_457_862_683'] ? Number(item['3_457_862_683']) : 0,
      };
    } catch (conversionError) {
      console.error('[storage-adapter] Error converting storage item:', conversionError, item);
      return null;
    }
  }).filter((item) => item !== null);
}
