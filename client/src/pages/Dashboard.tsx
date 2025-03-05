import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { getSalesAnalytics } from "@/api/analytics"
import { getLowStockAlerts } from "@/api/inventory"
import { useToast } from "@/hooks/useToast"
import { AlertCircle, TrendingUp, Package, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/format"

type Analytics = {
  dailySales: Array<{ date: string; amount: number }>
  popularItems: Array<{ _id: string; name: string; sales: number }>
  revenue: {
    daily: number
    weekly: number
    monthly: number
  }
}

type LowStockAlert = {
  _id: string
  name: string
  stock: number
  threshold: number
}

export function Dashboard() {
  const { t } = useLanguage()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsData, alertsData] = await Promise.all([
          getSalesAnalytics(),
          getLowStockAlerts(),
        ])
        setAnalytics(analyticsData)
        setLowStockAlerts(alertsData.alerts)
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: t("dashboard.failedToFetch"),
        })
      }
    }
    fetchData()
  }, [])

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        {t("dashboard.loading")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.dailyRevenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.revenue.daily)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.weeklyRevenue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.revenue.weekly)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.monthlyRevenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.revenue.monthly)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.dailySales")}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("dashboard.lowStockAlerts")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{alert.name}</span>
                  </div>
                  <div className="text-sm text-destructive">
                    {t("dashboard.stock")}: {alert.stock}/{alert.threshold}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}