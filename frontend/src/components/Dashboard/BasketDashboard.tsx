import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Link2, Package, Star } from 'lucide-react';
import KPICard from './KPICard';
import Pagination from '../Common/Pagination';

interface BasketRule {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
  composite_score?: number;
  revenue_weight?: number;
  rule_id?: string | number;
}

interface BasketSummary {
  total_rules: number;
  cross_category_rules: number;
  products_analyzed: number;
  avg_composite_score?: number;
}

interface BasketDashboardProps {
  rules: BasketRule[];
  summary: BasketSummary;
}

function LiftBadge({ lift }: { lift: number }) {
  const color =
    lift >= 3 ? 'bg-green-500/20 text-green-300' :
    lift >= 2 ? 'bg-cyan-500/20 text-cyan-300' :
    lift >= 1.5 ? 'bg-orange-500/20 text-orange-300' :
    'bg-white/10 text-slate-400';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {lift.toFixed(2)}×
    </span>
  );
}

export default function BasketDashboard({ rules, summary }: BasketDashboardProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const sortedRules = [...rules].sort(
    (a, b) => (b.composite_score ?? b.lift) - (a.composite_score ?? a.lift)
  );
  const totalPages = Math.ceil(sortedRules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRules = sortedRules.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Rules"
          value={summary.total_rules.toLocaleString()}
          subtitle="Association rules found"
          icon={<Link2 className="w-5 h-5" />}
          accentColor="green"
          delay={0}
        />
        <KPICard
          title="Cross-Category"
          value={summary.cross_category_rules.toLocaleString()}
          subtitle="Rules across categories"
          icon={<ShoppingCart className="w-5 h-5" />}
          accentColor="purple"
          delay={0.05}
        />
        <KPICard
          title="Products Analyzed"
          value={summary.products_analyzed.toLocaleString()}
          subtitle="Unique products"
          icon={<Package className="w-5 h-5" />}
          accentColor="cyan"
          delay={0.1}
        />
        {summary.avg_composite_score !== undefined && (
          <KPICard
            title="Avg Score"
            value={summary.avg_composite_score.toFixed(3)}
            subtitle="Composite rule quality"
            icon={<Star className="w-5 h-5" />}
            accentColor="orange"
            delay={0.15}
          />
        )}
      </div>

      {/* Top Rules Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-1">Top Association Rules</h3>
        <p className="text-xs text-slate-400 mb-4">
          Sorted by composite score (lift × confidence × revenue weight)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-white/10">
                <th className="text-left py-2 pr-4">#</th>
                <th className="text-left py-2 pr-4">If customer buys…</th>
                <th className="text-left py-2 pr-4">They also buy…</th>
                <th className="text-right py-2 pr-4">Lift</th>
                <th className="text-right py-2 pr-4">Confidence</th>
                <th className="text-right py-2">Support</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRules.map((rule, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-2.5 pr-4 text-slate-500">{startIndex + i + 1}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {rule.antecedent.map((item, j) => (
                        <span key={j} className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20">
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {rule.consequent.map((item, j) => (
                        <span key={j} className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <LiftBadge lift={rule.lift} />
                  </td>
                  <td className="py-2.5 pr-4 text-right text-slate-300">
                    {(rule.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right text-slate-400">
                    {(rule.support * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedRules.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </motion.div>
    </div>
  );
}
