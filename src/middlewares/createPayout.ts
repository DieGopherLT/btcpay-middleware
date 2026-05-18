import { Request, Response, NextFunction } from 'express';
import { BTCPayClient } from '@/client/BTCPayClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { CreatePayoutMiddlewareOptions, ExpressMiddleware } from '@/types';
import { BTCPayValidationError } from '@/utils/errors';

class CreatePayoutMiddleware extends BaseMiddleware {
  private client: BTCPayClient;

  constructor() {
    super();
    this.client = BTCPayClient.fromConfig(BTCPayConfiguration.getConfig());
  }

  create(options: CreatePayoutMiddlewareOptions): ExpressMiddleware {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new BTCPayValidationError(
            'createPayout: mapRequest function is required'
          );
        }

        const payoutData = options.mapRequest(req, res);

        if (!payoutData.destination) {
          throw new BTCPayValidationError(
            'createPayout: destination is required'
          );
        }
        if (!payoutData.amount) {
          throw new BTCPayValidationError(
            'createPayout: amount is required'
          );
        }
        if (!payoutData.payoutMethodId) {
          throw new BTCPayValidationError(
            'createPayout: payoutMethodId is required'
          );
        }

        const response = await this.client.createPayout(payoutData);

        const transformedResponse = options.transformResponse
          ? options.transformResponse(response)
          : response;

        this.saveToLocals(res, transformedResponse);
        next();
      } catch (error) {
        await this.handleError(error, req, res, next, options.onError);
      }
    };
  }
}

let createPayoutMiddleware: CreatePayoutMiddleware | null = null;

function getCreatePayoutMiddleware(): CreatePayoutMiddleware {
  if (!createPayoutMiddleware) {
    createPayoutMiddleware = new CreatePayoutMiddleware();
  }
  return createPayoutMiddleware;
}

export function resetCreatePayoutMiddleware(): void {
  createPayoutMiddleware = null;
}

export const createPayout = (
  options: CreatePayoutMiddlewareOptions
): ExpressMiddleware => getCreatePayoutMiddleware().create(options);
