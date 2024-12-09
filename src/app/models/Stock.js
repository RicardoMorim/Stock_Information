import mongoose from "mongoose";

// Define a schema for the data
const stockSchema = new mongoose.Schema({
	symbol: { type: String, required: true },
	name: { type: String, required: true },
	exchangeShortName: { type: String, required: false },
	exchange: { type: String, required: false },
	type: { type: String, required: false },
});

stockSchema.index({ name: 1, symbol: 1 }, { unique: true }); // Compound unique index

export default mongoose.models.Stock || mongoose.model("Stock", stockSchema);