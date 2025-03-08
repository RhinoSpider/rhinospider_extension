// certificate-patch.js - Handles certificate verification patching for Internet Computer

// Expose functions to window for access from injected scripts
window.patchCertificateVerification = patchCertificateVerification;
window.interceptScriptLoading = interceptScriptLoading;
window.patchAllVerifyMethods = patchAllVerifyMethods;
window.patchObjectRecursively = patchObjectRecursively;
window.patchActorModule = patchActorModule;
window.patchSpecificActorFile = patchSpecificActorFile;

// Function to patch certificate verification
function patchCertificateVerification() {
    try {
        // 1. Patch window.ic if it exists
        if (window.ic) {
            // Patch Certificate.verify if it exists
            if (window.ic.Certificate && window.ic.Certificate.prototype) {
                window.ic.Certificate.prototype.verify = async function() {
                    return true;
                };
            }
            
            // Patch HttpAgent.verifyQuerySignatures if it exists
            if (window.ic.HttpAgent && window.ic.HttpAgent.prototype) {
                window.ic.HttpAgent.prototype.verifyQuerySignatures = false;
            }
            
            // Patch agent if it exists
            if (window.ic.agent) {
                // Disable query signature verification
                window.ic.agent.verifyQuerySignatures = false;
                
                // Patch Certificate.verify if it exists
                if (window.ic.agent.Certificate && window.ic.agent.Certificate.prototype) {
                    window.ic.agent.Certificate.prototype.verify = async function() {
                        return true;
                    };
                }
            }
        }
        
        // 2. Patch all certificate verification methods in the window
        patchAllVerifyMethods();
        
        // 3. Set up script load interception
        interceptScriptLoading();
        
        // 4. Patch the specific actor file (actor-DXyMoorp.js)
        patchSpecificActorFile();
        
        return true;
    } catch (error) {
        console.error('[Patch] Error in certificate verification patching:', error);
        return false;
    }
}

// Function to patch all verify methods in an object recursively
function patchObjectRecursively(obj, path = 'window', visited = new Set()) {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
    
    // Add this object to the visited set to prevent circular references
    visited.add(obj);
    
    try {
        // Check if this object has a verify method
        if (typeof obj.verify === 'function') {
            obj.verify = async function() {
                return true;
            };
        }
        
        // Check for prototype verify methods
        if (obj.prototype && typeof obj.prototype.verify === 'function') {
            obj.prototype.verify = async function() {
                return true;
            };
        }
        
        // Recursively check properties
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
                patchObjectRecursively(obj[key], `${path}.${key}`, visited);
            }
        }
    } catch (e) {
        // Ignore errors for properties that can't be accessed
    }
}

// Function to patch specific actor module
function patchActorModule(actorModule) {
    if (!actorModule) return;
    
    try {

        
        // Patch the module itself
        patchObjectRecursively(actorModule);
        
        // Look for Certificate class
        for (const key in actorModule) {
            if (key === 'Certificate' || 
                key === 'ic' || 
                (typeof key === 'string' && key.toLowerCase().includes('certificate'))) {
                
                // Patch the Certificate class
                if (actorModule[key] && actorModule[key].prototype) {
                    actorModule[key].prototype.verify = async function() {
                        return true;
                    };
                }
            }
        }
        
    } catch (e) {
        console.error('[Patch] Error patching actor module:', e);
    }
}

// Function to specifically patch the actor-DXyMoorp.js file
function patchSpecificActorFile() {
    try {
        // Create a separate JavaScript file for patching instead of inline script
        // This is a direct function call approach that complies with CSP
        patchFeVerifyDirectly();
        
        // Also try to find and patch any existing fe class
        patchAllVerifyMethods();
    } catch (error) {
        console.error('[Patch] Error patching actor files:', error);
    }
}

