'use client'

import { useState } from 'react'
import { Button } from '@tabsy/ui-components'
import { 
  Users, 
  User, 
  Phone, 
  Calendar, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Crown,
  Settings
} from 'lucide-react'
import { User as BaseUser, UserRole, UserStatus } from '@tabsy/shared-types'
import { format } from 'date-fns'

// Extended user interface for admin portal
interface AdminUser extends BaseUser {
  lastLoginAt?: string
  restaurantAccess?: string[] // Restaurant IDs user has access to
}

interface UserCardProps {
  user: AdminUser
  onView: (user: AdminUser) => void
  onEdit: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
  onStatusChange: (user: AdminUser, status: AdminUser['status']) => void
}

function UserCard({ user, onView, onEdit, onDelete, onStatusChange }: UserCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-status-error-light text-status-error-dark border-status-error-border'
      case UserRole.RESTAURANT_OWNER:
        return 'bg-secondary-light text-secondary-dark border-secondary/20'
      case UserRole.RESTAURANT_STAFF:
        return 'bg-status-info-light text-status-info-dark border-status-info-border'
      case UserRole.CUSTOMER:
        return 'bg-surface-tertiary text-content-secondary border-border-secondary'
      default:
        return 'bg-surface-tertiary text-content-secondary border-border-secondary'
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Crown className="w-4 h-4" />
      case UserRole.RESTAURANT_OWNER:
        return <Shield className="w-4 h-4" />
      case UserRole.RESTAURANT_STAFF:
        return <Settings className="w-4 h-4" />
      case UserRole.CUSTOMER:
        return <User className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: AdminUser['status']): string => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-status-success-light text-status-success-dark border-status-success-border'
      case 'PENDING':
        return 'bg-status-warning-light text-status-warning-dark border-status-warning-border'
      case 'SUSPENDED':
        return 'bg-status-error-light text-status-error-dark border-status-error-border'
      case 'INACTIVE':
        return 'bg-surface-tertiary text-content-secondary border-border-secondary'
      default:
        return 'bg-surface-tertiary text-content-secondary border-border-secondary'
    }
  }

  const getStatusIcon = (status: AdminUser['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />
      case 'PENDING':
        return <AlertCircle className="w-4 h-4" />
      case 'SUSPENDED':
        return <XCircle className="w-4 h-4" />
      case 'INACTIVE':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-surface rounded-lg border border-tertiary shadow-sm hover:shadow-md transition-shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-surface-tertiary rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-content-tertiary" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-content-primary">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-content-secondary mb-2">{user.email}</p>
            
            <div className="flex items-center space-x-2">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                {getRoleIcon(user.role)}
                <span className="ml-1">{user.role.replace('_', ' ')}</span>
              </div>
              
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                {getStatusIcon(user.status)}
                <span className="ml-1">{user.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg border z-10">
              <div className="py-1">
                <button
                  onClick={() => { onView(user); setMenuOpen(false) }}
                  className="flex items-center w-full px-4 py-2 text-sm text-content-secondary hover:bg-interactive-hover"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Profile
                </button>
                <button
                  onClick={() => { onEdit(user); setMenuOpen(false) }}
                  className="flex items-center w-full px-4 py-2 text-sm text-content-secondary hover:bg-interactive-hover"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit User
                </button>
                
                {/* Status Actions */}
                {user.status !== 'ACTIVE' && (
                  <button
                    onClick={() => { onStatusChange(user, UserStatus.ACTIVE); setMenuOpen(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-status-success-dark hover:bg-status-success-light"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate
                  </button>
                )}
                
                {user.status === 'ACTIVE' && (
                  <button
                    onClick={() => { onStatusChange(user, UserStatus.SUSPENDED); setMenuOpen(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-status-warning-dark hover:bg-status-warning-light"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Suspend
                  </button>
                )}
                
                <div className="border-t border-border-tertiary"></div>
                <button
                  onClick={() => { onDelete(user); setMenuOpen(false) }}
                  className="flex items-center w-full px-4 py-2 text-sm text-status-error-dark hover:bg-status-error-light"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="space-y-2 text-sm text-content-secondary">
        {user.phone && (
          <div className="flex items-center">
            <Phone className="w-4 h-4 mr-2 text-content-disabled" />
            <span>{user.phone}</span>
          </div>
        )}
        
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-content-disabled" />
          <span>Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}</span>
        </div>
        
        {user.lastLoginAt && (
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2 text-content-disabled" />
            <span>Last login {format(new Date(user.lastLoginAt), 'MMM d, yyyy')}</span>
          </div>
        )}

        {user.restaurantAccess && user.restaurantAccess.length > 0 && (
          <div className="flex items-center">
            <Shield className="w-4 h-4 mr-2 text-content-disabled" />
            <span>Access to {user.restaurantAccess.length} restaurant(s)</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface UserManagementProps {
  users: AdminUser[]
  loading: boolean
  onCreateNew: () => void
}

export function UserManagement({ users, loading, onCreateNew }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<AdminUser['status'] | 'ALL'>('ALL')

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleCounts = () => {
    return {
      total: users.length,
      admin: users.filter(u => u.role === UserRole.ADMIN).length,
      restaurantOwner: users.filter(u => u.role === UserRole.RESTAURANT_OWNER).length,
      restaurantStaff: users.filter(u => u.role === UserRole.RESTAURANT_STAFF).length,
      customer: users.filter(u => u.role === UserRole.CUSTOMER).length,
    }
  }

  const getStatusCounts = () => {
    return {
      active: users.filter(u => u.status === 'ACTIVE').length,
      pending: users.filter(u => u.status === 'PENDING').length,
      suspended: users.filter(u => u.status === 'SUSPENDED').length,
      inactive: users.filter(u => u.status === 'INACTIVE').length,
    }
  }

  const roleCounts = getRoleCounts()

  const handleView = (user: AdminUser) => {
    // TODO: Implement detailed view modal
    console.log('View user:', user.firstName, user.lastName)
  }

  const handleEdit = (user: AdminUser) => {
    // Open edit modal
    console.log('Edit user:', user)
  }

  const handleDelete = (user: AdminUser) => {
    // Confirm and delete user
    console.log('Delete user:', user)
  }

  const handleStatusChange = (user: AdminUser, newStatus: AdminUser['status']) => {
    // Update user status
    console.log('Change status:', user, newStatus)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-content-primary">User Management</h2>
          <p className="text-content-secondary">Manage platform users and permissions</p>
        </div>

        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface rounded-lg border border-tertiary p-4 text-center">
          <p className="text-2xl font-bold text-content-primary">{roleCounts.total}</p>
          <p className="text-sm text-content-secondary">Total Users</p>
        </div>
        <div className="bg-surface rounded-lg border border-tertiary p-4 text-center">
          <p className="text-2xl font-bold text-primary">{roleCounts.admin}</p>
          <p className="text-sm text-content-secondary">Admins</p>
        </div>
        <div className="bg-surface rounded-lg border border-tertiary p-4 text-center">
          <p className="text-2xl font-bold text-status-success-dark">{roleCounts.restaurantOwner}</p>
          <p className="text-sm text-content-secondary">Restaurant Owners</p>
        </div>
        <div className="bg-surface rounded-lg border border-tertiary p-4 text-center">
          <p className="text-2xl font-bold text-status-warning-dark">{roleCounts.restaurantStaff}</p>
          <p className="text-sm text-content-secondary">Restaurant Staff</p>
        </div>
        <div className="bg-surface rounded-lg border border-tertiary p-4 text-center">
          <p className="text-2xl font-bold text-content-secondary">{roleCounts.customer}</p>
          <p className="text-sm text-content-secondary">Customers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-lg border border-tertiary p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-content-tertiary" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-content-tertiary" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
              className="border border-secondary rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">All Roles</option>
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.RESTAURANT_OWNER}>Restaurant Owner</option>
              <option value={UserRole.RESTAURANT_STAFF}>Restaurant Staff</option>
              <option value={UserRole.CUSTOMER}>Customer</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AdminUser['status'] | 'ALL')}
              className="border border-secondary rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg border border-tertiary">
          <Users className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
          <p className="text-content-tertiary">
            {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No users match your filters'
              : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}