## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层 (React)"
        A1["核心数据看板"]
        A2["实时监控中心"]
        A3["智能预警中心"]
        A4["区域下钻分析"]
        A5["宣传方案管理"]
        A6["产量预测中心"]
        A7["运营诊断报告"]
        A8["权限管理中心"]
    end
    
    subgraph "接口层 (Express API)"
        B1["数据接入API"]
        B2["指标计算服务"]
        B3["预警引擎服务"]
        B4["预测分析服务"]
        B5["报告生成服务"]
        B6["权限认证中间件"]
    end
    
    subgraph "数据层"
        C1["实时数据库 (SQLite)"]
        C2["Mock数据生成器"]
        C3["文件存储 (Excel/PDF)"]
    end
    
    subgraph "外部数据源 (Mock模拟)"
        D1["垃圾桶满溢传感器"]
        D2["转运车GPS"]
        D3["处理厂入料产出"]
    end
    
    D1 --> B1
    D2 --> B1
    D3 --> B1
    B1 --> C1
    B1 --> B2
    B2 --> C1
    B2 --> B3
    B3 --> C1
    B4 --> C1
    B5 --> C1
    B5 --> C3
    A1 --> B2
    A2 --> B1
    A3 --> B3
    A4 --> B2
    A5 --> B4
    A6 --> B4
    A7 --> B5
    A8 --> B6
    B6 --> C1
```

## 2. 技术描述

- **前端框架**：React@18 + TypeScript + Vite
- **状态管理**：Zustand（全局状态：用户权限、筛选条件、预警通知）
- **UI 样式**：TailwindCSS@3 + 自定义主题配色
- **图表库**：Recharts（折线图、饼图、条形图、面积图）
- **地图可视化**：ECharts（中国地图热力图）
- **图标库**：Lucide React
- **Excel处理**：SheetJS (xlsx)
- **后端框架**：Express@4 + TypeScript + ESM
- **数据库**：SQLite（本地开发，使用mock数据模拟）
- **初始化工具**：vite-init

## 3. 路由定义

| 路由 | 页面组件 | 权限级别 | 用途 |
|------|----------|----------|------|
| /login | Login | 公开 | 登录认证 |
| /dashboard | Dashboard | 所有角色 | 全国总览看板 |
| /monitor | Monitor | 所有角色 | 实时监控中心 |
| /monitor/region/:id | RegionDetail | 所有角色 | 区域下钻详情 |
| /alerts | Alerts | 所有角色 | 智能预警中心 |
| /alerts/:id/approval | ApprovalFlow | 市级+ | 三级审批流程 |
| /campaign | Campaign | 市级+ | 宣传方案管理 |
| /forecast | Forecast | 所有角色 | 产量预测中心 |
| /reports | Reports | 所有角色 | 运营诊断报告 |
| /admin/users | UserAdmin | 省级+ | 用户与权限管理 |

## 4. API定义

### 4.1 认证接口

```typescript
// POST /api/auth/login
interface LoginRequest {
  username: string;
  password: string;
}
interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    role: 'national' | 'provincial' | 'municipal' | 'regional';
    regionCode: string;
    regionName: string;
  };
}
```

### 4.2 指标数据接口

```typescript
// GET /api/metrics/overview
interface MetricsOverview {
  classificationAccuracy: number;
  collectionTimeliness: number;
  resourceConversionRate: number;
  totalWasteCollected: number;
  alertsActive: number;
  alertsLevel1: number;
  alertsLevel2: number;
  comparedYesterday: {
    classificationAccuracy: number;
    collectionTimeliness: number;
    resourceConversionRate: number;
    totalWasteCollected: number;
  };
}

// GET /api/metrics/region?regionCode=&type=
interface RegionMetrics {
  regionCode: string;
  regionName: string;
  dailyData: {
    date: string;
    classificationAccuracy: number;
    collectionTimeliness: number;
    resourceConversionRate: number;
    wasteByType: { recyclable: number; kitchen: number; hazardous: number; other: number };
  }[];
}
```

### 4.3 热力图接口

```typescript
// GET /api/heatmap?level=province|city
interface HeatmapItem {
  code: string;
  name: string;
  value: number;
  accuracy: number;
  timeliness: number;
  resourceRate: number;
}
```

### 4.4 预警接口

```typescript
// GET /api/alerts?status=&level=&regionCode=
interface Alert {
  id: string;
  level: 1 | 2;
  type: 'accuracy' | 'timeliness';
  regionCode: string;
  regionName: string;
  triggeredAt: string;
  escalatedAt?: string;
  currentValue: number;
  threshold: number;
  consecutiveDays: number;
  status: 'active' | 'processing' | 'resolved' | 'escalated';
  approvalStatus?: 'pending_station' | 'pending_manager' | 'pending_bureau' | 'approved' | 'rejected';
  responsiblePerson: string;
  pushRecords: { pushedAt: string; receiver: string; confirmed: boolean }[];
}

