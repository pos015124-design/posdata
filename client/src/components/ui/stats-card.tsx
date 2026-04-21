import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    type: "increase" | "decrease" | "neutral"
  }
  icon: LucideIcon
  gradient?: string
  className?: string
  loading?: boolean
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  gradient = "from-blue-500 to-purple-600",
  className,
  loading = false
}: StatsCardProps) {
  if (loading) {
    return (
      <Card className={cn("card-modern hover-lift", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-8 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </div>
            <div className="h-12 w-12 bg-muted rounded-xl animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const changeColor = {
    increase: "text-green-600 bg-green-50 dark:bg-green-900/20",
    decrease: "text-red-600 bg-red-50 dark:bg-red-900/20",
    neutral: "text-gray-600 bg-gray-50 dark:bg-gray-900/20"
  }

  return (
    <Card className={cn("card-modern hover-lift group animate-scale-in", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {change && (
              <div className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                changeColor[change.type]
              )}>
                {change.value}
              </div>
            )}
          </div>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r text-white shadow-lg transition-transform group-hover:scale-110",
            gradient
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  color?: "blue" | "green" | "purple" | "orange" | "red"
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  className
}: MetricCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600", 
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600"
  }

  return (
    <Card className={cn("card-modern hover-lift group overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className={cn("h-2 bg-gradient-to-r", colorClasses[color])} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r text-white",
              colorClasses[color]
            )}>
              <Icon className="h-5 w-5" />
            </div>
            {trend && (
              <div className="text-right">
                <div className={cn(
                  "text-sm font-medium",
                  trend.value > 0 ? "text-green-600" : trend.value < 0 ? "text-red-600" : "text-gray-600"
                )}>
                  {trend.value > 0 ? "+" : ""}{trend.value}%
                </div>
                <div className="text-xs text-muted-foreground">{trend.label}</div>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickStatsProps {
  stats: Array<{
    title: string
    value: string | number
    change?: {
      value: string
      type: "increase" | "decrease" | "neutral"
    }
    icon: LucideIcon
    gradient?: string
  }>
  loading?: boolean
  className?: string
}

export function QuickStats({ stats, loading = false, className }: QuickStatsProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          icon={stat.icon}
          gradient={stat.gradient}
          loading={loading}
          className="animate-slide-up"
          style={{ animationDelay: `${index * 0.1}s` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
