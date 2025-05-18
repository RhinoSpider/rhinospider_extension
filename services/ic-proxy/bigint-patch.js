// BigInt serialization patch for JSON.stringify
// This allows BigInt values to be serialized to JSON

(function() {
  const originalStringify = JSON.stringify;
  
  JSON.stringify = function(value, replacer, space) {
    return originalStringify(value, (key, val) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      return replacer ? replacer(key, val) : val;
    }, space);
  };
})();

module.exports = {};
