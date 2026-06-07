import type {
  Region, WasteBin, CollectionVehicle, ProcessingPlant,
  Alert, DailyMetrics, WeeklyReport, User
} from './types';

const PROVINCES: [string, string][] = [
  ['110000', '北京市'], ['120000', '天津市'], ['130000', '河北省'], ['140000', '山西省'],
  ['150000', '内蒙古自治区'], ['210000', '辽宁省'], ['220000', '吉林省'], ['230000', '黑龙江省'],
  ['310000', '上海市'], ['320000', '江苏省'], ['330000', '浙江省'], ['340000', '安徽省'],
  ['350000', '福建省'], ['360000', '江西省'], ['370000', '山东省'], ['410000', '河南省'],
  ['420000', '湖北省'], ['430000', '湖南省'], ['440000', '广东省'], ['450000', '广西壮族自治区'],
  ['460000', '海南省'], ['500000', '重庆市'], ['510000', '四川省'], ['520000', '贵州省'],
  ['530000', '云南省'], ['540000', '西藏自治区'], ['610000', '陕西省'], ['620000', '甘肃省'],
  ['630000', '青海省'], ['640000', '宁夏回族自治区'], ['650000', '新疆维吾尔自治区'],
  ['710000', '台湾省'], ['810000', '香港特别行政区'], ['820000', '澳门特别行政区'],
];

const CITIES_BY_PROVINCE: Record<string, [string, string][]> = {
  '110000': [['110100', '北京市']],
  '310000': [['310100', '上海市']],
  '440000': [['440100', '广州市'], ['440300', '深圳市'], ['440600', '佛山市'], ['441900', '东莞市']],
  '330000': [['330100', '杭州市'], ['330200', '宁波市'], ['330300', '温州市']],
  '320000': [['320100', '南京市'], ['320500', '苏州市'], ['320200', '无锡市']],
  '510000': [['510100', '成都市'], ['510300', '自贡市']],
  '420000': [['420100', '武汉市']],
  '610000': [['610100', '西安市']],
  '370000': [['370100', '济南市'], ['370200', '青岛市']],
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(42);

function randRange(min: number, max: number, decimals = 0): number {
  const val = min + rand() * (max - min);
  return decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.round(val);
}

export function generateRegions(): Region[] {
  const regions: Region[] = [
    { code: '000000', name: '全国', parentCode: null, level: 'national' },
  ];
  for (const [code, name] of PROVINCES) {
    regions.push({ code, name, parentCode: '000000', level: 'province' });
    const cities = CITIES_BY_PROVINCE[code] || [[code.replace(/00$/, '01'), name.replace(/省|市|自治区|特别行政区/, '') + '市']];
    for (const [cCode, cName] of cities.slice(0, 3)) {
      regions.push({ code: cCode, name: cName, parentCode: code, level: 'city' });
    }
  }
  return regions;
}

export function generateDailyMetrics(regionCode: string, days: number = 30): DailyMetrics[] {
  const data: DailyMetrics[] = [];
  const today = new Date();
  const base = randRange(72, 88, 1);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const variance = (rand() - 0.5) * 10;
    data.push({
      date: dateStr,
      classificationAccuracy: Math.max(55, Math.min(98, base + variance + (days - i) * 0.2)),
      collectionTimeliness: Math.max(65, Math.min(99, base + 5 + (rand() - 0.5) * 8)),
      resourceConversionRate: Math.max(30, Math.min(65, 45 + (rand() - 0.5) * 10 + (days - i) * 0.1)),
      wasteByType: {
        recyclable: randRange(80, 200),
        kitchen: randRange(200, 500),
        hazardous: randRange(5, 30),
        other: randRange(100, 300),
      },
    });
  }
  return data;
}

export function generateWasteBins(regionCode: string): WasteBin[] {
  const bins: WasteBin[] = [];
  const count = randRange(15, 40);
  const stations = ['阳光花园', '翠湖小区', '人民广场', '科技园A区', '商业街中心', '学府路', '滨河公园', '创业大厦'];
  for (let i = 0; i < count; i++) {
    const fill = randRange(10, 100);
    bins.push({
      id: `BIN-${regionCode}-${String(i + 1).padStart(3, '0')}`,
      regionCode,
      stationName: stations[i % stations.length] + ` #${Math.floor(i / stations.length) + 1}号`,
      fillLevel: fill,
      status: fill >= 95 ? 'overflow' : fill >= 80 ? 'full' : fill < 5 ? 'offline' : 'normal',
      lastUpdated: new Date(Date.now() - randRange(0, 3600_000)).toISOString(),
      lat: 30 + randRange(-10, 10, 4),
      lng: 110 + randRange(-10, 10, 4),
    });
  }
  return bins;
}

