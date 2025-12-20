import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Calendar } from "lucide-react";
import type { ActivityLog } from "@shared/schema";
import { format } from "date-fns";

export default function ActivityPage() {
  const { data: activities, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("create")) return "default";
    if (action.includes("delete")) return "destructive";
    if (action.includes("update")) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">Track all administrative actions and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    </TableRow>
                  ))
                ) : activities && activities.length > 0 ? (
                  activities.map((activity) => (
                    <TableRow key={activity.id} data-testid={`activity-row-${activity.id}`}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(activity.createdAt), "MMM dd, yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(activity.action)}>
                          {activity.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {activity.platform ? (
                          <Badge variant="outline" className="capitalize">
                            {activity.platform}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {activity.targetType || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                        {activity.details
                          ? typeof activity.details === "string"
                            ? activity.details
                            : JSON.stringify(activity.details)
                          : "No additional details"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Activity className="h-12 w-12 opacity-50" />
                        <p>No activity logs found</p>
                        <p className="text-sm">Admin actions will appear here</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
