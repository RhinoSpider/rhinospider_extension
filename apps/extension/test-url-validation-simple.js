/**
 * Simple test script for URL validation logic
 * 
 * This script tests our enhanced URL validation logic to ensure we're properly
 * detecting login pages, captcha pages, error pages, and other invalid content.
 */

// Mock URLs for testing
const testUrls = [
  // Valid URLs
  { url: 'https://www.amazon.com/s?k=laptop', expected: true, type: 'Valid product search page' },
  { url: 'https://www.nytimes.com/section/technology', expected: true, type: 'Valid news category page' },
  { url: 'https://www.theverge.com/tech', expected: true, type: 'Valid tech news page' },
  { url: 'https://www.bbc.com/news/technology', expected: true, type: 'Valid tech news page' },
  
  // Login pages
  { url: 'https://www.example.com/login', expected: false, type: 'Login page' },
  { url: 'https://www.example.com/signin', expected: false, type: 'Login page' },
  { url: 'https://www.example.com/account/login', expected: false, type: 'Login page' },
  
  // Captcha pages
  { url: 'https://www.example.com/captcha', expected: false, type: 'Captcha page' },
  { url: 'https://www.example.com/robot-check', expected: false, type: 'Robot check page' },
  { url: 'https://www.example.com/security-verification', expected: false, type: 'Security verification page' },
  
  // Error pages
  { url: 'https://www.example.com/404', expected: false, type: '404 page' },
  { url: 'https://www.example.com/error', expected: false, type: 'Error page' },
  { url: 'https://www.example.com/access-denied', expected: false, type: 'Access denied page' },
  
  // Problematic domains
  { url: 'http://localhost:3000', expected: false, type: 'Localhost domain' },
  { url: 'http://127.0.0.1:8080', expected: false, type: 'Local IP domain' },
  { url: 'http://example.com', expected: false, type: 'Example domain' }
];

/**
 * Mock implementation of validateUrlStructure function
 * Based on our enhanced logic in background.js
 */
function validateUrlStructure(url) {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    const { protocol, hostname, pathname, search } = parsedUrl;
    
    // Check protocol (must be http or https)
    if (protocol !== 'http:' && protocol !== 'https:') {
      return { valid: false, reason: 'INVALID_PROTOCOL' };
    }
    
    // Check for problematic domains
    const problematicDomains = ['localhost', '127.0.0.1', 'example.com'];
    for (const domain of problematicDomains) {
      if (hostname === domain || hostname.includes(domain)) {
        return { valid: false, reason: `PROBLEMATIC_DOMAIN_${domain}` };
      }
    }
    
    // Check for suspicious query parameters
    const suspiciousParams = ['login', 'signin', 'auth', 'captcha', 'robot', 'verification'];
    const searchParams = new URLSearchParams(search);
    for (const param of suspiciousParams) {
      if (searchParams.has(param)) {
        return { valid: false, reason: `SUSPICIOUS_PARAM_${param}` };
      }
    }
    
    // Check for suspicious path segments
    const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
    const suspiciousSegments = ['login', 'signin', 'auth', 'captcha', 'robot', 'verification', 'error', '404', 'not-found'];
    for (const segment of pathSegments) {
      if (suspiciousSegments.includes(segment.toLowerCase())) {
        return { valid: false, reason: `SUSPICIOUS_PATH_${segment}` };
      }
    }
    
    // URL structure looks valid
    return { valid: true };
  } catch (error) {
    console.error(`Error validating URL structure: ${url}`, error);
    return { valid: false, reason: `ERROR_${error.message}` };
  }
}

/**
 * Mock implementation of isLoginPage function
 * Based on our enhanced logic in background.js
 */
