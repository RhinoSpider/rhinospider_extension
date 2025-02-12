import { ScrapingStats } from '../types';

export interface PointsCalculation {
  basePoints: number;
  bandwidthPoints: number;
  requestPoints: number;
  bonusPoints: number;
  multiplier: number;
  total: number;
}

export interface DailyPoints {
  date: string;
  points: PointsCalculation;
  streak: number;
  achievements: string[];
}

export class PointsCalculator {
  private static readonly MB = 1024 * 1024;
  private static readonly POINTS_PER_10MB = 1;
  private static readonly POINTS_PER_SUCCESS = 5;
  private static readonly POINTS_PER_FAILURE = -1;
  private static readonly MAX_DAILY_POINTS = 1000;
  private static readonly MIN_POINTS_PER_REQUEST = 10;

  static calculatePoints(stats: ScrapingStats, streak: number = 0): PointsCalculation {
    // Calculate bandwidth points
    const totalBytes = stats.bytesDownloaded + stats.bytesUploaded;
    const bandwidthPoints = Math.floor((totalBytes / (10 * this.MB)) * this.POINTS_PER_10MB);

    // Calculate request points
    const requestPoints = (stats.successCount * this.POINTS_PER_SUCCESS) + 
                        (stats.failureCount * this.POINTS_PER_FAILURE);

    // Calculate quality multiplier
    const totalRequests = stats.successCount + stats.failureCount;
    const multiplier = totalRequests > 0 ? stats.successCount / totalRequests : 1;

    // Calculate bonus points based on streak
    let bonusMultiplier = 1;
    if (streak >= 30) bonusMultiplier = 1.5;  // 50% monthly bonus
    else if (streak >= 7) bonusMultiplier = 1.25;  // 25% weekly bonus
    else if (streak >= 1) bonusMultiplier = 1.1;  // 10% daily bonus

    // Calculate base points
    const basePoints = bandwidthPoints + requestPoints;

    // Apply multipliers and calculate bonus points
    const bonusPoints = Math.floor(basePoints * (bonusMultiplier - 1));

    // Calculate total points with cap
    const rawTotal = Math.floor((basePoints + bonusPoints) * multiplier);
    const total = Math.min(rawTotal, this.MAX_DAILY_POINTS);

    return {
      basePoints,
      bandwidthPoints,
      requestPoints,
      bonusPoints,
      multiplier,
      total
    };
  }

  static getAchievements(stats: ScrapingStats, streak: number): string[] {
    const achievements: string[] = [];

    // Bandwidth achievements
    if (stats.bytesDownloaded + stats.bytesUploaded >= 1000 * this.MB) {
      achievements.push('GIGABYTE_WARRIOR');
    }

    // Request achievements
    if (stats.successCount >= 100) {
      achievements.push('CENTURY_SCRAPER');
    }

    // Streak achievements
    if (streak >= 7) {
      achievements.push('WEEKLY_WARRIOR');
    }
    if (streak >= 30) {
      achievements.push('MONTHLY_MASTER');
    }

    // Success rate achievements
    const successRate = stats.successCount / (stats.successCount + stats.failureCount);
    if (successRate >= 0.95 && stats.successCount > 50) {
      achievements.push('PRECISION_EXPERT');
    }

    return achievements;
  }
}