// POST /api/alerts/:id/approve
interface ApprovalRequest {
  step: 'station' | 'manager' | 'bureau';
  approved: boolean;
  comment: string;
  actionPlan?: string;
}
```

### 4.5 预测接口

```typescript
// POST /api/forecast/upload
// Content-Type: multipart/form-data
// Body: Excel file
interface ForecastResult {
  extractedPlan: {
    campaignName: string;
    targetRegion: string;
    startDate: string;
    endDate: string;
    targetPopulation: number;
    budget: number;
    keyActions: string[];
  };
  prediction: {
    date: string;
    recyclable: number;
    kitchen: number;
    hazardous: number;
    other: number;
    total: number;
    processingCapacity: number;
    exceedsCapacity: boolean;
  }[];
  recommendations: {
    type: 'frequency' | 'line';
    description: string;
    affectedStations?: string[];
  }[];
}
```

### 4.6 报告接口

```typescript
// GET /api/reports?week=&regionCode=
interface WeeklyReport {
  week: string;
  startDate: string;
  endDate: string;
  metrics: {
    classificationAccuracy: { current: number; yoy: number; mom: number };
    collectionTimeliness: { current: number; yoy: number; mom: number };
    resourceConversionRate: { current: number; yoy: number; mom: number };
  };
  costAnalysis: {
    weeklyTotal: number;
    unitCost: number;
    trend: { date: string; cost: number }[];
  };
  recommendations: {
    routeOptimization: { region: string; suggestion: string }[];
    publicityFocus: { region: string; focus: string }[];
  };
}
```

## 5. 服务端架构图

```mermaid
flowchart TD
    A["路由层 (Routes)"] --> B["认证中间件 (AuthMiddleware)"]
    B --> C["控制器层 (Controllers)"]
    C --> D["服务层 (Services)"]
    D --> E["数据访问层 (Repositories)"]
    E --> F["SQLite 数据库"]
    
    D --> G["指标计算引擎"]
    D --> H["预警规则引擎"]
    D --> I["时间序列预测器"]
    D --> J["报告生成器"]
    
    G --> F
    H --> F
    I --> F
    J --> F
```

## 6. 数据模型

### 6.1 ER图

```mermaid
erDiagram
    USER {
        string id PK
        string username
        string password_hash
        string name
        string role
        string region_code
        datetime created_at
    }
    
    REGION {
        string code PK
        string name
        string parent_code FK
        string level
    }
    
    WASTE_BIN {
        string id PK
        string region_code FK
        string station_name
        decimal fill_level
        string status
        datetime last_updated
    }
    
    COLLECTION_VEHICLE {
        string id PK
        string plate_number
        string region_code FK
        decimal lat
        decimal lng
        decimal load_level
        string status
        datetime last_updated
    }
    
    PROCESSING_PLANT {
        string id PK
        string name
        string region_code FK
        decimal daily_capacity
        decimal current_load
        datetime last_updated
    }
    
    DAILY_METRICS {
        string id PK
        string region_code FK
        date date
        decimal classification_accuracy
        decimal collection_timeliness
        decimal resource_conversion_rate
        decimal recyclable_amount
        decimal kitchen_amount
        decimal hazardous_amount
        decimal other_amount
        decimal collection_cost
    }
    
    ALERT {
        string id PK
        int level
        string type
        string region_code FK
        datetime triggered_at
        datetime escalated_at
        decimal current_value
        decimal threshold
        int consecutive_days
        string status
        string approval_status
        string responsible_person
    }
    
    ALERT_PUSH {
        string id PK
        string alert_id FK
        datetime pushed_at
        string receiver
        boolean confirmed
    }
    
    APPROVAL_STEP {
        string id PK
        string alert_id FK
        string step
        string approver_id FK
        boolean approved
        string comment
        datetime approved_at
    }
    
    WEEKLY_REPORT {
        string id PK
        string week
        string region_code FK
        datetime generated_at
        text content
    }
    
    USER ||--o{ REGION : manages
    REGION ||--o{ WASTE_BIN : contains
    REGION ||--o{ COLLECTION_VEHICLE : contains
    REGION ||--o{ PROCESSING_PLANT : contains
    REGION ||--o{ DAILY_METRICS : has
    REGION ||--o{ ALERT : has
    ALERT ||--o{ ALERT_PUSH : has
    ALERT ||--o{ APPROVAL_STEP : has
    USER ||--o{ APPROVAL_STEP : approves
    REGION ||--o{ WEEKLY_REPORT : has
```

### 6.2 核心Mock数据说明

系统内置完整Mock数据，覆盖：
- 全国34个省级行政区、100+地级市的区域层级关系
- 各区域每日分类准确率、清运及时率、资源化转化率（近30天历史+实时模拟）
- 200+垃圾桶传感器实时状态（满溢度0-100%）
- 50+转运车GPS位置实时更新
- 30+处理厂入料产出数据
- 预警与审批流程完整测试数据
- 每周运营诊断报告预生成数据