function isLoginPage(content) {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  
  // Enhanced login page detection
  return (
    (lowerContent.includes('login') && lowerContent.includes('password')) ||
    (lowerContent.includes('sign in') && lowerContent.includes('password')) ||
    (lowerContent.includes('register') && lowerContent.includes('password')) ||
    (lowerContent.includes('log in') && lowerContent.includes('password')) ||
    (lowerContent.includes('signin') && lowerContent.includes('password')) ||
    (lowerContent.includes('account') && lowerContent.includes('password')) ||
    (lowerContent.includes('authentication') && lowerContent.includes('password')) ||
    (lowerContent.includes('username') && lowerContent.includes('password')) ||
    (lowerContent.includes('forgot password') && (lowerContent.includes('email') || lowerContent.includes('username'))) ||
    (lowerContent.includes('create account') && lowerContent.includes('password')) ||
    (lowerContent.includes('sign up') && lowerContent.includes('password')) ||
    (content.includes('<form') && lowerContent.includes('password') && 
     (lowerContent.includes('submit') || lowerContent.includes('login') || lowerContent.includes('sign in'))) ||
    (content.includes('<input type="password"')) ||
    (lowerContent.includes('authentication') && lowerContent.includes('required')) ||
    (lowerContent.includes('access denied') && (lowerContent.includes('login') || lowerContent.includes('sign in'))) ||
    (lowerContent.includes('session expired') && (lowerContent.includes('login') || lowerContent.includes('sign in'))) ||
    (lowerContent.includes('please authenticate'))
  );
}

/**
 * Mock implementation of isCaptchaPage function
 * Based on our enhanced logic in background.js
 */
function isCaptchaPage(content) {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  
  // Enhanced captcha page detection
  return (
    (lowerContent.includes('captcha')) ||
    (lowerContent.includes('recaptcha')) ||
    (lowerContent.includes('robot') && lowerContent.includes('check')) ||
    (lowerContent.includes('human verification')) ||
    (lowerContent.includes('security check')) ||
    (lowerContent.includes('prove you\'re human')) ||
    (lowerContent.includes('are you a robot')) ||
    (lowerContent.includes('cloudflare') && lowerContent.includes('security')) ||
    (lowerContent.includes('prove you are human')) ||
    (lowerContent.includes('automated access')) ||
    (lowerContent.includes('bot protection')) ||
    (lowerContent.includes('challenge') && lowerContent.includes('security')) ||
    (lowerContent.includes('ddos') && lowerContent.includes('protection')) ||
    (lowerContent.includes('automated request')) ||
    (lowerContent.includes('suspicious activity')) ||
    (lowerContent.includes('unusual traffic')) ||
    (lowerContent.includes('checking your browser')) ||
    (content.includes('g-recaptcha') || content.includes('grecaptcha')) ||
    (content.includes('hcaptcha')) ||
    (content.includes('turnstile.js')) ||
    (content.includes('cf-') && content.includes('challenge')) ||
    (lowerContent.includes('bot') && lowerContent.includes('detection')) ||
    (lowerContent.includes('verify') && lowerContent.includes('human'))
  );
}

/**
 * Mock implementation of isErrorPage function
 * Based on our enhanced logic in background.js
 */
function isErrorPage(content) {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  
  // Enhanced error page detection
  return (
    // 404 pages
    (lowerContent.includes('404') && lowerContent.includes('not found')) ||
    (lowerContent.includes('page not found')) ||
    (lowerContent.includes('page cannot be found')) ||
    (lowerContent.includes('page doesn\'t exist')) ||
    (lowerContent.includes('this page isn\'t available')) ||
    (lowerContent.includes('content unavailable')) ||
    
    // Other error pages
    (lowerContent.includes('403') && lowerContent.includes('forbidden')) ||
    (lowerContent.includes('500') && lowerContent.includes('server error')) ||
    (lowerContent.includes('access denied')) ||
    (lowerContent.includes('not available in your region')) ||
    (lowerContent.includes('error') && lowerContent.includes('occurred')) ||
    (lowerContent.includes('site maintenance')) ||
    (lowerContent.includes('temporarily unavailable'))
  );
}

/**
 * Mock implementation of validateUrlContent function
 * Based on our enhanced logic in background.js
 */
function validateUrlContent(url, content) {
  console.log(`Validating content for URL: ${url}`);
  
  // Check if content is valid
  if (!content || typeof content !== 'string') {
    console.log(`URL validation failed: ${url} (no content or not a string)`);
    return false;
  }
  
  // Check if content is too short
  if (content.length < 500) {
    console.log(`URL validation failed: ${url} (content too short: ${content.length} chars)`);
    return false;
  }
  
  // Check for login pages
  if (isLoginPage(content)) {
    console.log(`URL validation failed: ${url} (detected login page)`);
    return false;
  }
  
  // Check for captcha pages
  if (isCaptchaPage(content)) {
    console.log(`URL validation failed: ${url} (detected captcha page)`);
    return false;
  }
  
  // Check for error pages
  if (isErrorPage(content)) {
    console.log(`URL validation failed: ${url} (detected error page)`);
    return false;
  }
  
  // Content passed all checks
  console.log(`URL content validation successful: ${url}`);
  return true;
}

