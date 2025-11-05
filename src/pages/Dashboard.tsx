import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, FileText, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [totalChildren, setTotalChildren] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { count, error } = await supabase
        .from("children")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      setTotalChildren(count || 0);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">View analytics and reports</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Children</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-3xl font-bold text-primary">{totalChildren}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Registered children
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:border-primary/40 transition-all hover:shadow-md"
          onClick={() => navigate("/reports")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-foreground">View Analytics</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Payment summary, attendance & debt overview
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