export function generateVehicles(regionCode: string): CollectionVehicle[] {
  const vehicles: CollectionVehicle[] = [];
  const count = randRange(5, 15);
  const plates = ['京A', '沪B', '粤C', '浙D', '苏E', '川F', '鲁G'];
  const statuses: CollectionVehicle['status'][] = ['idle', 'collecting', 'transporting', 'discharging'];
  const routes = ['路线A-城东', '路线B-城西', '路线C-城北', '路线D-城南', '路线E-中心区'];
  for (let i = 0; i < count; i++) {
    const eta = new Date(Date.now() + randRange(600_000, 7200_000));
    vehicles.push({
      id: `VEH-${regionCode}-${String(i + 1).padStart(3, '0')}`,
      plateNumber: `${plates[i % plates.length]}·${String(randRange(10000, 99999))}`,
      regionCode,
      lat: 30 + randRange(-8, 8, 4),
      lng: 110 + randRange(-8, 8, 4),
      loadLevel: randRange(0, 100),
      status: statuses[randRange(0, 3)],
      currentRoute: routes[i % routes.length],
      estimatedArrival: eta.toISOString(),
      lastUpdated: new Date(Date.now() - randRange(0, 300_000)).toISOString(),
    });
  }
  return vehicles;
}

export function generatePlants(regionCode: string): ProcessingPlant[] {
  const plants: ProcessingPlant[] = [];
  const count = randRange(2, 6);
  const names = ['第一资源处理厂', '有机垃圾处理中心', '可回收物分拣中心', '焚烧发电厂', '危废处理站'];
  for (let i = 0; i < count; i++) {
    const capacity = randRange(500, 2000);
    const load = randRange(300, capacity);
    plants.push({
      id: `PLANT-${regionCode}-${String(i + 1).padStart(3, '0')}`,
      name: names[i % names.length],
      regionCode,
      dailyCapacity: capacity,
      currentLoad: load,
      todayInput: load,
      todayOutput: Math.round(load * randRange(0.4, 0.7)),
      resourceRate: randRange(40, 70, 1),
      lastUpdated: new Date(Date.now() - randRange(0, 1800_000)).toISOString(),
    });
  }
  return plants;
}

export function generateAlerts(): Alert[] {
  const alerts: Alert[] = [
    {
      id: 'ALT-001', level: 1, type: 'accuracy', regionCode: '440300', regionName: '深圳市',
      triggeredAt: new Date(Date.now() - 86400_000 * 3).toISOString(),
      currentValue: 67.3, threshold: 70, consecutiveDays: 3, status: 'active',
      approvalStatus: 'pending_station',
      responsiblePerson: '张建国',
      pushRecords: [
        { pushedAt: new Date(Date.now() - 86400_000 * 3).toISOString(), receiver: '张建国', confirmed: true },
        { pushedAt: new Date(Date.now() - 86400_000 * 2).toISOString(), receiver: '张建国', confirmed: true },
      ],
    },
    {
      id: 'ALT-002', level: 2, type: 'timeliness', regionCode: '330100', regionName: '杭州市',
      triggeredAt: new Date(Date.now() - 86400_000 * 8).toISOString(),
      escalatedAt: new Date(Date.now() - 86400_000 * 3).toISOString(),
      currentValue: 75.8, threshold: 80, consecutiveDays: 8, status: 'escalated',
      approvalStatus: 'pending_manager',
      responsiblePerson: '李明辉',
      pushRecords: [
        { pushedAt: new Date(Date.now() - 86400_000 * 8).toISOString(), receiver: '李明辉', confirmed: true },
        { pushedAt: new Date(Date.now() - 86400_000 * 3).toISOString(), receiver: '王经理', confirmed: false },
      ],
    },
    {
      id: 'ALT-003', level: 1, type: 'accuracy', regionCode: '320500', regionName: '苏州市',
      triggeredAt: new Date(Date.now() - 86400_000 * 4).toISOString(),
      currentValue: 68.9, threshold: 70, consecutiveDays: 4, status: 'processing',
      approvalStatus: 'pending_station',
      responsiblePerson: '刘芳',
      pushRecords: [
        { pushedAt: new Date(Date.now() - 86400_000 * 4).toISOString(), receiver: '刘芳', confirmed: true },
      ],
    },
    {
      id: 'ALT-004', level: 2, type: 'accuracy', regionCode: '510100', regionName: '成都市',
      triggeredAt: new Date(Date.now() - 86400_000 * 10).toISOString(),
      escalatedAt: new Date(Date.now() - 86400_000 * 5).toISOString(),
      currentValue: 63.2, threshold: 70, consecutiveDays: 10, status: 'escalated',
      approvalStatus: 'pending_bureau',
      responsiblePerson: '陈伟',
      pushRecords: [
        { pushedAt: new Date(Date.now() - 86400_000 * 10).toISOString(), receiver: '陈伟', confirmed: true },
        { pushedAt: new Date(Date.now() - 86400_000 * 5).toISOString(), receiver: '城管局', confirmed: false },
      ],
    },
    {
      id: 'ALT-005', level: 1, type: 'timeliness', regionCode: '370200', regionName: '青岛市',
      triggeredAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
      currentValue: 77.5, threshold: 80, consecutiveDays: 2, status: 'active',
      approvalStatus: 'pending_station',
      responsiblePerson: '赵强',
      pushRecords: [
        { pushedAt: new Date(Date.now() - 86400_000 * 2).toISOString(), receiver: '赵强', confirmed: true },
      ],
    },
  ];
  return alerts;
}

