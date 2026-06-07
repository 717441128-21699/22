import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  X,
  ChevronRight,
  ChevronDown,
  Loader2,
  Shield,
  MapPin,
  Calendar,
  Search,
  UserCheck,
} from 'lucide-react';
import type { User, UserRole, Region } from '../../shared/types';
import { generateRegions } from '../../shared/mockData';
import { api } from '../utils/api';
import { cn } from '../lib/utils';
import { formatDate } from '../utils/format';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuthStore } from '../store/authStore';

interface RoleBadgeProps {
  role: UserRole;
}

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  national: { label: '国家级', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  provincial: { label: '省级', className: 'bg-eco-500/20 text-eco-300 border-eco-400/30' },
  municipal: { label: '市级', className: 'bg-data-500/20 text-data-400 border-data-500/30' },
  regional: { label: '区级', className: 'bg-warning-500/20 text-warning-400 border-warning-500/30' },
};

function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <span className={cn('badge border', config.className)}>
      <Shield className="h-3 w-3 mr-1" />
      {config.label}
    </span>
  );
}

interface RegionTreeNode {
  code: string;
  name: string;
  level: Region['level'];
  children: RegionTreeNode[];
}

function buildRegionTree(regions: Region[]): RegionTreeNode[] {
  const map = new Map<string, RegionTreeNode>();
  const roots: RegionTreeNode[] = [];

  regions.forEach((r) => {
    map.set(r.code, { code: r.code, name: r.name, level: r.level, children: [] });
  });

  regions.forEach((r) => {
    const node = map.get(r.code)!;
    if (r.parentCode && map.has(r.parentCode)) {
      map.get(r.parentCode)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface RegionTreeItemProps {
  node: RegionTreeNode;
  depth: number;
  selectedCode: string | null;
  expandedCodes: Set<string>;
  onToggle: (code: string) => void;
  onSelect: (code: string, name: string) => void;
}

function RegionTreeItem({
  node,
  depth,
  selectedCode,
  expandedCodes,
  onToggle,
  onSelect,
}: RegionTreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedCodes.has(node.code);
  const isSelected = selectedCode === node.code;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors',
          isSelected ? 'bg-eco-500/20 text-eco-200' : 'text-white/80 hover:bg-white/5'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) {
            onToggle(node.code);
          }
          onSelect(node.code, node.name);
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-white/50" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/50" />
          )
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-white/40" />
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <RegionTreeItem
              key={child.code}
              node={child}
              depth={depth + 1}
              selectedCode={selectedCode}
              expandedCodes={expandedCodes}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { hasPermission } = useAuthStore();

  const canView = hasPermission(['national', 'provincial']);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.regionName.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  if (!canView) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-xl font-semibold text-white mb-2">无权限访问</h2>
        <p className="text-white/60">该页面仅限省级及以上管理员访问</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-eco-300" />
              用户管理
            </h2>
            <p className="text-xs text-white/50 mt-1">管理系统用户及权限分配</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="搜索用户名、姓名、区域..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-64 text-sm"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              新增用户
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <LoadingSpinner label="加载用户..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="table-header">用户名</th>
                  <th className="table-header">姓名</th>
                  <th className="table-header">角色</th>
                  <th className="table-header">管辖区域</th>
                  <th className="table-header">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-white/40">
                        <Users className="h-12 w-12 opacity-30" />
                        <p className="text-sm">暂无用户数据</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <tr
                      key={user.id}
                      className="hover:bg-white/[0.03] transition-colors animate-fadeInUp"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-eco-400 to-eco-600 flex items-center justify-center text-xs font-medium text-white">
                            {user.name.charAt(0)}
                          </div>
                          <span className="font-medium text-white/90">{user.username}</span>
                        </div>
                      </td>
                      <td className="table-cell text-white/90">{user.name}</td>
                      <td className="table-cell">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1 text-white/75">
                          <MapPin className="h-3.5 w-3.5 text-white/40" />
                          {user.regionName}
                        </span>
                      </td>
                      <td className="table-cell text-white/60 font-mono text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate('2026-01-01T00:00:00Z', 'date')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    role: 'regional' as UserRole,
    regionCode: '',
    regionName: '',
  });
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set(['000000']));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const allRegions = useMemo(() => generateRegions(), []);
  const regionTree = useMemo(() => buildRegionTree(allRegions), [allRegions]);

  const handleToggle = useCallback((code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const handleSelectRegion = useCallback((code: string, name: string) => {
    setFormData((prev) => ({ ...prev, regionCode: code, regionName: name }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!formData.name.trim()) {
      setError('请输入姓名');
      return;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (!formData.regionCode) {
      setError('请选择管辖区域');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeInUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-eco-300" />
            新增用户
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">用户名</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input-field"
                placeholder="请输入登录用户名"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">姓名</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="请输入真实姓名"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">密码</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field"
                placeholder="至少6位密码"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">角色</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="input-field appearance-none cursor-pointer"
              >
                {Object.entries(roleConfig).map(([key, config]) => (
                  <option key={key} value={key} className="bg-eco-900">
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1.5">
              管辖区域
              {formData.regionName && (
                <span className="ml-2 text-eco-300 text-xs">已选择：{formData.regionName}</span>
              )}
            </label>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] max-h-64 overflow-y-auto p-2">
              {regionTree.map((node) => (
                <RegionTreeItem
                  key={node.code}
                  node={node}
                  depth={0}
                  selectedCode={formData.regionCode}
                  expandedCodes={expandedCodes}
                  onToggle={handleToggle}
                  onSelect={handleSelectRegion}
                />
              ))}
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button type="button" onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            确认创建
          </button>
        </div>
      </div>
    </div>
  );
}
