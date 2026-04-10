interface Filters {
  priority: string;
  category: string;
  activeOnly: boolean;
}

interface Props {
  filters: Filters;
  categories: string[];
  onChange: (f: Filters) => void;
}

const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];

export default function InventoryFilters({ filters, categories, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Priority filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-400">Priority:</span>
        <div className="flex gap-1">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => onChange({ ...filters, priority: p })}
              className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                filters.priority === p
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-400">Category:</span>
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="text-xs bg-white/5 border border-white/10 text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-purple-500/50"
        >
          <option value="All">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Active POs only toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <div
          onClick={() => onChange({ ...filters, activeOnly: !filters.activeOnly })}
          className={`relative w-8 h-4 rounded-full transition-colors ${
            filters.activeOnly ? 'bg-emerald-500' : 'bg-white/10'
          }`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
              filters.activeOnly ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className="text-xs text-slate-400">Active POs only</span>
      </label>
    </div>
  );
}
