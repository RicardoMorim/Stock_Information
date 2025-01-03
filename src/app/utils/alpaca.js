import Alpaca from "@alpacahq/alpaca-trade-api";

const alpaca = new Alpaca({
	keyId: process.env.ALPACA_KEY,
	secretKey: process.env.ALPACA_SECRET_KEY,
	paper: true
});

export default alpaca;
