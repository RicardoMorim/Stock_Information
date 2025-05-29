import jwt from 'jsonwebtoken';

/**
 * Extracts and verifies the JWT from the request headers to get the user ID.
 * @param {Request} req - The Next.js request object.
 * @returns {string} The user ID from the token.
 * @throws {Error} If the token is missing, malformed, or invalid.
 */
export function getUserIdFromToken(req) {
	try {
		const authHeader = req.headers.get('authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			throw new Error('No token provided or token is malformed');
		}

		const token = authHeader.split(' ')[1];
		if (!token) {
			throw new Error('No token provided');
		}
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		return decoded.id;
	} catch (error) {
		// Log the specific error for debugging on the server
		console.error("Token verification failed:", error.message);
		// Throw a more generic error to the client or let the caller handle it
		throw new Error('Invalid token');
	}
}
