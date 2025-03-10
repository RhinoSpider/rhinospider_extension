// In-memory session storage (in production, use Redis or another persistent store)
const sessions = new Map();

// Session expiration time (30 minutes in milliseconds)
const SESSION_EXPIRATION = 30 * 60 * 1000;

/**
 * Create a new search session
 * @param {String} sessionToken - Unique session identifier
 * @param {String} extensionId - Extension identifier
 * @param {Array} topics - Array of topic objects with name and keywords
 * @returns {Object} - Created session object
 */
const createSession = async (sessionToken, extensionId, topics) => {
  const session = {
    sessionToken,
    extensionId,
    topics,
    urls: [],
    currentIndex: 0,
    createdAt: new Date().toISOString(),
    lastAccessTime: new Date().toISOString()
  };
  
  // Store session
  sessions.set(sessionToken, session);
  
  // Set up session expiration
  scheduleSessionCleanup(sessionToken);
  
  console.log(`Created new session ${sessionToken} for extension ${extensionId}`);
  
  return session;
};

/**
 * Get a session by token
 * @param {String} sessionToken - Session token to retrieve
 * @returns {Object|null} - Session object or null if not found/expired
 */
const getSession = async (sessionToken) => {
  const session = sessions.get(sessionToken);
  
  if (!session) {
    return null;
  }
  
  // Check if session has expired
  const lastAccess = new Date(session.lastAccessTime);
  const now = new Date();
  const timeDiff = now - lastAccess;
  
  if (timeDiff > SESSION_EXPIRATION) {
    // Session expired, remove it
    sessions.delete(sessionToken);
    console.log(`Session ${sessionToken} expired and was removed`);
    return null;
  }
  
  return session;
};

/**
 * Update session's last access time
 * @param {String} sessionToken - Session token to update
 * @returns {Boolean} - True if session was updated, false if not found
 */
const updateSession = async (sessionToken) => {
  const session = sessions.get(sessionToken);
  
  if (!session) {
    return false;
  }
  
  // Update last access time
  session.lastAccessTime = new Date().toISOString();
  
  // Reschedule cleanup
  scheduleSessionCleanup(sessionToken);
  
  return true;
};

/**
 * Get all active sessions
 * @returns {Array} - Array of active session objects
 */
const getAllSessions = async () => {
  return Array.from(sessions.values());
};

/**
 * Schedule cleanup for an inactive session
 * @param {String} sessionToken - Session token to schedule cleanup for
 */
const scheduleSessionCleanup = (sessionToken) => {
  setTimeout(() => {
    const session = sessions.get(sessionToken);
    
    if (!session) {
      return;
    }
    
    // Check if session has expired
    const lastAccess = new Date(session.lastAccessTime);
    const now = new Date();
    const timeDiff = now - lastAccess;
    
    if (timeDiff > SESSION_EXPIRATION) {
      // Session expired, remove it
      sessions.delete(sessionToken);
      console.log(`Session ${sessionToken} expired and was removed`);
    } else {
      // Session still active, reschedule cleanup
      scheduleSessionCleanup(sessionToken);
    }
  }, SESSION_EXPIRATION);
};

/**
 * Clean up expired sessions
 * This function should be called periodically to clean up expired sessions
 */
const cleanupExpiredSessions = () => {
  const now = new Date();
  
  for (const [sessionToken, session] of sessions.entries()) {
    const lastAccess = new Date(session.lastAccessTime);
    const timeDiff = now - lastAccess;
    
    if (timeDiff > SESSION_EXPIRATION) {
      // Session expired, remove it
      sessions.delete(sessionToken);
      console.log(`Session ${sessionToken} expired and was removed during cleanup`);
    }
  }
};

// Run cleanup every 15 minutes
setInterval(cleanupExpiredSessions, 15 * 60 * 1000);

/**
 * Update session's last access timestamp
 * @param {Object} session - Session object to update
 * @returns {Boolean} - True if session was updated
 */
const updateSessionTimestamp = async (session) => {
  if (!session) {
    return false;
  }
  
  // Update last access time
  session.lastAccessTime = new Date().toISOString();
  
  // Reschedule cleanup if needed
  if (session.sessionToken) {
    scheduleSessionCleanup(session.sessionToken);
  }
  
  return true;
};

module.exports = {
  createSession,
  getSession,
  updateSession,
  updateSessionTimestamp,
  getAllSessions
};
