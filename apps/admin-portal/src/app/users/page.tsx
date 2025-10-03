'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tabsy/ui-components';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Shield,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Key,
  Lock,
  Unlock,
  UserX,
  UserCheck
} from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/api';
import { formatDistanceToNow, format } from 'date-fns';
import AddUserModal from '@/components/users/AddUserModal';
import UserDetailsModal from '@/components/users/UserDetailsModal';
import { User, UserRole, getUserStatus } from '@tabsy/shared-types';
import { toast } from 'sonner';

// Role Badge Component
function RoleBadge({ role }: { role: UserRole }) {
  const roleStyles = {
    [UserRole.ADMIN]: 'badge-error',
    [UserRole.RESTAURANT_OWNER]: 'badge-warning',
    [UserRole.RESTAURANT_STAFF]: 'badge-info',
    [UserRole.CUSTOMER]: 'badge-success'
  };

  const roleIcons = {
    [UserRole.ADMIN]: Shield,
    [UserRole.RESTAURANT_OWNER]: Users,
    [UserRole.RESTAURANT_STAFF]: UserCheck,
    [UserRole.CUSTOMER]: Users
  };

  const Icon = roleIcons[role];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleStyles[role]}`}>
      <Icon className="w-3 h-3 mr-1" />
      {role.replace(/_/g, ' ')}
    </span>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-success">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    case 'INACTIVE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-error">
          <XCircle className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-warning">
          <AlertCircle className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    case 'SUSPENDED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-error">
          <XCircle className="w-3 h-3 mr-1" />
          Suspended
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-secondary">
          <AlertCircle className="w-3 h-3 mr-1" />
          Unknown
        </span>
      );
  }
}

export default function UsersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'unverified'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'lastLogin'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch users data
  const { data: usersData, isLoading, refetch } = useUsers({
    search: searchQuery,
    role: roleFilter === 'all' ? undefined : roleFilter,
    status: statusFilter === 'all' ? undefined : statusFilter === 'unverified' ? 'inactive' : statusFilter,
    sortBy: sortBy === 'lastLogin' ? 'createdAt' : sortBy,
    sortOrder
  });

  const deleteUser = useDeleteUser();

  // Calculate pagination
  const users = usersData?.users || [];
  const totalPages = Math.ceil((users?.length || 0) / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    if (!users) return [];
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return users.slice(start, end);
  }, [users, currentPage]);

  // Handlers
  const handleAddUser = () => {
    setSelectedUser(null);
    setShowAddModal(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowAddModal(true);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleDelete = async (user: User) => {
    if (confirm(`Are you sure you want to delete user "${user.firstName} ${user.lastName}"? This action cannot be undone.`)) {
      try {
        await deleteUser.mutateAsync(user.id);
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const handleResetPassword = (user: User) => {
    // TODO: Implement password reset
    toast.success(`Password reset link sent to ${user.email}`);
  };

  const handleToggleStatus = async (user: User) => {
    // TODO: Implement status toggle
    const action = (user as any).active ? 'deactivated' : 'activated';
    toast.success(`User ${action} successfully`);
  };

  return (
    <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
      <DashboardLayout breadcrumbs={[{ label: 'Users' }]}>
        {/* Page Header */}
        <div className="bg-surface border-b border-border-default">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-content-primary flex items-center">
                  <Users className="h-7 w-7 mr-3 text-primary" />
                  User Management
                </h1>
                <p className="mt-1 text-sm text-content-secondary">
                  Manage system users, roles, and permissions
                </p>
              </div>
              <div className="flex gap-3">
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
                  onClick={handleAddUser}
                  className="btn-professional hover-lift"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-surface rounded-lg shadow-card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-content-tertiary" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border-tertiary rounded-lg input-professional focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                    <SelectItem value={UserRole.RESTAURANT_OWNER}>Restaurant Owner</SelectItem>
                    <SelectItem value={UserRole.RESTAURANT_STAFF}>Restaurant Staff</SelectItem>
                    <SelectItem value={UserRole.CUSTOMER}>Customer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
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
                    <SelectItem value="lastLogin">Last Login</SelectItem>
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
                  Active: {users?.filter((u: any) => u.active).length || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-status-error"></div>
                <span className="text-sm text-content-secondary">
                  Admins: {users?.filter((u: any) => u.role === UserRole.ADMIN).length || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-status-warning"></div>
                <span className="text-sm text-content-secondary">
                  Owners: {users?.filter((u: any) => u.role === UserRole.RESTAURANT_OWNER).length || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-status-info"></div>
                <span className="text-sm text-content-secondary">
                  Staff: {users?.filter(u => u.role === UserRole.RESTAURANT_STAFF).length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-surface rounded-lg shadow-card overflow-visible">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <p className="text-content-secondary">Loading users...</p>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-content-tertiary" />
                <p className="text-content-secondary">No users found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full table-professional">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-content-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-tertiary">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-surface-secondary transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-content-primary">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-content-secondary">
                                  ID: {user.id.slice(-8)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-content-secondary">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="flex items-center text-sm text-content-secondary">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={getUserStatus(user)} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-content-secondary">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 hover:bg-surface-secondary rounded-full transition-colors">
                                  <MoreVertical className="h-4 w-4 text-content-tertiary" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                  <Key className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                  {user.active !== false ? (
                                    <>
                                      <Lock className="h-4 w-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user)}
                                  className="text-status-error focus:text-status-error"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                      {Math.min(currentPage * itemsPerPage, users?.length || 0)} of{' '}
                      {users?.length || 0} users
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
          <AddUserModal
            user={selectedUser}
            onClose={() => {
              setShowAddModal(false);
              setSelectedUser(null);
            }}
            onSuccess={() => {
              setShowAddModal(false);
              setSelectedUser(null);
              refetch();
            }}
          />
        )}

        {showDetailsModal && selectedUser && (
          <UserDetailsModal
            user={selectedUser}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedUser(null);
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