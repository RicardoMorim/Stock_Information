import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    holdings: [{
        symbol: {
            type: String,
            required: true,
            uppercase: true
        },
        shares: {
            type: Number,
            required: true,
            min: 0
        },
        costPerShare: {
            type: Number,
            required: true,
            min: 0
        },
        costInEUR: {  
            type: Number,
            required: true,
            min: 0
        },
        tradingCurrency: { 
            type: String,
            required: true,
            enum: ['USD', 'EUR', 'PLN', 'GBP']
        },
        purchaseDate: {
            type: Date,
            required: true
        },
        notes: {
            type: String,
            default: ''
        }
    }]
}, { timestamps: true });

portfolioSchema.index({ userId: 1 }); 


portfolioSchema.pre('save', function(next) {
    this.holdings.forEach((holding) => {
        if (isNaN(holding.costInEUR)) {
            next(new Error(`Invalid costInEUR for ${holding.symbol}`));
        }
    });
    next();
});

export default mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);