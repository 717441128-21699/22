import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  User,
  Clock,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Send,
  MessageSquare,
  Calendar,
  X,
} from 'lucide-react';
import type { Alert, AlertLevel, AlertType, AlertStatus, ApprovalStatus, UserRole } from '../../shared/types';
import { api } from '../utils/api';
import { formatPercent, formatDate, formatRelativeTime } from '../utils/format';
import { cn } from '@/lib/utils';
import LoadingSpinner from '../components/LoadingSpinner';
import PageBreadcrumb from '../components/PageBreadcrumb';
import { useAuthStore } from '../store/authStore';

const LEVEL_CONFIG: Record<
  AlertLevel,
  { label: string; color: string; bgColor: string; Icon: typeof AlertTriangle }
> = {
  1: {
    label: '一级预警',
    color: 'text-warning-400',
    bgColor: 'bg-warning-500/20 border-warning-400/50',
    Icon: AlertTriangle,
  },
  2: {
    label: '二级预警',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20 border-red-400/50',
    Icon: ShieldAlert,
  },
};

const TYPE_CONFIG: Record<AlertType, { label: string; color: string }> = {
  accuracy: { label: '分类准确率', color: 'text-data-400' },
  timeliness: { label: '清运及时率', color: 'text-eco-300' },
};

const STATUS_CONFIG: Record<
  AlertStatus,
  { label: string; color: string; bgColor: string; Icon: typeof Clock }
> = {
  active: {
    label: '活跃',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    Icon: AlertTriangle,
  },
  processing: {
    label: '处理中',
    color: 'text-warning-400',
    bgColor: 'bg-warning-500/15',
    Icon: Clock,
  },
  escalated: {
    label: '已升级',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
    Icon: XCircle,
  },
  resolved: {
    label: '已解决',
    color: 'text-eco-300',
    bgColor: 'bg-eco-500/15',
    Icon: CheckCircle,
  },
};

const APPROVAL_STEPS: { key: ApprovalStatus; label: string; step: number }[] = [
  { key: 'pending_station', label: '站点确认', step: 1 },
  { key: 'pending_manager', label: '经理复核', step: 2 },
  { key: 'pending_bureau', label: '局级批准', step: 3 },
];

interface ApprovalProgressProps {
  currentStatus: ApprovalStatus | undefined;
}

