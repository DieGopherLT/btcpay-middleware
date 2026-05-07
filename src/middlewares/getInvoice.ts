import { Request, Response, NextFunction } from 'express';
import { BTCPayClient } from '@/client/BTCPayClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { GetInvoiceMiddlewareOptions, ExpressMiddleware } from '@/types';
import { BTCPayValidationError } from '@/utils/errors';

class GetInvoiceMiddleware extends BaseMiddleware {
  private client: BTCPayClient;

  constructor() {
    super();
    this.client = BTCPayClient.fromConfig(BTCPayConfiguration.getConfig());
  }

  create(options: GetInvoiceMiddlewareOptions): ExpressMiddleware {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new BTCPayValidationError(
            'getInvoice: mapRequest function is required'
          );
        }

        const invoiceId = options.mapRequest(req, res);
        if (!invoiceId) {
          throw new BTCPayValidationError(
            'getInvoice: mapRequest must return a non-empty invoiceId'
          );
        }

        const response = await this.client.getInvoice(invoiceId);

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

let getInvoiceMiddleware: GetInvoiceMiddleware | null = null;

function getGetInvoiceMiddleware(): GetInvoiceMiddleware {
  if (!getInvoiceMiddleware) {
    getInvoiceMiddleware = new GetInvoiceMiddleware();
  }
  return getInvoiceMiddleware;
}

export function resetGetInvoiceMiddleware(): void {
  getInvoiceMiddleware = null;
}

export const getInvoice = (
  options: GetInvoiceMiddlewareOptions
): ExpressMiddleware => getGetInvoiceMiddleware().create(options);
