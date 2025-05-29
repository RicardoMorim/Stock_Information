"use client";
import Image from "next/image";

const NewsArticleCard = ({ article, index }) => {
    const {
        headline, 
        title, 
        summary,
        description, 
        image_url,
        banner_image,
        source_name,
        source, 
        published_at,
        published_utc, 
        url, 
        article_url,
        source_api, 
        isDelayed 
    } = article;

    const displayTitle = headline || title || 'No title available';
    const displaySummary = summary || description || 'No description available.';
    const displayUrl = url || article_url;
    const displayImageUrl = image_url || banner_image;
    const displaySourceName = typeof source === 'object' ? source.name : source_name || source || 'N/A';
    const displayPublishedDate = new Date(published_at || published_utc).toLocaleDateString();

    // Basic image validation or placeholder
    const finalImageUrl = displayImageUrl && displayImageUrl.startsWith('http') ? displayImageUrl : '/placeholder-news.png';

    const cardClasses = `bg-gray-800 shadow-xl rounded-lg overflow-hidden flex flex-col md:flex-row ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`;

    return (
        <article className={cardClasses}>
            <div className="md:w-1/3 w-full h-48 md:h-auto relative">
                <Image
                    src={finalImageUrl}
                    alt={displayTitle}
                    fill 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                    className="transition-transform duration-300 ease-in-out hover:scale-105 object-cover"
                />
            </div>
            <div className="p-5 md:w-2/3 flex flex-col justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-white hover:text-blue-400 transition-colors">
                        <a href={displayUrl} target="_blank" rel="noopener noreferrer">
                            {displayTitle}
                        </a>
                    </h3>
                    <p className="text-sm text-gray-400 mt-1 mb-1">
                        By {displaySourceName} - {displayPublishedDate}
                    </p>
                    {source_api === 'Alpha Vantage' && isDelayed && (
                        <p className="text-xs text-yellow-400 mb-2">
                            (News from Alpha Vantage - may be delayed)
                        </p>
                    )}
                    <p className="text-gray-300 text-base leading-relaxed line-clamp-3">
                        {displaySummary}
                    </p>
                </div>
                <a 
                    href={displayUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-4 inline-block text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                    Read more &rarr;
                </a>
            </div>
        </article>
    );
};

const NewsSection = ({ news, symbol }) => { 
    if (!news || news.length === 0) {
        return (
            <section className="mt-8 p-4 md:p-6 bg-gray-800 rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-6">Recent News</h2>
                <p className="text-gray-400">No news articles available at the moment.</p>
            </section>
        );
    }

    const hasAlphaVantageDelayedNews = news.some(item => item.source_api === 'Alpha Vantage' && item.isDelayed);

    return (
        <section className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Recent News</h2>
                {hasAlphaVantageDelayedNews && (
                    <span className="text-sm text-yellow-400 bg-gray-700 px-2 py-1 rounded">
                        Some news articles may be delayed (Source: Alpha Vantage)
                    </span>
                )}
            </div>
            <div className="space-y-6">
                {news.map((item, index) => (
                    <NewsArticleCard key={item.id || index} article={item} index={index} />
                ))}
            </div>
        </section>
    );
};

export default NewsSection;
