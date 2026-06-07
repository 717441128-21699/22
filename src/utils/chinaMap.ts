import * as echarts from 'echarts';

const chinaGeoJson: any = {
  type: 'FeatureCollection',
  features: [],
};

const provinceData: { name: string; adcode: string; center: [number, number] }[] = [
  { name: '北京市', adcode: '110000', center: [116.405, 39.905] },
  { name: '天津市', adcode: '120000', center: [117.2, 39.13] },
  { name: '河北省', adcode: '130000', center: [114.52, 38.05] },
  { name: '山西省', adcode: '140000', center: [112.55, 37.87] },
  { name: '内蒙古自治区', adcode: '150000', center: [111.67, 40.82] },
  { name: '辽宁省', adcode: '210000', center: [123.43, 41.8] },
  { name: '吉林省', adcode: '220000', center: [125.32, 43.88] },
  { name: '黑龙江省', adcode: '230000', center: [126.63, 45.75] },
  { name: '上海市', adcode: '310000', center: [121.47, 31.23] },
  { name: '江苏省', adcode: '320000', center: [118.78, 32.07] },
  { name: '浙江省', adcode: '330000', center: [120.19, 30.26] },
  { name: '安徽省', adcode: '340000', center: [117.28, 31.86] },
  { name: '福建省', adcode: '350000', center: [119.3, 26.08] },
  { name: '江西省', adcode: '360000', center: [115.89, 28.68] },
  { name: '山东省', adcode: '370000', center: [117.01, 36.67] },
  { name: '河南省', adcode: '410000', center: [113.62, 34.75] },
  { name: '湖北省', adcode: '420000', center: [114.31, 30.52] },
  { name: '湖南省', adcode: '430000', center: [112.94, 28.23] },
  { name: '广东省', adcode: '440000', center: [113.28, 23.12] },
  { name: '广西壮族自治区', adcode: '450000', center: [108.33, 22.84] },
  { name: '海南省', adcode: '460000', center: [110.33, 20.03] },
  { name: '重庆市', adcode: '500000', center: [106.54, 29.59] },
  { name: '四川省', adcode: '510000', center: [104.07, 30.67] },
  { name: '贵州省', adcode: '520000', center: [106.71, 26.57] },
  { name: '云南省', adcode: '530000', center: [102.71, 25.04] },
  { name: '西藏自治区', adcode: '540000', center: [91.11, 29.97] },
  { name: '陕西省', adcode: '610000', center: [108.95, 34.27] },
  { name: '甘肃省', adcode: '620000', center: [103.82, 36.06] },
  { name: '青海省', adcode: '630000', center: [101.78, 36.62] },
  { name: '宁夏回族自治区', adcode: '640000', center: [106.27, 38.47] },
  { name: '新疆维吾尔自治区', adcode: '650000', center: [87.68, 43.77] },
  { name: '台湾省', adcode: '710000', center: [121.5, 25.05] },
  { name: '香港特别行政区', adcode: '810000', center: [114.17, 22.28] },
  { name: '澳门特别行政区', adcode: '820000', center: [113.54, 22.19] },
];

function generatePolygon(center: [number, number], size: number): [number, number][] {
  const points: [number, number][] = [];
  const sides = 7 + Math.floor(Math.random() * 3);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const r = size * (0.7 + Math.random() * 0.6);
    points.push([
      center[0] + Math.cos(angle) * r,
      center[1] + Math.sin(angle) * r * 0.8,
    ]);
  }
  return points;
}

provinceData.forEach((p) => {
  const lonSize = p.name.includes('自治区') || ['新疆维吾尔自治区', '西藏自治区', '内蒙古自治区', '青海省', '四川省'].includes(p.name) ? 5 : 2.2;
  const latSize = lonSize * 0.7;
  chinaGeoJson.features.push({
    type: 'Feature',
    properties: {
      name: p.name,
      adcode: p.adcode,
      center: p.center,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [generatePolygon(p.center, lonSize)],
    },
  });
});

echarts.registerMap('china', chinaGeoJson);

export default echarts;