export function generateWeeklyReports(): WeeklyReport[] {
  const reports: WeeklyReport[] = [];
  for (let i = 0; i < 4; i++) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - i * 7);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    const weekNum = Math.ceil((endDate.getDate() + new Date(endDate.getFullYear(), endDate.getMonth(), 1).getDay()) / 7);
    const curAcc = randRange(78, 85, 1);
    const curTime = randRange(82, 92, 1);
    const curRes = randRange(45, 58, 1);
    const prevAcc = randRange(78, 85, 1);
    const prevTime = randRange(82, 92, 1);
    const prevRes = randRange(45, 58, 1);
    const yoyAcc = randRange(78, 85, 1);
    const yoyTime = randRange(82, 92, 1);
    const yoyRes = randRange(45, 58, 1);
    reports.push({
      id: `RPT-${String(i + 1).padStart(3, '0')}`,
      week: `${endDate.getFullYear()}年第${weekNum}周`,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      regionCode: '000000',
      regionName: '全国',
      generatedAt: new Date(endDate.getTime() + 3600_000 * 8).toISOString(),
      metrics: {
        classificationAccuracy: {
          current: curAcc,
          lastWeek: prevAcc,
          lastYear: yoyAcc,
          yoy: parseFloat(((curAcc - yoyAcc) / yoyAcc * 100).toFixed(1)),
          mom: parseFloat(((curAcc - prevAcc) / prevAcc * 100).toFixed(1)),
        },
        collectionTimeliness: {
          current: curTime,
          lastWeek: prevTime,
          lastYear: yoyTime,
          yoy: parseFloat(((curTime - yoyTime) / yoyTime * 100).toFixed(1)),
          mom: parseFloat(((curTime - prevTime) / prevTime * 100).toFixed(1)),
        },
        resourceConversionRate: {
          current: curRes,
          lastWeek: prevRes,
          lastYear: yoyRes,
          yoy: parseFloat(((curRes - yoyRes) / yoyRes * 100).toFixed(1)),
          mom: parseFloat(((curRes - prevRes) / prevRes * 100).toFixed(1)),
        },
        wasteByTypeTrend: Array.from({ length: 7 }, (_, idx) => {
          const d = new Date(startDate);
          d.setDate(d.getDate() + idx);
          return {
            date: d.toISOString().slice(0, 10),
            recyclable: randRange(2000, 5000),
            kitchen: randRange(5000, 12000),
            hazardous: randRange(100, 800),
            other: randRange(3000, 8000),
          };
        }),
      },
      costAnalysis: {
        weeklyTotal: randRange(120000000, 180000000),
        unitCost: randRange(380, 520),
        trend: Array.from({ length: 8 }, (_, idx) => {
          const d = new Date(endDate);
          d.setDate(d.getDate() - (7 - idx) * 7);
          return { date: d.toISOString().slice(0, 10), cost: randRange(110000000, 200000000) };
        }),
      },
      recommendations: {
        routeOptimization: [
          { region: '深圳市南山区', suggestion: '建议将垃圾收运频次从每日2次调整为3次，重点覆盖科技园片区' },
          { region: '杭州市西湖区', suggestion: '推荐优化文三路沿线收运路线，预计减少车程15%' },
        ],
        publicityFocus: [
          { region: '成都市武侯区', focus: '加强社区有害垃圾单独投放宣传，当前准确率仅63%' },
          { region: '苏州市工业园区', focus: '开展厨余垃圾破袋投放专项宣传活动' },
        ],
      },
    });
  }
  return reports;
}

export const MOCK_USERS: User[] = [
  { id: 'U001', username: 'admin', name: '国家管理员', role: 'national', regionCode: '000000', regionName: '全国' },
  { id: 'U002', username: 'gd_admin', name: '广东省管理员', role: 'provincial', regionCode: '440000', regionName: '广东省' },
  { id: 'U003', username: 'sz_admin', name: '深圳市管理员', role: 'municipal', regionCode: '440300', regionName: '深圳市' },
  { id: 'U004', username: 'ns_worker', name: '南山区环卫负责人', role: 'regional', regionCode: '440305', regionName: '深圳市南山区' },
];