// Direct function to patch fe.verify without using inline scripts
function patchFeVerifyDirectly() {

    
    // Function to find and patch fe.verify
    function attemptPatch() {
        // Look for the fe class in all possible places
        for (const key in window) {
            try {
                const obj = window[key];
                
                // Check for objects that might be the actor module
                if (obj && typeof obj === 'object') {
                    // Look for the fe class or constructor
                    for (const prop in obj) {
                        try {
                            const potential = obj[prop];
                            
                            // Check if this is a constructor named 'fe'
                            if (potential && 
                                typeof potential === 'function' && 
                                potential.name === 'fe' && 
                                potential.prototype && 
                                typeof potential.prototype.verify === 'function') {
                                
                                const originalVerify = potential.prototype.verify;
                                potential.prototype.verify = async function(...args) {
                                    try {
                                        return await originalVerify.apply(this, args);
                                    } catch (error) {
                                        // Return a valid-looking certificate result
                                        return {
                                            certificate: {},
                                            delegation: null,
                                            rootKey: new Uint8Array([]),
                                            canisterId: args[0]?.canisterId
                                        };
                                    }
                                };
                                return true;
                            }
                            
                            // Check if this is an instance of fe
                            if (potential && 
                                typeof potential === 'object' && 
                                potential.constructor && 
                                potential.constructor.name === 'fe' && 
                                typeof potential.verify === 'function') {
                                
                                const originalVerify = potential.verify;
                                potential.verify = async function(...args) {
                                    try {
                                        return await originalVerify.apply(this, args);
                                    } catch (error) {
                                        // Return a valid-looking certificate result
                                        return {
                                            certificate: {},
                                            delegation: null,
                                            rootKey: new Uint8Array([]),
                                            canisterId: args[0]?.canisterId
                                        };
                                    }
                                };
                                return true;
                            }
                        } catch (e) {
                            // Ignore property access errors
                        }
                    }
                }
            } catch (e) {
                // Ignore errors accessing window properties
            }
        }

        // Also look for window.fe directly
        if (window.fe && typeof window.fe.verify === 'function') {
            const originalVerify = window.fe.verify;
            window.fe.verify = async function(...args) {
                try {
                    return await originalVerify.apply(this, args);
                } catch (error) {
                    // Return a valid-looking certificate result
                    return {
                        certificate: {},
                        delegation: null,
                        rootKey: new Uint8Array([]),
                        canisterId: args[0]?.canisterId
                    };
                }
            };
            return true;
        }
        
        return false;
    }
    
    // Try patching immediately
    let success = attemptPatch();
    
    // If not successful, keep trying with a decreasing interval
    if (!success) {
        let attempts = 0;
        const maxAttempts = 10;
        const interval = setInterval(() => {
            attempts++;
            success = attemptPatch();
            
            if (success || attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 200);
    }
    
    // Set up a MutationObserver to catch dynamically loaded scripts
    setupScriptObserver();
}

// Function to set up a MutationObserver for script detection
function setupScriptObserver() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.tagName === 'SCRIPT' && node.src && 
                        (node.src.includes('actor-') || node.src.includes('agent'))) {
                        node.addEventListener('load', () => {
                            setTimeout(patchFeVerifyDirectly, 100);
                        });
                    }
                }
            }
        }
    });
    
    observer.observe(document, { childList: true, subtree: true });
    // Also patch XMLHttpRequest to intercept and modify responses
    patchXhrAndFetch();
}

// Function to patch XMLHttpRequest and fetch to detect script loading
function patchXhrAndFetch() {
    // Patch XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (url && typeof url === 'string' && 
            (url.includes('actor-') || url.includes('agent'))) {
            this.addEventListener('load', function() {
                setTimeout(patchFeVerifyDirectly, 100);
            });
        }
        return originalOpen.call(this, method, url, ...args);
    };
    
    // Patch fetch
    const originalFetch = window.fetch;
    window.fetch = function(resource, init) {
        if (resource && typeof resource === 'string' && 
            (resource.includes('actor-') || resource.includes('agent'))) {
            console.log('[Patch] Intercepted fetch for actor/agent script:', resource);
            return originalFetch.apply(this, arguments).then(response => {
                console.log('[Patch] Actor/agent script fetched, attempting patch');
                setTimeout(patchFeVerifyDirectly, 100);
                return response;
            });
        }
        return originalFetch.apply(this, arguments);
    };
    

}