/**
 * Test the URL validation logic
 */
function testUrlValidation() {
  console.log('Testing URL validation logic...');
  console.log('---------------------------------------');
  
  let passedTests = 0;
  let failedTests = 0;
  
  // Test URL structure validation
  console.log('\n1. Testing URL structure validation:');
  console.log('---------------------------------------');
  
  for (const test of testUrls) {
    const result = validateUrlStructure(test.url);
    const passed = result.valid === test.expected;
    
    if (passed) {
      passedTests++;
      console.log(`✓ PASSED: ${test.url} - ${test.type}`);
    } else {
      failedTests++;
      console.log(`✗ FAILED: ${test.url} - ${test.type}`);
      console.log(`  Expected: ${test.expected}, Got: ${result.valid}, Reason: ${result.reason || 'N/A'}`);
    }
  }
  
  // Test content validation with mock content
  console.log('\n2. Testing content validation:');
  console.log('---------------------------------------');
  
  // Mock content for different types of pages
  const mockContents = {
    loginPage: `
      <html>
        <head><title>Login Page</title></head>
        <body>
          <h1>Login to Your Account</h1>
          <form>
            <label for="username">Username:</label>
            <input type="text" id="username" name="username"><br><br>
            <label for="password">Password:</label>
            <input type="password" id="password" name="password"><br><br>
            <input type="submit" value="Login">
          </form>
        </body>
      </html>
    `,
    captchaPage: `
      <html>
        <head><title>Security Check</title></head>
        <body>
          <h1>Please Complete this Security Check</h1>
          <p>We need to verify you're a human. Please complete the captcha below.</p>
          <div class="g-recaptcha" data-sitekey="6LdQPnQpAAAAAFN8beQRBKt_q8EJqJ_OgDpbcGfU"></div>
          <script src="https://www.google.com/recaptcha/api.js"></script>
        </body>
      </html>
    `,
    errorPage: `
      <html>
        <head><title>404 Not Found</title></head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist or has been moved.</p>
        </body>
      </html>
    `,
    validPage: `
      <html>
        <head><title>Valid Content Page</title></head>
        <body>
          <header>
            <nav>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/products">Products</a></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </header>
          <main>
            <h1>Welcome to Our Website</h1>
            <p>This is a valid content page with enough text to pass validation.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.</p>
            <article>
              <h2>Article Title</h2>
              <p>This is an article with content that should be considered valid.</p>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.</p>
            </article>
          </main>
          <footer>
            <p>&copy; 2025 Example Company</p>
          </footer>
        </body>
      </html>
    `
  };
  
  // Test login page detection
  const loginResult = validateUrlContent('https://example.com/login', mockContents.loginPage);
  if (!loginResult) {
    passedTests++;
    console.log('✓ PASSED: Login page detection');
  } else {
    failedTests++;
    console.log('✗ FAILED: Login page detection');
  }
  
  // Test captcha page detection
  const captchaResult = validateUrlContent('https://example.com/security-check', mockContents.captchaPage);
  if (!captchaResult) {
    passedTests++;
    console.log('✓ PASSED: Captcha page detection');
  } else {
    failedTests++;
    console.log('✗ FAILED: Captcha page detection');
  }
  
  // Test error page detection
  const errorResult = validateUrlContent('https://example.com/not-found', mockContents.errorPage);
  if (!errorResult) {
    passedTests++;
    console.log('✓ PASSED: Error page detection');
  } else {
    failedTests++;
    console.log('✗ FAILED: Error page detection');
  }
  
  // Test valid page detection
  const validResult = validateUrlContent('https://example.com/valid-page', mockContents.validPage);
  if (validResult) {
    passedTests++;
    console.log('✓ PASSED: Valid page detection');
  } else {
    failedTests++;
    console.log('✗ FAILED: Valid page detection');
  }
  
  // Print summary
  console.log('\nTest Summary:');
  console.log('---------------------------------------');
  console.log(`Total tests: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
}

// Run the tests
testUrlValidation();
