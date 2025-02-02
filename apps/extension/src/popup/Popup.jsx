import React, { useState, useEffect } from 'react';
import { fetchContentByTopic, getSourceIcon, formatEngagement, formatDate } from '../services/api';
import './Popup.css';

const Popup = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        
        setLoading(true);
        setError(null);
        try {
            const data = await fetchContentByTopic(searchTerm);
            setContent(data);
        } catch (err) {
            setError('Failed to fetch content. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderContent = (item) => (
        <div key={item.id} className="content-item">
            <div className="content-header">
                <span className="source-icon">{getSourceIcon(item.source)}</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="title">
                    {item.title}
                </a>
            </div>
            
            <div className="metadata">
                <span className="author">{item.author}</span>
                <span className="date">{formatDate(item.publishDate)}</span>
                {item.metadata.readingTime && (
                    <span className="reading-time">
                        🕒 {item.metadata.readingTime} min read
                    </span>
                )}
            </div>

            <p className="summary">{item.summary}</p>

            <div className="topics">
                {item.topics.map(topic => (
                    <span key={topic} className="topic-tag">
                        {topic}
                    </span>
                ))}
            </div>

            <div className="tech-stack">
                {item.metadata.techStack.map(tech => (
                    <span key={tech} className="tech-tag">
                        {tech}
                    </span>
                ))}
            </div>

            <div className="engagement">
                {formatEngagement(item.engagement)}
            </div>

            <div className="ai-analysis">
                <h4>🤖 AI Analysis</h4>
                <div className="key-points">
                    {item.aiAnalysis.keyPoints.map((point, index) => (
                        <p key={index}>• {point}</p>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="popup-container">
            <div className="search-container">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search topics (e.g., artificial-intelligence)"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="content-container">
                {content.length > 0 ? (
                    content.map(renderContent)
                ) : (
                    <div className="no-content">
                        {!loading && 'No content found. Try searching for a topic.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Popup;
