'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText, Filter } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { AuditHoverIcon } from '@/components/ui/audit-hover-card';
import {
  getAllDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  DocumentType,
  CreateDocumentTypeData,
} from '@/lib/api/masters/document-types';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function DocumentTypesPage() {
  const { hasAccess, isLoading: permissionLoading } = useModuleAccess('master_data', true);
  const { hasPermission } = usePermissions();

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [filteredDocumentTypes, setFilteredDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDocumentType, setEditingDocumentType] = useState<DocumentType | null>(null);
  const [deletingDocumentType, setDeletingDocumentType] = useState<DocumentType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateDocumentTypeData>({
    name: '',
    code: '',
    category: 'Identity',
    isMandatory: false,
    isActive: true,
    displayOrder: 0,
  });

  const loadDocumentTypes = async () => {
    try {
      setIsLoading(true);
      const data = await getAllDocumentTypes();
      setDocumentTypes(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load document types');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documentTypes];

    if (filterCategory !== 'all') {
      filtered = filtered.filter((dt) => dt.category === filterCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((dt) =>
        dt.name.toLowerCase().includes(query) ||
        dt.code.toLowerCase().includes(query) ||
        dt.category.toLowerCase().includes(query)
      );
    }

    setFilteredDocumentTypes(filtered);
  };

  useEffect(() => {
    loadDocumentTypes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documentTypes, filterCategory, searchQuery]);

  if (permissionLoading || !hasAccess) {
    return null;
  }

  // Show loading screen on initial load
  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoader message="Loading document types..." />
      </DashboardLayout>
    );
  }

  const handleOpenDialog = (documentType?: DocumentType) => {
    if (documentType) {
      setEditingDocumentType(documentType);
      setFormData({
        name: documentType.name,
        code: documentType.code,
        category: documentType.category,
        isMandatory: documentType.isMandatory,
        isActive: documentType.isActive,
        displayOrder: documentType.displayOrder,
      });
    } else {
      setEditingDocumentType(null);
      setFormData({
        name: '',
        code: '',
        category: 'Identity',
        isMandatory: false,
        isActive: true,
        displayOrder: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDocumentType(null);
    setFormData({
      name: '',
      code: '',
      category: 'Identity',
      isMandatory: false,
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingDocumentType) {
        await updateDocumentType(editingDocumentType.id, formData);
        toast.success('Document type updated successfully');
      } else {
        await createDocumentType(formData);
        toast.success('Document type created successfully');
      }
      handleCloseDialog();
      loadDocumentTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDocumentType) return;

    setIsSubmitting(true);
    try {
      await deleteDocumentType(deletingDocumentType.id);
      toast.success('Document type deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingDocumentType(null);
      loadDocumentTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete document type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = filteredDocumentTypes.filter((dt) => dt.isActive).length;
  const inactiveCount = filteredDocumentTypes.filter((dt) => !dt.isActive).length;
  const mandatoryCount = filteredDocumentTypes.filter((dt) => dt.isMandatory).length;

  const categories = ['Identity', 'Education', 'Employment', 'Financial', 'Medical'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Document Types</h1>
            <p className="text-gray-600 mt-1">Manage document type master data</p>
          </div>
          {hasPermission('master_data', 'canWrite') && (
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Document Type
            </Button>
          )}
        </div>

        {/* Compact Stats + Search */}
        <div className="flex items-center justify-between gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Left side - Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-semibold text-gray-900">{filteredDocumentTypes.length}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Active:</span>
              <span className="text-lg font-semibold text-green-600">{activeCount}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Inactive:</span>
              <span className="text-lg font-semibold text-gray-400">{inactiveCount}</span>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Mandatory:</span>
              <span className="text-lg font-semibold text-blue-600">{mandatoryCount}</span>
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search document types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 h-9"
            />
          </div>
        </div>

        {/* Filters */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterCategory" className="text-sm font-medium text-gray-700">
                  Filter by Category
                </Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger id="filterCategory" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold">Document Type</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Mandatory</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocumentTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No document types found matching your search.' : 'No document types found. Create one to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocumentTypes.map((documentType) => (
                      <TableRow key={documentType.id} className="border-b border-gray-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-violet-600" />
                            </div>
                            <span className="font-medium">{documentType.name}</span>
                            <AuditHoverIcon
                            moduleCode="master_data"
                              createdAt={documentType.createdAt}
                              createdBy={documentType.createdBy}
                              creator={documentType.creator}
                              updatedAt={documentType.updatedAt}
                              updatedBy={documentType.updatedBy}
                              updater={documentType.updater}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {documentType.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                            {documentType.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {documentType.isMandatory ? (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200">Yes</Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {documentType.isActive ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(documentType)}
                              disabled={!hasPermission('master_data', 'canUpdate')}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingDocumentType(documentType);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={!hasPermission('master_data', 'canDelete')}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingDocumentType ? 'Edit Document Type' : 'Add New Document Type'}
                </DialogTitle>
                <DialogDescription>
                  {editingDocumentType
                    ? 'Update document type information'
                    : 'Add a new document type'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Passport"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., PASSPORT"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isMandatory" className="text-sm font-medium">
                    Mandatory
                  </Label>
                  <Switch
                    id="isMandatory"
                    checked={formData.isMandatory}
                    onCheckedChange={(checked) => setFormData({ ...formData, isMandatory: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive" className="text-sm font-medium">
                    Active Status
                  </Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {isSubmitting ? 'Saving...' : editingDocumentType ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Document Type</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingDocumentType?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingDocumentType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
