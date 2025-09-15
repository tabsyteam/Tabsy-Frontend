'use client';

import { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import { Table, TableStatus, TableShape } from '@tabsy/shared-types';
import {
  X,
  Edit,
  QrCode,
  Users,
  Circle,
  Square,
  RectangleHorizontal,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Hash,
  FileText,
  Download,
  Printer,
  Copy,
  History,
} from 'lucide-react';
import { createTableHooks } from '@tabsy/react-query-hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { toast } from 'sonner';
import { QRCodeManager } from './QRCodeManager';

interface TableDetailSlidePanelProps {
  table: Table;
  restaurantId: string;
  onClose: () => void;
  onEdit: (table: Table) => void;
  onUpdate: () => void;
}

export function TableDetailSlidePanel({
  table: initialTable,
  restaurantId,
  onClose,
  onEdit,
  onUpdate,
}: TableDetailSlidePanelProps) {
  const [showQRManager, setShowQRManager] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const queryClient = useQueryClient();
  const tableHooks = createTableHooks(useQuery);

  // Fetch fresh table data to ensure UI stays updated
  const {
    data: tableResponse,
    isLoading: tableLoading,
    refetch: refetchTable,
  } = tableHooks.useTable(restaurantId, initialTable.id);

  // Use fresh data if available, otherwise fall back to initial table
  const table = tableResponse?.data || initialTable;

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string; status: TableStatus }) => {
      return await tabsyClient.table.updateStatus(data.restaurantId, data.tableId, data.status);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] });
      refetchTable(); // Refetch the current table data to update the panel immediately
    }
  });

  const resetTableMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string }) => {
      return await tabsyClient.table.reset(data.restaurantId, data.tableId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] });
      refetchTable(); // Refetch the current table data to update the panel immediately
    }
  });

  // Get table sessions
  const {
    data: sessionsResponse,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = tableHooks.useTableSessions(restaurantId, table.id);

  const sessions = sessionsResponse?.data || [];

  const getShapeIcon = (shape: TableShape) => {
    switch (shape) {
      case TableShape.ROUND:
        return <Circle className="w-5 h-5" />;
      case TableShape.SQUARE:
        return <Square className="w-5 h-5" />;
      case TableShape.RECTANGULAR:
        return <RectangleHorizontal className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return <CheckCircle className="w-5 h-5" style={{ color: 'rgb(var(--status-success))' }} />;
      case TableStatus.OCCUPIED:
        return <Users className="w-5 h-5" style={{ color: 'rgb(var(--primary))' }} />;
      case TableStatus.RESERVED:
        return <Clock className="w-5 h-5" style={{ color: 'rgb(var(--status-info))' }} />;
      case TableStatus.MAINTENANCE:
        return <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--status-warning))' }} />;
      default:
        return <AlertTriangle className="w-5 h-5 text-content-secondary" />;
    }
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'status-success';
      case TableStatus.OCCUPIED:
        return 'bg-primary-light text-primary border-primary';
      case TableStatus.RESERVED:
        return 'status-info';
      case TableStatus.MAINTENANCE:
        return 'status-warning';
      default:
        return 'bg-surface-secondary text-content-secondary border-default';
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
      await updateStatusMutation.mutateAsync({
        restaurantId: table.restaurantId,
        tableId: table.id,
        status: newStatus,
      } as any);
      toast.success(`Table ${table.number} status updated to ${getStatusDisplayName(newStatus)}`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update table status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetTableMutation.mutateAsync({
        restaurantId: table.restaurantId,
        tableId: table.id,
      } as any);
      toast.success(`Table ${table.number} has been reset`);
      onUpdate();
      refetchSessions();
    } catch (error) {
      toast.error('Failed to reset table');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusActions = () => {
    const actions = [];

    switch (table.status) {
      case TableStatus.AVAILABLE:
        actions.push(
          <Button
            key="occupy"
            onClick={() => handleStatusChange(TableStatus.OCCUPIED)}
            disabled={isUpdatingStatus}
            size="sm"
            className="flex-1"
          >
            Mark as Occupied
          </Button>
        );
        actions.push(
          <Button
            key="reserve"
            onClick={() => handleStatusChange(TableStatus.RESERVED)}
            disabled={isUpdatingStatus}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Mark as Reserved
          </Button>
        );
        break;

      case TableStatus.OCCUPIED:
        actions.push(
          <Button
            key="available"
            onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
            disabled={isUpdatingStatus}
            size="sm"
            className="flex-1"
          >
            Mark as Available
          </Button>
        );
        actions.push(
          <Button
            key="maintenance"
            onClick={() => handleStatusChange(TableStatus.MAINTENANCE)}
            disabled={isUpdatingStatus}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Mark for Maintenance
          </Button>
        );
        break;

      case TableStatus.RESERVED:
        actions.push(
          <Button
            key="occupy"
            onClick={() => handleStatusChange(TableStatus.OCCUPIED)}
            disabled={isUpdatingStatus}
            size="sm"
            className="flex-1"
          >
            Mark as Occupied
          </Button>
        );
        actions.push(
          <Button
            key="available"
            onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
            disabled={isUpdatingStatus}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Cancel Reservation
          </Button>
        );
        break;

      case TableStatus.MAINTENANCE:
        actions.push(
          <Button
            key="available"
            onClick={() => handleStatusChange(TableStatus.AVAILABLE)}
            disabled={isUpdatingStatus}
            size="sm"
            className="flex-1"
          >
            Mark as Available
          </Button>
        );
        break;
    }

    return actions;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-25 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border ${getStatusColor(table.status)} ${isUpdatingStatus ? 'opacity-50' : ''}`}>
              {isUpdatingStatus ? (
                <RefreshCw className="w-5 h-5 animate-spin text-content-secondary" />
              ) : (
                getStatusIcon(table.status)
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-content-primary">
                Table {table.number}
              </h2>
              <p className="text-sm text-content-secondary">
                {isUpdatingStatus ? 'Updating...' : getStatusDisplayName(table.status)}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Table Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-content-primary">Table Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-secondary p-4 rounded-lg border border-default">
                <div className="flex items-center space-x-2 mb-2">
                  <Hash className="w-4 h-4 text-content-secondary" />
                  <span className="text-sm text-content-secondary">Table Number</span>
                </div>
                <p className="text-lg font-medium text-content-primary">{table.number}</p>
              </div>

              <div className="bg-surface-secondary p-4 rounded-lg border border-default">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-4 h-4 text-content-secondary" />
                  <span className="text-sm text-content-secondary">Capacity</span>
                </div>
                <p className="text-lg font-medium text-content-primary">{table.capacity} seats</p>
              </div>

              <div className="bg-surface-secondary p-4 rounded-lg border border-default">
                <div className="flex items-center space-x-2 mb-2">
                  {getShapeIcon(table.shape)}
                  <span className="text-sm text-content-secondary">Shape</span>
                </div>
                <p className="text-lg font-medium text-content-primary">
                  {table.shape.charAt(0) + table.shape.slice(1).toLowerCase()}
                </p>
              </div>

              <div className="bg-surface-secondary p-4 rounded-lg border border-default">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-content-secondary" />
                  <span className="text-sm text-content-secondary">Created</span>
                </div>
                <p className="text-sm font-medium text-content-primary">
                  {formatDate(table.createdAt)}
                </p>
              </div>
            </div>

            {table.notes && (
              <div className="bg-surface-secondary p-4 rounded-lg border border-default">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-content-secondary" />
                  <span className="text-sm text-content-secondary">Notes</span>
                </div>
                <p className="text-sm text-content-primary">{table.notes}</p>
              </div>
            )}
          </div>

          {/* Status Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-content-primary">Status Actions</h3>
            <div className="flex space-x-2">
              {getStatusActions()}
            </div>

            {table.status === TableStatus.OCCUPIED && (
              <Button
                onClick={handleReset}
                disabled={resetTableMutation.isPending}
                variant="outline"
                className="w-full border-status-error text-status-error hover:bg-red-50"
              >
                {resetTableMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Table
                  </>
                )}
              </Button>
            )}
          </div>

          {/* QR Code Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-content-primary">QR Code</h3>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowQRManager(true)}
                className="flex-1"
              >
                <QrCode className="w-4 h-4 mr-2" />
                View QR Code
              </Button>
              <Button
                onClick={() => onEdit(table)}
                variant="outline"
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Table
              </Button>
            </div>
          </div>

          {/* Session History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-content-primary">Recent Sessions</h3>
              <Button
                onClick={() => refetchSessions()}
                disabled={sessionsLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 ${sessionsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {sessionsLoading ? (
              <div className="text-center py-4">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-content-secondary" />
                <p className="text-sm text-content-secondary mt-2">Loading sessions...</p>
              </div>
            ) : sessions.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {sessions.slice(0, 5).map((session: any) => (
                  <div
                    key={session.id}
                    className="bg-surface-secondary p-3 rounded-lg border border-default"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-content-primary">
                        Session {session.id.slice(-6)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        session.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : session.status === 'EXPIRED'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-xs text-content-secondary space-y-1">
                      <p>Started: {formatDate(session.startedAt)}</p>
                      {session.guestCount && (
                        <p>Guests: {session.guestCount}</p>
                      )}
                      <p>Last activity: {formatDate(session.lastActivityAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-8 h-8 text-content-secondary mx-auto mb-2" />
                <p className="text-sm text-content-secondary">No sessions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Manager Modal */}
      {showQRManager && (
        <QRCodeManager
          table={table}
          restaurantId={restaurantId}
          onClose={() => setShowQRManager(false)}
        />
      )}
    </>
  );
}