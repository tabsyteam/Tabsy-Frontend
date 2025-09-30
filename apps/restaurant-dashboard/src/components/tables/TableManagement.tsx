'use client';

import { useState } from 'react';
import { useAuth } from '@tabsy/ui-components';
import { tabsyClient } from '@tabsy/api-client';
import { Button } from '@tabsy/ui-components';
import { Table, TableStatus } from '@tabsy/shared-types';
import {
  Filter,
  RefreshCw,
  AlertCircle,
  Plus,
  Search,
  Grid,
  List,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  SlidersHorizontal,
  BarChart3,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import { createTableHooks } from '@tabsy/react-query-hooks';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { TableCard } from './TableCard';
import { CreateTableModal } from './CreateTableModal';
import { QRCodeManager } from './QRCodeManager';
import { TableDetailsModal } from './TableDetailsModal';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface TableManagementProps {
  restaurantId: string;
}

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | TableStatus;

export function TableManagement({ restaurantId }: TableManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [qrCodeTable, setQrCodeTable] = useState<Table | null>(null);

  // Create hooks using factory pattern
  const tableHooks = createTableHooks(useQuery);
  const queryClient = useQueryClient();

  // Authentication
  const { session, user, isLoading: authLoading } = useAuth();

  // Sync authentication token with global API client
  if (session?.token && tabsyClient.getAuthToken() !== session.token) {
    tabsyClient.setAuthToken(session.token);
  }

  const isTokenSynced = Boolean(session?.token && tabsyClient.getAuthToken() === session.token);

  // Fetch tables
  const {
    data: tablesResponse,
    isLoading: tablesLoading,
    error: tablesError,
    refetch: refetchTables,
  } = tableHooks.useTables(restaurantId);

  // Mutation hooks for table operations - defined inline to avoid type issues
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string; status: TableStatus }) => {
      return await tabsyClient.table.updateStatus(data.restaurantId, data.tableId, data.status);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] });
    }
  });

  const resetTableMutation = useMutation({
    mutationFn: async (data: { restaurantId: string; tableId: string }) => {
      return await tabsyClient.table.reset(data.restaurantId, data.tableId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['table', variables.restaurantId, variables.tableId] });
    }
  });

  // Extract data from response
  const tables = tablesResponse?.data || [];

  // Filter and search logic
  const filteredTables = tables.filter((table: Table) => {
    const matchesSearch =
      table.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.capacity?.toString().includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;

    return matchesSearch && matchesStatus && table.isActive;
  });

  // Calculate statistics
  const stats = {
    total: tables.filter((t: Table) => t.isActive).length,
    available: tables.filter((t: Table) => t.status === TableStatus.AVAILABLE && t.isActive).length,
    occupied: tables.filter((t: Table) => t.status === TableStatus.OCCUPIED && t.isActive).length,
    reserved: tables.filter((t: Table) => t.status === TableStatus.RESERVED && t.isActive).length,
    maintenance: tables.filter((t: Table) => t.status === TableStatus.MAINTENANCE && t.isActive).length,
    totalCapacity: tables.filter((t: Table) => t.isActive).reduce((sum: number, table: Table) => sum + table.capacity, 0),
    availableCapacity: tables
      .filter((t: Table) => t.status === TableStatus.AVAILABLE && t.isActive)
      .reduce((sum: number, table: Table) => sum + table.capacity, 0),
  };

  const handleRefresh = async () => {
    try {
      await refetchTables();
      toast.success('Tables refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh tables');
    }
  };

  const handleTableSelect = (table: Table) => {
    setSelectedTable(table);
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setEditingTable(null);
    setShowCreateModal(true);
  };

  const handleQRCode = (table: Table) => {
    setQrCodeTable(table);
  };

  const handleStatusChange = async (table: Table, newStatus: TableStatus) => {
    await updateStatusMutation.mutateAsync({
      restaurantId,
      tableId: table.id,
      status: newStatus,
    });
    // Refetch tables to update the list
    refetchTables();
  };

  const handleTableReset = async (table: Table) => {
    await resetTableMutation.mutateAsync({
      restaurantId,
      tableId: table.id,
    });
    // Refetch tables to update the list
    refetchTables();
  };

  const getStatusIcon = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return <CheckCircle className="w-4 h-4 text-status-success" />;
      case TableStatus.OCCUPIED:
        return <Users className="w-4 h-4 text-accent" />;
      case TableStatus.RESERVED:
        return <Clock className="w-4 h-4 text-primary" />;
      case TableStatus.MAINTENANCE:
        return <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--status-warning))' }} />;
      default:
        return <AlertCircle className="w-4 h-4 text-content-secondary" />;
    }
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'status-success';
      case TableStatus.OCCUPIED:
        return 'status-warning';
      case TableStatus.RESERVED:
        return 'status-info';
      case TableStatus.MAINTENANCE:
        return 'status-warning';
      default:
        return 'border-default';
    }
  };

  // Loading state
  if (tablesLoading && !tables.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-content-primary">Table Management</h1>
              <p className="text-sm text-content-secondary mt-1">Organize and manage your restaurant's seating</p>
            </div>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (tablesError) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-content-primary">Table Management</h1>
              <p className="text-sm text-content-secondary mt-1">Organize and manage your restaurant's seating</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h3 className="text-lg font-medium text-content-primary mb-2">Failed to Load Tables</h3>
          <p className="text-content-secondary mb-4">
            There was an error loading your tables. Please try again.
          </p>
          <Button onClick={handleRefresh} className="mx-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-8">
        {/* Modern Header with Statistics */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 lg:gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10">
                  <LayoutGrid className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Table Management</h1>
                  <p className="text-foreground/80 mt-1">
                    Organize and manage your restaurant's seating
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                onClick={handleRefresh}
                disabled={tablesLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:scale-105 transition-all duration-200"
              >
                <RefreshCw
                  className={`h-4 w-4 ${tablesLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <div className="stat-card transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Tables</p>
                  <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="stat-card transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Available</p>
                  <p className="text-3xl font-bold text-foreground">{stats.available}</p>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </div>

            <div className="stat-card transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Occupied</p>
                  <p className="text-3xl font-bold text-foreground">{stats.occupied}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/10">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </div>

            <div className="stat-card transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Reserved</p>
                  <p className="text-3xl font-bold text-foreground">{stats.reserved}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent/10">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
              </div>
            </div>

            <div className="stat-card transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Capacity</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalCapacity}</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/10">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </div>

            <div className="stat-card transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Available Seats</p>
                  <p className="text-3xl font-bold text-foreground">{stats.availableCapacity}</p>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters and Actions */}
        <div className="glass-card p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Left side - Filters and Search */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filters:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className={`filter-button ${
                      statusFilter !== 'all' ? 'filter-button-active' : 'filter-button-inactive'
                    }`}
                  >
                    <option value="all">All Status</option>
                    <option value={TableStatus.AVAILABLE}>Available</option>
                    <option value={TableStatus.OCCUPIED}>Occupied</option>
                    <option value={TableStatus.RESERVED}>Reserved</option>
                    <option value={TableStatus.MAINTENANCE}>Maintenance</option>
                  </select>
                </div>
              </div>

              {/* Enhanced Search */}
              <div className="search-gradient-border w-full max-w-md">
                <div className="search-inner p-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search tables..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 text-sm bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - View Mode and Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-first sm:order-last">
                <Button
                  onClick={handleCreateNew}
                  size="sm"
                  className="btn-primary flex items-center justify-center gap-2 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Table</span>
                  <span className="sm:hidden">Table</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {filteredTables.length === 0 ? (
          <EmptyState
            title={searchQuery || statusFilter !== 'all' ? 'No tables match your filters' : 'No tables yet'}
            description={
              searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first table'
            }
            actionLabel={
              searchQuery || statusFilter !== 'all' ? 'Clear Filters' : 'Add Your First Table'
            }
            onAction={
              searchQuery || statusFilter !== 'all' ? () => {
                setSearchQuery('');
                setStatusFilter('all');
              } : handleCreateNew
            }
            className="py-12"
          />
        ) : (
          <div
            className={`transition-all duration-300 ${
              viewMode === 'grid'
                ? 'grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr'
                : 'space-y-4'
            }`}
          >
            {filteredTables.map((table: Table, index: number) => (
              <div
                key={table.id}
                className="animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCard
                  table={table}
                  viewMode={viewMode}
                  onSelect={handleTableSelect}
                  onEdit={handleEditTable}
                  onQRCode={handleQRCode}
                  onStatusChange={handleStatusChange}
                  onReset={handleTableReset}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals and Panels */}
      {showCreateModal && (
        <CreateTableModal
          restaurantId={restaurantId}
          editingTable={editingTable}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTable(null);
          }}
          onSuccess={() => {
            refetchTables();
            setShowCreateModal(false);
            setEditingTable(null);
          }}
        />
      )}


      {qrCodeTable && (
        <QRCodeManager
          table={qrCodeTable}
          restaurantId={restaurantId}
          onClose={() => setQrCodeTable(null)}
        />
      )}

      {selectedTable && (
        <TableDetailsModal
          table={selectedTable}
          restaurantId={restaurantId}
          onClose={() => setSelectedTable(null)}
          onEdit={(table) => {
            setEditingTable(table);
            setShowCreateModal(true);
            setSelectedTable(null);
          }}
          onQRCode={(table) => {
            setQrCodeTable(table);
            setSelectedTable(null);
          }}
          onUpdate={() => {
            refetchTables();
          }}
        />
      )}
    </div>
  );
}