import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Skeleton,
  Modal,
  ModalContent,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Textarea,
  Input,
  useDisclosure,
} from "@heroui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faRotateRight,
  faBug,
  faTrash,
  faWifi,
  faServer,
  faKey,
  faGlobe,
  faDesktop,
  faCode,
  faLock,
  faCertificate,
  faLayerGroup,
  faFileLines,
  faHardDrive,
  faClock,
  faPlus,
  faSync,
  faCopy,
  faPlug,
  faPlugCircleXmark,
  faNetworkWired,
  faCog,
  faQrcode,
  faMicrochip,
  faMemory,
} from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { addToast } from "@heroui/toast";
import QRCode from "qrcode";

import { buildApiUrl, formatUrlWithPrivacy } from "@/lib/utils";
import { OSIcon } from "@/components/ui/os-icon";
import { useSettings } from "@/components/providers/settings-provider";
import SystemStatsCharts from "@/components/ui/system-stats-charts";
import NetworkDebugModal from "@/components/ui/network-debug-modal";
import { SimpleCircleChart } from "@/components/ui/simple-circle-chart";
import { useSystemMonitorWS, SystemMonitorData } from "@/lib/hooks/use-system-monitor-ws";

// 主控详情接口定义
interface EndpointDetail {
  id: number;
  name: string;
  url: string;
  apiPath: string;
  apiKey: string;
  status: string;
  color?: string;
  os?: string;
  arch?: string;
  ver?: string;
  log?: string;
  tls?: string;
  crt?: string;
  keyPath?: string;
  uptime?: number | null;
  lastCheck: string;
  createdAt: string;
  updatedAt: string;
}

// 端点统计信息接口定义
interface EndpointStats {
  tunnelCount: number;
  fileLogCount: number;
  fileLogSize: number;
  totalTrafficIn: number;
  totalTrafficOut: number;
  tcpTrafficIn: number;
  tcpTrafficOut: number;
  udpTrafficIn: number;
  udpTrafficOut: number;
}

