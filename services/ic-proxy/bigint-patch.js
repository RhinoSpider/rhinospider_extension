// Patch BigInt serialization
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { 
    return this.toString(); 
  };
}

// Export a function to convert objects with BigInt to plain objects
function convertToPlainObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle BigInt
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Handle Principal objects
  if (obj && typeof obj === 'object' && typeof obj.toString === 'function' && 
      ((obj.constructor && obj.constructor.name === 'Principal') || 
       (Object.prototype.toString.call(obj) === '[object Object]' && '_arr' in obj))) {
    return obj.toString();
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertToPlainObject(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = convertToPlainObject(obj[key]);
    }
    return result;
  }
  
  return obj;
}

module.exports = {
  convertToPlainObject
};
