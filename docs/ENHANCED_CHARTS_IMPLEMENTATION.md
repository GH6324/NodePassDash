# 增强版实时图表组件实现

## 概述

基于 nezha-dash 项目的网络图表实现方式，重新设计了符合实时数据流特性的图表组件，解决了原有实现的三个关键问题：

## 解决的问题

### 1. 数据刷新方式优化
**问题**：原实现每15秒重绘整个图表，导致图表"跳跃"  
**解决方案**：
- 实现数据累积机制，新数据追加到现有数据集
- 使用内部状态管理历史数据
- 支持平滑的动画过渡（300ms缓动）

```typescript
// 数据更新逻辑 - 只追加新数据，不重绘整个图表
React.useEffect(() => {
  setHistoricalData(prevData => {
    const mergedData = [...prevData];
    // 合并新旧数据，避免重复
    // 保持最新的数据点，移除过老的数据
    return sortedData.slice(-maxDataPoints);
  });
}, [apiData]);
```

### 2. 图表大小显示问题
**问题**：图表在不同容器中显示异常  
**解决方案**：
- 使用 ResponsiveContainer 确保自适应
- 正确设置边距和容器尺寸
- 支持响应式高度配置

### 3. 横坐标显示优化
**问题**：时间轴刻度和标签显示不正确  
**解决方案**：
- 实现智能时间刻度算法
- 根据时间范围动态调整刻度间隔
- 自动对齐到整点/整分钟

```typescript
// 生成X轴刻度 - 参考 nezha-dash 实现
const generateXAxisTicks = (data, timeRange) => {
  let tickInterval: number;
  if (duration <= 1 * 60 * 60 * 1000) { // 1小时内
    tickInterval = 10 * 60 * 1000; // 每10分钟
  } else if (duration <= 12 * 60 * 60 * 1000) { // 12小时内
    tickInterval = 60 * 60 * 1000; // 每1小时
  } else { // 24小时
    tickInterval = 2 * 60 * 60 * 1000; // 每2小时
  }
};
```

## 组件架构

### 1. RealtimeLineChart (基础图表组件)
- 基于 recharts 的通用实时图表组件
- 支持单轴和双轴模式
- 实现数据点数量限制和性能优化
- 完整的主题适配支持

### 2. EnhancedMetricsChart (业务图表组件)  
- 专门适配后端 API 数据结构
- 实现数据累积和去重逻辑
- 支持两种图表类型：流量趋势和连接质量
- 内置加载、错误、空状态处理

## 核心特性

### 🚀 实时数据流
- **数据累积**：新数据追加到现有时间序列
- **平滑更新**：避免图表重绘，支持动画过渡
- **性能优化**：限制最大数据点数量（默认500个）

### 📊 智能时间轴
- **动态刻度**：根据时间范围智能调整刻度间隔
- **时间对齐**：自动对齐到整点/整分钟
- **格式化**：24小时内显示时分，超过24小时显示月日时分

### 🎨 主题适配
- **深色模式**：完整的深色主题支持
- **响应式**：自适应不同屏幕尺寸
- **自定义色彩**：参考 nezha-dash 的配色方案

### 📈 双轴图表
- **质量监控**：左轴显示连接池数量，右轴显示延迟
- **单位处理**：自动格式化不同单位（B/s、ms、个等）
- **数据验证**：只显示有效数据系列

## 使用方式

### 流量趋势图
```tsx
<EnhancedMetricsChart
  apiData={metricsData?.data || null}
  type="traffic"
  height={250}
  timeRange="24h"
  showLegend={true}
  maxDataPoints={500}
/>
```

### 连接质量图（双轴）
```tsx
<EnhancedMetricsChart
  apiData={metricsData?.data || null}
  type="quality"
  height={250}
  timeRange="24h"
  showLegend={true}
  maxDataPoints={500}
/>
```

## 性能优化

1. **数据点限制**：最大保存500个数据点，超出时移除最旧数据
2. **内存管理**：使用 useMemo 缓存计算结果
3. **动画优化**：使用 CSS 硬件加速
4. **条件渲染**：只渲染有数据的图表系列

## 兼容性

- ✅ 与现有 `useMetricsTrend` hook 完全兼容
- ✅ 支持15秒轮询数据更新
- ✅ 适配现有的 API 数据结构
- ✅ 保持原有的时间范围选择功能

## 技术栈

- **图表库**：recharts ^2.15.3
- **主题**：next-themes 0.4.6  
- **TypeScript**：完整类型定义
- **React**：函数组件 + Hooks

## 参考实现

参考了 [nezha-dash NetworkChart.tsx](https://github.com/hamster1963/nezha-dash/blob/484266666dd61bacb027c887436921dad86ed71e/app/(main)/ClientComponents/detail/NetworkChart.tsx) 的实现方式：

- 数据轮询机制
- 时间轴显示逻辑
- 纵坐标格式化
- 图表主题配置

