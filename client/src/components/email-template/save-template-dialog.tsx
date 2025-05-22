import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SaveTemplateDialogProps {
  templateName: string;
  category?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, category?: string) => void;
}

export function SaveTemplateDialog({
  templateName,
  category = 'custom',
  isOpen,
  onClose,
  onSave,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState(templateName);
  const [selectedCategory, setSelectedCategory] = useState(category);

  const handleSave = () => {
    if (name.trim() === '') {
      return; // Don't save if name is empty
    }
    onSave(name, selectedCategory);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Template</DialogTitle>
          <DialogDescription>
            Give your template a name and category to save it
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Email Template"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="introduction">Introduction</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="value-proposition">Value Proposition</SelectItem>
                <SelectItem value="case-study">Case Study</SelectItem>
                <SelectItem value="meeting-request">Meeting Request</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}