export default function EndpointDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const endpointId = searchParams.get("id");
  const { settings } = useSettings();

  const [detailLoading, setDetailLoading] = useState(true);
  const [recycleCount, setRecycleCount] = useState<number>(0);
  const [endpointDetail, setEndpointDetail] = useState<EndpointDetail | null>(
    null,
  );
  const [endpointStats, setEndpointStats] = useState<EndpointStats | null>(
    null,
  );
  const [statsLoading, setStatsLoading] = useState(true);

  // 实时系统状态
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [swapUsage, setSwapUsage] = useState(0);
  const [hasSwap, setHasSwap] = useState(false);
  const [realTimeTraffic, setRealTimeTraffic] = useState({
    uploadSpeed: 0,
    downloadSpeed: 0,
    tcpConnections: 0,
    udpConnections: 0,
  });
  const [realTimeDisk, setRealTimeDisk] = useState({
    usage: 0,
    fileCount: 0,
    readSpeed: 0,
    writeSpeed: 0,
  });

  // 网络和磁盘速率计算状态
  const [previousNetRx, setPreviousNetRx] = useState<number | null>(null);
  const [previousNetTx, setPreviousNetTx] = useState<number | null>(null);
  const [previousDiskR, setPreviousDiskR] = useState<number | null>(null);
  const [previousDiskW, setPreviousDiskW] = useState<number | null>(null);
  const [previousTimestamp, setPreviousTimestamp] = useState<number | null>(null);
  const [netRxRate, setNetRxRate] = useState(0);
  const [netTxRate, setNetTxRate] = useState(0);
  const [diskRRate, setDiskRRate] = useState(0);
  const [diskWRate, setDiskWRate] = useState(0);
  const [instances, setInstances] = useState<
    Array<{
      instanceId: string;
      commandLine: string;
      type: string;
      status: string;
      alias: string;
    }>
  >([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // 模态框状态管理
  const {
    isOpen: isAddTunnelOpen,
    onOpen: onAddTunnelOpen,
    onOpenChange: onAddTunnelOpenChange,
  } = useDisclosure();
  const {
    isOpen: isEditConfigOpen,
    onOpen: onEditConfigOpen,
    onOpenChange: onEditConfigOpenChange,
  } = useDisclosure();
  const {
    isOpen: isNetworkDebugOpen,
    onOpen: onNetworkDebugOpen,
    onOpenChange: onNetworkDebugOpenChange,
  } = useDisclosure();
  const {
    isOpen: isResetApiKeyOpen,
    onOpen: onResetApiKeyOpen,
    onOpenChange: onResetApiKeyOpenChange,
  } = useDisclosure();
  const {
    isOpen: isDeleteEndpointOpen,
    onOpen: onDeleteEndpointOpen,
    onOpenChange: onDeleteEndpointOpenChange,
  } = useDisclosure();
  const {
    isOpen: isQrCodeOpen,
    onOpen: onQrCodeOpen,
    onOpenChange: onQrCodeOpenChange,
  } = useDisclosure();

  // 表单状态
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [tunnelName, setTunnelName] = useState("");
  const [configForm, setConfigForm] = useState({
    name: "", // 主控名称，留空表示不修改
    url: "", // 完整URL（包含API路径），留空表示不修改
    apiKey: "", // API密钥，留空表示不修改
  });

  // 二维码状态
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // 获取日志级别的颜色
  const getLogLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "debug":
        return "primary";
      case "info":
        return "success";
      case "warn":
      case "warning":
        return "warning";
      case "error":
        return "danger";
      default:
        return "default";
    }
  };

  // 获取TLS配置说明
  const getTlsDescription = (tls: string) => {
    switch (tls) {
      case "0":
        return "无TLS";
      case "1":
        return "自签名证书";
      case "2":
        return "自定义证书";
      default:
        return tls;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 格式化流量数据
  const formatTraffic = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 格式化在线时长
  const formatUptime = (seconds: number | null | undefined) => {
    if (!seconds || seconds <= 0) return "";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    // 如果大于等于1天，只显示天数
    if (days >= 1) {
      return `${days}天`;
    }

    // 小于1天的情况
    const parts = [];

    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 && parts.length === 0) parts.push(`${secs}s`); // 只有在没有小时和分钟时才显示秒数

    return parts.join("") || "0s";
  };

  // 获取实例状态指示器
  const getInstanceStatusIndicator = (status: string) => {
    const statusConfig = {
      running: {
        color: "bg-green-500",
        label: "运行中",
        animate: false,
      },
      stopped: {
        color: "bg-red-500",
        label: "已停止",
        animate: false,
      },
      error: {
        color: "bg-red-500",
        label: "错误",
        animate: true,
      },
      starting: {
        color: "bg-yellow-500",
        label: "启动中",
        animate: true,
      },
      stopping: {
        color: "bg-orange-500",
        label: "停止中",
        animate: true,
      },
      unknown: {
        color: "bg-gray-400",
        label: "未知",
        animate: false,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;

    return (
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <div
          className={`w-2 h-2 rounded-full ${config.color} ${config.animate ? "animate-pulse" : ""}`}
          title={config.label}
        />
      </div>
    );
  };

  // 获取主控详情数据
  const fetchEndpointDetail = useCallback(async () => {
    if (!endpointId) return;

    try {
      setDetailLoading(true);
      const res = await fetch(
        buildApiUrl(`/api/endpoints/${endpointId}/detail`),
      );

      if (!res.ok) throw new Error("获取主控详情失败");
      const data = await res.json();

      if (data.success && data.endpoint) {
        setEndpointDetail(data.endpoint);
      }
    } catch (err) {
      console.error(err);
      addToast({
        title: "加载失败",
        description: err instanceof Error ? err.message : "未知错误",
        color: "danger",
      });
    } finally {
      setDetailLoading(false);
    }
  }, [endpointId]);

  // 获取端点统计信息
  const fetchEndpointStats = useCallback(async () => {
    if (!endpointId) return;

    try {
      setStatsLoading(true);
      const res = await fetch(
        buildApiUrl(`/api/endpoints/${endpointId}/stats`),
      );

      if (!res.ok) throw new Error("获取统计信息失败");
      const data = await res.json();

      if (data.success && data.data) {
        setEndpointStats(data.data);
      }
    } catch (err) {
      console.error("获取统计信息失败:", err);
      addToast({
        title: "获取统计信息失败",
        description: err instanceof Error ? err.message : "未知错误",
        color: "warning",
      });
    } finally {
      setStatsLoading(false);
    }
  }, [endpointId]);

  // 获取实例列表
  const fetchInstances = useCallback(async () => {
    if (!endpointId) return;
    try {
      setInstancesLoading(true);
      const res = await fetch(
        buildApiUrl(`/api/endpoints/${endpointId}/instances`),
      );

      if (!res.ok) throw new Error("获取实例列表失败");
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const list = data.data
          .map((item: any) => {
            const cmd = item.commandLine || item.url || "";
            let ty = item.type || item.mode || "";

            if (!ty && typeof cmd === "string") {
              ty = cmd.includes("client://") ? "client" : "server";
            }

            return {
              instanceId: item.id || item.instanceId || "",
              commandLine: cmd,
              type: ty,
              status: item.status || "unknown",
              alias: item.alias || item.name || "",
            };
          })
          .filter(
            (x: any) => x.type && x.instanceId && x.instanceId !== "********",
          );

        setInstances(list);
      } else {
        console.warn("获取实例数据格式错误:", data);
        setInstances([]);
      }
    } catch (e) {
      console.error(e);
      addToast({
        title: "获取实例失败",
        description: e instanceof Error ? e.message : "未知错误",
        color: "danger",
      });
    } finally {
      setInstancesLoading(false);
    }
  }, [endpointId]);

  // 使用useCallback优化函数引用，添加正确的依赖项
  const memoizedFetchEndpointDetail = useCallback(fetchEndpointDetail, [
    endpointId,
  ]);
  const memoizedFetchEndpointStats = useCallback(fetchEndpointStats, [
    endpointId,
  ]);
  const memoizedFetchInstances = useCallback(fetchInstances, [endpointId]);

  // SystemMonitor WebSocket连接用于实时系统数据
  const {
    isConnected: isSystemMonitorConnected,
    isConnecting: isSystemMonitorConnecting,
    error: systemMonitorError,
    latestData: systemMonitorData,
    connect: connectSystemMonitor,
    disconnect: disconnectSystemMonitor,
  } = useSystemMonitorWS(
    endpointId ? parseInt(endpointId) : null,
    {
      onData: (data: SystemMonitorData) => {
        console.log('[SystemMonitor] 收到实时数据:', data);

        // 更新CPU使用率
        if (data.cpu !== undefined) {
          setCpuUsage(Math.round(data.cpu));
        }

        // 更新内存使用率
        if (data.ram !== undefined) {
          setMemoryUsage(Math.round(data.ram));
        }

        // 更新Swap使用率
        if (data.swap !== undefined) {
          setSwapUsage(Math.round(data.swap));
          // 如果收到swap数据且大于0，设置hasSwap为true
          if (data.swap > 0) {
            setHasSwap(true);
          }
        }

        // 计算网络和磁盘速率
        const currentTime = data.timestamp;

        if (previousTimestamp && currentTime > previousTimestamp) {
          const timeDiff = (currentTime - previousTimestamp) / 1000; // 转换为秒

          // 计算网络速率
          if (previousNetRx !== null && data.netrx !== undefined) {
            const rxDiff = Math.max(0, data.netrx - previousNetRx);
            const rxRate = Math.round(rxDiff / timeDiff);
            setNetRxRate(rxRate);
          }

          if (previousNetTx !== null && data.nettx !== undefined) {
            const txDiff = Math.max(0, data.nettx - previousNetTx);
            const txRate = Math.round(txDiff / timeDiff);
            setNetTxRate(txRate);
          }

          // 计算磁盘I/O速率
          if (previousDiskR !== null && data.diskr !== undefined) {
            const diskRDiff = Math.max(0, data.diskr - previousDiskR);
            const diskRRate = Math.round(diskRDiff / timeDiff);
            setDiskRRate(diskRRate);
          }

          if (previousDiskW !== null && data.diskw !== undefined) {
            const diskWDiff = Math.max(0, data.diskw - previousDiskW);
            const diskWRate = Math.round(diskWDiff / timeDiff);
            setDiskWRate(diskWRate);
          }
        }

        // 更新实时流量数据
        setRealTimeTraffic({
          uploadSpeed: netTxRate,
          downloadSpeed: netRxRate,
          tcpConnections: 0, // SystemMonitor不提供连接数数据
          udpConnections: 0,
        });

        // 更新磁盘I/O数据
        setRealTimeDisk({
          usage: endpointStats?.fileLogSize || 0, // 使用日志文件大小作为磁盘使用量
          fileCount: endpointStats?.fileLogCount || 0, // 使用日志文件数量
          readSpeed: diskRRate,
          writeSpeed: diskWRate,
        });

        // 保存当前值为下次计算准备
        setPreviousNetRx(data.netrx || 0);
        setPreviousNetTx(data.nettx || 0);
        setPreviousDiskR(data.diskr || 0);
        setPreviousDiskW(data.diskw || 0);
        setPreviousTimestamp(currentTime);
      },
      onError: (error) => {
        console.error('[SystemMonitor] 连接错误:', error);
      },
    }
  );

  // 检查版本兼容性并自动连接SystemMonitor（类似SystemStatsCharts的逻辑）
  useEffect(() => {
    // 只有当端点在线且版本兼容时才连接SystemMonitor
    if (endpointDetail?.status === "ONLINE" && endpointDetail?.ver) {
      // 检查版本是否支持SystemMonitor (假设v2.0.0以上支持)
      const versionMatch = endpointDetail.ver.match(/v?(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const [, major, minor] = versionMatch.map(Number);
        const isVersionSupported = major > 2 || (major === 2 && minor >= 0);

        if (isVersionSupported && !isSystemMonitorConnected && !isSystemMonitorConnecting) {
          console.log('[SystemMonitor] 版本兼容，开始连接系统监控...');
          connectSystemMonitor();
        }
      }
    } else if (isSystemMonitorConnected && endpointDetail?.status !== "ONLINE") {
      // 如果端点离线，断开SystemMonitor连接
      console.log('[SystemMonitor] 端点离线，断开系统监控连接');
      disconnectSystemMonitor();
    }
  }, [endpointDetail?.status, endpointDetail?.ver, isSystemMonitorConnected, isSystemMonitorConnecting, connectSystemMonitor, disconnectSystemMonitor]);

  // 主控操作函数
  const handleConnect = async () => {
    if (!endpointId) return;
    try {
      const response = await fetch(buildApiUrl("/api/endpoints"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(endpointId),
          action: "reconnect",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || "连接失败");
      }

      const result = await response.json();

      addToast({
        title: "连接成功",
        description: result.message || "主控连接请求已发送",
        color: "success",
      });

      // 刷新主控详情
      await fetchEndpointDetail();
    } catch (error) {
      addToast({
        title: "连接失败",
        description: error instanceof Error ? error.message : "连接请求失败",
        color: "danger",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!endpointId) return;
    try {
      const response = await fetch(buildApiUrl("/api/endpoints"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(endpointId),
          action: "disconnect",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || "断开连接失败");
      }

      const result = await response.json();

      addToast({
        title: "断开连接成功",
        description: result.message || "主控连接已断开",
        color: "success",
      });

      // 刷新主控详情
      await fetchEndpointDetail();
    } catch (error) {
      addToast({
        title: "断开连接失败",
        description: error instanceof Error ? error.message : "断开连接失败",
        color: "danger",
      });
    }
  };

  const handleRefreshTunnels = async () => {
    if (!endpointId) return;
    try {
      const response = await fetch(buildApiUrl("/api/endpoints"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(endpointId),
          action: "refresTunnel",
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "刷新失败");
      }
      addToast({
        title: "刷新成功",
        description: data.message || "隧道信息已刷新",
        color: "success",
      });
      await fetchInstances();
    } catch (error) {
      addToast({
        title: "刷新失败",
        description: error instanceof Error ? error.message : "刷新请求失败",
        color: "danger",
      });
    }
  };

  const handleCopyConfig = () => {
    if (!endpointDetail) return;
    const config = `API URL: ${endpointDetail.url}${endpointDetail.apiPath}\nAPI KEY: ${endpointDetail.apiKey}`;

    navigator.clipboard.writeText(config).then(() => {
      addToast({
        title: "已复制",
        description: "配置信息已复制到剪贴板",
        color: "success",
      });
    });
  };

  const handleResetApiKey = async () => {
    if (!endpointId) return;

    try {
      addToast({
        title: "开始重置密钥",
        description: "正在断开当前连接...",
        color: "primary",
      });

      // 1. 先断开连接
      await handleDisconnect();

      // 2. 调用重置密钥接口
      const response = await fetch(
        buildApiUrl(`/api/endpoints/${endpointId}/reset-key`),
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || "重置密钥失败");
      }

      const result = await response.json();

      addToast({
        title: "密钥重置成功",
        description: "新密钥已生成，正在重新连接...",
        color: "success",
      });

      onResetApiKeyOpenChange();

      // 3. 刷新端点详情
      await fetchEndpointDetail();

      // 4. 延迟重新连接
      setTimeout(async () => {
        await handleConnect();
      }, 1500);
    } catch (error) {
      addToast({
        title: "密钥重置失败",
        description: error instanceof Error ? error.message : "重置失败",
        color: "danger",
      });
    }
  };

  const handleDeleteEndpoint = async () => {
    if (!endpointId) return;

    try {
      const response = await fetch(
        buildApiUrl(`/api/endpoints/${endpointId}`),
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.message || "删除失败");
      }

      addToast({
        title: "删除成功",
        description: "主控已删除",
        color: "success",
      });

      onDeleteEndpointOpenChange();

      // 返回主控列表页
      navigate("/endpoints");
    } catch (error) {
      addToast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除失败",
        color: "danger",
      });
    }
  };

  // 添加实例
  const handleAddTunnel = () => {
    setTunnelUrl("");
    setTunnelName("");
    onAddTunnelOpen();
  };

  const handleSubmitAddTunnel = async () => {
    if (!endpointId) return;
    if (!tunnelUrl.trim()) {
      addToast({
        title: "请输入 URL",
        description: "隧道 URL 不能为空",
        color: "warning",
      });

      return;
    }
    try {
      const res = await fetch(buildApiUrl("/api/tunnels/create_by_url"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointId: Number(endpointId),
          url: tunnelUrl.trim(),
          name: tunnelName.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "创建隧道失败");
      }
      addToast({
        title: "创建成功",
        description: data.message || "隧道已创建",
        color: "success",
      });
      onAddTunnelOpenChange();
      await fetchInstances();
    } catch (err) {
      addToast({
        title: "创建失败",
        description: err instanceof Error ? err.message : "无法创建隧道",
        color: "danger",
      });
    }
  };

  // 从 URL 中提取基础 URL 和 API 前缀的工具函数
  const parseUrl = (fullUrl: string) => {
    // 正则表达式匹配：协议://域名:端口/路径
    const urlRegex = /^(https?:\/\/[^\/]+)(\/.*)?$/;
    const match = fullUrl.match(urlRegex);

    if (match) {
      const baseUrl = match[1]; // 基础URL部分
      const apiPath = match[2] || "/api"; // API路径部分，默认为 /api

      return { baseUrl, apiPath };
    }

    // 如果不匹配，返回原URL和默认API路径
    return { baseUrl: fullUrl, apiPath: "/api" };
  };

  // 修改配置
  const handleEditConfig = () => {
    if (!endpointDetail) return;
    // 合并URL和APIPath为完整URL，预填充现有值
    const fullUrl = endpointDetail.url + endpointDetail.apiPath;

    setConfigForm({
      name: endpointDetail.name,
      url: fullUrl,
      apiKey: "", // API密钥留空，表示不修改
    });
    onEditConfigOpen();
  };

  const handleSubmitEditConfig = async () => {
    if (!endpointId) return;

    // 验证必填字段
    if (!configForm.name.trim() || !configForm.url.trim()) {
      addToast({
        title: "请填写完整信息",
        description: "名称和URL地址不能为空",
        color: "warning",
      });

      return;
    }

    // 从完整URL中分离出baseUrl和apiPath
    const { baseUrl, apiPath } = parseUrl(configForm.url.trim());

    // 检查是否有变更
    const hasNameChange = configForm.name.trim() !== endpointDetail?.name;
    const hasUrlChange =
      baseUrl !== endpointDetail?.url || apiPath !== endpointDetail?.apiPath;
    const hasApiKeyChange = configForm.apiKey.trim() !== "";

    if (!hasNameChange && !hasUrlChange && !hasApiKeyChange) {
      addToast({
        title: "没有变更",
        description: "未检测到任何配置变更",
        color: "warning",
      });

      return;
    }

    try {
      // 如果有URL或密钥变更，需要先断开连接
      if (hasUrlChange || hasApiKeyChange) {
        addToast({
          title: "开始更新配置",
          description: "正在断开当前连接...",
          color: "primary",
        });

        // 1. 先断开连接
        await handleDisconnect();
      }

      // 构建请求数据
      const updateData: any = {
        id: Number(endpointId),
        action: "updateConfig",
        name: configForm.name.trim(),
        url: configForm.url.trim(),
      };

      // 只有当填写了新密钥时才传送
      if (hasApiKeyChange) {
        updateData.apiKey = configForm.apiKey.trim();
      }

      const response = await fetch(buildApiUrl("/api/endpoints"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || "配置更新失败");
      }

      addToast({
        title: "配置更新成功",
        description: "配置已更新，正在重新连接...",
        color: "success",
      });

      onEditConfigOpenChange();

      // 刷新端点详情
      await fetchEndpointDetail();

      // 如果有URL或密钥变更，延迟重新连接
      if (hasUrlChange || hasApiKeyChange) {
        setTimeout(async () => {
          await handleConnect();
        }, 1500);
      }
    } catch (error) {
      addToast({
        title: "配置更新失败",
        description: error instanceof Error ? error.message : "更新失败",
        color: "danger",
      });
    }
  };

  // 刷新所有数据
  const handleRefreshAll = async () => {
    try {
      // 并行刷新所有数据
      await Promise.all([
        fetchEndpointDetail(),
        fetchEndpointStats(),
        fetchInstances(),
      ]);

      addToast({
        title: "刷新成功",
        description: "所有数据已刷新",
        color: "success",
      });
    } catch (error) {
      addToast({
        title: "刷新失败",
        description: error instanceof Error ? error.message : "刷新失败",
        color: "danger",
      });
    }
  };

  // 初始化数据加载 - 只在组件挂载时执行一次，使用ref避免重复执行
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      console.log("[Endpoint Detail] 组件初始化，加载数据");
      hasInitializedRef.current = true;
      memoizedFetchEndpointDetail();
      memoizedFetchEndpointStats();
      memoizedFetchInstances();
    }
  }, [
    memoizedFetchEndpointDetail,
    memoizedFetchEndpointStats,
    memoizedFetchInstances,
  ]);

  // LogViewer组件会自动处理滚动

  // 生成二维码
  const generateQRCode = useCallback(async () => {
    if (!endpointDetail) return;

    try {
      // 构建二维码内容：np://master?url=base64(url)&key=base64(key)
      const fullUrl = endpointDetail.url + endpointDetail.apiPath;
      const encodedUrl = btoa(fullUrl);
      const encodedKey = btoa(endpointDetail.apiKey);
      const qrContent = `np://master?url=${encodedUrl}&key=${encodedKey}`;

      // 生成二维码
      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeDataUrl(dataUrl);
      onQrCodeOpen();
    } catch (error) {
      console.error("生成二维码失败:", error);
      addToast({
        title: "生成二维码失败",
        description: error instanceof Error ? error.message : "未知错误",
        color: "danger",
      });
    }
  }, [endpointDetail, onQrCodeOpen]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 顶部返回按钮和主控信息 */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            className="bg-default-100 hover:bg-default-200"
            variant="flat"
            onClick={() => navigate(-1)}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>
          {endpointDetail ? (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg md:text-2xl font-bold truncate max-w-[200px] md:max-w-none">
                {endpointDetail.name}
              </h1>
              {endpointDetail.ver && (
                <Chip color="secondary" variant="flat">
                  {endpointDetail.ver}
                </Chip>
              )}
              <Chip
                color={
                  endpointDetail.status === "ONLINE"
                    ? "success"
                    : endpointDetail.status === "FAIL"
                      ? "danger"
                      : endpointDetail.status === "DISCONNECT"
                        ? "default"
                        : "warning"
                }
                variant="flat"
              >
                {endpointDetail.status === "ONLINE"
                  ? "在线"
                  : endpointDetail.status === "FAIL"
                    ? "异常"
                    : endpointDetail.status === "DISCONNECT"
                      ? "断开"
                      : "离线"}
              </Chip>
            </div>
          ) : (
            <h1 className="text-lg md:text-2xl font-bold truncate">主控详情</h1>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <Button
            className="hidden md:flex"
            color="default"
            isLoading={detailLoading || statsLoading || instancesLoading}
            startContent={<FontAwesomeIcon icon={faRotateRight} />}
            variant="flat"
            onPress={handleRefreshAll}
          >
            刷新
          </Button>
          <Button
            isIconOnly
            className="md:hidden"
            color="default"
            isLoading={detailLoading || statsLoading || instancesLoading}
            variant="flat"
            onPress={handleRefreshAll}
          >
            <FontAwesomeIcon icon={faRotateRight} />
          </Button>
        </div>
      </div>

      {/* 系统监控统计图 - 仅在实验模式下显示 */}
      {settings.isExperimentalMode && (
        <SystemStatsCharts
          endpointId={endpointId ? parseInt(endpointId) : null}
          endpointOS={endpointDetail?.os || null}
          endpointVersion={endpointDetail?.ver || null}
          isExperimentalMode={settings.isExperimentalMode}
        />
      )}

      {/* 统计信息卡片 - 隐藏 */}
      {false && (
        <Card className="p-2">
          <CardHeader>
            <div className="flex flex-col flex-1">
              <p className="text-lg font-semibold">主控统计</p>
              <p className="text-sm text-default-500">当前主控的数据统计概览</p>
            </div>
          </CardHeader>
          <CardBody>
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-default/10 rounded-lg"
                  >
                    <Skeleton className="w-6 h-6 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-5 w-12 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : endpointStats ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 隧道数量 */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20">
                  <FontAwesomeIcon
                    className="text-primary text-xl"
                    icon={faLayerGroup}
                  />
                  <div>
                    <p className="text-xs text-default-600">实例总数量</p>
                    <p className="text-xl font-bold text-primary">
                      {endpointStats.tunnelCount}
                    </p>
                    <p className="text-xs text-default-500">活跃实例</p>
                  </div>
                </div>

                {/* 日志文件数 */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5 border border-secondary/20">
                  <FontAwesomeIcon
                    className="text-secondary text-xl"
                    icon={faFileLines}
                  />
                  <div>
                    <p className="text-xs text-default-600">日志文件数</p>
                    <p className="text-xl font-bold text-secondary">
                      {endpointStats.fileLogCount}
                    </p>
                    <p className="text-xs text-default-500">日志文件</p>
                  </div>
                </div>

                {/* 日志文件大小 */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-success/20 via-success/10 to-success/5 border border-success/20">
                  <FontAwesomeIcon
                    className="text-success text-xl"
                    icon={faHardDrive}
                  />
                  <div>
                    <p className="text-xs text-default-600">日志文件大小</p>
                    <p className="text-xl font-bold text-success">
                      {formatFileSize(endpointStats.fileLogSize)}
                    </p>
                    <p className="text-xs text-default-500">磁盘占用</p>
                  </div>
                </div>

                {/* 总流量 */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br from-warning/20 via-warning/10 to-warning/5 border border-warning/20">
                  <FontAwesomeIcon
                    className="text-warning text-xl"
                    icon={faWifi}
                  />
                  <div>
                    <p className="text-xs text-default-600">总流量</p>
                    <p className="text-lg font-bold text-warning">
                      ↑{formatTraffic(endpointStats.totalTrafficOut)}
                    </p>
                    <p className="text-sm font-bold text-danger">
                      ↓{formatTraffic(endpointStats.totalTrafficIn)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-default-500">无法获取统计数据</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* 主控信息和详细统计的左右布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：主控信息 - 占1份 */}
        <div className="lg:col-span-1">
          {endpointDetail && (
            <Card className="p-2 h-full">
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">主控信息</h3>
                  <Button
                    isIconOnly
                    color="primary"
                    size="sm"
                    title="显示二维码"
                    variant="flat"
                    onPress={generateQRCode}
                  >
                    <FontAwesomeIcon icon={faQrcode} />
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {/* 详细信息网格 - 改为一列 */}
                  <div className="grid grid-cols-1 gap-4">
                    {/* 连接信息 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-small text-default-500">
                        <FontAwesomeIcon icon={faServer} />
                        <span>服务地址</span>
                      </div>
                      <p className="text-small font-mono truncate">
                        {formatUrlWithPrivacy(
                          endpointDetail.url,
                          endpointDetail.apiPath,
                          settings.isPrivacyMode,
                        )}
                      </p>
                    </div>

                    {(endpointDetail.uptime == null ||
                      endpointDetail.uptime == 0) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-small text-default-500">
                          <FontAwesomeIcon icon={faKey} />
                          <span>API Key</span>
                        </div>
                        <p className="text-small font-mono truncate">
                          ••••••••••••••••••••••••••••••••
                        </p>
                      </div>
                    )}

                    {/* 系统信息 */}
                    {endpointDetail.os && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-small text-default-500">
                          <FontAwesomeIcon icon={faDesktop} />
                          <span>操作系统</span>
                        </div>
                        <Chip
                          className="font-mono"
                          color="primary"
                          size="sm"
                          variant="flat"
                        >
                          <div className="flex items-center gap-2">
                            <OSIcon className="w-3 h-3" os={endpointDetail.os} />
                            {endpointDetail.os}
                          </div>
                        </Chip>
                      </div>
                    )}

                    {endpointDetail.arch && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-small text-default-500">
                          <FontAwesomeIcon icon={faCode} />
                          <span>架构</span>
                        </div>
                        <Chip
                          className="font-mono"
                          color="secondary"
                          size="sm"
                          variant="flat"
                        >
                          <div className="flex items-center gap-2">
                            <OSIcon
                              arch={endpointDetail.arch}
                              className="w-3 h-3"
                              type="arch"
                            />
                            {endpointDetail.arch}
                          </div>
                        </Chip>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-small text-default-500">
                        <FontAwesomeIcon icon={faGlobe} />
                        <span>日志级别</span>
                      </div>
                      <Chip
                        className="font-mono"
                        color={endpointDetail.log ? getLogLevelColor(endpointDetail.log) : "default"}
                        size="sm"
                        variant="flat"
                      >
                        {endpointDetail.log ? endpointDetail.log.toUpperCase() : "-"}
                      </Chip>
                    </div>

                    {endpointDetail.tls && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-small text-default-500">
                          <FontAwesomeIcon icon={faLock} />
                          <span>TLS配置</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Chip
                            color={
                              endpointDetail.tls === "0" ? "default" : "success"
                            }
                            size="sm"
                            variant="flat"
                          >
                            {getTlsDescription(endpointDetail.tls)}
                          </Chip>
                        </div>
                      </div>
                    )}

                    {/* 在线时长 */}
                    {endpointDetail.uptime != null && endpointDetail.uptime > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-small text-default-500">
                          <FontAwesomeIcon icon={faClock} />
                          <span>在线时长</span>
                        </div>
                        <Chip
                          className="font-mono"
                          color="success"
                          size="sm"
                          variant="flat"
                        >
                          {formatUptime(endpointDetail.uptime)}
                        </Chip>
                      </div>
                    )}

                    {/* 证书配置 - 仅当TLS=2时显示 */}
                    {endpointDetail.tls === "2" && endpointDetail.crt && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-small text-default-500">
                          <FontAwesomeIcon icon={faCertificate} />
                          <span>证书路径</span>
                        </div>
                        <p className="text-small font-mono truncate">
                          {endpointDetail.crt}
                        </p>
                      </div>
                    )}

                    {endpointDetail.tls === "2" && endpointDetail.keyPath && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-small text-default-500">
                          <FontAwesomeIcon icon={faKey} />
                          <span>密钥路径</span>
                        </div>
                        <p className="text-small font-mono truncate">
                          {endpointDetail.keyPath}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 时间信息 */}
                  <Divider />
                  <div className="grid grid-cols-1 gap-2 text-small text-default-500">
                    <div>
                      <span className="font-medium">创建时间：</span>
                      {new Date(endpointDetail.createdAt).toLocaleString("zh-CN")}
                    </div>
                    <div>
                      <span className="font-medium">更新时间：</span>
                      {new Date(endpointDetail.updatedAt).toLocaleString("zh-CN")}
                    </div>
                    <div>
                      <span className="font-medium">最后检查：</span>
                      {new Date(endpointDetail.lastCheck).toLocaleString("zh-CN")}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* 右侧：详细统计卡片 - 占3份 */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CPU使用率 - 圆圈图 */}
        <SimpleCircleChart
          title="CPU使用率"
          icon={faMicrochip}
          percentage={cpuUsage}
          color="primary"
          loading={statsLoading}
        />

        {/* 内存使用率 - 圆圈图 */}
        <SimpleCircleChart
          title="内存使用率"
          icon={faMemory}
          percentage={memoryUsage}
          color="success"
          loading={statsLoading}
        />

        {/* Swap内存使用率 - 圆圈图（仅在有swap时显示） */}
        {hasSwap && (
          <SimpleCircleChart
            title="Swap使用率"
            icon={faMemory}
            percentage={swapUsage}
            color="warning"
            loading={statsLoading}
          />
        )}

        {statsLoading ? (
          <>
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="aspect-square p-4 bg-default/10 rounded-lg flex flex-col items-center justify-center"
              >
                <Skeleton className="w-8 h-8 rounded mb-2" />
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </>
        ) : endpointStats ? (
          <>
            {/* 网络速度卡片 */}
            <Card className="aspect-square p-4 bg-white dark:bg-default-50 border-0 shadow-sm hover:shadow-md transition-all">
              <CardBody className="flex flex-col p-0">
                {/* 标题区域 */}
                <div className="flex items-center gap-2 mb-4">
                  <FontAwesomeIcon
                    className="text-default-500 text-sm"
                    icon={faWifi}
                  />
                  {/* lucide:globe */}
                  <span className="text-sm text-default-600 font-medium">网络速度</span>
                </div>

                {/* 数据区域 */}
                <div className="flex-1 flex flex-col justify-center space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">↑</span>
                    <span className="text-lg font-semibold text-foreground">
                      {realTimeTraffic.uploadSpeed > 0 ? `${formatTraffic(realTimeTraffic.uploadSpeed)}/s` : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">↓</span>
                    <span className="text-lg font-semibold text-foreground">
                      {realTimeTraffic.downloadSpeed > 0 ? `${formatTraffic(realTimeTraffic.downloadSpeed)}/s` : '-'}
                    </span>
                  </div>
                </div>

              </CardBody>
            </Card>

            {/* 磁盘I/O速度卡片 */}
            <Card className="aspect-square p-4 bg-white dark:bg-default-50 border-0 shadow-sm hover:shadow-md transition-all">
              <CardBody className="flex flex-col p-0">
                {/* 标题区域 */}
                <div className="flex items-center gap-2 mb-4">
                  <FontAwesomeIcon
                    className="text-default-500 text-sm"
                    icon={faHardDrive}
                  />
                  <span className="text-sm text-default-600 font-medium">磁盘I/O</span>
                </div>

                {/* 数据区域 */}
                <div className="flex-1 flex flex-col justify-center space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-default-600">读</span>
                    <span className="text-lg font-semibold text-foreground">
                      {realTimeDisk.readSpeed > 0 ? `${formatTraffic(realTimeDisk.readSpeed)}/s` : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-default-600">写</span>
                    <span className="text-lg font-semibold text-foreground">
                      {realTimeDisk.writeSpeed > 0 ? `${formatTraffic(realTimeDisk.writeSpeed)}/s` : '-'}
                    </span>
                  </div>
                </div>

              </CardBody>
            </Card>

            {/* 日志占用卡片 */}
            <Card className="aspect-square p-4 bg-white dark:bg-default-50 border-0 shadow-sm hover:shadow-md transition-all">
              <CardBody className="flex flex-col p-0">
                {/* 标题区域 */}
                <div className="flex items-center gap-2 mb-4">
                  <FontAwesomeIcon
                    className="text-default-500 text-sm"
                    icon={faFileLines}
                  />
                  <span className="text-sm text-default-600 font-medium">日志占用</span>
                </div>

                {/* 数据区域 */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {formatFileSize(endpointStats.fileLogSize)}
                  </div>
                  <div className="text-sm text-default-500">
                    {endpointStats.fileLogCount} 个文件
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 实例统计卡片 */}
            <Card className="aspect-square p-4 bg-white dark:bg-default-50 border-0 shadow-sm hover:shadow-md transition-all">
              <CardBody className="flex flex-col p-0">
                {/* 标题区域 */}
                <div className="flex items-center gap-2 mb-4">
                  <FontAwesomeIcon
                    className="text-default-500 text-sm"
                    icon={faLayerGroup}
                  />
                  <span className="text-sm text-default-600 font-medium">实例统计</span>
                </div>

                {/* 数据区域 */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {endpointStats.tunnelCount}
                  </div>
                  <div className="text-sm text-default-500">
                    活跃实例
                  </div>
                </div>

              </CardBody>
            </Card>

            {/* 流量统计卡片 */}
            <Card className="aspect-square p-4 bg-white dark:bg-default-50 border-0 shadow-sm hover:shadow-md transition-all">
              <CardBody className="flex flex-col p-0">
                {/* 标题区域 */}
                <div className="flex items-center gap-2 mb-4">
                  <FontAwesomeIcon
                    className="text-default-500 text-sm"
                    icon={faNetworkWired}
                  />
                  <span className="text-sm text-default-600 font-medium">总流量</span>
                </div>

                {/* 数据区域 */}
                <div className="flex-1 flex flex-col justify-center items-center space-y-2">
                  <div className="text-lg font-semibold text-foreground text-center">
                    ↑ {formatTraffic(endpointStats.totalTrafficOut + endpointStats.tcpTrafficOut + endpointStats.udpTrafficOut)}
                  </div>
                  <div className="text-lg font-semibold text-foreground text-center">
                    ↓ {formatTraffic(endpointStats.totalTrafficIn + endpointStats.tcpTrafficIn + endpointStats.udpTrafficIn)}
                  </div>
                </div>

              </CardBody>
            </Card>

          </>
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-default-500">无法获取统计数据</p>
          </div>
        )}
          </div>

          {/* 主控操作 */}
          {endpointDetail && (
            <Card className="p-2">
              {/* <CardHeader>
                <h3 className="text-lg font-semibold">主控操作</h3>
              </CardHeader> */}
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  {/* 添加实例 */}
                  <Button
                    color="primary"
                    startContent={<FontAwesomeIcon icon={faPlus} />}
                    variant="flat"
                    onPress={handleAddTunnel}
                  >
                    添加实例
                  </Button>

                  {/* 同步实例 */}
                  <Button
                    color="secondary"
                    startContent={<FontAwesomeIcon icon={faSync} />}
                    variant="flat"
                    onPress={handleRefreshTunnels}
                  >
                    同步实例
                  </Button>

                  {/* 分隔线 */}
                  {/* <Divider className="h-8 hidden md:block" orientation="vertical" /> */}

                  {/* 网络调试 */}
                  <Button
                    color="primary"
                    isDisabled={endpointDetail.status !== "ONLINE"}
                    startContent={<FontAwesomeIcon icon={faNetworkWired} />}
                    variant="flat"
                    onPress={onNetworkDebugOpen}
                  >
                    网络调试
                  </Button>

                  {/* 连接/断开按钮 */}
                  {endpointDetail.status === "ONLINE" ? (
                    <Button
                      color="warning"
                      startContent={<FontAwesomeIcon icon={faPlugCircleXmark} />}
                      variant="flat"
                      onPress={handleDisconnect}
                    >
                      断开连接
                    </Button>
                  ) : (
                    <Button
                      color="success"
                      startContent={<FontAwesomeIcon icon={faPlug} />}
                      variant="flat"
                      onPress={handleConnect}
                    >
                      连接主控
                    </Button>
                  )}

                  {/* 分隔线 */}
                  {/* <Divider className="h-8 hidden md:block" orientation="vertical" /> */}

                  {/* 复制配置 */}
                  <Button
                    color="default"
                    startContent={<FontAwesomeIcon icon={faCopy} />}
                    variant="flat"
                    onPress={handleCopyConfig}
                  >
                    复制配置
                  </Button>

                  {/* 修改配置 */}
                  <Button
                    color="primary"
                    startContent={<FontAwesomeIcon icon={faCog} />}
                    variant="flat"
                    onPress={handleEditConfig}
                  >
                    修改配置
                  </Button>

                  {/* 重置密钥 */}
                  <Button
                    color="success"
                    startContent={<FontAwesomeIcon icon={faKey} />}
                    variant="flat"
                    onPress={onResetApiKeyOpen}
                  >
                    重置密钥
                  </Button>

                  {/* SSE调试 */}
                  <Button
                    color="warning"
                    startContent={<FontAwesomeIcon icon={faBug} />}
                    variant="flat"
                    onPress={() => navigate(`/endpoints/sse-debug?id=${endpointId}`)}
                  >
                    SSE调试
                  </Button>

                  {/* 删除主控 */}
                  <Button
                    color="danger"
                    startContent={<FontAwesomeIcon icon={faTrash} />}
                    variant="flat"
                    onPress={onDeleteEndpointOpen}
                  >
                    删除主控
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>


      {/* 实例列表 */}
      <Card className="p-2">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">主控实例</h3>
            {/* <span className="text-sm text-default-500">({instances.length} 个实例)</span> */}
            {/* 类型和状态提示 */}
            {/* <div className="flex items-center gap-3 text-tiny">
              <div className="flex items-center gap-1 text-default-500">
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> 服务端
              </div>
              <div className="flex items-center gap-1 text-default-500">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block"></span> 客户端
              </div>
              <div className="border-l border-default-200 pl-3 flex items-center gap-3">
                <div className="flex items-center gap-1 text-default-500">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> 运行中
                </div>
                <div className="flex items-center gap-1 text-default-500">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> 已停止
                </div>
                <div className="flex items-center gap-1 text-default-500">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block"></span> 状态变化中
                </div>
              </div>
            </div> */}
          </div>
          <div className="flex items-center gap-2">
            {/* <Button size="sm" color="primary" variant="flat" onPress={() => setExtractOpen(true)}>提取</Button>
            <Button size="sm" color="secondary" variant="flat" onPress={() => setImportOpen(true)}>导入</Button> */}
          </div>
        </CardHeader>
        <CardBody>
          {instancesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Card key={index} className="h-[100px]">
                  <CardBody className="p-3 flex flex-col items-center justify-center">
                    <Skeleton className="w-8 h-8 rounded-full mb-2" />
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-2 w-12" />
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-default-500 text-sm">暂无实例数据</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[324px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {instances.map((ins) => (
                <Card
                  key={ins.instanceId}
                  className={`h-[100px] shadow-none border-1 transition-all relative ${
                    ins.type === "server"
                      ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700"
                      : "bg-secondary-50 border-secondary-200"
                  }`}
                >
                  {/* 状态指示器 */}
                  {getInstanceStatusIndicator(ins.status)}

                  <CardBody className="p-3 flex flex-col h-full relative">
                    {/* 顶部区域：左上角图标 + 右侧文字 */}
                    <div className="flex items-start gap-2 flex-1">
                      {/* 实例类型图标 */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          ins.type === "server"
                            ? "bg-primary-100 text-primary dark:bg-primary-600/20"
                            : "bg-secondary-100 text-secondary"
                        }`}
                      >
                        <FontAwesomeIcon
                          className="text-xs"
                          icon={ins.type === "server" ? faServer : faDesktop}
                        />
                      </div>

                      {/* 右侧文字区域 */}
                      <div className="flex-1 min-w-0">
                        {/* 第一行：alias */}
                        <p
                          className="text-xs font-medium truncate"
                          title={ins.alias || ins.instanceId}
                        >
                          {ins.alias || "未命名"}
                        </p>
                        {/* 第二行：实例ID */}
                        <p
                          className="text-xs text-default-500 truncate mt-0.5"
                          title={ins.instanceId}
                        >
                          {ins.instanceId}
                        </p>
                      </div>
                    </div>

                    {/* 左下角类型标签 */}
                    <div className="absolute bottom-2 left-2">
                      <Chip
                        className="text-xs h-4 px-2"
                        color={ins.type === "server" ? "primary" : "secondary"}
                        size="sm"
                        variant="flat"
                      >
                        {ins.type === "server" ? "服务端" : "客户端"}
                      </Chip>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* 提取模态框 */}
      <Modal
        isOpen={extractOpen}
        size="lg"
        onClose={() => setExtractOpen(false)}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader>实例URL提取</ModalHeader>
              <ModalBody>
                <Textarea
                  readOnly
                  minRows={10}
                  value={instances.map((i) => i.commandLine).join("\n")}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  onPress={() => {
                    navigator.clipboard.writeText(
                      instances.map((i) => i.commandLine).join("\n"),
                    );
                    addToast({ title: "已复制", color: "success" });
                  }}
                >
                  复制全部
                </Button>
                <Button onPress={() => setExtractOpen(false)}>关闭</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 添加实例模态框 */}
      <Modal
        isOpen={isAddTunnelOpen}
        placement="center"
        onOpenChange={onAddTunnelOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>添加实例</ModalHeader>
              <ModalBody>
                <div className="space-y-3">
                  <Input
                    label="实例名称"
                    placeholder="请输入实例名称（可选）"
                    value={tunnelName}
                    onValueChange={setTunnelName}
                  />
                  <Input
                    isRequired
                    label="隧道URL"
                    placeholder="例如：server://0.0.0.0:8080/127.0.0.1:3000"
                    value={tunnelUrl}
                    onValueChange={setTunnelUrl}
                  />
                  <p className="text-tiny text-default-500">
                    格式：server://bind_addr:bind_port/target_host:target_port
                    或 client://server_host:server_port/local_host:local_port
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button color="primary" onPress={handleSubmitAddTunnel}>
                  添加
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 修改配置模态框 */}
      <Modal
        isOpen={isEditConfigOpen}
        placement="center"
        size="lg"
        onOpenChange={onEditConfigOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>修改主控配置</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-sm text-warning-600">
                    ⚠️ 修改URL地址或密钥将会断开当前连接并使用新配置重新连接
                  </p>

                  <Input
                    isRequired
                    endContent={
                      <span className="text-xs text-default-500">
                        {configForm.name.length}/25
                      </span>
                    }
                    label="主控名称"
                    maxLength={25}
                    placeholder="请输入主控名称"
                    value={configForm.name}
                    onValueChange={(value) =>
                      setConfigForm((prev) => ({ ...prev, name: value }))
                    }
                  />

                  <Input
                    isRequired
                    label="URL 地址"
                    placeholder="http(s)://example.com:9090/api/v1"
                    type="url"
                    value={configForm.url}
                    onValueChange={(value) =>
                      setConfigForm((prev) => ({ ...prev, url: value }))
                    }
                  />

                  <Input
                    description="留空表示不修改密钥"
                    label="API密钥"
                    placeholder="留空表示不修改密钥"
                    type="password"
                    value={configForm.apiKey}
                    onValueChange={(value) =>
                      setConfigForm((prev) => ({ ...prev, apiKey: value }))
                    }
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button color="warning" onPress={handleSubmitEditConfig}>
                  确定修改
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 导入模态框 */}
      <Modal isOpen={importOpen} size="lg" onClose={() => setImportOpen(false)}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader>导入URL</ModalHeader>
              <ModalBody>
                <Textarea
                  minRows={10}
                  placeholder="在此粘贴 URL，每行一个..."
                />
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" onPress={() => setImportOpen(false)}>
                  确定
                </Button>
                <Button onPress={() => setImportOpen(false)}>取消</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 网络调试模态框 */}
      {endpointId && (
        <NetworkDebugModal
          endpointId={parseInt(endpointId)}
          isOpen={isNetworkDebugOpen}
          onOpenChange={onNetworkDebugOpenChange}
        />
      )}

      {/* 重置密钥确认模态框 */}
      <Modal
        isOpen={isResetApiKeyOpen}
        placement="center"
        onOpenChange={onResetApiKeyOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <FontAwesomeIcon className="text-warning" icon={faKey} />
                <span>重置API密钥</span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        className="text-warning text-lg mt-0.5"
                        icon={faKey}
                      />
                      <div>
                        <h4 className="font-semibold text-warning-800 mb-1">
                          ⚠️ 重要提醒
                        </h4>
                        <p className="text-sm text-warning-700">
                          重置API密钥后，当前连接将断开，需要使用新密钥重新连接主控。
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-default-600">
                    您确定要重置此主控的API密钥吗？此操作将：
                  </p>
                  <ul className="text-sm text-default-600 list-disc list-inside space-y-1 ml-4">
                    <li>生成新的API密钥</li>
                    <li>断开当前连接</li>
                    <li>需要使用新密钥重新连接</li>
                  </ul>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button color="warning" onPress={handleResetApiKey}>
                  确认重置
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 删除主控确认模态框 */}
      <Modal
        isOpen={isDeleteEndpointOpen}
        placement="center"
        onOpenChange={onDeleteEndpointOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <FontAwesomeIcon className="text-danger" icon={faTrash} />
                <span>删除主控</span>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        className="text-danger text-lg mt-0.5"
                        icon={faTrash}
                      />
                      <div>
                        <h4 className="font-semibold text-danger-800 mb-1">
                          ⚠️ 危险操作
                        </h4>
                        <p className="text-sm text-danger-700">
                          删除主控后，所有相关的实例和配置信息将永久丢失，无法恢复。
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-default-600">
                    您确定要删除主控 <strong>{endpointDetail?.name}</strong>{" "}
                    吗？此操作将：
                  </p>
                  <ul className="text-sm text-default-600 list-disc list-inside space-y-1 ml-4">
                    <li>永久删除主控配置</li>
                    <li>删除所有关联的实例</li>
                    <li>清除所有历史数据</li>
                    <li>此操作不可撤销</li>
                  </ul>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button color="danger" onPress={handleDeleteEndpoint}>
                  确认删除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 二维码模态框 */}
      <Modal
        isOpen={isQrCodeOpen}
        placement="center"
        size="lg"
        onOpenChange={onQrCodeOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <FontAwesomeIcon className="text-primary" icon={faQrcode} />
                <span>主控配置二维码</span>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col items-center space-y-6 pb-4">
                  {qrCodeDataUrl ? (
                    <>
                      <div className="p-4 bg-white rounded-lg border">
                        <img
                          alt="主控配置二维码"
                          className="w-64 h-64"
                          src={qrCodeDataUrl}
                        />
                      </div>
                      <p className="text-sm text-default-500 text-center">
                        扫描此二维码可快速配置主控连接
                      </p>

                      {/* 应用下载链接 */}
                      <div className="w-full">
                        <p className="text-sm font-medium text-default-700 mb-3 text-center">
                          下载移动端应用
                        </p>
                        <div className="flex items-center justify-center gap-4">
                          {/* iOS 应用 */}
                          <a
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                            href="https://apps.apple.com/us/app/nodepass/id6747930492"
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <Icon
                              className="w-5 h-5 text-white"
                              icon="simple-icons:apple"
                            />
                            <span className="text-sm font-medium">
                              iOS 版本
                            </span>
                          </a>

                          {/* Android 应用 */}
                          <button
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                            onClick={() => {
                              addToast({
                                title: "正在开发中",
                                description:
                                  "Android 版本正在开发中，敬请期待！",
                                color: "warning",
                              });
                            }}
                          >
                            <Icon
                              className="w-5 h-5 text-white"
                              icon="simple-icons:android"
                            />
                            <span className="text-sm font-medium">
                              Android 版本
                            </span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <Skeleton className="w-64 h-64 rounded-lg" />
                    </div>
                  )}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
