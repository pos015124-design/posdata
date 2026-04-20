import { useState, useEffect } from "react"
import { getSalesAnalytics } from "@/api/analytics"
import { getLowStockAlerts } from "@/api/inventory"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/format"
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react"

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsData, alertsData] = await Promise.all([
          getSalesAnalytics(),
          getLowStockAlerts(),
        ])
        setAnalytics(analyticsData || {
          dailySales: [],
          popularItems: [],
          revenue: { daily: 0, weekly: 0, monthly: 0 }
        })
        setLowStockAlerts(alertsData?.alerts || [])
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        // Set empty data instead of showing error
        setAnalytics({
          dailySales: [],
          popularItems: [],
          revenue: { daily: 0, weekly: 0, monthly: 0 }
        })
        setLowStockAlerts([])
      }
    }
    fetchData()
  }, [])

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        {t("dashboard.loading") || "Loading dashboard..."}
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
              {formatCurrency(analytics?.revenue?.daily || 0)}
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
              {formatCurrency(analytics?.revenue?.weekly || 0)}
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
              {formatCurrency(analytics?.revenue?.monthly || 0)}
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
              <BarChart data={analytics?.dailySales || []}>
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
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockAlerts.length > 0 ? (
                lowStockAlerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span>{alert.name}</span>
                    </div>
                    <div className="text-sm text-destructive">
                      {t("dashboard.stock")}: {alert.stock}/{alert.threshold}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No low stock alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}