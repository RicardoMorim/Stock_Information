"use client";
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const MiniPriceChart = ({ chartData, symbol }) => {
    if (!chartData || chartData.length === 0) {
        return <div className="h-20 flex items-center justify-center text-xs text-gray-500">No chart data</div>;
    }

    const series = [{
        name: symbol || 'Price',
        data: chartData.map(d => ({ x: new Date(d.t), y: d.c }))
    }];

    const options = {
        chart: {
            type: 'area',
            height: 80, // Smaller height
            sparkline: {
                enabled: true
            },
            animations: {
                enabled: false
            }
        },
        stroke: {
            curve: 'smooth',
            width: 1.5
        },
        fill: {
            opacity: 0.3,
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        yaxis: {
            show: false,
            min: Math.min(...chartData.map(d => d.c)) * 0.98, // Add some padding
            max: Math.max(...chartData.map(d => d.c)) * 1.02
        },
        xaxis: {
            type: 'datetime',
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        tooltip: {
            enabled: false // Disabled for mini chart
        },
        grid: {
            show: false
        },
        colors: [chartData[chartData.length - 1].c >= chartData[0].c ? '#4CAF50' : '#F44336'], // Green if price up, Red if down
    };

    return (
        <div className="w-full h-20">
            <Chart options={options} series={series} type="area" height="100%" width="100%" />
        </div>
    );
};

export default MiniPriceChart;
