import { useState, useEffect } from "react";
import { getStaff, updateStaff, deleteStaff, updateStaffPermissions, approveStaff } from "@/api/staff";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { EditStaff } from "@/components/admin/EditStaff";
import { useToast } from "@/hooks/useToast";
import { StaffMember } from "@/types/staff";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// UserPlus import removed

export function Staff() {
  const { t } = useLanguage();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // Add dialog state removed
  const { toast } = useToast();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStaff();
      setStaff(response.staff);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch staff";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleUpdateStaff = async (updatedStaff: StaffMember) => {
    try {

      
      if (!updatedStaff._id) {
        throw new Error("Staff ID is missing");
      }
      
      // Basic fields for the main update
      const staffData = {
        name: updatedStaff.name,
        role: updatedStaff.role,
        email: updatedStaff.email,
        phone: updatedStaff.phone || ""
      };
      

      
      // First update the basic staff information
      const result = await updateStaff(updatedStaff._id, staffData);

      
      // Performance update code removed
      
      // Handle permissions update if needed
      if (selectedStaff && updatedStaff.user && selectedStaff.user) {
        const oldPermissions = selectedStaff.user.permissions;
        const newPermissions = updatedStaff.user.permissions;
        
        // Check if any permission has changed
        const permissionsChanged =
          oldPermissions.dashboard !== newPermissions.dashboard ||
          oldPermissions.pos !== newPermissions.pos ||
          oldPermissions.inventory !== newPermissions.inventory ||
          oldPermissions.customers !== newPermissions.customers ||
          oldPermissions.staff !== newPermissions.staff ||
          oldPermissions.reports !== newPermissions.reports ||
          oldPermissions.settings !== newPermissions.settings;
        
        if (permissionsChanged) {
          console.log("Permissions changed, updating...");
          console.log("New permissions:", newPermissions);
          await updateStaffPermissions(updatedStaff._id, newPermissions);
          
          // Only refresh user data if the user is updating their own permissions
          // This prevents users from being logged out when an admin updates their permissions
          console.log("Permissions updated successfully");
        }
        
        // Handle approval status update if needed
        if (selectedStaff.user.isApproved === false && updatedStaff.user.isApproved === true) {
          console.log("Approving staff member");
          await approveStaff(updatedStaff._id);
          
          // Don't refresh user data after approval update to prevent logout
          console.log("Staff member approved successfully");
        }
      }
      
      toast({
        title: "Success",
        description: "Staff member updated successfully"
      });
      setIsEditDialogOpen(false);
      fetchStaff();
    } catch (error: unknown) {
      console.error("Error in handleUpdateStaff:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update staff member";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      await deleteStaff(selectedStaff._id);
      toast({
        title: "Success",
        description: "Staff member deleted successfully"
      });
      setIsDeleteDialogOpen(false);
      fetchStaff();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete staff member";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  if (error) {
    return <div className="text-center text-destructive">
      <p>{error}</p>
      <Button onClick={fetchStaff} variant="outline" className="mt-4">
        Retry
      </Button>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("staff.title")}</h1>
          <p className="text-muted-foreground">
            {t("staff.subtitle")}
          </p>
        </div>
        {/* Add Staff button removed as requested */}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("staff.name")}</TableHead>
              <TableHead>{t("staff.email")}</TableHead>
              <TableHead>{t("staff.role")}</TableHead>
              <TableHead>{t("staff.status")}</TableHead>
              <TableHead>{t("staff.created")}</TableHead>
              <TableHead>{t("staff.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff && staff.length > 0 ? staff.map((member) => (
              <TableRow key={member._id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge variant={member.role === 'Manager' || member.role === 'Admin' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={member.user?.isApproved ? 'default' : 'secondary'}>
                    {member.user?.isApproved ? t("staff.approved") : t("staff.pending")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {member.createdAt ? format(new Date(member.createdAt), "MMM d, yyyy") : "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStaff(member);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      {t("staff.edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStaff(member);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      {t("staff.delete")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  {t("staff.noStaffFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedStaff && (
        <>
          <EditStaff
            staff={selectedStaff}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSave={handleUpdateStaff}
          />

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("staff.deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("staff.deleteConfirmDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteStaff}>
                  {t("action.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Add Staff Dialog removed */}
    </div>
  );
}

export default Staff;