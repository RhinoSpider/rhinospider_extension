// Test tasks for different data types

export const TEST_TASKS = [
  {
    searchTerm: "product prices amazon",
    type: "e-commerce",
    interval: 5000,
    example: {
      url: "https://api.rainforestapi.com/request",
      params: {
        type: "product",
        amazon_domain: "amazon.com",
        search_term: "laptop"
      }
    }
  },
  {
    searchTerm: "weather san francisco",
    type: "weather",
    interval: 300000, // 5 minutes
    example: {
      url: "https://api.weatherapi.com/v1/current.json",
      params: {
        q: "San Francisco",
        aqi: "yes"
      }
    }
  },
  {
    searchTerm: "crypto prices",
    type: "cryptocurrency",
    interval: 10000,
    example: {
      url: "https://api.coingecko.com/api/v3/simple/price",
      params: {
        ids: "bitcoin,ethereum",
        vs_currencies: "usd"
      }
    }
  },
  {
    searchTerm: "news technology",
    type: "news",
    interval: 900000, // 15 minutes
    example: {
      url: "https://newsapi.org/v2/top-headlines",
      params: {
        category: "technology",
        language: "en"
      }
    }
  },
  {
    searchTerm: "social media trends",
    type: "social",
    interval: 600000, // 10 minutes
    example: {
      url: "https://api.twitter.com/2/tweets/search/recent",
      params: {
        query: "tech",
        max_results: 10
      }
    }
  },
  {
    searchTerm: "job listings software engineer",
    type: "jobs",
    interval: 3600000, // 1 hour
    example: {
      url: "https://api.adzuna.com/v1/api/jobs/us/search/1",
      params: {
        what: "software engineer",
        where: "san francisco"
      }
    }
  },
  {
    searchTerm: "stock market indices",
    type: "finance",
    interval: 60000, // 1 minute
    example: {
      url: "https://finnhub.io/api/v1/quote",
      params: {
        symbol: "^GSPC" // S&P 500
      }
    }
  },
  {
    searchTerm: "sports scores nba",
    type: "sports",
    interval: 300000, // 5 minutes
    example: {
      url: "https://api.sportsdata.io/v3/nba/scores/json/Games/2024",
      params: {
        status: "InProgress"
      }
    }
  }
];

// Test task rotator
export class TestTaskRotator {
  constructor() {
    this.tasks = TEST_TASKS;
    this.currentIndex = 0;
    this.lastRotation = Date.now();
  }

  getNextTask() {
    const now = Date.now();
    const task = this.tasks[this.currentIndex];
    
    // Only rotate if enough time has passed (based on task interval)
    if (now - this.lastRotation >= task.interval) {
      this.currentIndex = (this.currentIndex + 1) % this.tasks.length;
      this.lastRotation = now;
    }
    
    return task;
  }
}

// Sample response generators for testing
export const generateSampleResponse = (task) => {
  switch (task.type) {
    case 'e-commerce':
      return {
        product: {
          title: "2024 Laptop Model X",
          price: 999.99,
          rating: 4.5,
          reviews: 1250,
          availability: "In Stock"
        }
      };
      
    case 'weather':
      return {
        location: "San Francisco, CA",
        current: {
          temp_c: 18,
          temp_f: 64,
          condition: "Partly cloudy",
          wind_mph: 12,
          humidity: 75
        }
      };
      
    case 'cryptocurrency':
      return {
        bitcoin: { usd: 43250.65 },
        ethereum: { usd: 2250.30 }
      };
      
    case 'news':
      return {
        articles: [
          {
            title: "Latest Tech Innovation Revealed",
            source: "Tech Daily",
            published: new Date().toISOString()
          }
        ]
      };
      
    case 'social':
      return {
        data: [
          {
            text: "Trending tech topic discussion",
            metrics: {
              retweets: 1200,
              likes: 3500
            }
          }
        ]
      };
      
    case 'jobs':
      return {
        results: [
          {
            title: "Senior Software Engineer",
            company: "Tech Corp",
            salary: "$150,000 - $200,000",
            location: "San Francisco, CA"
          }
        ]
      };
      
    case 'finance':
      return {
        symbol: "^GSPC",
        price: 4780.25,
        change: 12.5,
        percent_change: 0.26
      };
      
    case 'sports':
      return {
        games: [
          {
            homeTeam: "Warriors",
            awayTeam: "Lakers",
            homeScore: 105,
            awayScore: 98,
            status: "In Progress",
            quarter: 3
          }
        ]
      };
      
    default:
      return {
        error: "Unknown task type",
        timestamp: new Date().toISOString()
      };
  }
};
