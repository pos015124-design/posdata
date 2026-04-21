import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface AnalyticsChartProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, title }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title || 'Analytics'}</CardTitle>
    </CardHeader>
    <CardContent>
      {data.length ? (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No analytics data available</p>
        </div>
      )}
    </CardContent>
  </Card>
);

export default AnalyticsChart;
