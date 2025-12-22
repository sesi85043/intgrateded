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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          HR Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage employee email accounts and credentials
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Credentials</CardTitle>
          <CardDescription>
            All generated employee email accounts and their credentials. This information is confidential and only visible to Management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

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
                  <TableRow>
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
                    <TableRow key={credential.id}>
                      <TableCell className="font-medium">
                        {credential.teamMember.firstName} {credential.teamMember.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {credential.teamMember.departmentCode || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {credential.email}
                      </TableCell>
                      <TableCell>
                        {credential.quota ? (credential.quota / 1024).toFixed(2) + " GB" : "Unlimited"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={credential.status === "active" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {credential.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(credential.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
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
