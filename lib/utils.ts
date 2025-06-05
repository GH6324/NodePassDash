import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrafficHistory, TrafficStats, Instance } from '../types/nodepass';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 构建内部 API 的完整 URL
 * 在云端部署时使用环境变量配置的基础URL，本地开发使用相对路径
 */
export function buildApiUrl(path: string): string {
  // 如果已经是完整URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // 确保路径以 / 开头
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // 在浏览器环境中
  if (typeof window !== 'undefined') {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (baseUrl) {
      return `${baseUrl}${path}`;
    }
    // 如果没有配置基础URL，使用当前域名
    return `${window.location.origin}${path}`;
  }
  
  // 在服务器环境中，直接返回路径（由Next.js处理）
  return path;
}

// 实例缓存
const instanceCache = new Map<string, { data: Instance; timestamp: number }>();
const CACHE_TTL = 60000; // 1分钟缓存时间

// 流量历史记录
const trafficHistory: Record<string, TrafficHistory> = {};
const MAX_HISTORY = 1000; // 最大历史记录数

// 前一个统计数据
const previousStats: Record<string, TrafficStats> = {};

// 获取缓存的实例信息
export async function getCachedInstance(id: string, fetchFn: () => Promise<Instance>): Promise<Instance> {
  const now = Date.now();
  const cached = instanceCache.get(id);
  
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFn();
  
  instanceCache.set(id, {
    data,
    timestamp: now
  });
  
  return data;
}

// 处理流量统计
export function processTrafficStats(instanceId: string, currentStats: TrafficStats): void {
  // 如果我们有该实例的前一个统计数据，计算差值
  if (previousStats[instanceId]) {
    const timeDiff = currentStats.timestamp - previousStats[instanceId].timestamp;
    const tcpInDiff = currentStats.tcp_in - previousStats[instanceId].tcp_in;
    const tcpOutDiff = currentStats.tcp_out - previousStats[instanceId].tcp_out;
    const udpInDiff = currentStats.udp_in - previousStats[instanceId].udp_in;
    const udpOutDiff = currentStats.udp_out - previousStats[instanceId].udp_out;
    
    // 存储历史数据
    storeTrafficHistory(instanceId, {
      timestamp: currentStats.timestamp,
      tcp_in_rate: tcpInDiff / timeDiff * 1000, // 每秒字节数
      tcp_out_rate: tcpOutDiff / timeDiff * 1000,
      udp_in_rate: udpInDiff / timeDiff * 1000,
      udp_out_rate: udpOutDiff / timeDiff * 1000
    });
  }
  
  // 更新前一个统计数据
  previousStats[instanceId] = currentStats;
}

// 存储流量历史
export function storeTrafficHistory(instanceId: string, metrics: {
  timestamp: number;
  tcp_in_rate: number;
  tcp_out_rate: number;
  udp_in_rate: number;
  udp_out_rate: number;
}): void {
  if (!trafficHistory[instanceId]) {
    trafficHistory[instanceId] = {
      timestamps: [],
      tcp_in_rates: [],
      tcp_out_rates: [],
      udp_in_rates: [],
      udp_out_rates: []
    };
  }
  
  const history = trafficHistory[instanceId];
  history.timestamps.push(metrics.timestamp);
  history.tcp_in_rates.push(metrics.tcp_in_rate);
  history.tcp_out_rates.push(metrics.tcp_out_rate);
  history.udp_in_rates.push(metrics.udp_in_rate);
  history.udp_out_rates.push(metrics.udp_out_rate);
  
  // 保持历史数据量可管理
  if (history.timestamps.length > MAX_HISTORY) {
    history.timestamps.shift();
    history.tcp_in_rates.shift();
    history.tcp_out_rates.shift();
    history.udp_in_rates.shift();
    history.udp_out_rates.shift();
  }
}

// 获取实例的流量历史
export function getTrafficHistory(instanceId: string): TrafficHistory | undefined {
  return trafficHistory[instanceId];
}

// 清除实例的流量历史
export function clearTrafficHistory(instanceId: string): void {
  delete trafficHistory[instanceId];
  delete previousStats[instanceId];
}

// 清除所有流量历史
export function clearAllTrafficHistory(): void {
  Object.keys(trafficHistory).forEach(clearTrafficHistory);
}

// 清除实例缓存
export function clearInstanceCache(instanceId?: string): void {
  if (instanceId) {
    instanceCache.delete(instanceId);
  } else {
    instanceCache.clear();
  }
}

/**
 * 将对象中的 BigInt 值转换为数字，用于 JSON 序列化
 * @param obj 要转换的对象
 * @returns 转换后的对象
 */
export function convertBigIntToNumber<T = any>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    // 如果 BigInt 值太大，转换为字符串；否则转换为数字
    return (obj > Number.MAX_SAFE_INTEGER ? obj.toString() : Number(obj)) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber) as T;
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted as T;
  }
  
  return obj;
} 