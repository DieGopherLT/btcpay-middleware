import { Request, Response, NextFunction } from 'express';
import { BTCPayClient } from '@/client/BTCPayClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { GetPayoutMiddlewareOptions, ExpressMiddleware } from '@/types';
import { BTCPayValidationError } from '@/utils/errors';

class GetPayoutMiddleware extends BaseMiddleware {
  private client: BTCPayClient;

  constructor() {
    super();
    this.client = BTCPayClient.fromConfig(BTCPayConfiguration.getConfig());
  }

  create(options: GetPayoutMiddlewareOptions): ExpressMiddleware {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new BTCPayValidationError(
            'getPayout: mapRequest function is required'
          );
        }

        const payoutId = options.mapRequest(req, res);
        if (!payoutId) {
          throw new BTCPayValidationError(
            'getPayout: mapRequest must return a non-empty payoutId'
          );
        }

        const response = await this.client.getPayout(payoutId);

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

let getPayoutMiddleware: GetPayoutMiddleware | null = null;

function getGetPayoutMiddleware(): GetPayoutMiddleware {
  if (!getPayoutMiddleware) {
    getPayoutMiddleware = new GetPayoutMiddleware();
  }
  return getPayoutMiddleware;
}

export function resetGetPayoutMiddleware(): void {
  getPayoutMiddleware = null;
}

export const getPayout = (
  options: GetPayoutMiddlewareOptions
): ExpressMiddleware => getGetPayoutMiddleware().create(options);
