import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye,
  RefreshCw,
  AlertCircle,
  Loader2,
  MapPin,
  Users,
  Phone,
  Mail,
  Building,
  KeyRound,
  Copy,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface LatestOtp {
  code: string;
  expiresAt: string;
}

interface PendingRegistration {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  departmentId: string;
  department: Department | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  nextOfKin1Name: string;
  nextOfKin1Relationship: string;
  nextOfKin1Phone: string;
  nextOfKin1Email: string | null;
  nextOfKin1Address: string | null;
  nextOfKin2Name: string;
  nextOfKin2Relationship: string;
  nextOfKin2Phone: string;
  nextOfKin2Email: string | null;
  nextOfKin2Address: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  latestOtp: LatestOtp | null;
}

interface Role {
  id: string;
  name: string;
  code: string;
  level: number;
}

export default function Registrations() {
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: registrations = [], isLoading, refetch } = useQuery<PendingRegistration[]>({
    queryKey: ["/api/registrations"],
    queryFn: async () => {
      const res = await apiRequest("/api/registrations", "GET");
      return res.json();
    },
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      const res = await apiRequest("/api/roles", "GET");
      return res.json();
    },
  });

  const generateOtpMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      return await apiRequest(`/api/registrations/${registrationId}/generate-otp`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, otpCode, roleId, employeeId }: { id: string; otpCode: string; roleId?: string; employeeId?: string }) => {
      return await apiRequest(`/api/registrations/${id}/approve`, "POST", { otpCode, roleId, employeeId });
    },
    onSuccess: () => {
      setShowApproveDialog(false);
      setOtpInput("");
      setSelectedRoleId("");
      setEmployeeId("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to approve registration");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest(`/api/registrations/${id}/reject`, "POST", { reason });
    },
    onSuccess: () => {
      setShowRejectDialog(false);
      setRejectionReason("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to reject registration");
    },
  });

  const filteredRegistrations = registrations.filter(reg => {
    if (activeTab === "pending") return reg.status === "pending";
    if (activeTab === "approved") return reg.status === "approved";
    if (activeTab === "rejected") return reg.status === "rejected";
    return true;
  });

  const pendingCount = registrations.filter(r => r.status === "pending").length;
  const approvedCount = registrations.filter(r => r.status === "approved").length;
  const rejectedCount = registrations.filter(r => r.status === "rejected").length;

  const copyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserPlus className="h-8 w-8" />
            Staff Registrations
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage pending staff registration applications
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedCount})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {activeTab} registrations found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegistrations.map((registration) => (
                <Card key={registration.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">
                            {registration.firstName} {registration.lastName}
                          </h3>
                          {getStatusBadge(registration.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {registration.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {registration.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {registration.department?.name || "Unknown"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Applied: {format(new Date(registration.createdAt), "PPP 'at' p")}
                        </p>
                        
                        {registration.status === "pending" && registration.latestOtp && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                            <KeyRound className="h-4 w-4 text-primary" />
                            <span className="font-mono font-semibold">{registration.latestOtp.code}</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyOtp(registration.latestOtp!.code)}
                            >
                              {copiedOtp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              Expires: {format(new Date(registration.latestOtp.expiresAt), "PPp")}
                            </span>
                          </div>
                        )}
                        
                        {registration.status === "rejected" && registration.rejectionReason && (
                          <p className="text-sm text-red-600 mt-2">
                            Reason: {registration.rejectionReason}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRegistration(registration);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        {registration.status === "pending" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => generateOtpMutation.mutate(registration.id)}
                              disabled={generateOtpMutation.isPending}
                            >
                              <RefreshCw className={`h-4 w-4 mr-1 ${generateOtpMutation.isPending ? 'animate-spin' : ''}`} />
                              New OTP
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedRegistration(registration);
                                setShowApproveDialog(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedRegistration(registration);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selectedRegistration && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selectedRegistration.firstName} {selectedRegistration.lastName}
                </SheetTitle>
                <SheetDescription>
                  Registration details and personal information
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p>{selectedRegistration.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p>{selectedRegistration.phone}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Department</Label>
                      <p>{selectedRegistration.department?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedRegistration.status)}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Residential Address
                  </h3>
                  <div className="text-sm space-y-1">
                    <p>{selectedRegistration.addressLine1}</p>
                    {selectedRegistration.addressLine2 && <p>{selectedRegistration.addressLine2}</p>}
                    <p>{selectedRegistration.city}, {selectedRegistration.state} {selectedRegistration.postalCode}</p>
                    <p>{selectedRegistration.country}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Next of Kin (Primary)
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p>{selectedRegistration.nextOfKin1Name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Relationship</Label>
                      <p>{selectedRegistration.nextOfKin1Relationship}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p>{selectedRegistration.nextOfKin1Phone}</p>
                    </div>
                    {selectedRegistration.nextOfKin1Email && (
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p>{selectedRegistration.nextOfKin1Email}</p>
                      </div>
                    )}
                  </div>
                  {selectedRegistration.nextOfKin1Address && (
                    <div className="text-sm">
                      <Label className="text-muted-foreground">Address</Label>
                      <p>{selectedRegistration.nextOfKin1Address}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Next of Kin (Secondary)
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p>{selectedRegistration.nextOfKin2Name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Relationship</Label>
                      <p>{selectedRegistration.nextOfKin2Relationship}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p>{selectedRegistration.nextOfKin2Phone}</p>
                    </div>
                    {selectedRegistration.nextOfKin2Email && (
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p>{selectedRegistration.nextOfKin2Email}</p>
                      </div>
                    )}
                  </div>
                  {selectedRegistration.nextOfKin2Address && (
                    <div className="text-sm">
                      <Label className="text-muted-foreground">Address</Label>
                      <p>{selectedRegistration.nextOfKin2Address}</p>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Applied on: {format(new Date(selectedRegistration.createdAt), "PPP 'at' p")}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Registration</DialogTitle>
            <DialogDescription>
              Approve {selectedRegistration?.firstName} {selectedRegistration?.lastName}'s registration and assign a role.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Approval OTP *</Label>
              <Input
                id="otp"
                placeholder="Enter the 6-digit OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                maxLength={6}
              />
              {selectedRegistration?.latestOtp && (
                <p className="text-xs text-muted-foreground">
                  Current OTP: <span className="font-mono font-semibold">{selectedRegistration.latestOtp.code}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID (Optional)</Label>
              <Input
                id="employeeId"
                placeholder="e.g., EMP001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedRegistration && otpInput) {
                  approveMutation.mutate({
                    id: selectedRegistration.id,
                    otpCode: otpInput,
                    roleId: selectedRoleId || undefined,
                    employeeId: employeeId || undefined,
                  });
                }
              }}
              disabled={approveMutation.isPending || !otpInput}
            >
              {approveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Reject {selectedRegistration?.firstName} {selectedRegistration?.lastName}'s registration application.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Rejection</Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for rejection (optional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedRegistration) {
                  rejectMutation.mutate({
                    id: selectedRegistration.id,
                    reason: rejectionReason,
                  });
                }
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting...</>
              ) : (
                <><XCircle className="h-4 w-4 mr-2" /> Reject</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
