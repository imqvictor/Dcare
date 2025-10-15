import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalChildren: number;
  totalPayments: number;
  unpaidChildren: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total children
      const { count: childrenCount } = await supabase
        .from("children")
        .select("*", { count: "exact", head: true });

      // Fetch total payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("amount, status");

      const totalPayments = paymentsData
        ?.filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch children with unpaid payments
      const { data: unpaidPayments } = await supabase
        .from("payments")
        .select("child_id")
        .eq("status", "unpaid");

      const uniqueUnpaidChildren = new Set(unpaidPayments?.map((p) => p.child_id)).size;

      setStats({
        totalChildren: childrenCount || 0,
        totalPayments,
        unpaidChildren: uniqueUnpaidChildren,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Children",
      value: stats?.totalChildren || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Payments",
      value: `$${stats?.totalPayments.toFixed(2)}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success-light",
    },
    {
      title: "Unpaid Children",
      value: stats?.unpaidChildren || 0,
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning-light",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your daycare management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
