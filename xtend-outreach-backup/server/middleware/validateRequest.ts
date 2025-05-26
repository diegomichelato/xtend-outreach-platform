import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { logger } from "../utils/logger";

export const validateRequest =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        logger.warn("Request validation failed:", validationError);
        return res.status(400).json({
          error: "Validation failed",
          details: validationError.details,
        });
      }

      logger.error("Unexpected validation error:", error);
      return res.status(500).json({
        error: "Internal server error during validation",
      });
    }
  }; 