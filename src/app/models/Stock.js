import mongoose from "mongoose";

// Define a schema for the data
const stockSchema = new mongoose.Schema({
    symbol: { 
        type: String, 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    exchangeShortName: { 
        type: String, 
        required: false 
    },
    exchange: { 
        type: String, 
        required: false 
    },
    type: { 
        type: String, 
        required: false 
    },
    tradingCurrency: {  // Add trading currency
        type: String,
        required: true,
        default: 'USD',
        enum: ['USD', 'EUR', 'PLN', 'GBP'] // Add more currencies as needed
    },
    country: {  // Add country information
        type: String,
        required: false
    },
    marketIdentifier: {  // Add market identifier (e.g., .WA for Warsaw)
        type: String,
        required: false
    }
});

stockSchema.index({ name: 1, symbol: 1 }, { unique: true }); // Compound unique index

// Add helper method to get stock's trading currency
stockSchema.statics.getTradingCurrency = async function(symbol) {
    const stock = await this.findOne({ symbol });
    return stock ? stock.tradingCurrency : 'USD'; // Default to USD if not found
};

// Add helper method to get clean symbol (without market identifier)
stockSchema.statics.getCleanSymbol = function(symbol) {
    return symbol.split('.')[0];
};

export default mongoose.models.Stock || mongoose.model("Stock", stockSchema);