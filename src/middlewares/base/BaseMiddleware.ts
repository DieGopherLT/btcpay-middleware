import { Request, Response, NextFunction } from 'express';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { BTCPayError } from '@/utils/errors';
import { ErrorHandler, ErrorHandlingMode } from '@/types';

export abstract class BaseMiddleware {
  protected async handleError(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
    onError?: ErrorHandler
  ): Promise<void> {
    if (onError) {
      await onError(error, req, res, next);
      return;
    }

    const config = BTCPayConfiguration.getConfig();
    if (config.onError) {
      await config.onError(error, req, res, next);
      return;
    }

    const errorHandling: ErrorHandlingMode = config.errorHandling || 'next';
    if (errorHandling === 'direct') {
      this.sendErrorResponse(error, res);
      return;
    }

    next(error);
  }

  protected saveToLocals(res: Response, data: unknown): void {
    res.locals.btcpayResponse = data;
  }

  private sendErrorResponse(error: unknown, res: Response): void {
    if (error instanceof BTCPayError) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
}
