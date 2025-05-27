
"use client";
import Image from "next/image";

const NewsArticleCard = ({ article, index }) => {
    const { title, description, banner_image, source, published_utc, article_url } = article;
    const publisherName = source?.name || 'N/A';
    const publishedDate = new Date(published_utc).toLocaleDateString();

    // Basic image validation or placeholder
    const imageUrl = banner_image && banner_image.startsWith('http') ? banner_image : '/placeholder-news.png'; // Ensure you have a placeholder image

    const cardClasses = `bg-gray-800 shadow-xl rounded-lg overflow-hidden flex flex-col md:flex-row ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`;

    return (
        <article className={cardClasses}>
            <div className="md:w-1/3 w-full h-48 md:h-auto relative">
                <Image
                    src={imageUrl}
                    alt={title || 'News article image'}
                    layout="fill"
                    objectFit="cover"
                    className="transition-transform duration-300 ease-in-out hover:scale-105"
                />
            </div>
            <div className="p-5 md:w-2/3 flex flex-col justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-white hover:text-blue-400 transition-colors">
                        <a href={article_url} target="_blank" rel="noopener noreferrer">
                            {title || 'No title available'}
                        </a>
                    </h3>
                    <p className="text-sm text-gray-400 mt-1 mb-3">
                        By {publisherName} - {publishedDate}
                    </p>
                    <p className="text-gray-300 text-base leading-relaxed line-clamp-3">
                        {description || 'No description available.'}
                    </p>
                </div>
                <a 
                    href={article_url} 
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

const NewsSection = ({ news }) => {
    if (!news || news.length === 0) {
        return (
            <section className="mt-8 p-4 md:p-6 bg-gray-800 rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-6">Recent News</h2>
                <p className="text-gray-400">No news articles available at the moment.</p>
            </section>
        );
    }

    return (
        <section className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-6">Recent News</h2>
            <div className="space-y-6">
                {news.map((item, index) => (
                    <NewsArticleCard key={item.id || index} article={item} index={index} />
                ))}
            </div>
        </section>
    );
};

export default NewsSection;
