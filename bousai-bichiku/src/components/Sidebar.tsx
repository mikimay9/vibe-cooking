import { OrgUnit } from '../types/master';
import './Sidebar.css';

interface SidebarProps {
  branches: string[];
  // branchConfig: BranchConfigMap; // Removed
  orgUnits: OrgUnit[]; // Phase 6: New source of truth
  selectedBranch: string | null;
  onBranchSelect: (branch: string | null) => void;
  itemCountByBranch: Record<string, number>;
}

export function Sidebar({
  branches,
  orgUnits,
  selectedBranch,
  onBranchSelect,
  itemCountByBranch,
}: SidebarProps) {
  const totalCount = Object.values(itemCountByBranch).reduce((a, b) => a + b, 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>🏢 支店</h2>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${selectedBranch === null ? 'active' : ''}`}
          onClick={() => onBranchSelect(null)}
        >
          <span className="sidebar-item-icon">📊</span>
          <span className="sidebar-item-label">全支店</span>
          <span className="sidebar-item-count">{totalCount}</span>
        </button>

        {branches.map(branchName => {
          // Find OrgUnit by name (or ID if we switch to ID-based selection fully)
          // For now, assume 'branches' list contains Names (from extractBranches legacy util)
          // We try to find match in OrgUnits
          const unit = orgUnits.find(u => u.name === branchName && u.layer === 'Branch');
          const count = itemCountByBranch[branchName] || 0;

          return (
            <button
              key={branchName}
              className={`sidebar-item ${selectedBranch === branchName ? 'active' : ''}`}
              onClick={() => onBranchSelect(branchName)}
            >
              <span className="sidebar-item-icon">🏠</span>
              <div className="sidebar-item-content">
                <span className="sidebar-item-label">{branchName}</span>
                {unit && (
                  <span className="sidebar-item-meta">
                    {unit.headcount ? `${unit.headcount}名` : ''}
                    {/* requiredDays is not on OrgUnit by default, assumed 3 or derived? */}
                    {/* For now omitted or hardcoded if crucial */}
                  </span>
                )}
              </div>
              <span className="sidebar-item-count">{count}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
