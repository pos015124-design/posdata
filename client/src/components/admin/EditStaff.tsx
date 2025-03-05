import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StaffMember } from "@/types/staff";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface EditStaffProps {
  staff: StaffMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (staff: StaffMember) => void;
}

export function EditStaff({ staff, open, onOpenChange, onSave }: EditStaffProps) {
  const [formData, setFormData] = useState<StaffMember>({
    _id: "",
    name: "",
    role: "",
    email: "",
    phone: "",
    user: {
      isApproved: false,
      permissions: {
        dashboard: false,
        pos: false,
        inventory: false,
        customers: false,
        staff: false,
        reports: false,
        settings: false,
      },
    },
  });

  useEffect(() => {
    if (staff) {
      setFormData({
        ...staff,
        user: staff.user || {
          isApproved: false,
          permissions: {
            dashboard: false,
            pos: false,
            inventory: false,
            customers: false,
            staff: false,
            reports: false,
            settings: false,
          },
        },
      });
    }
  }, [staff]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
  };

  const handleApprovalChange = (checked: boolean) => {
    setFormData({
      ...formData,
      user: {
        ...formData.user!,
        isApproved: checked,
      },
    });
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData({
      ...formData,
      user: {
        ...formData.user!,
        permissions: {
          ...formData.user!.permissions,
          [permission]: checked,
        },
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Pass the complete staff data including permissions and approval status
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone || ""}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sales Clerk">Sales Clerk</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Performance field removed */}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isApproved"
                checked={formData.user?.isApproved}
                onCheckedChange={handleApprovalChange}
              />
              <Label htmlFor="isApproved">Approved</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dashboard"
                  checked={formData.user?.permissions.dashboard}
                  onCheckedChange={(checked) => handlePermissionChange("dashboard", checked as boolean)}
                />
                <Label htmlFor="dashboard">Dashboard</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pos"
                  checked={formData.user?.permissions.pos}
                  onCheckedChange={(checked) => handlePermissionChange("pos", checked as boolean)}
                />
                <Label htmlFor="pos">Point of Sale</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inventory"
                  checked={formData.user?.permissions.inventory}
                  onCheckedChange={(checked) => handlePermissionChange("inventory", checked as boolean)}
                />
                <Label htmlFor="inventory">Inventory</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customers"
                  checked={formData.user?.permissions.customers}
                  onCheckedChange={(checked) => handlePermissionChange("customers", checked as boolean)}
                />
                <Label htmlFor="customers">Customers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="staff"
                  checked={formData.user?.permissions.staff}
                  onCheckedChange={(checked) => handlePermissionChange("staff", checked as boolean)}
                />
                <Label htmlFor="staff">Staff</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reports"
                  checked={formData.user?.permissions.reports}
                  onCheckedChange={(checked) => handlePermissionChange("reports", checked as boolean)}
                />
                <Label htmlFor="reports">Reports</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="settings"
                  checked={formData.user?.permissions.settings}
                  onCheckedChange={(checked) => handlePermissionChange("settings", checked as boolean)}
                />
                <Label htmlFor="settings">Settings</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}