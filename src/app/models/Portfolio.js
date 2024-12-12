import mongoose from "mongoose";

const portfolioItemSchema = new mongoose.Schema({
	symbol: { type: String, required: true },
	shares: { type: Number, required: true },
	costPerShare: { type: Number, required: true },
	purchaseDate: { type: Date, required: true },
	notes: { type: String }
});

const portfolioSchema = new mongoose.Schema({
	userId: { type: String, required: true },
	holdings: [portfolioItemSchema]
});

portfolioSchema.index({ userId: 1 });

export default mongoose.models.Portfolio || mongoose.model("Portfolio", portfolioSchema);