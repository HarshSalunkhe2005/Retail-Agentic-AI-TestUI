import type { SegmentData, InventoryItem, KPIMetrics, CSVRow } from '../store/wizardStore';

export const CHART_COLORS = {
  purple: '#a855f7',
  cyan: '#06b6d4',
  orange: '#f97316',
  green: '#22c55e',
  pink: '#ec4899',
  yellow: '#eab308',
  blue: '#3b82f6',
  red: '#ef4444',
};

export const URGENCY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export function generateMockResults(csvData: CSVRow[]): {
  kpi: KPIMetrics;
  segments: SegmentData[];
  inventory: InventoryItem[];
} {
  const rowCount = csvData.length || 1000;
  const scale = rowCount / 1000;

  const kpi: KPIMetrics = {
    fillRate: 87.4 + Math.random() * 5,
    inventoryTurns: 8.2 + Math.random() * 2,
    stockoutRate: 3.1 + Math.random() * 2,
    totalRevenue: Math.round(1_250_000 * scale + Math.random() * 100_000),
    avgOrderValue: 142 + Math.round(Math.random() * 30),
    activeCustomers: Math.round(8_400 * scale + Math.random() * 500),
  };

  const segments: SegmentData[] = [
    {
      segment: 'Champions',
      oldRevenue: 420000 * scale,
      newRevenue: 485000 * scale,
      customers: 1240,
      churnRisk: 8,
    },
    {
      segment: 'Loyal',
      oldRevenue: 310000 * scale,
      newRevenue: 358000 * scale,
      customers: 2100,
      churnRisk: 15,
    },
    {
      segment: 'Potential Loyalists',
      oldRevenue: 180000 * scale,
      newRevenue: 224000 * scale,
      customers: 1850,
      churnRisk: 28,
    },
    {
      segment: 'At Risk',
      oldRevenue: 220000 * scale,
      newRevenue: 195000 * scale,
      customers: 980,
      churnRisk: 62,
    },
    {
      segment: "Can't Lose Them",
      oldRevenue: 95000 * scale,
      newRevenue: 112000 * scale,
      customers: 450,
      churnRisk: 55,
    },
    {
      segment: 'Hibernating',
      oldRevenue: 25000 * scale,
      newRevenue: 18000 * scale,
      customers: 1780,
      churnRisk: 85,
    },
  ];

  const inventory: InventoryItem[] = [
    {
      sku: 'SKU-1042',
      name: 'Premium Widget A',
      urgency: 'critical',
      stockLevel: 5,
      reorderPoint: 50,
      daysToStockout: 2,
    },
    {
      sku: 'SKU-0731',
      name: 'Basic Component B',
      urgency: 'high',
      stockLevel: 18,
      reorderPoint: 40,
      daysToStockout: 5,
    },
    {
      sku: 'SKU-2210',
      name: 'Standard Part C',
      urgency: 'high',
      stockLevel: 25,
      reorderPoint: 60,
      daysToStockout: 7,
    },
    {
      sku: 'SKU-0892',
      name: 'Economy Item D',
      urgency: 'medium',
      stockLevel: 85,
      reorderPoint: 100,
      daysToStockout: 14,
    },
    {
      sku: 'SKU-3301',
      name: 'Deluxe Module E',
      urgency: 'medium',
      stockLevel: 120,
      reorderPoint: 150,
      daysToStockout: 18,
    },
    {
      sku: 'SKU-1580',
      name: 'Standard Kit F',
      urgency: 'low',
      stockLevel: 300,
      reorderPoint: 200,
      daysToStockout: 45,
    },
    {
      sku: 'SKU-2490',
      name: 'Budget Pack G',
      urgency: 'low',
      stockLevel: 450,
      reorderPoint: 250,
      daysToStockout: 60,
    },
    {
      sku: 'SKU-0120',
      name: 'Value Bundle H',
      urgency: 'critical',
      stockLevel: 3,
      reorderPoint: 30,
      daysToStockout: 1,
    },
  ];

  return { kpi, segments, inventory };
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function generateDemandData(months = 12) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (months - 1 - i));
    return {
      month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      actual: Math.round(8000 + Math.random() * 4000),
      forecast: Math.round(8500 + Math.random() * 3500),
      lower: Math.round(7000 + Math.random() * 2000),
      upper: Math.round(10000 + Math.random() * 3000),
    };
  });
}

export function generatePricingData() {
  const categories = ['Electronics', 'Clothing', 'Food', 'Home', 'Sports', 'Beauty'];
  return categories.map((cat) => ({
    category: cat,
    currentPrice: Math.round(50 + Math.random() * 150),
    optimalPrice: Math.round(55 + Math.random() * 160),
    elasticity: -(0.8 + Math.random() * 1.5),
    revenue: Math.round(50000 + Math.random() * 200000),
  }));
}
