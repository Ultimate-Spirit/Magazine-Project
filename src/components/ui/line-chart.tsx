import React from 'react';
import ReactECharts from 'echarts-for-react';

interface LineChartProps {
  pagesData: number[];
  pdfsData: number[];
  dates: string[];
  height?: string | number;
}

export const LineChart: React.FC<LineChartProps> = ({ pagesData, pdfsData, dates, height = '100%' }) => {
  const options = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0A0A0A',
      borderColor: '#333',
      textStyle: {
        color: '#FFF',
        fontSize: 12
      }
    },
    grid: {
      top: 10,
      right: 10,
      bottom: 20,
      left: 30,
      containLabel: false
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: dates,
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#a3a3a3',
        fontSize: 10
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#a3a3a3',
        fontSize: 10
      },
      splitLine: {
        show: false
      }
    },
    series: [
      {
        name: 'Platform Activity',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: {
          color: '#64748b', // slate-500
          width: 2,
        },
        areaStyle: {
          color: 'rgba(100, 116, 139, 0.1)'
        },
        data: pdfsData // Or combine pagesData and pdfsData depending on preference, we will use pdfsData for now as Platform Activity
      }
    ]
  };

  return (
    <ReactECharts
      option={options}
      theme="dark"
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
};
