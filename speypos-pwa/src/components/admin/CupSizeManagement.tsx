import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Ruler, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cupSizeApi } from '@/lib/api';
import { sortCupSizes } from '@/lib/cupSizeSort';
import { useMenu } from '@/contexts/MenuContext';
import { useToast } from '@/hooks/use-toast';
import type { CupSize } from '@/types/pos';

interface CupSizeFormData {
  size: string;
  unit: string;
}

const initialFormData: CupSizeFormData = { size: '', unit: '' };

export function CupSizeManagement() {
  const { refresh: refreshMenuContext } = useMenu();
  const { toast } = useToast();
  const [cupSizes, setCupSizes] = useState<CupSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCupSize, setEditingCupSize] = useState<CupSize | null>(null);
  const [deletingCupSize, setDeletingCupSize] = useState<CupSize | null>(null);
  const [formData, setFormData] = useState<CupSizeFormData>(initialFormData);

  const fetchCupSizes = async () => {
    setIsLoading(true);
    const response = await cupSizeApi.getAll();
    setCupSizes(sortCupSizes(response.data || []));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCupSizes();
  }, []);

  const openCreateForm = () => {
    setEditingCupSize(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const openEditForm = (cupSize: CupSize) => {
    setEditingCupSize(cupSize);
    setFormData({ size: cupSize.size, unit: cupSize.unit });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    const size = formData.size.trim();
    const unit = formData.unit.trim();
    if (!size || !unit) {
      toast({ title: 'Missing details', description: 'Size and unit are required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = editingCupSize
        ? await cupSizeApi.update(editingCupSize.id, { size, unit })
        : await cupSizeApi.create({ size, unit });
      if (response.error) throw new Error(response.error);

      setIsFormOpen(false);
      await Promise.all([fetchCupSizes(), refreshMenuContext()]);
      toast({ title: 'Saved', description: editingCupSize ? 'Cup size updated.' : 'Cup size created.' });
    } catch (error) {
      toast({
        title: 'Unable to save cup size',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCupSize) return;

    setIsSubmitting(true);
    try {
      const response = await cupSizeApi.delete(deletingCupSize.id);
      if (response.error) throw new Error(response.error);

      setIsDeleteOpen(false);
      setDeletingCupSize(null);
      await Promise.all([fetchCupSizes(), refreshMenuContext()]);
      toast({ title: 'Deleted', description: 'Cup size removed.' });
    } catch (error) {
      toast({
        title: 'Unable to delete cup size',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cup Sizes</h1>
          <p className="text-muted-foreground">Manage the reusable cup sizes used by menu items and categories.</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Cup Size
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Unit</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cupSizes.map((cupSize) => (
                <tr key={cupSize.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{cupSize.size}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cupSize.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(cupSize)} aria-label={`Edit ${cupSize.size} ${cupSize.unit}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setDeletingCupSize(cupSize); setIsDeleteOpen(true); }} aria-label={`Delete ${cupSize.size} ${cupSize.unit}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {cupSizes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                    <Ruler className="mx-auto mb-3 w-6 h-6" />
                    No cup sizes have been created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCupSize ? 'Edit Cup Size' : 'Add Cup Size'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="cup-size-value">Size</label>
              <Input id="cup-size-value" value={formData.size} onChange={(event) => setFormData((current) => ({ ...current, size: event.target.value }))} placeholder="e.g. 20" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="cup-size-unit">Unit</label>
              <Input id="cup-size-unit" value={formData.unit} onChange={(event) => setFormData((current) => ({ ...current, unit: event.target.value }))} placeholder="e.g. oz" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {editingCupSize ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Cup Size</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deletingCupSize ? `${deletingCupSize.size} (${deletingCupSize.unit})` : ''}</span>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}