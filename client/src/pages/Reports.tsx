import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';

export default function Reports() {
  const [selectedPeriod] = useState('monthly');

  const metrics = [
    { title: 'Total Revenue', value: '$45,250', change: '+12.5%', icon: DollarSign, color: 'from-green-500 to-emerald-600' },
    { title: 'Total Orders', value: '356', change: '+8.2%', icon: ShoppingCart, color: 'from-blue-500 to-cyan-600' },
    { title: 'Average Order', value: '$127', change: '+5.3%', icon: BarChart3, color: 'from-purple-500 to-pink-600' },
    { title: 'Growth Rate', value: '15.8%', change: '+2.1%', icon: TrendingUp, color: 'from-orange-500 to-red-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Insights into your business performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{metric.title}</p>
                  <p className="text-3xl font-bold mt-2">{metric.value}</p>
                  <p className="text-sm text-green-600 mt-1 font-semibold">{metric.change}</p>
                </div>
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${metric.color} shadow-lg`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Chart visualization will be added here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
