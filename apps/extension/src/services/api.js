const API_BASE_URL = 'http://localhost:3001/api';

export const fetchContentByTopic = async (topic, limit = 10) => {
    try {
        const response = await fetch(`${API_BASE_URL}/content/topic/${topic}?limit=${limit}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching content:', error);
        throw error;
    }
};

export const getSourceIcon = (source) => {
    switch (source.toLowerCase()) {
        case 'github':
            return '🐙';
        case 'dev.to':
            return '👩‍💻';
        case 'medium':
            return '📝';
        default:
            return '🔗';
    }
};

export const formatEngagement = (engagement) => {
    const metrics = [];
    if (engagement.stars && Number(engagement.stars) > 0) {
        metrics.push(`⭐ ${engagement.stars}`);
    }
    if (engagement.reactions && Number(engagement.reactions) > 0) {
        metrics.push(`❤️ ${engagement.reactions}`);
    }
    if (engagement.claps && Number(engagement.claps) > 0) {
        metrics.push(`👏 ${engagement.claps}`);
    }
    if (engagement.comments > 0) {
        metrics.push(`💬 ${engagement.comments}`);
    }
    return metrics.join(' · ');
};

export const formatDate = (timestamp) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
