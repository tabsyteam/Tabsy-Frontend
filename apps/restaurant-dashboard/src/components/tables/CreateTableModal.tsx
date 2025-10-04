'use client';

import { useState, useEffect } from 'react';
import { Button } from '@tabsy/ui-components';
import { Table, TableShape } from '@tabsy/shared-types';
import {
  X,
  Circle,
  Square,
  RectangleHorizontal,
  Users,
  Hash,
  FileText,
  Save,
  Loader2,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tabsyClient } from '@tabsy/api-client';
import { toast } from 'sonner';

interface CreateTableModalProps {
  restaurantId: string;
  editingTable?: Table | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface TableFormData {
  tableNumber: string;
  capacity: number;
  shape: TableShape;
  notes: string;
}

interface FormErrors {
  tableNumber?: string;
  capacity?: string;
  notes?: string;
}

export function CreateTableModal({
  restaurantId,
  editingTable,
  onClose,
  onSuccess,
}: CreateTableModalProps) {
  const [formData, setFormData] = useState<TableFormData>({
    tableNumber: '',
    capacity: 4,
    shape: TableShape.ROUND,
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const queryClient = useQueryClient();

  const createTableMutation = useMutation({
    mutationFn: async (data: any) => {
      return await tabsyClient.table.create(restaurantId, {
        tableNumber: data.tableNumber,
        seats: data.seats,
        shape: data.shape,
        locationDescription: data.locationDescription
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
    }
  });

  const updateTableMutation = useMutation({
    mutationFn: async (data: any) => {
      return await tabsyClient.table.update(restaurantId, data.tableId, {
        tableNumber: data.tableNumber,
        seats: data.seats,
        shape: data.shape,
        locationDescription: data.locationDescription
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['table', restaurantId, variables.tableId] });
    }
  });

  const isEditing = !!editingTable;
  const isLoading = createTableMutation.isPending || updateTableMutation.isPending;

  // Load editing data
  useEffect(() => {
    if (editingTable) {
      setFormData({
        tableNumber: editingTable.tableNumber || '',
        capacity: editingTable.capacity || 4,
        shape: editingTable.shape || TableShape.ROUND,
        notes: editingTable.notes || '',
      });
    }
  }, [editingTable]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.tableNumber || !formData.tableNumber.trim()) {
      newErrors.tableNumber = 'Table number is required';
    } else if (formData.tableNumber.trim().length > 10) {
      newErrors.tableNumber = 'Table number must be 10 characters or less';
    }

    if (!formData.capacity || formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    } else if (formData.capacity > 20) {
      newErrors.capacity = 'Capacity cannot exceed 20';
    }

    if ((formData.notes || '').length > 200) {
      newErrors.notes = 'Notes must be 200 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const submitData = {
        tableNumber: formData.tableNumber.trim(),
        seats: formData.capacity,
        shape: formData.shape,
        locationDescription: formData.notes.trim() || undefined,
      };

      if (isEditing && editingTable) {
        await updateTableMutation.mutateAsync({
          tableId: editingTable.id,
          ...submitData,
        });
        toast.success(`Table ${formData.tableNumber} updated successfully`);
      } else {
        await createTableMutation.mutateAsync(submitData);
        toast.success(`Table ${formData.tableNumber} created successfully`);
      }

      onSuccess();
    } catch (error: any) {
      if (error?.message?.includes('already exists')) {
        setErrors({ tableNumber: 'A table with this number already exists' });
      } else {
        toast.error(isEditing ? 'Failed to update table' : 'Failed to create table');
      }
    }
  };

  const handleInputChange = (field: keyof TableFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }));
    }
  };

  const getShapeIcon = (shape: TableShape, isSelected: boolean) => {
    const iconClass = `w-6 h-6 ${isSelected ? 'text-primary-foreground' : 'text-content-secondary'}`;
    switch (shape) {
      case TableShape.ROUND:
        return <Circle className={iconClass} />;
      case TableShape.SQUARE:
        return <Square className={iconClass} />;
      case TableShape.RECTANGULAR:
        return <RectangleHorizontal className={iconClass} />;
      default:
        return <Circle className={iconClass} />;
    }
  };

  const getShapeLabel = (shape: TableShape) => {
    switch (shape) {
      case TableShape.ROUND:
        return 'Round';
      case TableShape.SQUARE:
        return 'Square';
      case TableShape.RECTANGULAR:
        return 'Rectangular';
      default:
        return 'Round';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-content-primary">
            {isEditing ? 'Edit Table' : 'Create New Table'}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Table Number */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Table Number *
            </label>
            <input
              type="text"
              value={formData.tableNumber}
              onChange={(e) => handleInputChange('tableNumber', e.target.value)}
              placeholder="e.g., A1, 101, VIP-1"
              maxLength={10}
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-content-primary placeholder-content-secondary focus:ring-2 focus:ring-primary focus:border-primary ${
                errors.tableNumber ? 'border-status-error' : 'border-default'
              }`}
              disabled={isLoading}
            />
            <div className="flex justify-between mt-1">
              {errors.tableNumber ? (
                <p className="text-sm text-status-error">{errors.tableNumber}</p>
              ) : (
                <div />
              )}
              <p className="text-sm text-content-secondary">
                {(formData.tableNumber || '').length}/10
              </p>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Seating Capacity *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.capacity}
              onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 1)}
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-content-primary focus:ring-2 focus:ring-primary focus:border-primary ${
                errors.capacity ? 'border-status-error' : 'border-default'
              }`}
              disabled={isLoading}
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-status-error">{errors.capacity}</p>
            )}
          </div>

          {/* Table Shape */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-3">
              Table Shape
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.values(TableShape).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => handleInputChange('shape', shape)}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    formData.shape === shape
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-default bg-surface hover:border-secondary'
                  }`}
                  disabled={isLoading}
                >
                  {getShapeIcon(shape, formData.shape === shape)}
                  <span className={`text-sm font-medium ${
                    formData.shape === shape ? 'text-primary-foreground' : 'text-content-primary'
                  }`}>
                    {getShapeLabel(shape)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any special notes about this table..."
              rows={3}
              maxLength={200}
              className={`w-full px-3 py-2 border rounded-lg bg-surface text-content-primary placeholder-content-secondary focus:ring-2 focus:ring-primary focus:border-primary resize-none ${
                errors.notes ? 'border-status-error' : 'border-default'
              }`}
              disabled={isLoading}
            />
            <div className="flex justify-between mt-1">
              {errors.notes && (
                <p className="text-sm text-status-error">{errors.notes}</p>
              )}
              <p className="text-sm text-content-secondary ml-auto">
                {(formData.notes || '').length}/200
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Table' : 'Create Table'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}