function ApprovalProgress({ currentStatus }: ApprovalProgressProps) {
  const getStepIndex = () => {
    if (currentStatus === 'approved') return 3;
    if (currentStatus === 'rejected') return 0;
    const idx = APPROVAL_STEPS.findIndex((s) => s.key === currentStatus);
    return idx === -1 ? 0 : idx;
  };

  const currentIdx = getStepIndex();
  const isApproved = currentStatus === 'approved';
  const isRejected = currentStatus === 'rejected';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {APPROVAL_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx && !isApproved && !isRejected;
          const isApprovedStep = isApproved && idx < currentIdx;
          const isLast = idx === APPROVAL_STEPS.length - 1;

          return (
            <>
              <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
                    isDone || isApprovedStep
                      ? 'bg-eco-500/30 border-eco-400 text-eco-300'
                      : isCurrent
                      ? 'bg-eco-500/20 border-eco-400 text-eco-300 shadow-lg shadow-eco-500/20'
                      : 'bg-white/5 border-white/20 text-white/40'
                  )}
                >
                  {isDone || isApprovedStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.step
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium text-center',
                    isDone || isApprovedStep
                      ? 'text-eco-300'
                      : isCurrent
                      ? 'text-white'
                      : 'text-white/40'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  key={`line-${step.key}`}
                  className={cn(
                    'flex-1 h-0.5 mx-2 -mt-7 rounded-full',
                    idx < currentIdx || isApproved
                      ? 'bg-eco-500/50'
                      : 'bg-white/10'
                  )}
                />
              )}
            </>
          );
        })}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
              isApproved
                ? 'bg-eco-500/30 border-eco-400 text-eco-300'
                : isRejected
                ? 'bg-red-500/30 border-red-400 text-red-300'
                : 'bg-white/5 border-white/20 text-white/40'
            )}
          >
            {isApproved ? (
              <CheckCircle className="h-5 w-5" />
            ) : isRejected ? (
              <XCircle className="h-5 w-5" />
            ) : (
              '✓'
            )}
          </div>
          <span
            className={cn(
              'text-xs font-medium text-center',
              isApproved
                ? 'text-eco-300'
                : isRejected
                ? 'text-red-300'
                : 'text-white/40'
            )}
          >
            {isApproved ? '已通过' : isRejected ? '已驳回' : '完成'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ApprovalActionProps {
  currentStatus: ApprovalStatus | undefined;
  userRole: UserRole;
  onApprove: (step: string, approved: boolean, comment: string) => void;
  isSubmitting: boolean;
}

function ApprovalActions({
  currentStatus,
  userRole,
  onApprove,
  isSubmitting,
}: ApprovalActionProps) {
  const [comment, setComment] = useState('');

  const canDoStation = currentStatus === 'pending_station' && (userRole === 'regional' || userRole === 'municipal');
  const canDoManager = currentStatus === 'pending_manager' && (userRole === 'municipal' || userRole === 'provincial');
  const canDoBureau =
    currentStatus === 'pending_bureau' &&
    (userRole === 'municipal' || userRole === 'provincial' || userRole === 'national');

  const stepLabel = canDoStation ? '站点确认' : canDoManager ? '经理复核' : canDoBureau ? '局级批准' : null;
  const stepKey = canDoStation ? 'pending_station' : canDoManager ? 'pending_manager' : canDoBureau ? 'pending_bureau' : null;

  if (!stepLabel || !stepKey) {
    if (currentStatus === 'approved') {
      return (
        <div className="rounded-lg bg-eco-500/10 border border-eco-500/30 p-4 text-center">
          <CheckCircle className="mx-auto h-8 w-8 text-eco-300 mb-2" />
          <p className="text-sm font-medium text-eco-300">该预警已通过审批</p>
        </div>
      );
    }
    if (currentStatus === 'rejected') {
      return (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-center">
          <XCircle className="mx-auto h-8 w-8 text-red-300 mb-2" />
          <p className="text-sm font-medium text-red-300">该预警已被驳回</p>
        </div>
      );
    }
    return (
      <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-center">
        <Clock className="mx-auto h-8 w-8 text-white/40 mb-2" />
        <p className="text-sm text-white/60">等待上一级审批完成</p>
        <p className="text-xs text-white/40 mt-1">当前角色：{userRole}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="badge badge-info">{stepLabel}</span>
        <span className="text-white/50">您可以执行此操作</span>
      </div>
      <div>
        <label className="block text-sm text-white/70 mb-1.5">审批意见</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="input-field resize-none"
          placeholder="请输入审批意见..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onApprove(stepKey, false, comment)}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 font-medium hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <XCircle className="h-4 w-4" />
          驳回
        </button>
        <button
          onClick={() => onApprove(stepKey, true, comment)}
          disabled={isSubmitting}
          className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          通过
        </button>
      </div>
    </div>
  );
}

export default function AlertApproval() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAlertDetail();
  }, [id]);

  async function loadAlertDetail() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<Alert>(`/alerts/${id}`);
      setAlert(data);
    } catch (err) {
      console.error('加载预警详情失败', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproval(step: string, approved: boolean, comment: string) {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const nextStep = approved
        ? step === 'pending_station'
          ? 'pending_manager'
          : step === 'pending_manager'
          ? 'pending_bureau'
          : 'approved'
        : 'rejected';

      await api.post(`/alerts/${id}/approve`, {
        action: nextStep,
        comment,
      });

      await loadAlertDetail();
    } catch (err) {
      console.error('审批失败', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb items={[{ label: '预警管理' }, { label: '审批详情' }]} />
        <div className="glass-card h-96 flex items-center justify-center">
          <LoadingSpinner label="加载预警详情..." />
        </div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="space-y-4">
        <PageBreadcrumb items={[{ label: '预警管理' }, { label: '审批详情' }]} />
        <div className="glass-card p-12 text-center">
          <XCircle className="mx-auto mb-3 h-12 w-12 text-red-400/50" />
          <h3 className="text-lg font-semibold text-white mb-2">预警不存在</h3>
          <p className="text-white/50 text-sm mb-4">该预警记录可能已被删除</p>
          <Link to="/alerts" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回预警列表
          </Link>
        </div>
      </div>
    );
  }

  const levelCfg = LEVEL_CONFIG[alert.level];
  const typeCfg = TYPE_CONFIG[alert.type];
  const statusCfg = STATUS_CONFIG[alert.status];
  const LevelIcon = levelCfg.Icon;
  const StatusIcon = statusCfg.Icon;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadcrumb items={[{ label: '预警管理' }, { label: '审批详情' }]} />
        <Link
          to="/alerts"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-white">预警审批</h1>
        <p className="text-xs text-white/50">预警ID：{alert.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <div className="glass-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium',
                    levelCfg.bgColor,
                    levelCfg.color
                  )}
                >
                  <LevelIcon className="h-4 w-4" />
                  {levelCfg.label}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                    statusCfg.bgColor,
                    statusCfg.color
                  )}
                >
                  <StatusIcon className="h-4 w-4" />
                  {statusCfg.label}
                </span>
              </div>
              <span className={cn('text-sm font-medium', typeCfg.color)}>{typeCfg.label}</span>
            </div>

            <div className="mb-6">
              <p className="text-xs text-white/40 mb-3">审批进度</p>
              <ApprovalProgress currentStatus={alert.approvalStatus} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-white/10">
              <div>
                <p className="text-xs text-white/40 mb-1">区域</p>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-white/40" />
                  {alert.regionName}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">负责人</p>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-white/40" />
                  {alert.responsiblePerson}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">触发时间</p>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-white/40" />
                  {formatDate(alert.triggeredAt, 'date')}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">连续天数</p>
                <p
                  className={cn(
                    'text-sm font-medium',
                    alert.consecutiveDays >= 7
                      ? 'text-red-400'
                      : alert.consecutiveDays >= 3
                      ? 'text-warning-400'
                      : 'text-white'
                  )}
                >
                  {alert.consecutiveDays} 天
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-white/40 mb-2">当前值 / 阈值</p>
              <div className="flex items-end gap-4">
                <div>
                  <p
                    className={cn(
                      'text-3xl font-bold font-mono',
                      alert.currentValue < alert.threshold ? 'text-red-400' : 'text-white'
                    )}
                  >
                    {formatPercent(alert.currentValue, 1)}
                  </p>
                  <p className="text-xs text-white/40">当前值</p>
                </div>
                <div>
                  <p className="text-2xl font-mono text-white/60">{formatPercent(alert.threshold, 0)}</p>
                  <p className="text-xs text-white/40">阈值</p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    alert.currentValue < alert.threshold ? 'bg-red-500' : 'bg-eco-400'
                  )}
                  style={{ width: `${Math.min((alert.currentValue / alert.threshold) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-data-400" />
              推送记录
            </h3>
            <div className="space-y-3">
              {alert.pushRecords.map((record, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center',
                        record.confirmed
                          ? 'bg-eco-500/20 text-eco-300'
                          : 'bg-warning-500/20 text-warning-400'
                      )}
                    >
                      {record.confirmed ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{record.receiver}</p>
                      <p className="text-xs text-white/50">{formatRelativeTime(record.pushedAt)}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      record.confirmed ? 'text-eco-300' : 'text-warning-400'
                    )}
                  >
                    {record.confirmed ? '已确认' : '待确认'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-warning-400" />
              审批处理
            </h3>

            {user ? (
              <ApprovalActions
                currentStatus={alert.approvalStatus}
                userRole={user.role}
                onApprove={handleApproval}
                isSubmitting={isSubmitting}
              />
            ) : null}
          </div>

          <div className="glass-card p-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-eco-300" />
              时间线
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-white/90">预警触发</p>
                  <p className="text-xs text-white/40">{formatDate(alert.triggeredAt)}</p>
                </div>
              </div>
              {alert.escalatedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <XCircle className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-white/90">已升级审批</p>
                    <p className="text-xs text-white/40">{formatDate(alert.escalatedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
