import React from 'react';
import { History, RefreshCw, CheckCircle, Clock, AlertCircle, Box } from 'lucide-react';

export default function HistoryList({ history, onSelectModel, activeTaskId, onRefresh, isLoading }) {
  return (
    <div className="history-panel">
      <div className="history-header">
        <div className="history-title">
          <History size={18} className="icon-accent" />
          <span>Generation History</span>
          {history.length > 0 && (
            <span className="history-count">({history.length})</span>
          )}
        </div>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh history"
        >
          <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
        </button>
      </div>

      <div className="history-items">
        {history.length === 0 ? (
          <div className="history-empty">
            <Box size={24} className="muted-icon" />
            <p>No generations yet</p>
            <span>Generated models will be saved in MongoDB here.</span>
          </div>
        ) : (
          history.map((item) => {
            const isSelected = activeTaskId === item.taskId;
            const isReady = item.status === 'SUCCEEDED' && item.modelUrls?.glb;

            return (
              <div
                key={item.taskId || item._id}
                className={`history-card ${isSelected ? 'selected' : ''} ${
                  !isReady ? 'disabled' : ''
                }`}
                onClick={() => isReady && onSelectModel(item)}
              >
                <div className="history-card-header">
                  <span className="history-prompt" title={item.prompt}>
                    {item.prompt}
                  </span>
                  <span className={`status-pill status-${item.status?.toLowerCase()}`}>
                    {item.status === 'SUCCEEDED' ? (
                      <CheckCircle size={12} />
                    ) : item.status === 'IN_PROGRESS' || item.status === 'PENDING' ? (
                      <Clock size={12} />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    {item.status}
                  </span>
                </div>

                <div className="history-card-footer">
                  <span className="history-style">{item.artStyle || 'realistic'}</span>
                  <span className="history-time">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
