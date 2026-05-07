import { Request, Response, NextFunction } from 'express';
import { BTCPayClient } from '@/client/BTCPayClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { BTCPayConfiguration } from '@/config/BTCPayConfig';
import { CreateInvoiceMiddlewareOptions, ExpressMiddleware } from '@/types';
import { BTCPayValidationError } from '@/utils/errors';

class CreateInvoiceMiddleware extends BaseMiddleware {
  private client: BTCPayClient;

  constructor() {
    super();
    this.client = BTCPayClient.fromConfig(BTCPayConfiguration.getConfig());
  }

  create(options: CreateInvoiceMiddlewareOptions): ExpressMiddleware {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new BTCPayValidationError(
            'createInvoice: mapRequest function is required'
          );
        }

        const invoiceData = options.mapRequest(req, res);

        if (
          invoiceData.amount === undefined ||
          invoiceData.amount === null ||
          !invoiceData.currency
        ) {
          throw new BTCPayValidationError(
            'createInvoice: amount and currency are required'
          );
        }

        const response = await this.client.createInvoice(invoiceData);

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

let createInvoiceMiddleware: CreateInvoiceMiddleware | null = null;

function getCreateInvoiceMiddleware(): CreateInvoiceMiddleware {
  if (!createInvoiceMiddleware) {
    createInvoiceMiddleware = new CreateInvoiceMiddleware();
  }
  return createInvoiceMiddleware;
}

export function resetCreateInvoiceMiddleware(): void {
  createInvoiceMiddleware = null;
}

export const createInvoice = (
  options: CreateInvoiceMiddlewareOptions
): ExpressMiddleware => getCreateInvoiceMiddleware().create(options);
