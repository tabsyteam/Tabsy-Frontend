'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tabsy/ui-components';
import {
  Store,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Users,
  MapPin,
  Phone,
  Mail,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  PauseCircle
} from 'lucide-react';
import {
  useRestaurants,
  useCreateRestaurant,
  useUpdateRestaurant,
  useUpdateRestaurantStatus,
  useDeleteRestaurant
} from '@/hooks/api';
import { formatDistanceToNow } from 'date-fns';
import AddRestaurantModal from '@/components/restaurants/AddRestaurantModal';
import RestaurantDetailsModal from '@/components/restaurants/RestaurantDetailsModal';
import { Restaurant } from '@tabsy/shared-types';

// Status Badge Component
function StatusBadge({ status, active }: { status?: string; active: boolean }) {
  if (status === 'SUSPENDED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-error">
        <XCircle className="w-3 h-3 mr-1" />
        Suspended
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-warning">
        <AlertCircle className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  }
  if (active) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-success">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-secondary">
      <PauseCircle className="w-3 h-3 mr-1" />
      Inactive
    </span>
  );
}

export default function RestaurantsPage(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'revenue'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  const itemsPerPage = 10;

  // API Hooks
  const {
    data: restaurantsData,
    isLoading,
    refetch
  } = useRestaurants({
    search: searchQuery,
    status: statusFilter,
    sortBy,
    sortOrder
  });

  const createRestaurant = useCreateRestaurant();
  const updateRestaurant = useUpdateRestaurant();
  const updateStatus = useUpdateRestaurantStatus();
  const deleteRestaurant = useDeleteRestaurant();

  // Pagination logic
  const paginatedRestaurants = useMemo(() => {
    if (!restaurantsData || !Array.isArray(restaurantsData)) return [];

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return restaurantsData.slice(start, end);
  }, [restaurantsData, currentPage]);

  const totalPages = Math.ceil((restaurantsData?.length || 0) / itemsPerPage);

  // Handlers
  const handleStatusToggle = async (restaurant: Restaurant) => {
    await updateStatus.mutateAsync({
      id: restaurant.id,
      active: !restaurant.active
    });
    setShowActionMenu(null);
  };

  const handleDelete = async (restaurant: Restaurant) => {
    if (confirm(`Are you sure you want to delete "${restaurant.name}"? This action cannot be undone.`)) {
      await deleteRestaurant.mutateAsync(restaurant.id);
      setShowActionMenu(null);
    }
  };

  const handleViewDetails = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowDetailsModal(true);
    setShowActionMenu(null);
  };

  const handleEdit = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowAddModal(true);
    setShowActionMenu(null);
  };

  const handleExport = () => {
    // Export logic here
    const csv = restaurantsData?.map(r =>
      `${r.name},${r.email},${r.phoneNumber},${r.address},${r.active ? 'Active' : 'Inactive'}`
    ).join('\n');

    const blob = new Blob([`Name,Email,Phone,Address,Status\n${csv}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restaurants.csv';
    a.click();
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Restaurants' }
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout breadcrumbs={breadcrumbs}>
        {/* Header Actions */}
        <div className="px-6 py-4 bg-surface border-b border-border-default">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content-primary">Restaurant Management</h1>
              <p className="text-sm text-content-secondary mt-1">
                Manage all restaurants on the platform
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="hover-lift"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="hover-lift"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => {
                  setSelectedRestaurant(null);
                  setShowAddModal(true);
                }}
                className="btn-professional hover-lift"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Restaurant
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="px-6 py-4">
          <div className="bg-surface rounded-lg shadow-card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-content-tertiary" />
                  <input
                    type="text"
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border-tertiary rounded-lg input-professional focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="createdAt">Date Added</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-border-tertiary rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-border-tertiary">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-status-success"></div>
                <span className="text-sm text-content-secondary">
                  Active: {restaurantsData?.filter(r => r.active).length || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-content-disabled"></div>
                <span className="text-sm text-content-secondary">
                  Inactive: {restaurantsData?.filter(r => !r.active).length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Restaurants Table */}
        <div className="px-6 pb-8">
          <div className="bg-surface rounded-lg shadow-card overflow-visible">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-content-secondary">Loading restaurants...</p>
              </div>
            ) : paginatedRestaurants.length === 0 ? (
              <div className="p-8 text-center">
                <Store className="h-12 w-12 mx-auto mb-4 text-content-tertiary" />
                <p className="text-content-secondary">No restaurants found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full table-professional">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Restaurant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-tertiary">
                      {paginatedRestaurants.map((restaurant) => (
                        <tr key={restaurant.id} className="hover:bg-surface-secondary transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-content-primary">
                                {restaurant.name}
                              </div>
                              {restaurant.description && (
                                <div className="text-sm text-content-secondary truncate max-w-xs">
                                  {restaurant.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-content-secondary">
                                <Mail className="h-3 w-3 mr-1" />
                                {restaurant.email}
                              </div>
                              <div className="flex items-center text-sm text-content-secondary">
                                <Phone className="h-3 w-3 mr-1" />
                                {restaurant.phoneNumber}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-content-secondary">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate max-w-xs">
                                {restaurant.address}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge active={restaurant.active} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-content-secondary">
                            {formatDistanceToNow(new Date(restaurant.createdAt), { addSuffix: true })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="relative">
                              <button
                                onClick={() => setShowActionMenu(showActionMenu === restaurant.id ? null : restaurant.id)}
                                className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors"
                              >
                                <MoreVertical className="h-4 w-4 text-content-secondary" />
                              </button>

                              {showActionMenu === restaurant.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-dropdown border border-border-tertiary z-dropdown animate-fadeIn">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleViewDetails(restaurant)}
                                      className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => handleEdit(restaurant)}
                                      className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleStatusToggle(restaurant)}
                                      className="flex items-center px-4 py-2 text-sm text-content-primary hover:bg-surface-secondary w-full text-left"
                                    >
                                      {restaurant.active ? (
                                        <>
                                          <PauseCircle className="h-4 w-4 mr-2" />
                                          Deactivate
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Activate
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleDelete(restaurant)}
                                      className="flex items-center px-4 py-2 text-sm text-status-error hover:bg-status-error-light w-full text-left"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-3 flex items-center justify-between border-t border-border-tertiary">
                    <div className="text-sm text-content-secondary">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, restaurantsData?.length || 0)} of{' '}
                      {restaurantsData?.length || 0} restaurants
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-border-tertiary rounded-lg hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page =>
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        )
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-content-tertiary">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 rounded-lg ${
                                page === currentPage
                                  ? 'bg-primary text-content-inverse'
                                  : 'hover:bg-surface-secondary'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-border-tertiary rounded-lg hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {showAddModal && (
          <AddRestaurantModal
            restaurant={selectedRestaurant}
            onClose={() => {
              setShowAddModal(false);
              setSelectedRestaurant(null);
            }}
            onSuccess={() => {
              setShowAddModal(false);
              setSelectedRestaurant(null);
              refetch();
            }}
          />
        )}

        {showDetailsModal && selectedRestaurant && (
          <RestaurantDetailsModal
            restaurant={selectedRestaurant}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedRestaurant(null);
            }}
            onEdit={() => {
              setShowDetailsModal(false);
              setShowAddModal(true);
            }}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}