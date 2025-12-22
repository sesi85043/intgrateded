import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Check, Mail, AlertCircle, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface EmailCredential {
  id: string;
  teamMemberId: string;
  email: string;
  quota?: number;
  status: string;
  createdAt: string;
  teamMember: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentCode?: string;
  };
}

export default function HRManagement() {
  const { isManagement } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: emailCredentials = [], isLoading, error } = useQuery<EmailCredential[]>({
    queryKey: ["/api/hr/email-credentials"],
    queryFn: async () => {
      const res = await apiRequest("/api/hr/email-credentials", "GET");
      return res.json();
    },
  });

  const filteredCredentials = emailCredentials.filter(cred =>
    cred.teamMember.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.teamMember.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isManagement) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access HR Management. Only Management roles can view this section.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeCount = emailCredentials.filter(c => c.status === "active").length;
  const inactiveCount = emailCredentials.filter(c => c.status !== "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            HR Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage employee email accounts and credentials
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Email Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailCredentials.length}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Active Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{activeCount}</div>
            <p className="text-xs text-green-600/70 dark:text-green-400/70">Fully operational</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Suspended/Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{inactiveCount}</div>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Email Credentials</CardTitle>
            <CardDescription>
              Confidential employee email records
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load email credentials. Please try again.
              </AlertDescription>
            </Alert>
          ) : filteredCredentials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No email credentials found</p>
              {searchQuery && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchQuery("")}
                  className="mt-4"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Quota (MB)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredentials.map((credential) => (
                    <TableRow key={credential.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        {credential.teamMember.firstName} {credential.teamMember.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold px-2 py-0">
                          {credential.teamMember.departmentCode || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {credential.email}
                      </TableCell>
                      <TableCell className="text-xs">
                        {credential.quota ? (credential.quota / 1024).toFixed(1) + " GB" : "Unlimited"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={credential.status === "active" ? "default" : "secondary"}
                          className={`capitalize text-[10px] h-5 ${credential.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                        >
                          {credential.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(credential.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(credential.email, credential.id)}
                        >
                          {copiedId === credential.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
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

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Note:</strong> Email credentials are sensitive information. Passwords are encrypted and never displayed in the UI. Only share credentials directly with employees through secure channels.
        </AlertDescription>
      </Alert>
    </div>
  );
}