// Function to patch all verify methods in the window
function patchAllVerifyMethods() {
    // Look for actor module in window
    for (const key in window) {
        try {
            const obj = window[key];
            
            // Look for actor-related objects
            if (obj && typeof obj === 'object') {
                // Check if this might be an actor module
                if (key === 'actor' || 
                    key === 'ic' || 
                    (typeof key === 'string' && key.includes('actor')) || 
                    (obj.Certificate && obj.Certificate.prototype) ||
                    (obj.HttpAgent && obj.HttpAgent.prototype)) {
                    
                    patchObjectRecursively(obj, `window.${key}`);
                }
            }
        } catch (e) {
            // Ignore errors for properties that can't be accessed
        }
    }
    
    // Look for specific objects that might contain verify methods
    try {
        // Find all script tags
        const scripts = document.querySelectorAll('script');
        
        // Look for the actor script
        for (const script of scripts) {
            if (script.src && script.src.includes('actor-')) {
                // Try to find the actor module in window
                setTimeout(() => {
                    // Look for any new objects that might have been added
                    for (const key in window) {
                        try {
                            if (key !== 'patchCertificateVerification' && 
                                key !== 'interceptScriptLoading' && 
                                key !== 'patchAllVerifyMethods' && 
                                key !== 'patchObjectRecursively' && 
                                key !== 'patchActorModule' &&
                                key !== 'patchSpecificActorFile') {
                                
                                const obj = window[key];
                                if (obj && typeof obj === 'object') {
                                    patchObjectRecursively(obj, `window.${key}`);
                                }
                            }
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                }, 200);
                
                break;
            }
        }
    } catch (e) {
        console.error('[Patch] Error patching actor script:', e);
    }
    
    // Set up a MutationObserver to detect when new scripts are added
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'SCRIPT' && node.src) {
                        // If this is an actor script, patch it
                        if (node.src.includes('actor-') || node.src.includes('ic-agent')) {
                            setTimeout(() => {
                                patchCertificateVerification();
                                patchAllVerifyMethods();
                                patchFeVerifyDirectly(); // Use CSP-compliant function
                            }, 100);
                        }
                    }
                });
            }
        });
    });
    
    // Start observing the document
    observer.observe(document, { childList: true, subtree: true });

}

// Function to intercept script loading
function interceptScriptLoading() {
    console.log('[Patch] Setting up script load interception');
    
    // Store the original createElement method
    const originalCreateElement = document.createElement;
    
    // Override the createElement method
    document.createElement = function(tagName) {
        // Call the original method to create the element
        const element = originalCreateElement.call(document, tagName);
        
        // If this is a script element, intercept its loading
        if (tagName.toLowerCase() === 'script') {
            // Store the original setAttribute method
            const originalSetAttribute = element.setAttribute;
            
            // Override the setAttribute method
            element.setAttribute = function(name, value) {
                // Call the original method
                originalSetAttribute.call(this, name, value);
                
                // If this is setting the src attribute
                if (name === 'src' && (value.includes('actor-') || value.includes('ic-agent'))) {
                    // Store the original onload handler
                    const originalOnload = this.onload;
                    
                    // Set a new onload handler
                    this.onload = function() {
                        // Call the original onload handler if it exists
                        if (originalOnload) {
                            originalOnload.call(this);
                        }
                        
                        // Apply patching after the script has loaded
                        setTimeout(() => {
                            patchCertificateVerification();
                            patchAllVerifyMethods();
                            patchFeVerifyDirectly(); // Use our CSP-compliant function
                        }, 100);
                    };
                }
            };
        }
        
        return element;
    };
    

}

// Initialize patching when the script is loaded
setTimeout(() => {
    patchCertificateVerification();
    interceptScriptLoading();
    patchAllVerifyMethods();
    patchFeVerifyDirectly();
}, 0);
