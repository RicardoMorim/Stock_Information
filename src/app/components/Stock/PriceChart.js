
"use client";
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const PriceChart = ({ historicalData, symbol }) => {
    const chartData = historicalData?.data?.map((data) => ({ x: new Date(data.t), y: data.c })) || [];

    const priceChartOptions = {
        chart: {
            type: 'area',
            height: 400,
            toolbar: {
                show: true
            },
            foreColor: '#ccc' // Light text color for dark theme
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            type: 'datetime',
            title: {
                text: 'Date',
                style: { color: '#ccc' }
            },
            labels: {
                style: { colors: '#ccc' }
            }
        },
        yaxis: {
            title: {
                text: 'Price ($)',
                style: { color: '#ccc' }
            },
            labels: {
                style: { colors: '#ccc' },
                formatter: (value) => `$${value.toFixed(2)}`
            }
        },
        tooltip: {
            x: {
                format: 'dd MMM yyyy'
            },
            y: {
                formatter: (value) => `$${value.toFixed(2)}`
            },
            theme: 'dark'
        },
        colors: ['#4ade80'], // Green color for price
        grid: {
            borderColor: '#555' // Darker grid lines
        }
    };

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">Price History</h2>
            {chartData.length > 0 ? (
                <Chart
                    options={priceChartOptions}
                    series={[{ name: `${symbol} Price`, data: chartData }]}
                    type="area"
                    height={400}
                />
            ) : (
                <p className="text-gray-400">No historical price data available.</p>
            )}
        </div>
    );
};

export default PriceChart;
