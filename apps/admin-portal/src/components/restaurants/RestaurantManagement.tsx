'use client'

import { useState } from 'react'
import { Button } from '@tabsy/ui-components'
import { 
  Store, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Eye, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Restaurant } from '@tabsy/shared-types'

type RestaurantStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'

// Extended restaurant interface for admin portal with additional properties
interface AdminRestaurant extends Restaurant {
  status: RestaurantStatus
  logoUrl?: string
  settings: {
    maxTables: number
    maxCapacity: number
  }
}

interface RestaurantCardProps {
  restaurant: AdminRestaurant
  onView: (restaurant: AdminRestaurant) => void
  onEdit: (restaurant: AdminRestaurant) => void
  onDelete: (restaurant: AdminRestaurant) => void
  onStatusChange: (restaurant: AdminRestaurant, status: RestaurantStatus) => void
}

function RestaurantCard({ 
  restaurant, 
  onView, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: RestaurantCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const getStatusColor = (status: RestaurantStatus): string => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: RestaurantStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />
      case 'PENDING':
        return <Clock className="w-4 h-4" />
      case 'SUSPENDED':
        return <XCircle className="w-4 h-4" />
      case 'INACTIVE':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start space-x-4">
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-gray-400" />
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{restaurant.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{restaurant.description}</p>
            
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(restaurant.status)}`}>
              {getStatusIcon(restaurant.status)}
              <span className="ml-1">{restaurant.status}</span>
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
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
              <div className="py-1">
                <button
                  onClick={() => { onView(restaurant); setMenuOpen(false) }}
                  className="flex items-center w-full px-4 py-2 text-sm text-content-secondary hover:bg-interactive-hover"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </button>
                <button
                  onClick={() => { onEdit(restaurant); setMenuOpen(false) }}
                  className="flex items-center w-full px-4 py-2 text-sm text-content-secondary hover:bg-interactive-hover"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                
                {/* Status Actions */}
                {restaurant.status !== 'ACTIVE' && (
                  <button
                    onClick={() => { onStatusChange(restaurant, 'ACTIVE'); setMenuOpen(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate
                  </button>
                )}
                
                {restaurant.status === 'ACTIVE' && (
                  <button
                    onClick={() => { onStatusChange(restaurant, 'SUSPENDED'); setMenuOpen(false) }}
                    className="flex items-center w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Suspend
                  </button>
                )}
                
                <div className="border-t border-gray-100"></div>
                <button
                  onClick={() => { onDelete(restaurant); setMenuOpen(false) }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span>{restaurant.address.street}, {restaurant.address.city}</span>
        </div>
        
        <div className="flex items-center">
          <Phone className="w-4 h-4 mr-2 text-gray-400" />
          <span>{restaurant.contact.phone}</span>
        </div>
        
        <div className="flex items-center">
          <Mail className="w-4 h-4 mr-2 text-gray-400" />
          <span>{restaurant.contact.email}</span>
        </div>
        
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          <span>{restaurant.settings.maxTables} tables • {restaurant.settings.maxCapacity} capacity</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">-</p>
          <p className="text-xs text-gray-500">Today Orders</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">-</p>
          <p className="text-xs text-gray-500">Revenue</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">-</p>
          <p className="text-xs text-gray-500">Rating</p>
        </div>
      </div>
    </div>
  )
}

interface RestaurantManagementProps {
  restaurants: AdminRestaurant[]
  loading: boolean
  onCreateNew: () => void
}

export function RestaurantManagement({ 
  restaurants, 
  loading, 
  onCreateNew 
}: RestaurantManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<RestaurantStatus | 'ALL'>('ALL')

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.address.city.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || restaurant.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusCounts = () => {
    return {
      total: restaurants.length,
      active: restaurants.filter(r => r.status === 'ACTIVE').length,
      pending: restaurants.filter(r => r.status === 'PENDING').length,
      suspended: restaurants.filter(r => r.status === 'SUSPENDED').length,
    }
  }

  const statusCounts = getStatusCounts()

  const handleView = (restaurant: AdminRestaurant) => {
    // TODO: Implement detailed view modal
    console.log('View restaurant:', restaurant.name)
  }

  const handleEdit = (restaurant: AdminRestaurant) => {
    // Open edit modal
    console.log('Edit restaurant:', restaurant)
  }

  const handleDelete = (restaurant: AdminRestaurant) => {
    // Confirm and delete restaurant
    console.log('Delete restaurant:', restaurant)
  }

  const handleStatusChange = (restaurant: AdminRestaurant, newStatus: RestaurantStatus) => {
    // Update restaurant status
    console.log('Change status:', restaurant, newStatus)
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
          <h2 className="text-2xl font-bold text-gray-900">Restaurant Management</h2>
          <p className="text-gray-600">Manage all restaurants in the platform</p>
        </div>
        
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Restaurant
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p>
          <p className="text-sm text-gray-600">Total Restaurants</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
          <p className="text-sm text-gray-600">Active</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
          <p className="text-sm text-gray-600">Pending</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{statusCounts.suspended}</p>
          <p className="text-sm text-gray-600">Suspended</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RestaurantStatus | 'ALL')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
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

      {/* Restaurants Grid */}
      {filteredRestaurants.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchQuery || statusFilter !== 'ALL' ? 'No restaurants match your filters' : 'No restaurants found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
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