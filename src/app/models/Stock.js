import mongoose from "mongoose";


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
    tradingCurrency: {  
        type: String,
        required: true,
        default: 'USD',
        enum: ['USD', 'EUR', 'PLN', 'GBP'] 
    },
    country: {  
        type: String,
        required: false
    },
    marketIdentifier: { 
        type: String,
        required: false
    }
});

stockSchema.index({ name: 1, symbol: 1 }, { unique: true }); 


stockSchema.statics.getTradingCurrency = async function(symbol) {
    const stock = await this.findOne({ symbol });
    return stock ? stock.tradingCurrency : 'USD';
};


stockSchema.statics.getCleanSymbol = function(symbol) {
    return symbol.split('.')[0];
};

export default mongoose.models.Stock || mongoose.model("Stock", stockSchema);