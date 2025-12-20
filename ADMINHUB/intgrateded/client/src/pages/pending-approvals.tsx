/**
 * @fileoverview Pending User Approvals page
 * Copyright (c) 2025 DevPulse.Inc
 * Designed for MM ALL ELECTRONICS
 *
 * Description: Admin page to review and approve/reject pending user registrations.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, Calendar, Mail, Phone, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamMember } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function PendingApprovals() {
  const { toast } = useToast();
  const [viewingUser, setViewingUser] = useState<TeamMember | null>(null);
  const [rejectingUser, setRejectingUser] = useState<TeamMember | null>(null);

  const { data: pendingUsers, isLoading, refetch } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/pending-users"],
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/approve-user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve user");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.firstName} ${data.lastName} has been approved!`,
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/reject-user/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Rejected by admin" }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rejected",
        description: "User has been rejected and removed from the system",
      });
      setRejectingUser(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject user",
        variant: "destructive",
      });
    },
  });

  const handleApprove = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/approve-user/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to approve user");
      }

      // Refetch the pending users list
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      toast.success("User approved successfully");
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user");
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/reject-user/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to reject user");
      }

      // Refetch the pending users list
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      toast.success("User rejected successfully");
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Failed to reject user");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  const hasPendingUsers = pendingUsers && pendingUsers.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending User Approvals</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review and approve new user registrations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Pending Users
            {hasPendingUsers && (
              <Badge className="ml-3" variant="destructive">
                {pendingUsers.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {hasPendingUsers
              ? "Users below are waiting for admin approval to access the system"
              : "No pending users at this time"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasPendingUsers ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                All registered users have been approved
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Signup Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>{user.departmentId}</TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right space-x-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingUser(user)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveMutation.mutate(user.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectingUser(user)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View User Details Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              User Details: {viewingUser?.firstName} {viewingUser?.lastName}
            </DialogTitle>
            <DialogDescription>Complete registration information</DialogDescription>
          </DialogHeader>

          {viewingUser && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-gray-400">First Name</p>
                    <p className="font-medium">{viewingUser.firstName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-gray-400">Last Name</p>
                    <p className="font-medium">{viewingUser.lastName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </p>
                    <p className="font-medium">{viewingUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </p>
                    <p className="font-medium">{viewingUser.phone || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-gray-400">Employee ID</p>
                    <p className="font-medium">{viewingUser.employeeId || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Signup Date
                    </p>
                    <p className="font-medium">
                      {new Date(viewingUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {viewingUser.addressLine1 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Residential Address
                  </h3>
                  <div className="text-sm space-y-1">
                    <p>{viewingUser.addressLine1}</p>
                    {viewingUser.addressLine2 && <p>{viewingUser.addressLine2}</p>}
                    <p>
                      {viewingUser.city}, {viewingUser.state} {viewingUser.postalCode}
                    </p>
                    <p>{viewingUser.country}</p>
                  </div>
                </div>
              )}

              {/* Next of Kin Information */}
              {viewingUser.nextOfKin1Name && (
                <div>
                  <h3 className="font-semibold mb-3">Next of Kin #1</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Name</p>
                      <p className="font-medium">{viewingUser.nextOfKin1Name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Relationship</p>
                      <p className="font-medium">
                        {viewingUser.nextOfKin1Relationship}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Phone</p>
                      <p className="font-medium">{viewingUser.nextOfKin1Phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium">{viewingUser.nextOfKin1Email || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {viewingUser.nextOfKin2Name && (
                <div>
                  <h3 className="font-semibold mb-3">Next of Kin #2</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Name</p>
                      <p className="font-medium">{viewingUser.nextOfKin2Name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Relationship</p>
                      <p className="font-medium">
                        {viewingUser.nextOfKin2Relationship}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Phone</p>
                      <p className="font-medium">{viewingUser.nextOfKin2Phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium">{viewingUser.nextOfKin2Email || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    approveMutation.mutate(viewingUser.id);
                    setViewingUser(null);
                  }}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve User
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setRejectingUser(viewingUser);
                    setViewingUser(null);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!rejectingUser} onOpenChange={() => setRejectingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject User Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject {rejectingUser?.firstName}{" "}
              {rejectingUser?.lastName}'s registration? This action will remove their
              account from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (rejectingUser) {
                  rejectMutation.mutate(rejectingUser.id);
                }
              }}
              disabled={rejectMutation.isPending}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
