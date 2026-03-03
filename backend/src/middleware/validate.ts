// backend/src/middleware/validate.ts
// Shared helper: run express-validator checks and return structured errors.
//
// Usage in any route:
//   import { validate } from '../middleware/validate';
//   router.post('/', validate([body('email').isEmail()]), handler);

import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult } from 'express-validator';

/**
 * Runs an array of express-validator chains, then calls next() if no errors.
 * On failure returns: { errors: [{ field: string, message: string }] }
 */
export function validate(chains: ValidationChain[]) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Run all validation chains in parallel
        await Promise.all(chains.map(chain => chain.run(req)));

        const result = validationResult(req);
        if (result.isEmpty()) {
            next();
            return;
        }

        // Map to { field, message } — never expose internals
        const errors = result.array().map(e => ({
            field: e.type === 'field' ? e.path : 'unknown',
            message: e.msg,
        }));

        res.status(400).json({ errors });
    };
}
