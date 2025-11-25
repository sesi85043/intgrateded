import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, Users, BarChart3, Shield, Zap, Database } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <span className="text-xl font-semibold">Admin Hub</span>
            </div>
            <Button onClick={handleLogin} data-testid="button-login">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              Unified Platform Management
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Centralize control over Metabase, Chatwoot, Typebot, and Mailcow.
              Manage users, monitor analytics, and streamline operations from one powerful dashboard.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
              Get Started
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Create, edit, and manage user accounts across all platforms from a single interface.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor key metrics, track conversations, and visualize platform performance.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">Activity Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive audit logs for all admin actions and platform changes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 pt-16 border-t border-border">
            <h2 className="text-2xl font-semibold mb-8">Supported Platforms</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <Database className="h-8 w-8 text-primary" />
                    <span className="font-medium">Metabase</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <Zap className="h-8 w-8 text-primary" />
                    <span className="font-medium">Chatwoot</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <LayoutDashboard className="h-8 w-8 text-primary" />
                    <span className="font-medium">Typebot</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-8 w-8 text-primary" />
                    <span className="font-medium">Mailcow</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-24">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2024 Admin Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
