import React from 'react';
import { X, CheckCircle2, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { LauncherTask } from '../types/launcher';
import { tclBridge } from '../bridge/tclBridge';

interface TaskDrawerProps {
  open: boolean;
  tasks: LauncherTask[];
  onClose: () => void;
  onRefresh: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ open, tasks, onClose, onRefresh }) => {
  if (!open) return null;

  return (
    <div
      className="tcl-glass-card"
      style={{
        position: 'fixed',
        top: 58,
        right: 14,
        width: 370,
        maxHeight: 'calc(100vh - 76px)',
        zIndex: 80,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Active & Recent Tasks</div>
          <div style={{ fontSize: 11.5, opacity: 0.65 }}>Multi-threaded Download & Install Queue</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {tasks.some((t) => t.status !== 'running') && (
            <button
              type="button"
              className="tcl-icon-btn"
              title="Clear finished tasks"
              onClick={async () => {
                await tclBridge.rpc('clearFinishedTasks');
                onRefresh();
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
          <button type="button" className="tcl-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ padding: '26px 12px', textAlign: 'center', fontSize: 12.5, opacity: 0.65 }}>
          No background downloads running right now.
        </div>
      ) : (
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: 'rgba(0,0,0,0.28)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 12.5 }}>{task.title}</span>
                {task.status === 'running' ? (
                  <button
                    type="button"
                    onClick={() => void tclBridge.rpc('cancelTask', { taskId: task.id })}
                    style={{
                      border: 'none',
                      background: 'rgba(239,68,68,0.2)',
                      color: '#FCA5A5',
                      borderRadius: 8,
                      fontSize: 10.5,
                      padding: '2px 7px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                ) : task.status === 'completed' ? (
                  <CheckCircle2 size={15} color="#8BE51B" />
                ) : (
                  <AlertTriangle size={15} color="#F87171" />
                )}
              </div>

              <div style={{ fontSize: 11.5, opacity: 0.72, margin: '4px 0 6px' }}>
                {task.subtitle} {task.speedText ? `• ${task.speedText}` : ''}
              </div>

              <div
                style={{
                  height: 5,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(2, task.progress)}%`,
                    height: '100%',
                    background:
                      task.status === 'failed'
                        ? '#EF4444'
                        : 'var(--primary)',
                    transition: 'width 0.25s ease',
                  }}
                />
              </div>
              {task.status === 'running' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, marginTop: 5, opacity: 0.7 }}>
                  <Loader2 size={11} className="tcl-spin" /> {task.progress}%
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
