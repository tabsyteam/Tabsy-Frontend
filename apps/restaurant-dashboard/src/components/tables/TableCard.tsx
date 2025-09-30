'use client';

import { useState } from 'react';
import { Button } from '@tabsy/ui-components';
import { Table, TableStatus, TableShape } from '@tabsy/shared-types';
import { TableSessionStatus } from './TableSessionStatus';
import {
  Users,
  MoreVertical,
  QrCode,
  Edit,
  RefreshCw,
  Eye,
  Circle,
  Square,
  RectangleHorizontal,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface TableCardProps {
  table: Table;
  viewMode: 'grid' | 'list';
  onSelect: (table: Table) => void;
  onEdit: (table: Table) => void;
  onQRCode: (table: Table) => void;
  onStatusChange: (table: Table, newStatus: TableStatus) => Promise<void>;
  onReset: (table: Table) => Promise<void>;
  getStatusIcon: (status: TableStatus) => JSX.Element;
  getStatusColor: (status: TableStatus) => string;
}

export function TableCard({
  table,
  viewMode,
  onSelect,
  onEdit,
  onQRCode,
  onStatusChange,
  onReset,
  getStatusIcon,
  getStatusColor,
}: TableCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const getShapeIcon = (shape: TableShape) => {
    switch (shape) {
      case TableShape.ROUND:
        return <Circle className="w-4 h-4" />;
      case TableShape.SQUARE:
        return <Square className="w-4 h-4" />;
      case TableShape.RECTANGULAR:
        return <RectangleHorizontal className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusDisplayName = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'Available';
      case TableStatus.OCCUPIED:
        return 'Occupied';
      case TableStatus.RESERVED:
        return 'Reserved';
      case TableStatus.MAINTENANCE:
        return 'Maintenance';
      default:
        return status;
    }
  };

  const handleStatusChange = async (newStatus: TableStatus) => {
    if (newStatus === table.status) return;

    setIsUpdatingStatus(true);
    try {
      await onStatusChange(table, newStatus);
      toast.success(`Table ${table.number} status updated to ${getStatusDisplayName(newStatus)}`);
    } catch (error) {
      toast.error('Failed to update table status');
    } finally {
      setIsUpdatingStatus(false);
      setShowActions(false);
    }
  };

  const handleReset = async () => {
    setIsUpdatingStatus(true);
    try {
      await onReset(table);
      toast.success(`Table ${table.number} has been reset`);
    } catch (error) {
      toast.error('Failed to reset table');
    } finally {
      setIsUpdatingStatus(false);
      setShowActions(false);
    }
  };

  const getQuickActions = () => {
    const actions = [];

    // Available status actions
    if (table.status === TableStatus.AVAILABLE) {
      actions.push(
        <button
          key="occupy"
          onClick={() => handleStatusChange(TableStatus.OCCUPIED)}
          disabled={isUpdatingStatus}
          className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary rounded"
        >
          Mark as Occupied
        </button>
      );
      actions.push(
        <button
          key="reserve"
          onClick={() => handleStatusChange(TableStatus.RESERVED)}
          disabled={isUpdatingStatus}
          className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary rounded"
        >
          Mark as Reserved
        </button>
      );
    }

    // Occupied status actions
    if (table.status === TableStatus.OCCUPIED) {
      actions.push(
        <button
          key="available"
          onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
          disabled={isUpdatingStatus}
          className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary rounded"
        >
          Mark as Available
        </button>
      );
      actions.push(
        <button
          key="maintenance"
          onClick={() => handleStatusChange(TableStatus.MAINTENANCE)}
          disabled={isUpdatingStatus}
          className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary rounded"
        >
          Mark for Maintenance
        </button>
      );
    }

    // Reserved status actions
    if (table.status === TableStatus.RESERVED) {
      actions.push(
        <button
          key="occupy"
          onClick={() => handleStatusChange(TableStatus.OCCUPIED)}
          disabled={isUpdatingStatus}
          className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary rounded"
        >
          Mark as Occupied
        </button>
      );
      actions.push(
        <button
          key="available"
          onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
          disabled={isUpdatingStatus}
          className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary rounded"
        >
          Cancel Reservation
        </button>
      );
    }

    // Maintenance status actions
    if (table.status === TableStatus.MAINTENANCE) {
      actions.push(
        <button
          key="available"
          onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
          disabled={isUpdatingStatus}
          className="w-full text-left px-3 py-2 text-sm text-content-primary hover:bg-surface-secondary rounded"
        >
          Mark as Available
        </button>
      );
    }

    // Reset action for occupied tables
    if (table.status === TableStatus.OCCUPIED) {
      actions.push(
        <div key="divider" className="border-t border-border my-1" />
      );
      actions.push(
        <button
          key="reset"
          onClick={handleReset}
          disabled={isUpdatingStatus}
          className="w-full text-left px-3 py-2 text-sm text-status-error hover:bg-surface-secondary rounded"
        >
          Reset Table
        </button>
      );
    }

    return actions;
  };

  if (viewMode === 'list') {
    return (
      <div className="glass-card menu-card-hover group cursor-pointer relative overflow-hidden" onClick={() => onSelect(table)}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative flex-shrink-0">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300">
                  {getShapeIcon(table.shape)}
                </div>
                {/* Status indicator dot */}
                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card" style={{
                  backgroundColor: table.status === 'AVAILABLE' ? 'rgb(var(--status-success))' :
                  table.status === 'OCCUPIED' ? 'rgb(var(--primary))' :
                  table.status === 'RESERVED' ? 'rgb(var(--status-info))' :
                  table.status === 'MAINTENANCE' ? 'rgb(var(--status-warning))' :
                  'rgb(var(--status-error))'
                }} />
              </div>

              <div className="flex items-center space-x-6">
                <div>
                  <span className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">Table {table.number}</span>
                  <div className="flex items-center space-x-1 mt-1">
                    <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-primary">{table.capacity} seats</span>
                  </div>
                </div>

                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  table.status === 'AVAILABLE' ? 'status-success' :
                  table.status === 'OCCUPIED' ? 'bg-primary-light text-primary border-primary' :
                  table.status === 'RESERVED' ? 'status-info' :
                  table.status === 'MAINTENANCE' ? 'status-warning' :
                  'status-error'
                }`}>
                  {getStatusIcon(table.status)}
                  <span className="ml-1">{getStatusDisplayName(table.status)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(table)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(table)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowActions(!showActions)}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>

                {showActions && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-default rounded-lg shadow-lg z-10">
                    <div className="p-1">
                      {getQuickActions()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Session Status */}
          <div className="mt-2">
            <TableSessionStatus
              table={table}
            />
          </div>

          {table.notes && (
            <div className="mt-2 text-sm text-content-secondary">
              {table.notes}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card menu-card-hover group cursor-pointer relative overflow-hidden h-full" onClick={() => onSelect(table)}>
      <div className="p-4 h-full flex flex-col">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between mb-3 relative">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300">
                {getShapeIcon(table.shape)}
              </div>
              {/* Status indicator dot */}
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card" style={{
                backgroundColor: table.status === 'AVAILABLE' ? 'rgb(var(--status-success))' :
                table.status === 'OCCUPIED' ? 'rgb(var(--primary))' :
                table.status === 'RESERVED' ? 'rgb(var(--status-info))' :
                table.status === 'MAINTENANCE' ? 'rgb(var(--status-warning))' :
                'rgb(var(--status-error))'
              }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-base mb-2 truncate group-hover:text-primary transition-colors leading-tight">
                Table {table.number}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                table.status === 'AVAILABLE' ? 'status-success' :
                table.status === 'OCCUPIED' ? 'bg-primary-light text-primary border-primary' :
                table.status === 'RESERVED' ? 'status-info' :
                table.status === 'MAINTENANCE' ? 'status-warning' :
                'status-error'
              }`}>
                {getStatusIcon(table.status)}
                <span className="ml-1">{getStatusDisplayName(table.status)}</span>
              </span>
            </div>
          </div>

          {/* Quick actions - positioned absolutely to stay within bounds */}
          <div className="absolute top-0 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(table);
              }}
              className="h-7 w-7 p-0 hover:bg-interactive-hover hover:text-primary hover:shadow-md transition-all"
              title="View details"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(table);
              }}
              className="h-7 w-7 p-0 hover:bg-interactive-hover hover:text-primary hover:shadow-md transition-all"
              title="Edit table"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className="h-7 w-7 p-0 hover:bg-interactive-hover hover:text-accent hover:shadow-md transition-all"
                title="More actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>

              {showActions && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-default rounded-lg shadow-lg z-10">
                  <div className="p-1">
                    {getQuickActions()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 mb-3">
          {table.notes ? (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {table.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No notes provided
            </p>
          )}
        </div>

        {/* Table Session Status */}
        <div className="mb-2">
          <TableSessionStatus
            table={table}
          />
        </div>

        {/* Footer with capacity and actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
          <div className="flex items-center space-x-1">
            <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm text-primary">
              {table.capacity} seats
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isUpdatingStatus ? (
              <div className="flex items-center text-xs text-content-secondary">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Updating...
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onQRCode(table);
                }}
                className="text-xs px-2 py-1 h-auto"
              >
                <QrCode className="w-3 h-3 mr-1" />
                QR Code
              </Button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}